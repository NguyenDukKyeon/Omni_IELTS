import type { FullMockTestPackage, MockExamSkill } from '../types';

export type PersistedMockAttemptSnapshot = {
  package: FullMockTestPackage;
  mockBuildId: string;
  attemptId: string;
  currentSkill: MockExamSkill;
  currentQuestionNumber: number;
  activeSubIndex: number;
  timeRemainingSeconds: number;
  totalTimeSpentSeconds: number;
  listeningAnswers: Record<number, string>;
  readingAnswers: Record<number, string>;
  writingAnswers: { task1: string; task2: string };
  speakingAnswers: {
    part1Answers: Array<{ question: string; transcript: string }>;
    part2Transcript: string;
    part2Notes: string;
    part3Answers: Array<{ question: string; transcript: string }>;
  };
  flaggedListening: number[];
  flaggedReading: number[];
  savedAt: string;
};

const SKILL_TIME_SECONDS: Record<MockExamSkill, number> = {
  listening: 2400, reading: 3600, writing: 3600, speaking: 900,
};

export function createInitialMockAttemptSnapshot(
  pkg: FullMockTestPackage,
  startSkill: MockExamSkill = 'listening',
  attemptId = `attempt_${pkg.id}_${Date.now()}`,
): PersistedMockAttemptSnapshot {
  return {
    package: pkg,
    mockBuildId: pkg.id,
    attemptId,
    currentSkill: startSkill,
    currentQuestionNumber: 1,
    activeSubIndex: 0,
    timeRemainingSeconds: SKILL_TIME_SECONDS[startSkill],
    totalTimeSpentSeconds: 0,
    listeningAnswers: {},
    readingAnswers: {},
    writingAnswers: { task1: '', task2: '' },
    speakingAnswers: { part1Answers: [], part2Transcript: '', part2Notes: '', part3Answers: [] },
    flaggedListening: [],
    flaggedReading: [],
    savedAt: new Date().toISOString(),
  };
}

export function persistInitialMockAttempt(
  storage: Pick<Storage, 'setItem'>,
  pkg: FullMockTestPackage,
  startSkill: MockExamSkill = 'listening',
  attemptId?: string,
): PersistedMockAttemptSnapshot {
  const snapshot = createInitialMockAttemptSnapshot(pkg, startSkill, attemptId);
  storage.setItem('omni_active_mock_build', JSON.stringify(snapshot));
  return snapshot;
}
