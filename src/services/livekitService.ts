import { getSession } from './supabase';
import type {
  SpeakingFallbackReason,
  SpeakingRealtimeSession,
  SpeakingSessionState,
} from '../lib/speakingRealtimeTypes';

export interface LivekitSessionResponse {
  session: SpeakingRealtimeSession;
  token: string | null;
  livekitUrl: string | null;
  fallbackReason: SpeakingFallbackReason | null;
  requestId: string;
  error?: string;
  code?: string;
}

async function authHeaders(extra: Record<string, string> = {}): Promise<HeadersInit> {
  const session = await getSession().catch(() => null);
  const geminiApiKey = typeof window !== 'undefined' ? sessionStorage.getItem('omni_gemini_api_key') : null;
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : {}),
    ...extra,
  };
}

async function parse(res: Response): Promise<LivekitSessionResponse & { status: number }> {
  const payload = await res.json().catch(() => ({})) as LivekitSessionResponse;
  return { ...payload, status: res.status };
}

export async function createLivekitSession(input: {
  voiceId?: string;
  consentStorage: boolean;
  resumeSessionId?: string;
}): Promise<LivekitSessionResponse & { status: number }> {
  const res = await fetch('/api/livekit/session', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  return parse(res);
}

export async function getLivekitSession(id: string): Promise<LivekitSessionResponse & { status: number }> {
  const res = await fetch(`/api/livekit/session/${encodeURIComponent(id)}`, {
    headers: await authHeaders(),
  });
  return parse(res);
}

export async function endLivekitSession(id: string): Promise<LivekitSessionResponse & { status: number }> {
  const res = await fetch(`/api/livekit/session/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return parse(res);
}

export async function transitionLivekitSession(
  id: string,
  state: SpeakingSessionState,
  extras?: { questionIndex?: number; question?: string },
) {
  const res = await fetch(`/api/livekit/session/${encodeURIComponent(id)}/transition`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ state, ...extras }),
  });
  return parse(res);
}

export async function cutoffLivekitProvider(id: string) {
  const res = await fetch(`/api/livekit/session/${encodeURIComponent(id)}/provider-cutoff`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  return parse(res);
}

export async function getLivekitHealth(): Promise<{ livekitConfigured: boolean }> {
  const res = await fetch('/api/livekit/health');
  return res.json();
}
