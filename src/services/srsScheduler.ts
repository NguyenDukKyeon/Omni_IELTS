import { VocabCard, MistakeEntry } from '../types';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'; // 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)

export interface SRSItemResult {
  srsStage: number; // 0..5
  intervalDays: number;
  nextReviewDate: string;
  easeFactor: number;
  repetitions: number;
  mastered: boolean;
}

/**
 * SuperMemo SM-2 / Leitner Hybrid Engine
 * Used uniformly across Vocabulary, Mistakes, and Grammar topics.
 */
export function calculateNextSRS(
  currentStage: number,
  currentInterval: number,
  currentEaseFactor: number = 2.5,
  currentRepetitions: number = 0,
  rating: ReviewRating
): SRSItemResult {
  let stage = currentStage;
  let interval = currentInterval;
  let ef = currentEaseFactor;
  let reps = currentRepetitions;

  const now = new Date();

  switch (rating) {
    case 'again':
      // Reset or drop stage
      stage = Math.max(0, stage - 1);
      interval = 1;
      reps = 0;
      ef = Math.max(1.3, ef - 0.2);
      break;

    case 'hard':
      // Keep stage or minor step
      interval = Math.max(1, Math.round(interval * 1.2));
      ef = Math.max(1.3, ef - 0.15);
      reps += 1;
      break;

    case 'good':
      // Normal progression
      stage = Math.min(5, stage + 1);
      reps += 1;
      if (reps === 1) {
        interval = 1;
      } else if (reps === 2) {
        interval = 3;
      } else {
        interval = Math.round(interval * ef);
      }
      break;

    case 'easy':
      // Accelerated progression
      stage = Math.min(5, stage + 2);
      reps += 1;
      ef = Math.min(3.0, ef + 0.15);
      if (reps === 1) {
        interval = 3;
      } else if (reps === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * ef * 1.3);
      }
      break;
  }

  // Calculate next review date
  const nextDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    srsStage: stage,
    intervalDays: interval,
    nextReviewDate: nextDate.toISOString(),
    easeFactor: Number(ef.toFixed(2)),
    repetitions: reps,
    mastered: stage >= 5,
  };
}

/**
 * Filter items that are due for review (scheduled for today or overdue)
 */
export function isDueForReview(nextReviewDateStr: string): boolean {
  if (!nextReviewDateStr) return true;
  const targetDate = new Date(nextReviewDateStr);
  const now = new Date();
  // Set target to end of today to include all due today
  return targetDate.getTime() <= now.getTime();
}

export function getDueVocabCards(cards: VocabCard[]): VocabCard[] {
  return cards.filter((card) => !card.mastered && isDueForReview(card.nextReviewDate));
}

export function getDueMistakes(mistakes: MistakeEntry[]): MistakeEntry[] {
  return mistakes.filter((m) => !m.mastered && isDueForReview(m.nextReviewDate));
}
