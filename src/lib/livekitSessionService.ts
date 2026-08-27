import { randomUUID } from 'node:crypto';
import { consumeFixedWindowQuota, type FixedWindowUsage } from './mediaImport';
import { OneTimeCredentialStore } from './oneTimeCredentialStore';
import {
  examPartFromState,
  resumeStateAfterReconnect,
  transitionSpeakingState,
} from './speakingStateMachine';
import type {
  SpeakingExamPart,
  SpeakingFallbackReason,
  SpeakingRealtimeSession,
  SpeakingSessionState,
} from './speakingRealtimeTypes';
import { assertNoSecretLeak, collectSecretValues } from './secretRedaction';
import {
  questionForPart,
  resolveGeminiLiveVoiceId,
  type ExamAgentEvent,
} from './speakingExamProtocol';

export const LIVEKIT_SESSION_TTL_MS = 20 * 60 * 1000;
export const LIVEKIT_SESSION_RATE_LIMIT = 5;
export const LIVEKIT_SESSION_RATE_WINDOW_MS = 10 * 60 * 1000;
export const LIVEKIT_MAX_CONCURRENT_SESSIONS = 1;

export interface LivekitEnv {
  LIVEKIT_URL?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
  LIVEKIT_AGENT_NAME?: string;
  GEMINI_API_KEY?: string;
  GEMINI_LIVE_MODEL?: string;
  LIVEKIT_AGENT_INTERNAL_SECRET?: string;
}

export interface MintedLivekitAccess {
  token: string;
  roomName: string;
  livekitUrl: string;
}

export interface LivekitInfrastructure {
  isConfigured(): boolean;
  mint(input: {
    roomName: string;
    identity: string;
    sessionId: string;
    ttlSeconds: number;
  }): Promise<MintedLivekitAccess>;
  dispatchAgent?(input: {
    roomName: string;
    metadata: Record<string, string>;
  }): Promise<void>;
  deleteRoom?(roomName: string): Promise<void>;
}

export class LivekitUnavailableError extends Error {
  readonly fallbackReason: SpeakingFallbackReason;

  constructor(fallbackReason: SpeakingFallbackReason, message: string) {
    super(message);
    this.name = 'LivekitUnavailableError';
    this.fallbackReason = fallbackReason;
  }
}

export class LivekitSessionQuotaError extends Error {
  readonly code: 'rate_limited' | 'max_concurrent';
  readonly retryAfterSeconds: number;

  constructor(code: 'rate_limited' | 'max_concurrent', retryAfterSeconds: number) {
    super(code === 'rate_limited'
      ? 'Speaking realtime session rate limit reached'
      : 'A realtime speaking session is already open');
    this.name = 'LivekitSessionQuotaError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface InternalSession {
  public: SpeakingRealtimeSession;
  credentialId: string | null;
}

const ACTIVE_STATES: SpeakingSessionState[] = [
  'requesting_permission',
  'connecting',
  'part_1',
  'part_2_preparation',
  'part_2_speaking',
  'part_3',
  'finalizing',
  'connection_lost',
];

export class LivekitSessionService {
  private readonly sessions = new Map<string, InternalSession>();
  private readonly createWindows = new Map<string, FixedWindowUsage>();

  constructor(
    private readonly options: {
      now?: () => number;
      credentials: OneTimeCredentialStore;
      infrastructure: LivekitInfrastructure;
      env?: LivekitEnv;
      ttlMs?: number;
    },
  ) {}

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  isLivekitConfigured(): boolean {
    return this.options.infrastructure.isConfigured();
  }

  get(id: string): SpeakingRealtimeSession | null {
    this.purgeExpired();
    return this.sessions.get(id)?.public ?? null;
  }

  listForUser(userId: string): SpeakingRealtimeSession[] {
    this.purgeExpired();
    return [...this.sessions.values()]
      .filter((session) => session.public.userId === userId)
      .map((session) => session.public);
  }

