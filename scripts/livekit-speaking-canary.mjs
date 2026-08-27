import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { ensureLivekitSpeakingStack, resolveSpeakingStackTarget } from './ensure-livekit-speaking-stack.mjs';

dotenv.config({ quiet: true });

const url = process.env.LIVEKIT_URL?.trim();
const apiKey = process.env.LIVEKIT_API_KEY?.trim();
const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
const geminiKey = process.env.GEMINI_API_KEY?.trim();
const canaryToken = process.env.OMNI_SPEAKING_CANARY_TOKEN?.trim();
const forceFallback = process.env.OMNI_SPEAKING_CANARY_FORCE_FALLBACK === 'true';

if (!url || !apiKey || !apiSecret || !geminiKey || !canaryToken) {
  throw new Error('LiveKit speaking canary is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, GEMINI_API_KEY, and OMNI_SPEAKING_CANARY_TOKEN. Refusing to fake a pass.');
}

if (process.env.OMNI_SPEAKING_CANARY_SKIP_STACK !== 'true') {
  await ensureLivekitSpeakingStack(process.env);
}

const appBaseUrl = resolveSpeakingStackTarget(process.env).appBaseUrl;

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

function decodeWavPcm16(bytes) {
  if (bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset, length) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE') return null;
  let offset = 12;
  let sampleRate = 0;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= bytes.length) {
    const id = ascii(offset, 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (id === 'fmt ') {
      if (view.getUint16(start, true) !== 1 || view.getUint16(start + 2, true) !== 1 || view.getUint16(start + 14, true) !== 16) {
        return null;
      }
      sampleRate = view.getUint32(start + 4, true);
    } else if (id === 'data') {
      dataOffset = start;
      dataSize = size;
      break;
    }
    offset = start + size + (size % 2);
  }
  if (dataOffset < 0 || !sampleRate) return null;
  const frameCount = Math.floor(Math.min(dataSize, bytes.length - dataOffset) / 2);
  const samples = new Int16Array(frameCount);
  for (let index = 0; index < frameCount; index += 1) {
    samples[index] = view.getInt16(dataOffset + index * 2, true);
  }
  return { samples, sampleRate, durationSeconds: samples.length / sampleRate };
}

const fixturePath = fileURLToPath(new URL('./fixtures/speaking-canary-hometown.wav', import.meta.url));
if (!existsSync(fixturePath)) {
  throw new Error(`Speaking canary fixture is missing at ${fixturePath}. Refusing to fake a pass.`);
}
const fixture = decodeWavPcm16(new Uint8Array(readFileSync(fixturePath)));
if (!fixture || fixture.samples.length < 16_000 || fixture.durationSeconds < 1) {
  throw new Error('Speaking canary fixture is not a 16-bit mono PCM WAV of intelligible English. Refusing to fake a pass.');
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
      if (/AIza|geminiApiKey|apiKey/i.test(agent.metadata || '')) {
        throw new Error('Agent metadata leaked a provider key.');
      }
      break;
    }
    await sleep(1000);
  }
  if (!agentIdentity) {
    throw new Error('Live speaking canary did not observe the LiveKit agent in the room. Refusing to fake a pass.');
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
    throw new Error('Live speaking canary did not receive the first examiner audio/question. Refusing to fake a pass.');
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

  const source = new rtc.AudioSource(fixture.sampleRate, 1);
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

  const frameSize = Math.floor(fixture.sampleRate / 50);
  let learnerAudioFrames = 0;
  for (let offset = 0; offset < fixture.samples.length; offset += frameSize) {
    const slice = fixture.samples.subarray(offset, Math.min(fixture.samples.length, offset + frameSize));
    const frame = new rtc.AudioFrame(slice, fixture.sampleRate, 1, slice.length);
    await source.captureFrame(frame);
    learnerAudioFrames += 1;
  }
  if (typeof source.waitForPlayout === 'function') {
    await source.waitForPlayout().catch(() => undefined);
  }
  const learnerAudioBytes = fixture.samples.byteLength;
  if (learnerAudioFrames <= 0 || learnerAudioBytes <= 0) {
    await room.disconnect();
    throw new Error('Live speaking canary published no learner audio. Refusing to fake a pass.');
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
    throw new Error('Live speaking canary did not receive an examiner follow-up after the learner audio fixture. Refusing to fake a pass.');
  }
  if (examinerFrames.length <= framesAfterLearner && !followUpData.length && !followUpAudio.length) {
    throw new Error('Live speaking canary did not prove Examiner -> Learner -> Examiner. Refusing to fake a pass.');
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
    fixture: path.basename(fixturePath),
    fixtureTranscript: 'My hometown is a quiet coastal city.',
    agentIdentity,
    examinerAudioFrames: examinerFrames.length,
    learnerAudioFrames,
    learnerAudioBytes,
    followUpAudioFrames: followUpAudio.length,
    followUpDataMessages: followUpData.length,
    dataMessages: dataMessages.length,
    cycle: 'Examiner -> Learner -> Examiner',
    fallbackAfterCutoff: true,
  }));
}
