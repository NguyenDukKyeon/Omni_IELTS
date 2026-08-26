import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { OneTimeCredentialStore } from '../../lib/oneTimeCredentialStore';
import { LivekitSessionService, type LivekitInfrastructure } from '../../lib/livekitSessionService';
import { createLivekitRouter } from '../routes/livekit';

const KEY = 'AIzaSyRouterLeakTestKey123456';
const CANARY = 'speaking-canary-token';
let servers: Array<ReturnType<express.Express['listen']>> = [];

afterEach(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  servers = [];
});

function infra(configured = true): LivekitInfrastructure {
  return {
    isConfigured: () => configured,
    mint: async ({ roomName }) => ({ token: 'lk.jwt.token', roomName, livekitUrl: 'wss://omni.livekit.cloud' }),
    dispatchAgent: async () => undefined,
  };
}

async function listen(app: express.Express) {
  const server = app.listen(0);
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  return `http://127.0.0.1:${address.port}`;
}

function appWith(configured: boolean) {
  const credentials = new OneTimeCredentialStore(() => 1_000);
  const sessions = new LivekitSessionService({
    now: () => 1_000,
    credentials,
    infrastructure: infra(configured),
    env: { GEMINI_API_KEY: KEY, LIVEKIT_AGENT_INTERNAL_SECRET: 'agent-secret' },
  });
  const app = express();
  app.use(express.json());
  app.use('/api/livekit', createLivekitRouter({
    env: {
      GEMINI_API_KEY: KEY,
      OMNI_SPEAKING_CANARY_TOKEN: CANARY,
      LIVEKIT_AGENT_INTERNAL_SECRET: 'agent-secret',
    },
    sessions,
    credentials,
  }));
  return { app, credentials, sessions };
}

describe('livekit HTTP router', () => {
  it('rejects unauthenticated realtime session creation', async () => {
    const { app } = appWith(true);
    const origin = await listen(app);
    const response = await fetch(`${origin}/api/livekit/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-gemini-api-key': KEY },
      body: JSON.stringify({ consentStorage: false }),
    });
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.fallbackReason).toBe('unauthenticated');
    expect(JSON.stringify(body)).not.toContain(KEY);
  });

  it('creates a session and never echoes the Gemini key', async () => {
    const logs: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    };
    const { app } = appWith(true);
    const origin = await listen(app);
    const response = await fetch(`${origin}/api/livekit/session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${CANARY}`,
        'x-gemini-api-key': KEY,
      },
      body: JSON.stringify({ consentStorage: false, geminiApiKey: KEY }),
    });
    const body = await response.json();
    console.error = original;
    expect(response.status).toBe(201);
    expect(body.session.mode).toBe('realtime');
    expect(JSON.stringify(body)).not.toContain(KEY);
    expect(logs.join('\n')).not.toContain(KEY);
  });

  it('redeems a credential once for the agent and then rejects', async () => {
    const { app, credentials } = appWith(true);
    const issued = credentials.issue({ sessionId: 'sess-1', secret: KEY });
    const origin = await listen(app);
    const first = await fetch(`${origin}/api/livekit/credentials/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer agent-secret' },
      body: JSON.stringify({ credentialId: issued.id, sessionId: 'sess-1' }),
    });
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    expect(firstBody.apiKey).toBe(KEY);
    const second = await fetch(`${origin}/api/livekit/credentials/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer agent-secret' },
      body: JSON.stringify({ credentialId: issued.id, sessionId: 'sess-1' }),
    });
    expect(second.status).toBe(409);
    const unauthorized = await fetch(`${origin}/api/livekit/credentials/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credentialId: issued.id, sessionId: 'sess-1' }),
    });
    expect(unauthorized.status).toBe(404);
  });
});
