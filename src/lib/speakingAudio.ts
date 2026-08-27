export interface RecordedTurnAudio {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  startedAtMs: number;
  endedAtMs: number;
  speechSegments: Array<{ start: number; end: number }> | null;
}

export interface ComposedSpeakingAudio {
  audioBase64: string | null;
  mimeType: string;
  durationSeconds: number;
  speechSegments: Array<{ start: number; end: number }> | null;
  acousticStatus: 'measured' | 'unavailable';
  decodedTurnCount: number;
  expectedTurnCount: number;
}

export function measuredDurationSeconds(startedAtMs: number, endedAtMs = performance.now()): number {
  return Math.max(0, Number(((endedAtMs - startedAtMs) / 1000).toFixed(3)));
}

export function totalTurnDurationSeconds(turns: Array<{ durationSeconds: number }>): number {
  return Number(turns.reduce((sum, turn) => sum + Math.max(0, turn.durationSeconds), 0).toFixed(3));
}

export function canonicalExamDurationSeconds(
  composed: Pick<ComposedSpeakingAudio, 'durationSeconds' | 'decodedTurnCount' | 'expectedTurnCount'>,
  recordedTurns: Array<{ durationSeconds: number }>,
): number {
  if (composed.expectedTurnCount > 0 && composed.decodedTurnCount === composed.expectedTurnCount) {
    return composed.durationSeconds;
  }
  return totalTurnDurationSeconds(recordedTurns);
}

