import { describe, expect, it } from 'vitest';
import { calculatePartTrend, calculateSpeakingTelemetry } from '../speakingTelemetry';

const FIXTURE = {
  transcript: 'Um I think public transport is useful and I use it every day.',
  durationSeconds: 10,
  speechSegments: [
    { start: 0, end: 2 },
    { start: 4, end: 7 },
    { start: 8.5, end: 10 },
  ],
};

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
    expect(metrics.speechRatio).toBeNull();
    expect(metrics.acousticStatus).toBe('unavailable');
  });

  it('computes deterministic speech and pause metrics from a VAD fixture within zero error', () => {
    const metrics = calculateSpeakingTelemetry(FIXTURE);
    expect(metrics.speechRatio).toBeCloseTo(0.65, 5);
    expect(metrics.silentPauses).toHaveLength(2);
    expect(metrics.longPauses).toBe(1);
    expect(metrics.fillerCount).toBe(1);
    expect(metrics.acousticStatus).toBe('measured');
    expect(metrics.rawWpm).toBe(78);
  });

  it('builds Part 1/2/3 trends without inventing acoustic values', () => {
    const part1 = calculatePartTrend({
      part: 'part_1',
      transcript: 'I live in a small city.',
      durationSeconds: 5,
      speechSegments: [{ start: 0, end: 5 }],
    });
    const part2 = calculatePartTrend({
      part: 'part_2',
      transcript: 'There is a park near my house.',
      durationSeconds: 8,
      speechSegments: null,
    });
    expect(part1.acousticStatus).toBe('measured');
    expect(part2.acousticStatus).toBe('unavailable');
    expect(part2.speechRatio).toBeNull();
  });
});
