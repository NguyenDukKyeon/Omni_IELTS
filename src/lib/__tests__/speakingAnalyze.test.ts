import { describe, expect, it } from 'vitest';
import { interpretSpeakingAnalyzeRequest } from '../speakingAnalyze';

describe('speaking analyze contract', () => {
  it('marks acoustic metrics unavailable when audio is missing', () => {
    const result = interpretSpeakingAnalyzeRequest({
      conversationHistory: [{ part: 'part_1', userTranscript: 'I like buses', durationSeconds: 8 }],
      totalDurationSeconds: 8,
      consentStorage: false,
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe('AUDIO_REQUIRED');
    expect(result.telemetry.acousticStatus).toBe('unavailable');
    expect(result.telemetry.longPauses).toBeNull();
    expect(result.telemetry.articulationRate).toBeNull();
    expect(result.persist).toBe(false);
  });

  it('allows persistence only when consent is true and audio exists', () => {
    const result = interpretSpeakingAnalyzeRequest({
      fullAudioBase64: 'A'.repeat(80),
      conversationHistory: [{ part: 'part_1', userTranscript: 'Public transport is useful every day', durationSeconds: 10 }],
      totalDurationSeconds: 10,
      speechSegments: [{ start: 0, end: 4 }, { start: 6, end: 10 }],
      consentStorage: true,
    });
    expect(result.ok).toBe(true);
    expect(result.persist).toBe(true);
    expect(result.telemetry.acousticStatus).toBe('measured');
  });
});
