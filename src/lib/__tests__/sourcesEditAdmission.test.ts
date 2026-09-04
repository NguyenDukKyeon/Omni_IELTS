import express from 'express';
import http from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import {
  createJsonParserExcludingSourceImport,
  createSourceVersionEditAdmissionGate,
  createSourceVersionEditJsonParser,
  createSourceImportParserErrorHandler,
  SOURCE_VERSION_EDIT_MAX_JSON_BODY_BYTES,
  SOURCE_VERSION_EDIT_JSON_BODY_OVERHEAD_BYTES,
  SOURCE_VERSION_EDIT_JSON_BYTES_PER_CODE_POINT,
} from '../sources/importRouteGate.server';
import { handleSourceVersionEditRequest } from '../sources/libraryTransport.server';
import type { LearnerAuthResult } from '../sources/groundedChat';
import { SOURCE_VERSION_MAX_TEXT_CODE_POINTS } from '../sources/versioning';

const SOURCE_ID = '00000000-0000-4000-8000-000000000001';
const VERSION_ID = '00000000-0000-4000-8000-000000000002';

async function withServer<T>(app: express.Express, run: (port: number) => Promise<T>): Promise<T> {
  const server = await new Promise<http.Server>((resolve) => {
    const next = app.listen(0, '127.0.0.1', () => resolve(next));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind');
  try {
    return await run(address.port);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function buildEditAdmissionApp(options: {
  featureEnabled?: boolean;
  cloudConfigured?: boolean;
  authResult?: { status: 'ok'; userId: string; accessToken: string } | { status: 'auth_required' };
}) {
  const app = express();
  const verifyAccessToken = vi.fn(async (): Promise<LearnerAuthResult> => options.authResult ?? ({ status: 'ok', userId: 'learner-1', accessToken: 'verified-token' }));
  let genericParserCalls = 0;
  let routeCalls = 0;
  const genericJsonParser = express.json({ limit: '15mb' });
  app.use(createJsonParserExcludingSourceImport((req, res, next) => {
    genericParserCalls += 1;
    return genericJsonParser(req, res, next);
  }));
  app.post(
    '/api/sources/versions',
    createSourceVersionEditAdmissionGate({
      featureEnabled: options.featureEnabled ?? true,
      cloudConfigured: options.cloudConfigured ?? true,
      verifyAccessToken,
    }),
    createSourceVersionEditJsonParser(),
    createSourceImportParserErrorHandler(),
    (req, res) => {
      routeCalls += 1;
      res.status(200).json({ status: 'parsed', sourceId: req.body?.sourceId });
    },
  );
  return { app, verifyAccessToken, getGenericParserCalls: () => genericParserCalls, getRouteCalls: () => routeCalls };
}

async function postJson(port: number, body: string, headers: Record<string, string> = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/sources/versions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function postChunked(port: number, body: string) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1', port, path: '/api/sources/versions/', method: 'POST',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json', 'transfer-encoding': 'chunked' },
    }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try { resolve({ status: response.statusCode ?? 0, body: JSON.parse(data) as Record<string, unknown> }); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

async function postDeclaredLength(port: number, declaredLength: number, body: string) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1', port, path: '/api/sources/versions', method: 'POST',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json', 'content-length': String(declaredLength) },
    }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try { resolve({ status: response.statusCode ?? 0, body: JSON.parse(data) as Record<string, unknown> }); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

describe('Sources immutable-edit admission boundary', () => {
  it('derives the edit JSON ceiling from Unicode text and bounded metadata overhead', () => {
    expect(SOURCE_VERSION_EDIT_MAX_JSON_BODY_BYTES).toBe(
      SOURCE_VERSION_MAX_TEXT_CODE_POINTS * SOURCE_VERSION_EDIT_JSON_BYTES_PER_CODE_POINT
      + SOURCE_VERSION_EDIT_JSON_BODY_OVERHEAD_BYTES,
    );
    expect(SOURCE_VERSION_EDIT_MAX_JSON_BODY_BYTES).toBeLessThan(15 * 1024 * 1024);
  });

  it('rejects feature-off, missing, and forged Bearer traffic before parsing', async () => {
    const cases = [
      { featureEnabled: false, authorization: 'Bearer valid-token', expected: 403, verifies: 0 },
      { featureEnabled: true, authorization: undefined, expected: 401, verifies: 0 },
      { featureEnabled: true, authorization: 'Bearer forged-token', expected: 401, verifies: 1, authResult: { status: 'auth_required' as const } },
    ];
    for (const item of cases) {
      const fixture = buildEditAdmissionApp({ featureEnabled: item.featureEnabled, authResult: item.authResult });
      await withServer(fixture.app, async (port) => {
        const response = await postJson(port, JSON.stringify({ editedText: 'private body that must not parse' }), item.authorization ? { authorization: item.authorization } : {});
        expect(response.status).toBe(item.expected);
        expect(fixture.verifyAccessToken).toHaveBeenCalledTimes(item.verifies);
        expect(fixture.getGenericParserCalls()).toBe(0);
        expect(fixture.getRouteCalls()).toBe(0);
        expect(JSON.stringify(response.body)).not.toContain('private');
      });
    }
  });

  it('rejects wrong content type and oversized declared length after auth but before parsing', async () => {
    const wrongType = buildEditAdmissionApp({});
    await withServer(wrongType.app, async (port) => {
      const response = await postJson(port, 'not-json', { authorization: 'Bearer valid-token', 'content-type': 'text/plain' });
      expect(response.status).toBe(400);
      expect(wrongType.verifyAccessToken).toHaveBeenCalledTimes(1);
      expect(wrongType.getGenericParserCalls()).toBe(0);
      expect(wrongType.getRouteCalls()).toBe(0);
    });

    const oversized = buildEditAdmissionApp({});
    await withServer(oversized.app, async (port) => {
      const response = await postDeclaredLength(port, SOURCE_VERSION_EDIT_MAX_JSON_BODY_BYTES + 1, '{}');
      expect(response.status).toBe(400);
      expect(oversized.getGenericParserCalls()).toBe(0);
      expect(oversized.getRouteCalls()).toBe(0);
    });
  });

  it('keeps chunked edit bodies bounded by the route-local parser', async () => {
    const fixture = buildEditAdmissionApp({});
    const oversized = JSON.stringify({ sourceId: SOURCE_ID, baseVersionId: VERSION_ID, editedText: 'x'.repeat(SOURCE_VERSION_EDIT_MAX_JSON_BODY_BYTES) });
    await withServer(fixture.app, async (port) => {
      const response = await postChunked(port, oversized);
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('invalid_request');
      expect(fixture.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(fixture.getGenericParserCalls()).toBe(0);
      expect(fixture.getRouteCalls()).toBe(0);
    });
  });

  it('rejects non-UUID edit IDs before repository or RPC work and reuses verified learner identity', async () => {
    const repositoryForToken = vi.fn(() => ({ createEditedVersion: vi.fn() }) as never);
    const verifyAccessToken = vi.fn(async () => ({ status: 'ok' as const, userId: 'learner-1', accessToken: 'verified-token' }));
    const invalid = await handleSourceVersionEditRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer verified-token',
      body: { sourceId: 'source-not-uuid', baseVersionId: VERSION_ID, editedText: 'A valid enough edited source body.' },
      cloudConfigured: true,
      verifyAccessToken,
      repositoryForToken,
    });
    expect(invalid.status).toBe(400);
    expect(repositoryForToken).not.toHaveBeenCalled();

    const createEditedVersion = vi.fn(async () => ({ sourceRecord: {}, sourceVersion: {} }));
    const reusedVerify = vi.fn();
    const valid = await handleSourceVersionEditRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer verified-token',
      verifiedLearner: { userId: 'learner-1', accessToken: 'verified-token' },
      body: { sourceId: SOURCE_ID, baseVersionId: VERSION_ID, editedText: 'A valid enough edited source body.' },
      cloudConfigured: true,
      verifyAccessToken: reusedVerify,
      repositoryForToken: () => ({ createEditedVersion } as never),
    });
    expect(valid.status).toBe(200);
    expect(reusedVerify).not.toHaveBeenCalled();
    expect(createEditedVersion).toHaveBeenCalledWith({ sourceId: SOURCE_ID, baseVersionId: VERSION_ID, editedText: 'A valid enough edited source body.', userId: 'learner-1' });
  });
});
