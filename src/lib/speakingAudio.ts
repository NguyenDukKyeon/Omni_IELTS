export interface RecordedTurnAudio {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  startedAtMs: number;
  endedAtMs: number;
  speechSegments: Array<{ start: number; end: number }> | null;
}

export function measuredDurationSeconds(startedAtMs: number, endedAtMs = performance.now()): number {
  return Math.max(0, Number(((endedAtMs - startedAtMs) / 1000).toFixed(3)));
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export async function concatenateTurnAudio(turns: RecordedTurnAudio[]): Promise<{ blob: Blob; mimeType: string } | null> {
  if (!turns.length) return null;
  const mimeType = turns[0].mimeType || 'audio/webm';
  return { blob: new Blob(turns.map((turn) => turn.blob), { type: mimeType }), mimeType };
}

export async function measureSpeechSegmentsFromBlob(blob: Blob): Promise<{
  durationSeconds: number;
  speechSegments: Array<{ start: number; end: number }> | null;
}> {
  if (typeof AudioContext === 'undefined') {
    return { durationSeconds: 0, speechSegments: null };
  }
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const durationSeconds = Number(buffer.duration.toFixed(3));
    const samples = buffer.getChannelData(0);
    const windowSize = Math.max(1, Math.floor(buffer.sampleRate * 0.03));
    const segments: Array<{ start: number; end: number }> = [];
    let speaking = false;
    let start = 0;
    for (let offset = 0; offset < samples.length; offset += windowSize) {
      let sum = 0;
      const end = Math.min(samples.length, offset + windowSize);
      for (let index = offset; index < end; index += 1) sum += samples[index] * samples[index];
      const rms = Math.sqrt(sum / (end - offset));
      const time = offset / buffer.sampleRate;
      if (rms > 0.02) {
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
  } catch {
    return { durationSeconds: 0, speechSegments: null };
  } finally {
    await context.close().catch(() => undefined);
  }
}

export function releaseMedia(stream?: MediaStream | null, recorder?: MediaRecorder | null) {
  recorder?.stream.getTracks().forEach((track) => track.stop());
  stream?.getTracks().forEach((track) => track.stop());
}
