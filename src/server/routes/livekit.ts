import express from 'express';
import { extractBearerToken, timingSafeEqualString, verifyLearnerAccessToken, type LearnerAuthEnv } from '../../lib/learnerAuth';
import {
  CreateLivekitSessionRequestSchema,
  RedeemCredentialRequestSchema,
  SpeakingRealtimeSessionSchema,
  type SpeakingSessionState,
} from '../../lib/speakingRealtimeTypes';
import {
  LivekitSessionQuotaError,
  LivekitSessionService,
  LivekitUnavailableError,
} from '../../lib/livekitSessionService';
import { CredentialUnavailableError, OneTimeCredentialStore } from '../../lib/oneTimeCredentialStore';
import { ExamAgentEventSchema } from '../../lib/speakingExamProtocol';
import { assertNoSecretLeak, collectSecretValues, redactText, safeErrorMessage } from '../../lib/secretRedaction';

export interface LivekitRouterDeps {
  env: NodeJS.ProcessEnv;
  sessions: LivekitSessionService;
  credentials: OneTimeCredentialStore;
  verifyLearner?: typeof verifyLearnerAccessToken;
}

function json(res: express.Response, status: number, body: unknown, secrets: string[] = []) {
  assertNoSecretLeak(body, secrets, 'livekit-response');
  return res.status(status).json(body);
}

function requestSecrets(req: express.Request, env: NodeJS.ProcessEnv): string[] {
  return collectSecretValues(
    req.header('x-gemini-api-key'),
    typeof req.body?.geminiApiKey === 'string' ? req.body.geminiApiKey : undefined,
    env.GEMINI_API_KEY,
    env.LIVEKIT_API_SECRET,
    env.LIVEKIT_AGENT_INTERNAL_SECRET,
  );
}

