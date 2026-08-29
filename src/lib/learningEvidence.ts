export type LearningEvidenceClass = 'independent' | 'mock';
export type LearningEvidenceStatus = 'in_progress' | 'completed' | 'invalid';

export interface EvidenceClassifiable {
  evidenceClass?: LearningEvidenceClass;
  status?: LearningEvidenceStatus;
  scoreBand?: number;
  overallBand?: number;
  completedDate?: string;
}

export function isExplicitIndependentEvidence(item: EvidenceClassifiable): boolean {
  return item.evidenceClass === 'independent' && item.status === 'completed';
}

export function isExplicitMockEvidence(item: EvidenceClassifiable): boolean {
  return item.evidenceClass === 'mock' && item.status === 'completed';
}

export function isUnfinishedPracticeAttempt(item: EvidenceClassifiable): boolean {
  return item.status === 'in_progress';
}
