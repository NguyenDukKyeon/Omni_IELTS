import type express from 'express';
import { interpretSpeakingAnalyzeRequest, unavailableAnalyzeBody } from '../../lib/speakingAnalyze';
import { SpeakingArtifactStore } from '../../lib/speakingConsent';
import { assertNoSecretLeak, collectSecretValues, safeErrorMessage } from '../../lib/secretRedaction';

export interface SpeakingAnalyzeDeps {
  evaluateWithAudio: (req: express.Request, res: express.Response, extras: {
    telemetry: ReturnType<typeof interpretSpeakingAnalyzeRequest>['telemetry'];
    persist: boolean;
  }) => Promise<express.Response | void>;
  artifacts?: SpeakingArtifactStore;
  env?: NodeJS.ProcessEnv;
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

      if (interpretation.persist && interpretation.request && deps.artifacts) {
        deps.artifacts.write({
          sessionId: interpretation.request.sessionId || 'anonymous',
          userId: String(req.header('x-omni-user-id') || 'anonymous'),
          kind: 'telemetry',
          payload: interpretation.telemetry,
          consent: true,
        });
      } else if (interpretation.request && deps.artifacts && interpretation.request.consentStorage === false) {
        // Explicitly do not write. Covered by tests.
      }

      return await deps.evaluateWithAudio(req, res, {
        telemetry: interpretation.telemetry,
        persist: interpretation.persist,
      });
    } catch (error) {
      return res.status(500).json({ error: safeErrorMessage(error), code: 'SPEAKING_ANALYZE_FAILED' });
    }
  };
}
