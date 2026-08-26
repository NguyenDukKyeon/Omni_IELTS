import { describe, expect, it } from 'vitest';
import {
  concatenateTurnAudio,
  measuredDurationSeconds,
  measureSpeechSegmentsFromBlob,
  type RecordedTurnAudio,
} from '../speakingAudio';

describe('speaking audio helpers', () => {
  it('measures duration from real timestamps instead of a hard-coded 20s', () => {
    expect(measuredDurationSeconds(1_000, 2_450)).toBe(1.45);
    expect(measuredDurationSeconds(5_000, 5_000)).toBe(0);
  });

  it('concatenates every recorded turn in order for fullAudio payloads', async () => {
    const turns: RecordedTurnAudio[] = [
      {
        blob: new Blob(['aaaa'], { type: 'audio/webm' }),
        mimeType: 'audio/webm',
        durationSeconds: 1.2,
        startedAtMs: 0,
        endedAtMs: 1200,
        speechSegments: [{ start: 0, end: 1.2 }],
      },
      {
        blob: new Blob(['bbbb'], { type: 'audio/webm' }),
        mimeType: 'audio/webm',
        durationSeconds: 2.4,
        startedAtMs: 1200,
        endedAtMs: 3600,
        speechSegments: null,
      },
    ];
    const combined = await concatenateTurnAudio(turns);
    expect(combined).not.toBeNull();
    expect(combined?.mimeType).toBe('audio/webm');
    expect(await combined?.blob.text()).toBe('aaaabbbb');
    expect(await concatenateTurnAudio([])).toBeNull();
  });

  it('returns unavailable VAD segments when AudioContext cannot decode the blob', async () => {
    const measured = await measureSpeechSegmentsFromBlob(new Blob(['not-audio'], { type: 'audio/webm' }));
    expect(measured.speechSegments).toBeNull();
  });
});
