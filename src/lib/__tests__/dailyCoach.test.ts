import { describe, expect, it } from 'vitest';
import { buildDailyCoachModel } from '../dailyCoach';

describe('Daily Coach', () => {
  it('returns one primary and two alternatives including manual module choice', () => {
    const model = buildDailyCoachModel({
      diagnosticComplete: true,
      dueMistakeIds: ['mistake-1', 'mistake-2'],
      dueVocabIds: ['vocab-1'],
      unfinishedPracticeId: 'practice-1',
    });

    expect(model.primary.destination).toBe('review_progress');
    expect(model.primary.evidenceRefs).toEqual(['mistake:mistake-1', 'mistake:mistake-2']);
    expect(model.alternatives).toHaveLength(2);
    expect(model.alternatives.some(({ kind }) => kind === 'manual_module')).toBe(true);
  });

  it('requests evidence instead of inventing progress when diagnostic is incomplete', () => {
    const model = buildDailyCoachModel({
      diagnosticComplete: false,
      dueMistakeIds: [],
      dueVocabIds: [],
    });
    expect(model.primary.kind).toBe('diagnostic');
    expect(model.primary.confidence).toBe('low');
    expect(model.primary.evidenceRefs).toEqual([]);
  });
});
