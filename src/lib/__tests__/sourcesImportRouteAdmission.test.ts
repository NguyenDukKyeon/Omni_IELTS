import express from 'express';
import http from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import {
  createJsonParserExcludingSourceImport,
  createSourceImportAdmissionGate,
  createSourceImportJsonParser,
  createSourceImportParserErrorHandler,
  SOURCE_IMPORT_MAX_JSON_BODY_BYTES,
} from '../sources/importRouteGate.server';

type AuthResult = { status: 'ok'; userId: string; accessToken: string } | { status: 'auth_required' };

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

function buildApp(options?: {
  featureEnabled?: boolean;
  authResult?: AuthResult;
  body?: unknown;
}) {
  const app = express();
  const verifyAccessToken = vi.fn(async () => options?.authResult ?? ({
    status: 'ok',
    userId: 'learner-1',
    accessToken: 'verified-token',
  } satisfies AuthResult));
  let genericParserCalls = 0;
  let routeCalls = 0;
  const genericJsonParser = express.json({ limit: '15mb' });

  app.use(createJsonParserExcludingSourceImport((req, res, next) => {
    genericParserCalls += 1;
    return genericJsonParser(req, res, next);
  }));
  app.post(
    '/api/sources/import',
    createSourceImportAdmissionGate({
      featureEnabled: options?.featureEnabled ?? true,
      cloudConfigured: true,
      verifyAccessToken,
    }),
    createSourceImportJsonParser(),
    createSourceImportParserErrorHandler(),
    (req, res) => {
      routeCalls += 1;
      res.status(200).json({ status: 'parsed', title: req.body?.title });
    },
  );
  return { app, verifyAccessToken, getGenericParserCalls: () => genericParserCalls, getRouteCalls: () => routeCalls };
}

async function postJson(port: number, body: string, headers: Record<string, string> = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api/sources/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function postChunked(port: number, body: string) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port,
      path: '/api/sources/import',
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
        'transfer-encoding': 'chunked',
      },
    }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode ?? 0, body: JSON.parse(data) as Record<string, unknown> });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

async function postDeclaredLength(port: number, declaredLength: number, body: string) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1',
      port,
      path: '/api/sources/import',
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
        'content-type': 'application/json',
        'content-length': String(declaredLength),
      },
    }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          resolve({ status: response.statusCode ?? 0, body: JSON.parse(data) as Record<string, unknown> });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
    request.end(body);
  });
}

describe('Sources import pre-auth admission and scoped parser', () => {
  it('rejects feature-off and missing/malformed Bearer traffic before any parser runs', async () => {
    const cases = [
      { featureEnabled: false, authorization: 'Bearer valid-token', expected: 403 },
      { featureEnabled: true, authorization: undefined, expected: 401 },
      { featureEnabled: true, authorization: 'Bearer', expected: 401 },
      { featureEnabled: true, authorization: 'Basic invalid', expected: 401 },
    ];

    for (const item of cases) {
      const fixture = buildApp({ featureEnabled: item.featureEnabled });
      await withServer(fixture.app, async (port) => {
        const response = await postJson(port, '{"contentBase64":"not parsed"}', item.authorization
          ? { authorization: item.authorization }
          : {});
        expect(response.status).toBe(item.expected);
        expect(fixture.getGenericParserCalls()).toBe(0);
        expect(fixture.getRouteCalls()).toBe(0);
        expect(fixture.verifyAccessToken).not.toHaveBeenCalled();
      });
    }
  });

  it('rejects a forged Bearer before JSON parsing and returns only the typed auth body', async () => {
    const fixture = buildApp({ authResult: { status: 'auth_required' } });
    await withServer(fixture.app, async (port) => {
      const response = await postJson(port, '{"title":"private","content":"body"}', { authorization: 'Bearer forged-token' });
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('auth_required');
      expect(JSON.stringify(response.body)).not.toContain('private');
      expect(fixture.verifyAccessToken).toHaveBeenCalledWith('forged-token');
      expect(fixture.getGenericParserCalls()).toBe(0);
      expect(fixture.getRouteCalls()).toBe(0);
    });
  });

  it('rejects unsupported content types and oversized declared Content-Length before JSON parsing', async () => {
    const unsupported = buildApp();
    await withServer(unsupported.app, async (port) => {
      const response = await postJson(port, 'raw-body-that-must-not-be-parsed', {
        authorization: 'Bearer valid-token',
        'content-type': 'text/plain',
      });
      expect(response.status).toBe(400);
      expect(unsupported.getGenericParserCalls()).toBe(0);
      expect(unsupported.getRouteCalls()).toBe(0);
    });

    const oversized = buildApp();
    await withServer(oversized.app, async (port) => {
      const response = await postDeclaredLength(port, SOURCE_IMPORT_MAX_JSON_BODY_BYTES + 1, '{"title":"small"}');
      expect(response.status).toBe(400);
      expect(oversized.getGenericParserCalls()).toBe(0);
      expect(oversized.getRouteCalls()).toBe(0);
    });
  });

  it('authenticates chunked traffic before the scoped parser rejects the bounded envelope', async () => {
    const fixture = buildApp();
    const oversizedJson = JSON.stringify({ title: 'chunked', type: 'text', content: 'x'.repeat(SOURCE_IMPORT_MAX_JSON_BODY_BYTES) });
    await withServer(fixture.app, async (port) => {
      const response = await postChunked(port, oversizedJson);
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('invalid_request');
      expect(fixture.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(fixture.getGenericParserCalls()).toBe(0);
      expect(fixture.getRouteCalls()).toBe(0);
    });
  });

  it('uses the scoped parser for a valid authenticated JSON envelope', async () => {
    const fixture = buildApp();
    await withServer(fixture.app, async (port) => {
      const response = await postJson(port, JSON.stringify({ title: 'bounded', type: 'text', content: 'bounded source content' }), {
        authorization: 'Bearer valid-token',
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'parsed', title: 'bounded' });
      expect(fixture.verifyAccessToken).toHaveBeenCalledTimes(1);
      expect(fixture.getGenericParserCalls()).toBe(0);
      expect(fixture.getRouteCalls()).toBe(1);
    });
  });

  it('keeps the accepted trailing-slash route out of the generic parser', async () => {
    const fixture = buildApp();
    await withServer(fixture.app, async (port) => {
      const response = await fetch(`http://127.0.0.1:${port}/api/sources/import/`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ title: 'bounded', type: 'text', content: 'bounded source content' }),
      });
      expect(response.status).toBe(200);
      expect(fixture.getGenericParserCalls()).toBe(0);
      expect(fixture.getRouteCalls()).toBe(1);
    });
  });
});
