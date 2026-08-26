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

function assertNoKeyLeak(label, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if (serialized.includes(geminiKey) || /AIza[0-9A-Za-z_-]{8,}/.test(serialized)) {
    throw new Error(`${label} leaked a Gemini key.`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodePayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (payload instanceof Uint8Array) return new TextDecoder().decode(payload);
  if (ArrayBuffer.isView(payload)) return new TextDecoder().decode(payload);
  return String(payload);
}

function isAudioKind(rtc, kind) {
  return kind === rtc.TrackKind?.KIND_AUDIO || kind === 'audio' || kind === 1;
}

function synthesizeSpeechLikePcm(sampleRate, seconds) {
  const samples = new Int16Array(sampleRate * seconds);
  for (let index = 0; index < samples.length; index += 1) {
    const t = index / sampleRate;
    const syllable = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * t);
    const formant = Math.sin(2 * Math.PI * 220 * t) * 0.45
      + Math.sin(2 * Math.PI * 880 * t) * 0.25
      + Math.sin(2 * Math.PI * 1400 * t) * 0.15;
    samples[index] = Math.round(formant * syllable * 18_000);
  }
  return samples;
}

const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${canaryToken}`,
};

const created = await fetch(`${appBaseUrl}/api/livekit/session`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ consentStorage: false, voiceId: 'Puck' }),
  signal: AbortSignal.timeout(30_000),
});
const sessionPayload = await created.json().catch(() => ({}));
assertNoKeyLeak('session response', sessionPayload);
if (!created.ok) {
  throw new Error(`Live speaking canary failed to create a session: HTTP ${created.status}`);
}
if (sessionPayload.fallbackReason === 'quota_exhausted' || sessionPayload.session?.state === 'quota_exhausted') {
  throw new Error('Live speaking canary hit Gemini or LiveKit quota.');
}

if (forceFallback) {
  if (sessionPayload.session?.state !== 'fallback_turn_based') {
    throw new Error('Forced fallback canary expected fallback_turn_based after the provider was cut off.');
  }
  console.log(JSON.stringify({ status: 'ok', mode: 'forced_fallback', requestId: sessionPayload.requestId }));
} else {
  if (!sessionPayload.token || !sessionPayload.livekitUrl || !sessionPayload.session?.roomName) {
    throw new Error(`Live speaking canary did not receive a LiveKit token: ${sessionPayload.fallbackReason || sessionPayload.session?.state}`);
  }
  if (sessionPayload.session.voiceId !== 'Puck') {
    throw new Error(`Live speaking canary expected voiceId Puck, received ${sessionPayload.session.voiceId}`);
  }

  const { RoomServiceClient } = await import('livekit-server-sdk');
  const rooms = new RoomServiceClient(url, apiKey, apiSecret);
  const roomName = sessionPayload.session.roomName;
  const agentDeadline = Date.now() + 45_000;
  let agentIdentity = null;
  while (Date.now() < agentDeadline) {
    const participants = await rooms.listParticipants(roomName).catch(() => []);
    assertNoKeyLeak('participant list', participants);
    const agent = participants.find((participant) => {
      const identity = participant.identity || '';
      const name = participant.name || '';
      const kind = String(participant.kind || '');
      return /agent|examiner|omni-ielts/i.test(`${identity} ${name} ${kind}`) || kind === 'AGENT' || kind === '3';
    });
    if (agent) {
      agentIdentity = agent.identity;
      assertNoKeyLeak('agent metadata', agent.metadata || '');
      break;
    }
    await sleep(1000);
  }
  if (!agentIdentity) {
    throw new Error('Live speaking canary did not observe the LiveKit agent in the room.');
  }

  const rtc = await import('@livekit/rtc-node').catch((error) => {
    throw new Error(`Live speaking canary cannot import @livekit/rtc-node to publish a fixture. Refusing to fake a pass. ${error}`);
  });

  const room = new rtc.Room();
  const examinerFrames = [];
  const dataMessages = [];

  const consumeTrack = (track, participant) => {
    if (!isAudioKind(rtc, track?.kind)) return;
    if (!rtc.AudioStream) return;
    const stream = new rtc.AudioStream(track);
    void (async () => {
      try {
        for await (const event of stream) {
          const frame = event?.frame || event;
          examinerFrames.push({
            at: Date.now(),
            identity: participant?.identity,
            samples: frame?.samplesPerChannel || frame?.data?.length || 1,
          });
        }
      } catch {
        // room disconnect
      }
    })();
  };

  room.on(rtc.RoomEvent.TrackSubscribed, (track, publication, participant) => {
    consumeTrack(track, participant);
  });
  room.on(rtc.RoomEvent.DataReceived, (payload, participant) => {
    const text = decodePayload(payload);
    dataMessages.push({ at: Date.now(), text, identity: participant?.identity });
    assertNoKeyLeak('room data', text);
  });

  await room.connect(sessionPayload.livekitUrl, sessionPayload.token, { autoSubscribe: true });

  const examinerDeadline = Date.now() + 35_000;
  while (Date.now() < examinerDeadline && examinerFrames.length === 0 && dataMessages.length === 0) {
    await sleep(200);
  }
  if (!examinerFrames.length && !dataMessages.length) {
    await room.disconnect();
    throw new Error('Live speaking canary did not receive the first examiner audio/question.');
  }

  const quietDeadline = Date.now() + 8_000;
  let lastCount = examinerFrames.length;
  let lastAt = Date.now();
  while (Date.now() < quietDeadline) {
    await sleep(250);
    if (examinerFrames.length !== lastCount) {
      lastCount = examinerFrames.length;
      lastAt = Date.now();
    } else if (Date.now() - lastAt > 1500) {
      break;
    }
  }

  const sampleRate = 16_000;
  const source = new rtc.AudioSource(sampleRate, 1);
  const localTrack = rtc.LocalAudioTrack.createAudioTrack('microphone', source);
  let publishOptions;
  try {
    publishOptions = new rtc.TrackPublishOptions();
    if (rtc.TrackSource?.SOURCE_MICROPHONE !== undefined) {
      publishOptions.source = rtc.TrackSource.SOURCE_MICROPHONE;
    }
  } catch {
    publishOptions = rtc.TrackSource ? { source: rtc.TrackSource.SOURCE_MICROPHONE } : undefined;
  }
  await room.localParticipant.publishTrack(localTrack, publishOptions);

  const samples = synthesizeSpeechLikePcm(sampleRate, 2);
  const frameSize = 320;
  for (let offset = 0; offset < samples.length; offset += frameSize) {
    const slice = samples.subarray(offset, Math.min(samples.length, offset + frameSize));
    const frame = new rtc.AudioFrame(slice, sampleRate, 1, slice.length);
    await source.captureFrame(frame);
  }
  if (typeof source.waitForPlayout === 'function') {
    await source.waitForPlayout().catch(() => undefined);
  }

  const framesAfterLearner = examinerFrames.length;
  const dataAfterLearner = dataMessages.length;
  const learnerPublishedAt = Date.now();
  const replyDeadline = Date.now() + 30_000;
  while (Date.now() < replyDeadline) {
    const newAudio = examinerFrames.some((frame) => frame.at > learnerPublishedAt + 400);
    const newData = dataMessages.length > dataAfterLearner;
    if (newAudio || newData) break;
    await sleep(250);
  }
  const followUpAudio = examinerFrames.filter((frame) => frame.at > learnerPublishedAt + 400);
  const followUpData = dataMessages.slice(dataAfterLearner);
  await room.disconnect();
  if (!followUpAudio.length && !followUpData.length) {
    throw new Error('Live speaking canary did not receive an examiner follow-up after the learner audio fixture.');
  }
  if (examinerFrames.length <= framesAfterLearner && !followUpData.length && !followUpAudio.length) {
    throw new Error('Live speaking canary did not prove Examiner -> Learner -> Examiner.');
  }

  const cutoff = await fetch(`${appBaseUrl}/api/livekit/session/${sessionPayload.session.id}/provider-cutoff`, {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  const cutoffBody = await cutoff.json().catch(() => ({}));
  assertNoKeyLeak('cutoff response', cutoffBody);
  if (cutoffBody.session?.state !== 'fallback_turn_based') {
    throw new Error(`Intentional provider cutoff did not enter fallback_turn_based: ${cutoffBody.session?.state}`);
  }

  console.log(JSON.stringify({
    status: 'ok',
    mode: 'realtime',
    sessionId: sessionPayload.session.id,
    requestId: sessionPayload.requestId,
    voiceId: sessionPayload.session.voiceId,
    agentIdentity,
    examinerAudioFrames: examinerFrames.length,
    followUpAudioFrames: followUpAudio.length,
    dataMessages: dataMessages.length,
    cycle: 'Examiner -> Learner -> Examiner',
    fallbackAfterCutoff: true,
  }));
}
