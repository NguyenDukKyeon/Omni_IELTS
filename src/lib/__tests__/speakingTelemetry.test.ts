import { describe, expect, it } from 'vitest';
import { calculateSpeakingTelemetry } from '../speakingTelemetry';

describe('calculateSpeakingTelemetry', () => {
  it('returns unavailable acoustic metrics without real audio segments', () => {
    const metrics = calculateSpeakingTelemetry({
      transcript: 'I think public transport is useful.',
      durationSeconds: 10,
      speechSegments: null,
    });
    expect(metrics.rawWpm).toBe(36);
    expect(metrics.articulationRate).toBeNull();
    expect(metrics.longPauses).toBeNull();
    expect(metrics.acousticStatus).toBe('unavailable');
  });

  it('computes deterministic speech and pause metrics from VAD segments', () => {
    const metrics = calculateSpeakingTelemetry({
      transcript: 'Um I think public transport is useful and I use it every day.',
      durationSeconds: 10,
      speechSegments: [
        { start: 0, end: 2 },
        { start: 4, end: 7 },
        { start: 8.5, end: 10 },
      ],
    });
    expect(metrics.speechRatio).toBeCloseTo(0.65);
    expect(metrics.silentPauses).toHaveLength(2);
    expect(metrics.longPauses).toBe(1);
    expect(metrics.fillerCount).toBe(1);
    expect(metrics.acousticStatus).toBe('measured');
  });
});
