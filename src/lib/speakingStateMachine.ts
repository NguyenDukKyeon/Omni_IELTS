import {
  SPEAKING_SESSION_STATES,
  type SpeakingExamPart,
  type SpeakingSessionState,
} from './speakingRealtimeTypes';

export class IllegalSpeakingTransitionError extends Error {
  readonly from: SpeakingSessionState;
  readonly to: SpeakingSessionState;

  constructor(from: SpeakingSessionState, to: SpeakingSessionState) {
    super(`Illegal speaking transition: ${from} -> ${to}`);
    this.name = 'IllegalSpeakingTransitionError';
    this.from = from;
    this.to = to;
  }
}

const NEXT: Record<SpeakingSessionState, readonly SpeakingSessionState[]> = {
  idle: ['requesting_permission', 'fallback_turn_based', 'failed'],
  requesting_permission: ['connecting', 'permission_denied', 'fallback_turn_based', 'failed'],
  connecting: [
    'part_1',
    'part_2_preparation',
    'part_2_speaking',
    'part_3',
    'connection_lost',
    'provider_unavailable',
    'quota_exhausted',
    'fallback_turn_based',
    'failed',
  ],
  part_1: [
    'part_2_preparation',
    'connection_lost',
    'provider_unavailable',
    'quota_exhausted',
    'fallback_turn_based',
    'finalizing',
    'failed',
  ],
  part_2_preparation: [
    'part_2_speaking',
    'connection_lost',
    'provider_unavailable',
    'quota_exhausted',
    'fallback_turn_based',
    'failed',
  ],
  part_2_speaking: [
    'part_3',
    'connection_lost',
    'provider_unavailable',
    'quota_exhausted',
    'fallback_turn_based',
    'failed',
  ],
  part_3: [
    'finalizing',
    'connection_lost',
    'provider_unavailable',
    'quota_exhausted',
    'fallback_turn_based',
    'failed',
  ],
  finalizing: ['completed', 'failed', 'fallback_turn_based'],
  completed: ['idle'],
  permission_denied: ['requesting_permission', 'fallback_turn_based', 'idle', 'failed'],
  connection_lost: [
    'connecting',
    'fallback_turn_based',
    'part_1',
    'part_2_preparation',
    'part_2_speaking',
    'part_3',
    'failed',
  ],
  provider_unavailable: ['connecting', 'fallback_turn_based', 'failed'],
  quota_exhausted: ['fallback_turn_based', 'failed', 'idle'],
  fallback_turn_based: [
    'part_1',
    'part_2_preparation',
    'part_2_speaking',
    'part_3',
    'finalizing',
    'completed',
    'connection_lost',
    'failed',
    'idle',
  ],
  failed: ['idle', 'fallback_turn_based'],
};

export const SPEAKING_PART_ORDER: SpeakingExamPart[] = [
  'part_1',
  'part_2_preparation',
  'part_2_speaking',
  'part_3',
];

export function isSpeakingSessionState(value: string): value is SpeakingSessionState {
  return (SPEAKING_SESSION_STATES as readonly string[]).includes(value);
}

export function canTransitionSpeakingState(
  from: SpeakingSessionState,
  to: SpeakingSessionState,
): boolean {
  return NEXT[from].includes(to);
}

export function transitionSpeakingState(
  from: SpeakingSessionState,
  to: SpeakingSessionState,
): SpeakingSessionState {
  if (!canTransitionSpeakingState(from, to)) {
    throw new IllegalSpeakingTransitionError(from, to);
  }
  return to;
}

export function examPartFromState(state: SpeakingSessionState): SpeakingExamPart | null {
  if (
    state === 'part_1'
    || state === 'part_2_preparation'
    || state === 'part_2_speaking'
    || state === 'part_3'
  ) {
    return state;
  }
  return null;
}

export function resumeStateAfterReconnect(currentPart: SpeakingExamPart | null): SpeakingSessionState {
  return currentPart ?? 'part_1';
}

export function nextExamPart(part: SpeakingExamPart): SpeakingExamPart | 'finalizing' {
  const index = SPEAKING_PART_ORDER.indexOf(part);
  if (index < 0 || index === SPEAKING_PART_ORDER.length - 1) return 'finalizing';
  return SPEAKING_PART_ORDER[index + 1];
}

export function mapTurnBasedStageToState(
  stage: 'welcome' | 'part1' | 'part2_prep' | 'part2_speak' | 'part3' | 'evaluating' | 'score_report',
): SpeakingSessionState {
  switch (stage) {
    case 'welcome':
      return 'idle';
    case 'part1':
      return 'part_1';
    case 'part2_prep':
      return 'part_2_preparation';
    case 'part2_speak':
      return 'part_2_speaking';
    case 'part3':
      return 'part_3';
    case 'evaluating':
      return 'finalizing';
    case 'score_report':
      return 'completed';
    default:
      return 'failed';
  }
}

export function bargeInAllowed(state: SpeakingSessionState): boolean {
  return state === 'part_1' || state === 'part_3';
}
