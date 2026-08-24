import { describe, expect, it } from 'vitest';
import { finalizeMediaShadowingEvaluation, parseMediaShadowingEvaluation } from '../mediaShadowingEvaluation';

describe('parseMediaShadowingEvaluation', () => {
  it('accepts a complete audio-backed evaluation', () => {
    const result = parseMediaShadowingEvaluation({
      overallScore: 82,
      fluencyScore: 79,
      intonationScore: 84,
      accuracyScore: 81,
      feedbackVi: 'Nhịp câu khá tự nhiên.',
      swallowedWords: ['worked'],
      stressHighlights: [{ word: 'important', isCorrect: true, tip: 'Giữ trọng âm âm tiết thứ hai.' }],
      actionableAdvice: 'Lặp lại câu ở tốc độ 0.9x.',
    });

    expect(result.overallScore).toBe(82);
    expect(result.swallowedWords).toEqual(['worked']);
  });

  it('rejects incomplete or out-of-range scores instead of fabricating defaults', () => {
    expect(() => parseMediaShadowingEvaluation({ overallScore: 90 })).toThrow();
    expect(() => parseMediaShadowingEvaluation({
      overallScore: 120,
      fluencyScore: 80,
      intonationScore: 80,
      accuracyScore: 80,
      feedbackVi: 'Không hợp lệ',
    })).toThrow();
  });

  it('attaches deterministic VAD telemetry without asking AI to invent pauses', () => {
    const result = finalizeMediaShadowingEvaluation({
      overallScore: 82,
      fluencyScore: 79,
      intonationScore: 84,
      accuracyScore: 81,
      feedbackVi: 'Nhịp câu khá tự nhiên.',
    }, {
      transcript: 'Public transport is important for everyone.',
      durationSeconds: 4,
      speechSegments: [{ start: 0.2, end: 1.8 }, { start: 2.2, end: 3.8 }],
    });

    expect(result.acousticStatus).toBe('measured');
    expect(result.telemetry.acousticStatus).toBe('measured');
    expect(result.telemetry.speechRatio).toBe(0.8);
    expect(result.telemetry.silentPauses).toEqual([{ start: 1.8, end: 2.2, duration: 0.4 }]);
  });
});