  async create(input: {
    userId: string;
    voiceId?: string;
    consentStorage: boolean;
    geminiApiKey?: string;
    resumeSessionId?: string;
  }): Promise<{
    session: SpeakingRealtimeSession;
    token: string | null;
    livekitUrl: string | null;
    fallbackReason: SpeakingFallbackReason | null;
    credentialId: string | null;
    requestId: string;
  }> {
    this.purgeExpired();

    if (input.resumeSessionId) {
      const resumed = await this.resume(input.userId, input.resumeSessionId);
      if (resumed) return resumed;
    }

    const quota = consumeFixedWindowQuota(
      this.createWindows,
      input.userId,
      this.now(),
      LIVEKIT_SESSION_RATE_LIMIT,
      LIVEKIT_SESSION_RATE_WINDOW_MS,
    );
    if (!quota.allowed) {
      throw new LivekitSessionQuotaError('rate_limited', quota.retryAfterSeconds);
    }

    const active = this.listForUser(input.userId).filter((session) => ACTIVE_STATES.includes(session.state));
    if (active.length >= LIVEKIT_MAX_CONCURRENT_SESSIONS) {
      throw new LivekitSessionQuotaError('max_concurrent', 30);
    }

    const requestId = randomUUID();
    const sessionId = randomUUID();
    const createdAt = this.now();
    const participantIdentity = `learner-${input.userId}`.slice(0, 64);
    const roomName = `omni-speaking-${sessionId}`;

    const base: SpeakingRealtimeSession = {
      id: sessionId,
      requestId,
      userId: input.userId,
      state: 'connecting',
      mode: 'realtime',
      roomName,
      livekitUrl: null,
      participantIdentity,
      currentPart: 'part_1',
      questionIndex: 0,
      currentQuestion: questionForPart('part_1', 0),
      fallbackReason: null,
      consentStorage: input.consentStorage,
      voiceId: resolveGeminiLiveVoiceId(input.voiceId),
      createdAt: new Date(createdAt).toISOString(),
      expiresAt: new Date(createdAt + (this.options.ttlMs ?? LIVEKIT_SESSION_TTL_MS)).toISOString(),
      lastEventAt: new Date(createdAt).toISOString(),
    };

    const providerKey = input.geminiApiKey?.trim() || this.options.env?.GEMINI_API_KEY?.trim();
    let credentialId: string | null = null;
    if (providerKey) {
      credentialId = this.options.credentials.issue({ sessionId, secret: providerKey }).id;
    }

    if (!this.options.infrastructure.isConfigured()) {
      const fallback = this.storeFallback(base, 'livekit_unavailable', credentialId);
      return {
        session: fallback,
        token: null,
        livekitUrl: null,
        fallbackReason: 'livekit_unavailable',
        credentialId: null,
        requestId,
      };
    }

    if (!providerKey) {
      const fallback = this.storeFallback(base, 'provider_unavailable', null);
      return {
        session: fallback,
        token: null,
        livekitUrl: null,
        fallbackReason: 'provider_unavailable',
        credentialId: null,
        requestId,
      };
    }

    try {
      const minted = await this.options.infrastructure.mint({
        roomName,
        identity: participantIdentity,
        sessionId,
        ttlSeconds: Math.floor((this.options.ttlMs ?? LIVEKIT_SESSION_TTL_MS) / 1000),
      });
      try {
        await this.options.infrastructure.dispatchAgent?.({
          roomName,
          metadata: {
            sessionId,
            credentialId: credentialId ?? '',
            voiceId: resolveGeminiLiveVoiceId(input.voiceId),
            requestId,
          },
        });
      } catch {
        const fallback = this.storeFallback({
          ...base,
          livekitUrl: minted.livekitUrl,
        }, 'agent_unavailable', credentialId);
        return {
          session: fallback,
          token: null,
          livekitUrl: null,
          fallbackReason: 'agent_unavailable',
          credentialId: null,
          requestId,
        };
      }

      const session: SpeakingRealtimeSession = {
        ...base,
        livekitUrl: minted.livekitUrl,
        state: 'connecting',
        currentPart: 'part_1',
      };
      this.sessions.set(sessionId, { public: session, credentialId });
      this.assertSessionSafe(session, providerKey);
      return {
        session,
        token: minted.token,
        livekitUrl: minted.livekitUrl,
        fallbackReason: null,
        credentialId,
        requestId,
      };
    } catch (error) {
      const reason = error instanceof LivekitUnavailableError
        ? error.fallbackReason
        : 'livekit_unavailable';
      const fallback = this.storeFallback(base, reason, credentialId);
      return {
        session: fallback,
        token: null,
        livekitUrl: null,
        fallbackReason: reason,
        credentialId: null,
        requestId,
      };
    }
  }

