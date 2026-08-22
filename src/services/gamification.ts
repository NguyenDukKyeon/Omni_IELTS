import { UserProfile } from '../types';

export const XP_REWARDS = {
  VOCAB_REVIEW_CARD: 5,
  VOCAB_MASTERED: 25,
  SOURCE_INGESTED: 40,
  MISTAKE_REVIEWED: 10,
  GRAMMAR_EXERCISE: 15,
  SHADOWING_SENTENCE: 15,
  DICTATION_COMPLETED: 30,
  PRACTICE_COMPLETED: 50,
  MOCK_TEST_COMPLETED: 100,
  DIAGNOSTIC_COMPLETED: 80,
};

export function calculateLevel(totalXP: number): { level: number; currentLevelXP: number; nextLevelXP: number; progressPercent: number } {
  // Simple quadratic XP curve: Level N requires 100 * N^1.4 XP
  let level = 1;
  let xpThreshold = 0;
  let prevThreshold = 0;

  while (true) {
    const requiredForNext = Math.round(100 * Math.pow(level, 1.35));
    if (totalXP < xpThreshold + requiredForNext) {
      const currentLevelXP = totalXP - xpThreshold;
      const progressPercent = Math.min(100, Math.round((currentLevelXP / requiredForNext) * 100));
      return {
        level,
        currentLevelXP,
        nextLevelXP: requiredForNext,
        progressPercent,
      };
    }
    prevThreshold = xpThreshold;
    xpThreshold += requiredForNext;
    level += 1;
  }
}

export function updateStreak(profile: UserProfile): UserProfile {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastActiveStr = profile.lastActiveDate ? profile.lastActiveDate.split('T')[0] : '';

  if (lastActiveStr === todayStr) {
    return profile; // already active today
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = profile.streak;
  if (lastActiveStr === yesterdayStr) {
    newStreak += 1;
  } else if (!lastActiveStr) {
    newStreak = 1;
  } else {
    // missed days
    newStreak = 1;
  }

  return {
    ...profile,
    streak: newStreak,
    lastActiveDate: new Date().toISOString(),
  };
}
