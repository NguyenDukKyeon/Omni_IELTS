import { describe, expect, it } from 'vitest';
import {
  IllegalSpeakingTransitionError,
  canTransitionSpeakingState,
  resumeStateAfterReconnect,
  transitionSpeakingState,
} from '../speakingStateMachine';

describe('speaking state machine', () => {
  it('allows the canonical Part 1 → Part 2 → Part 3 journey', () => {
    let state = transitionSpeakingState('idle', 'requesting_permission');
    state = transitionSpeakingState(state, 'connecting');
    state = transitionSpeakingState(state, 'part_1');
    state = transitionSpeakingState(state, 'part_2_preparation');
    state = transitionSpeakingState(state, 'part_2_speaking');
    state = transitionSpeakingState(state, 'part_3');
    state = transitionSpeakingState(state, 'finalizing');
    state = transitionSpeakingState(state, 'completed');
    expect(state).toBe('completed');
  });

  it('rejects illegal transitions', () => {
    expect(canTransitionSpeakingState('idle', 'part_3')).toBe(false);
    expect(() => transitionSpeakingState('part_1', 'completed')).toThrow(IllegalSpeakingTransitionError);
    expect(() => transitionSpeakingState('completed', 'part_1')).toThrow(/Illegal speaking transition/);
  });

  it('resumes the interrupted part after reconnect', () => {
    expect(resumeStateAfterReconnect('part_2_speaking')).toBe('part_2_speaking');
    expect(resumeStateAfterReconnect(null)).toBe('part_1');
    const lost = transitionSpeakingState('part_2_speaking', 'connection_lost');
    expect(transitionSpeakingState(lost, 'connecting')).toBe('connecting');
    expect(transitionSpeakingState(lost, 'part_2_speaking')).toBe('part_2_speaking');
    expect(transitionSpeakingState('fallback_turn_based', 'connection_lost')).toBe('connection_lost');
  });

  it('can enter honest turn-based fallback from provider failures', () => {
    expect(transitionSpeakingState('connecting', 'quota_exhausted')).toBe('quota_exhausted');
    expect(transitionSpeakingState('quota_exhausted', 'fallback_turn_based')).toBe('fallback_turn_based');
    expect(transitionSpeakingState('fallback_turn_based', 'part_1')).toBe('part_1');
  });
});