  transition(sessionId: string, userId: string, to: SpeakingSessionState, extras?: {
    questionIndex?: number;
    question?: string;
  }): SpeakingRealtimeSession {
    const internal = this.requireOwned(sessionId, userId);
    const next = internal.public.state === to ? to : transitionSpeakingState(internal.public.state, to);
    const currentPart = examPartFromState(next) ?? internal.public.currentPart;
    const questionIndex = extras?.questionIndex ?? internal.public.questionIndex ?? 0;
    internal.public = {
      ...internal.public,
      state: next,
      currentPart,
      questionIndex,
      currentQuestion: extras?.question
        ?? (currentPart ? questionForPart(currentPart, questionIndex) : internal.public.currentQuestion ?? null),
      lastEventAt: new Date(this.now()).toISOString(),
      mode: next === 'fallback_turn_based' ? 'turn_based' : internal.public.mode,
    };
    return internal.public;
  }

  applyAgentEvent(sessionId: string, event: ExamAgentEvent): SpeakingRealtimeSession {
    const internal = this.sessions.get(sessionId);
    if (!internal) {
      throw new LivekitUnavailableError('network_failed', 'Speaking session was not found');
    }
    const from = internal.public.state;
    const next = from === event.state ? event.state : transitionSpeakingState(from, event.state);
    const currentPart = examPartFromState(next) ?? internal.public.currentPart;
    const questionIndex = event.questionIndex ?? internal.public.questionIndex ?? 0;
    internal.public = {
      ...internal.public,
      state: next,
      currentPart,
      questionIndex,
      currentQuestion: event.question
        ?? (currentPart ? questionForPart(currentPart, questionIndex) : internal.public.currentQuestion ?? null),
      lastEventAt: new Date(this.now()).toISOString(),
    };
    return internal.public;
  }

  cutOffProvider(sessionId: string, userId: string): SpeakingRealtimeSession {
    const internal = this.requireOwned(sessionId, userId);
    this.options.credentials.destroyForSession(sessionId);
    if (internal.public.roomName) {
      void this.options.infrastructure.deleteRoom?.(internal.public.roomName);
    }
    return this.storeFallback(internal.public, 'provider_unavailable', internal.credentialId);
  }

  markLost(sessionId: string, userId: string): SpeakingRealtimeSession {
    return this.transition(sessionId, userId, 'connection_lost');
  }

  async resume(userId: string, sessionId: string): Promise<{
    session: SpeakingRealtimeSession;
    token: string | null;
    livekitUrl: string | null;
    fallbackReason: SpeakingFallbackReason | null;
    credentialId: string | null;
    requestId: string;
  } | null> {
    this.purgeExpired();
    const internal = this.sessions.get(sessionId);
    if (!internal || internal.public.userId !== userId) return null;
    if (internal.public.state !== 'connection_lost') {
      return {
        session: internal.public,
        token: null,
        livekitUrl: internal.public.livekitUrl,
        fallbackReason: internal.public.fallbackReason,
        credentialId: internal.credentialId,
        requestId: internal.public.requestId,
      };
    }

    const restoredPart = resumeStateAfterReconnect(internal.public.currentPart as SpeakingExamPart | null);
    if (!this.options.infrastructure.isConfigured() || !internal.public.roomName) {
      const fallback = this.storeFallback(internal.public, 'livekit_unavailable', internal.credentialId);
      return {
        session: fallback,
        token: null,
        livekitUrl: null,
        fallbackReason: 'livekit_unavailable',
        credentialId: null,
        requestId: internal.public.requestId,
      };
    }

    const minted = await this.options.infrastructure.mint({
      roomName: internal.public.roomName,
      identity: internal.public.participantIdentity,
      sessionId,
      ttlSeconds: Math.max(60, Math.floor((Date.parse(internal.public.expiresAt) - this.now()) / 1000)),
    });
    internal.public = {
      ...internal.public,
      state: restoredPart,
      currentPart: examPartFromState(restoredPart) ?? internal.public.currentPart,
      livekitUrl: minted.livekitUrl,
      lastEventAt: new Date(this.now()).toISOString(),
      fallbackReason: null,
      mode: 'realtime',
    };
    return {
      session: internal.public,
      token: minted.token,
      livekitUrl: minted.livekitUrl,
      fallbackReason: null,
      credentialId: internal.credentialId,
      requestId: internal.public.requestId,
    };
  }