export function offsetSpeechSegments(
  turns: Array<{ durationSeconds: number; speechSegments: Array<{ start: number; end: number }> | null }>,
): Array<{ start: number; end: number }> | null {
  if (!turns.length || turns.some((turn) => !turn.speechSegments?.length)) return null;
  const segments: Array<{ start: number; end: number }> = [];
  let offset = 0;
  for (const turn of turns) {
    for (const segment of turn.speechSegments || []) {
      segments.push({
        start: Number((segment.start + offset).toFixed(3)),
        end: Number((segment.end + offset).toFixed(3)),
      });
    }
    offset += turn.durationSeconds;
  }
  return segments.length ? segments : null;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function encodePcm16Wav(samples: Int16Array, sampleRate: number): Uint8Array {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  for (let index = 0; index < samples.length; index += 1) {
    view.setInt16(44 + index * 2, samples[index], true);
  }
  return new Uint8Array(buffer);
}

export function decodeWavPcm16(bytes: Uint8Array): {
  samples: Int16Array;
  sampleRate: number;
  durationSeconds: number;
} | null {
  if (bytes.length < 44) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WAVE') return null;
  let offset = 12;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let channels = 0;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= bytes.length) {
    const id = readAscii(view, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (id === 'fmt ') {
      const format = view.getUint16(start, true);
      channels = view.getUint16(start + 2, true);
      sampleRate = view.getUint32(start + 4, true);
      bitsPerSample = view.getUint16(start + 14, true);
      if (format !== 1 || channels !== 1 || bitsPerSample !== 16) return null;
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
  return {
    samples,
    sampleRate,
    durationSeconds: Number((frameCount / sampleRate).toFixed(3)),
  };
}

export function measureSpeechSegmentsFromPcm(
  samples: ArrayLike<number>,
  sampleRate: number,
  threshold = 0.02,
): { durationSeconds: number; speechSegments: Array<{ start: number; end: number }> | null } {
  const durationSeconds = Number((samples.length / sampleRate).toFixed(3));
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.03));
  const segments: Array<{ start: number; end: number }> = [];
  let speaking = false;
  let start = 0;
  const normalize = (value: number) => (Math.abs(value) > 1 ? value / 32768 : value);
  for (let offset = 0; offset < samples.length; offset += windowSize) {
    let sum = 0;
    const end = Math.min(samples.length, offset + windowSize);
    for (let index = offset; index < end; index += 1) {
      const sample = normalize(samples[index]);
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / (end - offset));
    const time = offset / sampleRate;
    if (rms > threshold) {
      if (!speaking) {
        speaking = true;
        start = time;
      }
    } else if (speaking) {
      speaking = false;
      segments.push({ start: Number(start.toFixed(3)), end: Number(time.toFixed(3)) });
    }
  }
  if (speaking) {
    segments.push({ start: Number(start.toFixed(3)), end: durationSeconds });
  }
  return { durationSeconds, speechSegments: segments.length ? segments : null };
}

export async function decodeTurnPcm(blob: Blob): Promise<{
  samples: Float32Array;
  sampleRate: number;
  durationSeconds: number;
} | null> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const wav = decodeWavPcm16(bytes);
  if (wav) {
    const samples = new Float32Array(wav.samples.length);
    for (let index = 0; index < wav.samples.length; index += 1) {
      samples[index] = wav.samples[index] / 32768;
    }
    return { samples, sampleRate: wav.sampleRate, durationSeconds: wav.durationSeconds };
  }
  if (typeof AudioContext === 'undefined') return null;
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const channel = buffer.getChannelData(0);
    return {
      samples: new Float32Array(channel),
      sampleRate: buffer.sampleRate,
      durationSeconds: Number(buffer.duration.toFixed(3)),
    };
  } catch {
    return null;
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function measureSpeechSegmentsFromBlob(blob: Blob): Promise<{
  durationSeconds: number;
  speechSegments: Array<{ start: number; end: number }> | null;
}> {
  const decoded = await decodeTurnPcm(blob);
  if (!decoded) return { durationSeconds: 0, speechSegments: null };
  return measureSpeechSegmentsFromPcm(decoded.samples, decoded.sampleRate);
}

export async function composeSpeakingTurnsForAnalysis(turns: RecordedTurnAudio[]): Promise<ComposedSpeakingAudio> {
  const wallClockDuration = totalTurnDurationSeconds(turns);
  if (!turns.length) {
    return {
      audioBase64: null,
      mimeType: 'audio/wav',
      durationSeconds: 0,
      speechSegments: null,
      acousticStatus: 'unavailable',
      decodedTurnCount: 0,
      expectedTurnCount: 0,
    };
  }

  const decoded: Array<{ samples: Float32Array; sampleRate: number; durationSeconds: number }> = [];
  for (const turn of turns) {
    const pcm = await decodeTurnPcm(turn.blob);
    if (!pcm) {
      return {
        audioBase64: null,
        mimeType: 'audio/wav',
        durationSeconds: wallClockDuration,
        speechSegments: null,
        acousticStatus: 'unavailable',
        decodedTurnCount: decoded.length,
        expectedTurnCount: turns.length,
      };
    }
    decoded.push(pcm);
  }

  const sampleRate = decoded[0].sampleRate;
  if (decoded.some((turn) => turn.sampleRate !== sampleRate)) {
    return {
      audioBase64: null,
      mimeType: 'audio/wav',
      durationSeconds: wallClockDuration,
      speechSegments: null,
      acousticStatus: 'unavailable',
      decodedTurnCount: decoded.length,
      expectedTurnCount: turns.length,
    };
  }

  const totalSamples = decoded.reduce((sum, turn) => sum + turn.samples.length, 0);
  const combined = new Float32Array(totalSamples);
  let offset = 0;
  for (const turn of decoded) {
    combined.set(turn.samples, offset);
    offset += turn.samples.length;
  }
  const int16 = new Int16Array(combined.length);
  for (let index = 0; index < combined.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, combined[index]));
    int16[index] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
  }
  const wav = encodePcm16Wav(int16, sampleRate);
  const durationSeconds = Number((combined.length / sampleRate).toFixed(3));
  const measured = measureSpeechSegmentsFromPcm(combined, sampleRate);
  const offsetSegments = offsetSpeechSegments(decoded.map((turn) => ({
    durationSeconds: turn.durationSeconds,
    speechSegments: measureSpeechSegmentsFromPcm(turn.samples, turn.sampleRate).speechSegments,
  })));
  const speechSegments = measured.speechSegments || offsetSegments;

  return {
    audioBase64: bytesToBase64(wav),
    mimeType: 'audio/wav',
    durationSeconds,
    speechSegments,
    acousticStatus: speechSegments?.length ? 'measured' : 'unavailable',
    decodedTurnCount: decoded.length,
    expectedTurnCount: turns.length,
  };
}

export function releaseMedia(stream?: MediaStream | null, recorder?: MediaRecorder | null) {
  recorder?.stream.getTracks().forEach((track) => track.stop());
  stream?.getTracks().forEach((track) => track.stop());
}

export function releaseObjectUrl(url?: string | null) {
  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function readAscii(view: DataView, offset: number, length: number): string {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }
  return value;
}
