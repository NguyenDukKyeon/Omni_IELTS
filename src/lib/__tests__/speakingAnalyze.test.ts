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

  it('uses canonical totalDurationSeconds 5.5s from two turns, not 11s', () => {
    const result = interpretSpeakingAnalyzeRequest({
      fullAudioBase64: 'A'.repeat(80),
      conversationHistory: [
        { part: 'part_1', userTranscript: 'My hometown is quiet', durationSeconds: 2 },
        { part: 'part_1', userTranscript: 'It is a coastal city', durationSeconds: 3.5 },
      ],
      totalDurationSeconds: 5.5,
      speechSegments: [{ start: 0, end: 1.6 }, { start: 2.1, end: 4.9 }],
      consentStorage: false,
    });
    expect(result.ok).toBe(true);
    expect(result.request?.totalDurationSeconds).toBe(5.5);
    expect(result.telemetry.rawWpm).toBe(Math.round((9 / 5.5) * 60));
    expect(result.persist).toBe(false);

    const doubled = interpretSpeakingAnalyzeRequest({
      fullAudioBase64: 'A'.repeat(80),
      conversationHistory: [
        { part: 'part_1', userTranscript: 'My hometown is quiet', durationSeconds: 2 },
        { part: 'part_1', userTranscript: 'It is a coastal city', durationSeconds: 3.5 },
      ],
      totalDurationSeconds: 11,
      speechSegments: [{ start: 0, end: 1.6 }, { start: 2.1, end: 4.9 }],
      consentStorage: false,
    });
    expect(doubled.telemetry.rawWpm).toBe(Math.round((9 / 11) * 60));
    expect(result.telemetry.rawWpm).toBeGreaterThan(doubled.telemetry.rawWpm);
  });
});
