import type express from 'express';
import { interpretSpeakingAnalyzeRequest, unavailableAnalyzeBody } from '../../lib/speakingAnalyze';
import { SpeakingArtifactStore } from '../../lib/speakingConsent';
import { extractBearerToken, verifyLearnerAccessToken, type LearnerAuthEnv } from '../../lib/learnerAuth';
import { assertNoSecretLeak, collectSecretValues, safeErrorMessage } from '../../lib/secretRedaction';

export interface SpeakingAnalyzeDeps {
  evaluateWithAudio: (req: express.Request, res: express.Response, extras: {
    telemetry: ReturnType<typeof interpretSpeakingAnalyzeRequest>['telemetry'];
    persist: boolean;
  }) => Promise<express.Response | void>;
  artifacts?: SpeakingArtifactStore;
  env?: NodeJS.ProcessEnv;
  verifyLearner?: typeof verifyLearnerAccessToken;
}

export function createSpeakingAnalyzeHandler(deps: SpeakingAnalyzeDeps) {
  return async (req: express.Request, res: express.Response) => {
    const secrets = collectSecretValues(
      req.header('x-gemini-api-key'),
      deps.env?.GEMINI_API_KEY,
    );
    try {
      const interpretation = interpretSpeakingAnalyzeRequest(req.body);
      if (!interpretation.ok) {
        const body = unavailableAnalyzeBody(interpretation);
        assertNoSecretLeak(body, secrets, 'speaking-analyze');
        return res.status(interpretation.status).json(body);
      }

      const token = extractBearerToken(req.header('authorization'));
      const identity = token
        ? await (deps.verifyLearner ?? verifyLearnerAccessToken)(token, (deps.env || {}) as LearnerAuthEnv)
        : null;

      if (interpretation.persist && interpretation.request && deps.artifacts && identity?.userId) {
        const sessionId = interpretation.request.sessionId || 'anonymous';
        deps.artifacts.write({
          sessionId,
          userId: identity.userId,
          kind: 'telemetry',
          payload: interpretation.telemetry,
          consent: true,
        });
        deps.artifacts.write({
          sessionId,
          userId: identity.userId,
          kind: 'transcript',
          payload: {
            turns: (interpretation.request.conversationHistory || []).map((turn) => ({
              part: turn.part,
              question: turn.question,
              userTranscript: turn.userTranscript,
              durationSeconds: turn.durationSeconds,
            })),
          },
          consent: true,
        });
      }

      return await deps.evaluateWithAudio(req, res, {
        telemetry: interpretation.telemetry,
        persist: Boolean(interpretation.persist && identity?.userId),
      });
    } catch (error) {
      return res.status(500).json({ error: safeErrorMessage(error), code: 'SPEAKING_ANALYZE_FAILED' });
    }
  };
}
