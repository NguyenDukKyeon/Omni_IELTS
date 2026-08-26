import { buildExaminerInstructions, buildPartOpeningInstruction, GEMINI_LIVE_MODEL } from '../lib/speakingRealtimePrompt';
import type { SpeakingSessionState } from '../lib/speakingRealtimeTypes';

export interface AgentJobMetadata {
  sessionId: string;
  credentialId: string;
  voiceId?: string;
  requestId?: string;
}

export async function redeemGeminiKey(input: {
  redeemUrl: string;
  agentSecret: string;
  credentialId: string;
  sessionId: string;
  fetchImpl?: typeof fetch;
}): Promise<{ apiKey: string; model: string }> {
  const fetchFn = input.fetchImpl ?? fetch;
  const response = await fetchFn(input.redeemUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${input.agentSecret}`,
    },
    body: JSON.stringify({
      credentialId: input.credentialId,
      sessionId: input.sessionId,
    }),
  });
  const payload = await response.json().catch(() => ({})) as { apiKey?: string; model?: string; error?: string };
  if (!response.ok || !payload.apiKey) {
    throw new Error('Provider credential is not redeemable');
  }
  return {
    apiKey: payload.apiKey,
    model: payload.model || GEMINI_LIVE_MODEL,
  };
}

export function parseAgentJobMetadata(raw: string | undefined): AgentJobMetadata {
  if (!raw) throw new Error('Missing agent job metadata');
  const parsed = JSON.parse(raw) as AgentJobMetadata;
  if (!parsed.sessionId || !parsed.credentialId) {
    throw new Error('Agent job metadata is incomplete');
  }
  if ('apiKey' in (parsed as object) || 'geminiApiKey' in (parsed as object)) {
    throw new Error('Agent job metadata must not contain provider keys');
  }
  return parsed;
}

export function resolveAgentRuntime(env: NodeJS.ProcessEnv) {
  return {
    redeemUrl: (env.OMNI_AGENT_REDEEM_URL || `http://127.0.0.1:${env.PORT || 3000}/api/livekit/credentials/redeem`).replace(/\/$/, ''),
    agentSecret: env.LIVEKIT_AGENT_INTERNAL_SECRET || env.LIVEKIT_API_SECRET || '',
    model: env.GEMINI_LIVE_MODEL || GEMINI_LIVE_MODEL,
  };
}

export function examinerDataMessage(state: SpeakingSessionState) {
  return JSON.stringify({
    type: 'exam_state',
    state,
    instruction: buildPartOpeningInstruction(state),
  });
}

async function runWorker() {
  const runtime = resolveAgentRuntime(process.env);
  if (!runtime.agentSecret) {
    console.error('[omni-speaking-agent] LIVEKIT_AGENT_INTERNAL_SECRET or LIVEKIT_API_SECRET is required');
    process.exit(1);
  }

  const agents = await import('@livekit/agents');
  const google = await import('@livekit/agents-plugin-google');

  const worker = agents.defineAgent({
    entry: async (ctx) => {
      await ctx.connect();
      const metadata = parseAgentJobMetadata(ctx.job.metadata);
      const redeemed = await redeemGeminiKey({
        redeemUrl: runtime.redeemUrl,
        agentSecret: runtime.agentSecret,
        credentialId: metadata.credentialId,
        sessionId: metadata.sessionId,
      });

      const session = new agents.voice.AgentSession({
        llm: new google.beta.realtime.RealtimeModel({
          model: redeemed.model,
          voice: metadata.voiceId || 'Kore',
          temperature: 0.7,
          instructions: buildExaminerInstructions({ voiceId: metadata.voiceId, state: 'part_1' }),
          apiKey: redeemed.apiKey,
        }),
      });

      await session.start({
        agent: new agents.voice.Agent({
          instructions: buildExaminerInstructions({ voiceId: metadata.voiceId, state: 'part_1' }),
        }),
        room: ctx.room,
      });
      await session.generateReply({
        instructions: buildPartOpeningInstruction('part_1'),
      });
    },
  });

  agents.cli.runApp(new agents.ServerOptions({
    agent: import.meta.url,
    agentName: process.env.LIVEKIT_AGENT_NAME || 'omni-ielts-speaking-examiner',
  }));

  return worker;
}

const isDirect = process.argv[1] && process.argv[1].includes('livekitSpeakingAgent');
if (isDirect) {
  void runWorker();
}
