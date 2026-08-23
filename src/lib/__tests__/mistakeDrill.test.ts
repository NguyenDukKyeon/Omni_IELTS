import { describe, expect, it } from 'vitest';
import { isAcceptedAnswer, selectDueMistakes, transitionMistakeLifecycle } from '../mistakeDrill';

const mistake = {
  id: 'm1',
  correctedText: 'Had governments invested earlier, emissions would have fallen.',
  acceptedAnswers: ['Had governments invested earlier emissions would have fallen'],
  nextReviewDate: '2026-08-20T00:00:00.000Z',
  mastered: false,
  lifecycle: 'active' as const,
  srsStage: 2,
};

describe('mistake drill correctness', () => {
  it('accepts canonical answers and declared variants only', () => {
    expect(isAcceptedAnswer(mistake.correctedText, mistake.correctedText, mistake.acceptedAnswers)).toBe(true);
    expect(isAcceptedAnswer(mistake.acceptedAnswers[0], mistake.correctedText, mistake.acceptedAnswers)).toBe(true);
    expect(isAcceptedAnswer('emissions', mistake.correctedText, mistake.acceptedAnswers)).toBe(false);
  });

  it('queues only mistakes that are due and active/relapsed', () => {
    const future = { ...mistake, id: 'future', nextReviewDate: '2026-09-01T00:00:00.000Z' };
    const archived = { ...mistake, id: 'archived', lifecycle: 'archived' as const };
    expect(selectDueMistakes([mistake, future, archived], new Date('2026-08-23T00:00:00.000Z')).map((m) => m.id)).toEqual(['m1']);
  });

  it('archives stage-five mistakes and reopens recurring taxonomies', () => {
    expect(transitionMistakeLifecycle({ ...mistake, srsStage: 5, mastered: true }, 'reviewed-correct').lifecycle).toBe('archived');
    const relapsed = transitionMistakeLifecycle({ ...mistake, lifecycle: 'archived', srsStage: 5, mastered: true }, 'taxonomy-recurred');
    expect(relapsed.lifecycle).toBe('relapsed');
    expect(relapsed.mastered).toBe(false);
    expect(relapsed.srsStage).toBeLessThan(5);
  });
});
