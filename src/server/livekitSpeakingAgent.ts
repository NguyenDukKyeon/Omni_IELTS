import {
  buildExaminerInstructions,
  buildPartOpeningInstruction,
  GEMINI_LIVE_MODEL,
} from '../lib/speakingRealtimePrompt';
import {
  bargeInAllowedForPart,
  encodeExamDataMessage,
  nextQuestionIndexAfterAnswer,
  PART_2_PREP_SECONDS,
  PART_2_SPEAK_SECONDS,
  questionForPart,
  resolveGeminiLiveVoiceId,
  type ExamAgentEvent,
} from '../lib/speakingExamProtocol';
import type { SpeakingExamPart, SpeakingSessionState } from '../lib/speakingRealtimeTypes';
import { examPartFromState } from '../lib/speakingStateMachine';

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
  const port = env.PORT || env.PLAYWRIGHT_LIVE_PORT || 3000;
  const base = (env.OMNI_CANARY_BASE_URL || env.PLAYWRIGHT_LIVE_BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, '');
  return {
    redeemUrl: (env.OMNI_AGENT_REDEEM_URL || `${base}/api/livekit/credentials/redeem`).replace(/\/$/, ''),
    eventUrl: (env.OMNI_AGENT_EVENT_URL || `${base}/api/livekit/session`).replace(/\/$/, ''),
    agentSecret: env.LIVEKIT_AGENT_INTERNAL_SECRET || env.LIVEKIT_API_SECRET || '',
    model: env.GEMINI_LIVE_MODEL || GEMINI_LIVE_MODEL,
  };
}

export function examinerDataMessage(state: SpeakingSessionState, extras?: {
  questionIndex?: number;
  question?: string;
}) {
  return encodeExamDataMessage({
    type: 'exam_state',
    state,
    questionIndex: extras?.questionIndex,
    question: extras?.question,
    instruction: buildPartOpeningInstruction(state),
  });
}

export async function reportAgentState(input: {
  eventUrl: string;
  agentSecret: string;
  sessionId: string;
  event: ExamAgentEvent;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const fetchFn = input.fetchImpl ?? fetch;
  await fetchFn(`${input.eventUrl}/${encodeURIComponent(input.sessionId)}/agent-event`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${input.agentSecret}`,
    },
    body: JSON.stringify(input.event),
  });
}

async function runWorker() {
  const runtime = resolveAgentRuntime(process.env);
  if (!runtime.agentSecret) {
    process.stderr.write('[omni-speaking-agent] LIVEKIT_AGENT_INTERNAL_SECRET or LIVEKIT_API_SECRET is required\n');
    process.exit(1);
  }

  process.stdout.write(`[omni-speaking-agent] redeemUrl=${runtime.redeemUrl}\n`);
  if (/AIza|geminiApiKey/i.test(runtime.redeemUrl)) {
    process.stderr.write('[omni-speaking-agent] redeem URL must not contain a provider key\n');
    process.exit(1);
  }

  const agents = await import('@livekit/agents');
  const google = await import('@livekit/agents-plugin-google');

  agents.defineAgent({
    entry: async (ctx) => {
      await ctx.connect();
      const metadata = parseAgentJobMetadata(ctx.job.metadata);
      const voiceId = resolveGeminiLiveVoiceId(metadata.voiceId);
      const redeemed = await redeemGeminiKey({
        redeemUrl: runtime.redeemUrl,
        agentSecret: runtime.agentSecret,
        credentialId: metadata.credentialId,
        sessionId: metadata.sessionId,
      });

      let examState: SpeakingSessionState = 'part_1';
      let questionIndex = 0;
      const cueCardIndex = 0;
      let advancing = false;

      const publishState = async (state: SpeakingSessionState, index = questionIndex) => {
        examState = state;
        questionIndex = index;
        const part = examPartFromState(state);
        const question = part ? questionForPart(part, index, cueCardIndex) : undefined;
        const payload = examinerDataMessage(state, { questionIndex: index, question });
        await ctx.room.localParticipant?.publishData(new TextEncoder().encode(payload), { reliable: true });
        await reportAgentState({
          eventUrl: runtime.eventUrl,
          agentSecret: runtime.agentSecret,
          sessionId: metadata.sessionId,
          event: { type: 'exam_state', state, questionIndex: index, question },
        }).catch(() => undefined);
      };

      const session = new agents.voice.AgentSession({
        llm: new google.beta.realtime.RealtimeModel({
          model: redeemed.model,
          voice: voiceId,
          temperature: 0.7,
          instructions: buildExaminerInstructions({ voiceId, state: 'part_1' }),
          apiKey: redeemed.apiKey,
        }),
      });

      await session.start({
        agent: new agents.voice.Agent({
          instructions: buildExaminerInstructions({ voiceId, state: 'part_1' }),
        }),
        room: ctx.room,
      });

      await publishState('part_1', 0);
      await session.generateReply({
        instructions: buildPartOpeningInstruction('part_1'),
      });

      const onSessionEvent = session.on.bind(session) as (
        event: string,
        listener: (event: { isFinal?: boolean }) => void,
      ) => void;
      onSessionEvent('user_input_transcribed', (event) => {
        if (!event.isFinal || advancing) return;
        const part = examPartFromState(examState);
        if (!part || !bargeInAllowedForPart(part)) return;
        const next = nextQuestionIndexAfterAnswer(part, questionIndex);
        advancing = true;
        void (async () => {
          try {
            if (next.nextPart === 'finalizing') {
              await publishState('finalizing', 0);
              await session.generateReply({ instructions: 'Thank the candidate briefly and end the exam. Do not announce a band score.' });
              return;
            }
            if (next.nextPart === 'part_2_preparation') {
              await publishState('part_2_preparation', 0);
              await session.generateReply({ instructions: buildPartOpeningInstruction('part_2_preparation') });
              await new Promise((resolve) => setTimeout(resolve, PART_2_PREP_SECONDS * 1000));
              await publishState('part_2_speaking', 0);
              await session.generateReply({ instructions: buildPartOpeningInstruction('part_2_speaking') });
              await new Promise((resolve) => setTimeout(resolve, PART_2_SPEAK_SECONDS * 1000));
              await publishState('part_3', 0);
              await session.generateReply({ instructions: buildPartOpeningInstruction('part_3') });
              return;
            }
            await publishState(next.nextPart, next.nextIndex);
            const question = questionForPart(next.nextPart as SpeakingExamPart, next.nextIndex, cueCardIndex);
            await session.generateReply({
              instructions: `Ask this single question and wait: ${question}`,
            });
          } finally {
            advancing = false;
          }
        })().catch(() => {
          advancing = false;
        });
      });
    },
  });

  agents.cli.runApp(new agents.ServerOptions({
    agent: import.meta.url,
    agentName: process.env.LIVEKIT_AGENT_NAME || 'omni-ielts-speaking-examiner',
  }));
}

const isDirect = process.argv[1] && process.argv[1].includes('livekitSpeakingAgent');
if (isDirect) {
  void runWorker();
}
