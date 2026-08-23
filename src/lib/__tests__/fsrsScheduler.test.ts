import { describe, expect, it } from 'vitest';
import { migrateLegacySrsCard, scheduleFsrsReview } from '../../services/srsScheduler';

describe('FSRS scheduler migration', () => {
  it('preserves a legacy card review history and due date', () => {
    const due = '2026-09-01T00:00:00.000Z';
    const migrated = migrateLegacySrsCard({
      srsStage: 3,
      intervalDays: 7,
      nextReviewDate: due,
      easeFactor: 2.5,
      repetitions: 3,
      lastReviewedDate: '2026-08-25T00:00:00.000Z',
    });

    expect(migrated.due).toBe(due);
    expect(migrated.reps).toBe(3);
    expect(migrated.scheduledDays).toBe(7);
    expect(migrated.version).toBe('fsrs-6');
  });

  it('schedules deterministically from persisted FSRS memory state', () => {
    const now = new Date('2026-08-23T12:00:00.000Z');
    const legacy = {
      srsStage: 3,
      intervalDays: 7,
      nextReviewDate: now.toISOString(),
      easeFactor: 2.5,
      repetitions: 3,
      lastReviewedDate: '2026-08-16T12:00:00.000Z',
    };

    const result = scheduleFsrsReview(legacy, 'good', now);

    expect(result.fsrs.version).toBe('fsrs-6');
    expect(result.repetitions).toBeGreaterThan(legacy.repetitions);
    expect(new Date(result.nextReviewDate).getTime()).toBeGreaterThan(now.getTime());
    expect(result.intervalDays).toBeGreaterThan(0);
  });

  it('gives Easy a later due date than Good for the same review card', () => {
    const now = new Date('2026-08-23T12:00:00.000Z');
    const legacy = {
      srsStage: 4,
      intervalDays: 14,
      nextReviewDate: now.toISOString(),
      easeFactor: 2.5,
      repetitions: 5,
      lastReviewedDate: '2026-08-09T12:00:00.000Z',
    };

    const good = scheduleFsrsReview(legacy, 'good', now);
    const easy = scheduleFsrsReview(legacy, 'easy', now);

    expect(new Date(easy.nextReviewDate).getTime()).toBeGreaterThan(new Date(good.nextReviewDate).getTime());
  });

  it('continues from persisted FSRS memory instead of remigrating legacy fields', () => {
    const firstReview = new Date('2026-08-23T12:00:00.000Z');
    const first = scheduleFsrsReview({
      srsStage: 2,
      intervalDays: 3,
      nextReviewDate: firstReview.toISOString(),
      easeFactor: 2.5,
      repetitions: 2,
      lastReviewedDate: '2026-08-20T12:00:00.000Z',
    }, 'good', firstReview);
    const secondReview = new Date(first.nextReviewDate);
    const second = scheduleFsrsReview({ ...first, lastReviewedDate: firstReview.toISOString() }, 'good', secondReview);

    expect(second.fsrs.reps).toBe(first.fsrs.reps + 1);
    expect(second.fsrs.stability).toBeGreaterThan(first.fsrs.stability);
  });

  it('rejects corrupted persisted FSRS state and safely remigrates legacy progress', () => {
    const migrated = migrateLegacySrsCard({
      srsStage: 2,
      intervalDays: 3,
      nextReviewDate: '2026-08-26T00:00:00.000Z',
      easeFactor: 2.5,
      repetitions: 2,
      fsrs: {
        version: 'fsrs-6',
        due: 'not-a-date',
        stability: -10,
        difficulty: 99,
        elapsedDays: 0,
        scheduledDays: 0,
        learningSteps: 0,
        reps: 0,
        lapses: 0,
        state: 2,
      },
    });

    expect(migrated.due).toBe('2026-08-26T00:00:00.000Z');
    expect(migrated.stability).toBe(3);
    expect(migrated.reps).toBe(2);
  });
});