  end(sessionId: string, userId: string): SpeakingRealtimeSession {
    const internal = this.requireOwned(sessionId, userId);
    this.options.credentials.destroyForSession(sessionId);
    if (internal.public.roomName) {
      void this.options.infrastructure.deleteRoom?.(internal.public.roomName);
    }
    internal.public = {
      ...internal.public,
      state: internal.public.state === 'completed' ? 'completed' : 'idle',
      lastEventAt: new Date(this.now()).toISOString(),
    };
    this.sessions.delete(sessionId);
    return internal.public;
  }

  requireOwned(sessionId: string, userId: string): InternalSession {
    this.purgeExpired();
    const internal = this.sessions.get(sessionId);
    if (!internal || internal.public.userId !== userId) {
      throw new LivekitUnavailableError('network_failed', 'Speaking session was not found');
    }
    return internal;
  }

  private storeFallback(
    base: SpeakingRealtimeSession,
    reason: SpeakingFallbackReason,
    credentialId: string | null,
  ): SpeakingRealtimeSession {
    if (credentialId) this.options.credentials.destroy(credentialId);
    this.options.credentials.destroyForSession(base.id);
    const session: SpeakingRealtimeSession = {
      ...base,
      state: 'fallback_turn_based',
      mode: 'turn_based',
      livekitUrl: null,
      roomName: null,
      fallbackReason: reason,
      lastEventAt: new Date(this.now()).toISOString(),
    };
    this.sessions.set(base.id, { public: session, credentialId: null });
    return session;
  }

  private purgeExpired(): void {
    const now = this.now();
    for (const [id, session] of this.sessions) {
      if (Date.parse(session.public.expiresAt) <= now) {
        this.options.credentials.destroyForSession(id);
        this.sessions.delete(id);
      }
    }
    for (const [userId, usage] of this.createWindows) {
      if (usage.startedAt + LIVEKIT_SESSION_RATE_WINDOW_MS <= now) {
        this.createWindows.delete(userId);
      }
    }
  }

  private assertSessionSafe(session: SpeakingRealtimeSession, secret?: string): void {
    const secrets = collectSecretValues(secret, this.options.env?.GEMINI_API_KEY, this.options.env?.LIVEKIT_API_SECRET);
    assertNoSecretLeak(session, secrets, 'livekit-session');
  }
}

export function readLivekitEnv(env: NodeJS.ProcessEnv): LivekitEnv {
  return {
    LIVEKIT_URL: env.LIVEKIT_URL,
    LIVEKIT_API_KEY: env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: env.LIVEKIT_API_SECRET,
    LIVEKIT_AGENT_NAME: env.LIVEKIT_AGENT_NAME || 'omni-ielts-speaking-examiner',
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    GEMINI_LIVE_MODEL: env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025',
    LIVEKIT_AGENT_INTERNAL_SECRET: env.LIVEKIT_AGENT_INTERNAL_SECRET || env.LIVEKIT_API_SECRET,
  };
}

export function livekitConfigured(env: LivekitEnv): boolean {
  return Boolean(env.LIVEKIT_URL?.trim() && env.LIVEKIT_API_KEY?.trim() && env.LIVEKIT_API_SECRET?.trim());
}
