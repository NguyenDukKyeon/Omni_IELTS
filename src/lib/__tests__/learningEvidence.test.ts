import { describe, expect, it } from 'vitest';
import {
  isExplicitIndependentEvidence,
  isExplicitMockEvidence,
  isUnfinishedPracticeAttempt,
} from '../learningEvidence';

describe('learning evidence classification', () => {
  it('does not label an ordinary AI-scored attempt as Independent evidence', () => {
    const scoredAttempt = {
      scoreBand: 6.5,
      taskType: 'Writing Task 2',
      skill: 'writing',
    };
    expect(isExplicitIndependentEvidence(scoredAttempt)).toBe(false);
  });

  it('requires explicit independent class and completed status', () => {
    expect(isExplicitIndependentEvidence({
      scoreBand: 6.5,
      evidenceClass: 'independent',
      status: 'completed',
    })).toBe(true);
    expect(isExplicitIndependentEvidence({
      scoreBand: 6.5,
      evidenceClass: 'independent',
      status: 'in_progress',
    })).toBe(false);
  });

  it('does not treat numeric Mock bands or a completedDate alone as valid Mock evidence', () => {
    const scoredMock = {
      overallBand: 5.5,
      listeningBand: 6,
      completedDate: '2026-08-18T10:00:00Z',
    };
    expect(isExplicitMockEvidence(scoredMock)).toBe(false);
    expect(isExplicitMockEvidence({
      overallBand: 5.5,
      evidenceClass: 'mock',
      status: 'completed',
    })).toBe(true);
  });

  it('treats only explicit in-progress status as an unfinished attempt', () => {
    expect(isUnfinishedPracticeAttempt({ scoreBand: 6.5 })).toBe(false);
    expect(isUnfinishedPracticeAttempt({ scoreBand: 6.5, status: 'completed' })).toBe(false);
    expect(isUnfinishedPracticeAttempt({ status: 'in_progress' })).toBe(true);
  });
});
