import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const url = process.env.LIVEKIT_URL?.trim();
const apiKey = process.env.LIVEKIT_API_KEY?.trim();
const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
const geminiKey = process.env.GEMINI_API_KEY?.trim();
const canaryToken = process.env.OMNI_SPEAKING_CANARY_TOKEN?.trim();
const appBaseUrl = (process.env.OMNI_CANARY_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const forceFallback = process.env.OMNI_SPEAKING_CANARY_FORCE_FALLBACK === 'true';

if (!url || !apiKey || !apiSecret || !geminiKey || !canaryToken) {
  throw new Error('LiveKit speaking canary is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, GEMINI_API_KEY, and OMNI_SPEAKING_CANARY_TOKEN. Refusing to fake a pass.');
}

const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${canaryToken}`,
};

const created = await fetch(`${appBaseUrl}/api/livekit/session`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ consentStorage: false, voiceId: 'Kore' }),
  signal: AbortSignal.timeout(30_000),
});
const sessionPayload = await created.json().catch(() => ({}));
const serialized = JSON.stringify(sessionPayload);
if (serialized.includes(geminiKey) || /AIza[0-9A-Za-z_-]{8,}/.test(serialized)) {
  throw new Error('Live speaking canary leaked a Gemini key in the session response.');
}
if (!created.ok) {
  throw new Error(`Live speaking canary failed to create a session: HTTP ${created.status}`);
}
if (sessionPayload.fallbackReason === 'quota_exhausted') {
  throw new Error('Live speaking canary hit Gemini or LiveKit quota.');
}

if (forceFallback) {
  if (sessionPayload.session?.state !== 'fallback_turn_based') {
    throw new Error('Forced fallback canary expected fallback_turn_based after the provider was cut off.');
  }
  console.log(JSON.stringify({ status: 'ok', mode: 'forced_fallback', requestId: sessionPayload.requestId }));
} else {
  if (!sessionPayload.token || !sessionPayload.livekitUrl) {
    throw new Error(`Live speaking canary did not receive a LiveKit token: ${sessionPayload.fallbackReason || sessionPayload.session?.state}`);
  }

  console.log(JSON.stringify({
    status: 'ok',
    mode: 'realtime',
    sessionId: sessionPayload.session?.id,
    requestId: sessionPayload.requestId,
    hasToken: true,
  }));
}