export function createLivekitRouter(deps: LivekitRouterDeps) {
  const router = express.Router();
  const verify = deps.verifyLearner ?? verifyLearnerAccessToken;

  const authenticate = async (req: express.Request, res: express.Response) => {
    const secrets = requestSecrets(req, deps.env);
    const token = extractBearerToken(req.header('authorization'));
    const identity = await verify(token, deps.env as LearnerAuthEnv);
    if (!identity) {
      json(res, 401, {
        error: 'Hãy đăng nhập trước khi mở phòng thi realtime.',
        code: 'AUTH_REQUIRED',
        fallbackReason: 'unauthenticated',
      }, secrets);
      return null;
    }
    return identity;
  };

  router.post('/session', async (req, res) => {
    const secrets = requestSecrets(req, deps.env);
    try {
      const identity = await authenticate(req, res);
      if (!identity) return;

      const parsed = CreateLivekitSessionRequestSchema.safeParse({
        ...req.body,
        geminiApiKey: req.body?.geminiApiKey || req.header('x-gemini-api-key') || undefined,
      });
      if (!parsed.success) {
        return json(res, 400, { error: 'Yêu cầu phiên LiveKit không hợp lệ.', code: 'LIVEKIT_SESSION_INVALID' }, secrets);
      }

      const created = await deps.sessions.create({
        userId: identity.userId,
        voiceId: parsed.data.voiceId,
        consentStorage: parsed.data.consentStorage,
        geminiApiKey: parsed.data.geminiApiKey,
        resumeSessionId: parsed.data.resumeSessionId,
      });

      const body = {
        session: SpeakingRealtimeSessionSchema.parse(created.session),
        token: created.token,
        livekitUrl: created.livekitUrl,
        fallbackReason: created.fallbackReason,
        requestId: created.requestId,
      };
      return json(res, 201, body, secrets);
    } catch (error) {
      if (error instanceof LivekitSessionQuotaError) {
        const state = error.code === 'rate_limited' ? 'failed' : 'quota_exhausted';
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
        return json(res, 429, {
          error: error.message,
          code: error.code === 'rate_limited' ? 'LIVEKIT_RATE_LIMITED' : 'LIVEKIT_MAX_CONCURRENT',
          fallbackReason: error.code === 'rate_limited' ? 'quota_exhausted' : 'quota_exhausted',
          state,
          retryAfterSeconds: error.retryAfterSeconds,
        }, secrets);
      }
      return json(res, 500, { error: safeErrorMessage(error), code: 'LIVEKIT_SESSION_FAILED' }, secrets);
    }
  });

  router.get('/session/:id', async (req, res) => {
    const secrets = requestSecrets(req, deps.env);
    const identity = await authenticate(req, res);
    if (!identity) return;
    const session = deps.sessions.get(req.params.id);
    if (!session || session.userId !== identity.userId) {
      return json(res, 404, { error: 'Không tìm thấy phiên Speaking.', code: 'SESSION_NOT_FOUND' }, secrets);
    }
    return json(res, 200, { session }, secrets);
  });

  router.delete('/session/:id', async (req, res) => {
    const secrets = requestSecrets(req, deps.env);
    const identity = await authenticate(req, res);
    if (!identity) return;
    try {
      const session = deps.sessions.end(req.params.id, identity.userId);
      return json(res, 200, { session, ended: true }, secrets);
    } catch {
      return json(res, 404, { error: 'Không tìm thấy phiên Speaking.', code: 'SESSION_NOT_FOUND' }, secrets);
    }
  });

  router.post('/session/:id/transition', async (req, res) => {
    const secrets = requestSecrets(req, deps.env);
    const identity = await authenticate(req, res);
    if (!identity) return;
    const to = req.body?.state as SpeakingSessionState | undefined;
    if (!to) {
      return json(res, 400, { error: 'Thiếu trạng thái.', code: 'STATE_REQUIRED' }, secrets);
    }
    try {
      const session = deps.sessions.transition(req.params.id, identity.userId, to, {
        questionIndex: typeof req.body?.questionIndex === 'number' ? req.body.questionIndex : undefined,
        question: typeof req.body?.question === 'string' ? req.body.question : undefined,
      });
      return json(res, 200, { session }, secrets);
    } catch (error) {
      if (error instanceof LivekitUnavailableError) {
        return json(res, 404, { error: 'Không tìm thấy phiên Speaking.', code: 'SESSION_NOT_FOUND' }, secrets);
      }
      return json(res, 409, {
        error: redactText(error instanceof Error ? error.message : 'Illegal transition'),
        code: 'ILLEGAL_TRANSITION',
      }, secrets);
    }
  });

  router.post('/session/:id/agent-event', async (req, res) => {
    const secrets = requestSecrets(req, deps.env);
    const expected = deps.env.LIVEKIT_AGENT_INTERNAL_SECRET?.trim() || deps.env.LIVEKIT_API_SECRET?.trim();
    const provided = extractBearerToken(req.header('authorization')) || req.header('x-omni-agent-key')?.trim();
    if (!expected || !provided || !timingSafeEqualString(provided, expected)) {
      return res.sendStatus(404);
    }
    const parsed = ExamAgentEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return json(res, 400, { error: 'Agent event is invalid.', code: 'AGENT_EVENT_INVALID' }, secrets);
    }
    try {
      const session = deps.sessions.applyAgentEvent(req.params.id, parsed.data);
      return json(res, 200, { session }, secrets);
    } catch {
      return json(res, 404, { error: 'Không tìm thấy phiên Speaking.', code: 'SESSION_NOT_FOUND' }, secrets);
    }
  });

  router.post('/session/:id/provider-cutoff', async (req, res) => {
    const secrets = requestSecrets(req, deps.env);
    const identity = await authenticate(req, res);
    if (!identity) return;
    try {
      const session = deps.sessions.cutOffProvider(req.params.id, identity.userId);
      return json(res, 200, { session, fallbackReason: session.fallbackReason }, secrets);
    } catch {
      return json(res, 404, { error: 'Không tìm thấy phiên Speaking.', code: 'SESSION_NOT_FOUND' }, secrets);
    }
  });

  router.post('/credentials/redeem', async (req, res) => {
    const secrets = requestSecrets(req, deps.env);
    const expected = deps.env.LIVEKIT_AGENT_INTERNAL_SECRET?.trim() || deps.env.LIVEKIT_API_SECRET?.trim();
    const provided = extractBearerToken(req.header('authorization')) || req.header('x-omni-agent-key')?.trim();
    if (!expected || !provided || !timingSafeEqualString(provided, expected)) {
      return res.sendStatus(404);
    }
    const parsed = RedeemCredentialRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return json(res, 400, { error: 'Credential redeem request is invalid.', code: 'REDEEM_INVALID' }, secrets);
    }
    try {
      const redeemed = deps.credentials.redeem(parsed.data.credentialId, parsed.data.sessionId);
      assertNoSecretLeak({ credential: redeemed.credential }, [redeemed.apiKey, ...secrets], 'credential-public');
      return res.status(200).json({
        credential: redeemed.credential,
        apiKey: redeemed.apiKey,
        model: deps.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025',
      });
    } catch (error) {
      const code = error instanceof CredentialUnavailableError ? error.code : 'expired';
      return json(res, 409, { error: 'Credential is not redeemable.', code: code.toUpperCase() }, secrets);
    }
  });

  router.get('/health', (_req, res) => {
    return res.json({
      livekitConfigured: Boolean(deps.env.LIVEKIT_URL && deps.env.LIVEKIT_API_KEY && deps.env.LIVEKIT_API_SECRET),
      agentName: deps.env.LIVEKIT_AGENT_NAME || 'omni-ielts-speaking-examiner',
      geminiLiveModel: deps.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-12-2025',
    });
  });

  return router;
}
