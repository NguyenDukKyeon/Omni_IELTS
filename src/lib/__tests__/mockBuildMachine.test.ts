import { describe, expect, it } from 'vitest';
import { transitionMockBuildState } from '../mockBuildMachine';

describe('mock build state machine', () => {
  it('follows the staged happy path', () => {
    let state = transitionMockBuildState('draft', { type: 'START' });
    state = transitionMockBuildState(state, { type: 'VALIDATE' });
    state = transitionMockBuildState(state, { type: 'READY' });
    expect(state).toBe('ready');
  });

  it('allows a failed skill to enter repair and return to validation', () => {
    let state = transitionMockBuildState('generating', { type: 'FAIL' });
    state = transitionMockBuildState(state, { type: 'RETRY' });
    state = transitionMockBuildState(state, { type: 'VALIDATE' });
    expect(state).toBe('validating');
  });

  it('rejects impossible transitions instead of silently changing state', () => {
    expect(() => transitionMockBuildState('draft', { type: 'READY' })).toThrow(/Invalid MockBuild transition/);
  });
});
