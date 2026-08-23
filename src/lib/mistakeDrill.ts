export type MistakeLifecycle = 'active' | 'due' | 'mastered' | 'archived' | 'relapsed';

export interface DrillMistakeLike {
  id: string;
  correctedText: string;
  acceptedAnswers?: string[];
  nextReviewDate: string;
  mastered: boolean;
  lifecycle?: MistakeLifecycle;
  srsStage: number;
}
const canonicalize = (value: string) => value
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[\p{P}\p{S}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function isAcceptedAnswer(
  userInput: string,
  canonicalAnswer: string,
  acceptedVariants: string[] = [],
): boolean {
  const normalizedInput = canonicalize(userInput);
  if (!normalizedInput) return false;
  return [canonicalAnswer, ...acceptedVariants].some(
    (answer) => canonicalize(answer) === normalizedInput,
  );
}

export function selectDueMistakes<T extends DrillMistakeLike>(mistakes: T[], now = new Date()): T[] {
  return mistakes
    .filter((mistake) => {
      const lifecycle = mistake.lifecycle ?? (mistake.mastered ? 'archived' : 'active');
      return ['active', 'due', 'relapsed'].includes(lifecycle)
        && !mistake.mastered
        && new Date(mistake.nextReviewDate).getTime() <= now.getTime();
    })
    .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
}

export function transitionMistakeLifecycle<T extends DrillMistakeLike>(
  mistake: T,
  event: 'reviewed-correct' | 'taxonomy-recurred',
): T & { lifecycle: MistakeLifecycle } {
  if (event === 'taxonomy-recurred') {
    return {
      ...mistake,
      lifecycle: 'relapsed',
      mastered: false,
      srsStage: Math.min(3, Math.max(1, mistake.srsStage - 2)),
      nextReviewDate: new Date().toISOString(),
    };
  }
  if (mistake.mastered || mistake.srsStage >= 5) {
    return { ...mistake, lifecycle: 'archived', mastered: true };
  }
  return { ...mistake, lifecycle: 'active' };
}
