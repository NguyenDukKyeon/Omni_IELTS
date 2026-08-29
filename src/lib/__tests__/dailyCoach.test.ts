import { describe, expect, it } from 'vitest';
import { buildDailyCoachModel, type DailyCoachModel } from '../dailyCoach';

function actionIds(model: DailyCoachModel): string[] {
  return [model.primary.id, model.alternatives[0].id, model.alternatives[1].id];
}

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

  it('keeps three unique action IDs when diagnostic is complete and nothing is due', () => {
    const model = buildDailyCoachModel({
      diagnosticComplete: true,
      dueMistakeIds: [],
      dueVocabIds: [],
    });
    const ids = actionIds(model);
    expect(new Set(ids).size).toBe(3);
    expect(model.primary.id).not.toBe(model.alternatives[0].id);
    expect(model.alternatives.some(({ kind }) => kind === 'manual_module')).toBe(true);
    expect(model.primary.kind).not.toBe('resume');
  });

  it('uses an unfinished attempt only when an in-progress id is supplied', () => {
    const withUnfinished = buildDailyCoachModel({
      diagnosticComplete: true,
      dueMistakeIds: [],
      dueVocabIds: [],
      unfinishedPracticeId: 'att-open',
    });
    expect(withUnfinished.primary.kind).toBe('resume');
    expect(withUnfinished.primary.evidenceRefs).toEqual(['attempt:att-open']);

    const completedOnly = buildDailyCoachModel({
      diagnosticComplete: true,
      dueMistakeIds: [],
      dueVocabIds: [],
    });
    expect(completedOnly.primary.kind).not.toBe('resume');
    expect(
      [completedOnly.primary, ...completedOnly.alternatives].some(({ kind }) => kind === 'resume'),
    ).toBe(false);
  });

  it('always includes unique IDs and a manual module alternative', () => {
    const fixtures = [
      { diagnosticComplete: true, dueMistakeIds: ['m1'], dueVocabIds: ['v1'], unfinishedPracticeId: 'p1' },
      { diagnosticComplete: true, dueMistakeIds: [], dueVocabIds: [], unfinishedPracticeId: 'p1' },
      { diagnosticComplete: true, dueMistakeIds: [], dueVocabIds: [] },
      { diagnosticComplete: false, dueMistakeIds: [], dueVocabIds: [] },
    ];
    for (const input of fixtures) {
      const model = buildDailyCoachModel(input);
      expect(new Set(actionIds(model)).size).toBe(3);
      expect(model.alternatives.some(({ kind }) => kind === 'manual_module')).toBe(true);
    }
  });
});
