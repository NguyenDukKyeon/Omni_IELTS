import { createMachine, transition } from 'xstate';

export type MockBuildState = 'draft' | 'generating' | 'validating' | 'repairing' | 'ready' | 'failed';
export type MockBuildEvent =
  | { type: 'START' }
  | { type: 'VALIDATE' }
  | { type: 'REPAIR' }
  | { type: 'READY' }
  | { type: 'FAIL' }
  | { type: 'RETRY' };

export const mockBuildMachine = createMachine({
  id: 'mockBuild',
  initial: 'draft',
  states: {
    draft: { on: { START: 'generating', FAIL: 'failed' } },
    generating: { on: { VALIDATE: 'validating', REPAIR: 'repairing', FAIL: 'failed' } },
    validating: { on: { START: 'generating', READY: 'ready', REPAIR: 'repairing', FAIL: 'failed' } },
    repairing: { on: { VALIDATE: 'validating', FAIL: 'failed' } },
    failed: { on: { RETRY: 'repairing' } },
    ready: { type: 'final' },
  },
});

export function transitionMockBuildState(state: MockBuildState, event: MockBuildEvent): MockBuildState {
  const current = mockBuildMachine.resolveState({ value: state, context: {} });
  const [next] = transition(mockBuildMachine, current, event);
  if (next.value === state) {
    throw new Error(`Invalid MockBuild transition: ${state} -> ${event.type}`);
  }
  return next.value as MockBuildState;
}
