import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { SpeakingArtifactStore } from '../../lib/speakingConsent';
import { createSpeakingAnalyzeHandler } from '../routes/speakingAnalyze';

const CANARY = 'speaking-analyze-canary';
let servers: Array<ReturnType<express.Express['listen']>> = [];

afterEach(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  servers = [];
});

async function listen(app: express.Express) {
  const server = app.listen(0);
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return `http://127.0.0.1:${address.port}`;
}

function appWith(artifacts: SpeakingArtifactStore) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.post('/api/speaking/analyze', createSpeakingAnalyzeHandler({
    env: { OMNI_SPEAKING_CANARY_TOKEN: CANARY },
    artifacts,
    evaluateWithAudio: async (_req, res, extras) => res.json({
      telemetry: extras.telemetry,
      persisted: extras.persist,
      pronunciation: extras.telemetry.acousticStatus === 'measured' ? { status: 'ok' } : null,
    }),
  }));
  return app;
}

const validBody = {
  fullAudioBase64: 'A'.repeat(80),
  conversationHistory: [{ part: 'part_1', userTranscript: 'Public transport is useful every day', durationSeconds: 10 }],
  totalDurationSeconds: 10,
  speechSegments: [{ start: 0, end: 4 }, { start: 6, end: 10 }],
};

describe('speaking analyze identity and consent', () => {
  it('does not persist artifacts when consent is false even with a verified token', async () => {
    const artifacts = new SpeakingArtifactStore(() => 1);
    const origin = await listen(appWith(artifacts));
    const response = await fetch(`${origin}/api/speaking/analyze`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${CANARY}`,
        'x-omni-user-id': 'spoofed-user',
      },
      body: JSON.stringify({ ...validBody, consentStorage: false, sessionId: 'sess-no' }),
    });
    expect(response.status).toBe(200);
    expect(artifacts.list('sess-no')).toHaveLength(0);
  });

  it('ignores client-supplied x-omni-user-id and persists only the verified token identity', async () => {
    const artifacts = new SpeakingArtifactStore(() => 1);
    const origin = await listen(appWith(artifacts));
    const response = await fetch(`${origin}/api/speaking/analyze`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${CANARY}`,
        'x-omni-user-id': 'spoofed-user',
      },
      body: JSON.stringify({ ...validBody, consentStorage: true, sessionId: 'sess-yes' }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.persisted).toBe(true);
    const written = artifacts.list('sess-yes');
    expect(written.length).toBeGreaterThan(0);
    expect(written.every((item) => item.userId === 'canary-speaker')).toBe(true);
    expect(written.some((item) => item.userId === 'spoofed-user')).toBe(false);
    expect(written.some((item) => item.kind === 'transcript')).toBe(true);
    expect(JSON.stringify(written)).not.toContain('fullAudioBase64');
  });

  it('does not persist when consent is true but the caller is unauthenticated', async () => {
    const artifacts = new SpeakingArtifactStore(() => 1);
    const origin = await listen(appWith(artifacts));
    const response = await fetch(`${origin}/api/speaking/analyze`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-omni-user-id': 'spoofed-user',
      },
      body: JSON.stringify({ ...validBody, consentStorage: true, sessionId: 'sess-anon' }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.persisted).toBe(false);
    expect(artifacts.list('sess-anon')).toHaveLength(0);
  });
});
