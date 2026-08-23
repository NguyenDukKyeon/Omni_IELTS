import { describe, expect, it } from 'vitest';
import { auditInteractiveSource, validateUxFlowContracts, type UxFlowContract } from '../uxFlowContracts';

const contract: UxFlowContract = {
  id: 'live-hub.refresh',
  module: 'live-hub',
  owner: 'ForecastLiveHub',
  precondition: 'Live Hub is visible',
  trigger: 'Learner requests a grounded refresh',
  expectedTransition: 'idle -> loading -> fresh|unavailable',
  sideEffect: 'POST /api/forecast/refresh and persist a verified snapshot',
  errorStates: ['quota_exhausted', 'network_failed'],
  evidence: ['e2e/live-hub.spec.ts'],
};

describe('validateUxFlowContracts', () => {
  it('rejects duplicate IDs and contracts without executable evidence', () => {
    const issues = validateUxFlowContracts([
      contract,
      { ...contract, evidence: [] },
    ]);

    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining('Duplicate flow id: live-hub.refresh'),
      expect.stringContaining('live-hub.refresh has no executable evidence'),
    ]));
  });
});

describe('auditInteractiveSource', () => {
  it('reports visible native controls that are not assigned to a UX flow', () => {
    const issues = auditInteractiveSource(
      '<div><button onClick={() => true}>Refresh</button><a href="/help">Help</a></div>',
      'src/components/Example.tsx',
      [contract],
    );

    expect(issues).toHaveLength(2);
    expect(issues[0]).toContain('button');
    expect(issues[1]).toContain('a');
  });

  it('accepts controls assigned to a registered flow and rejects unknown IDs', () => {
    expect(auditInteractiveSource(
      '<button data-ux-flow="live-hub.refresh" onClick={() => refresh()}>Refresh</button>',
      'src/components/Example.tsx',
      [contract],
    )).toEqual([]);

    expect(auditInteractiveSource(
      '<button data-ux-flow="missing.flow" onClick={() => refresh()}>Refresh</button>',
      'src/components/Example.tsx',
      [contract],
    )).toEqual([expect.stringContaining('unknown UX flow missing.flow')]);
  });

  it('rejects decorative CTAs that declare a flow but cannot trigger a transition', () => {
    expect(auditInteractiveSource(
      '<button data-ux-flow="live-hub.refresh">Refresh</button><a data-ux-flow="live-hub.refresh">Quota</a>',
      'src/components/Example.tsx',
      [contract],
    )).toEqual(expect.arrayContaining([
      expect.stringContaining('<button> has no action handler'),
      expect.stringContaining('<a> has no href'),
    ]));
  });

  it('rejects forms and editable fields without a state-changing handler', () => {
    expect(auditInteractiveSource(
      '<form data-ux-flow="live-hub.refresh"><input data-ux-flow="live-hub.refresh" /></form>',
      'src/components/Example.tsx',
      [contract],
    )).toEqual(expect.arrayContaining([
      expect.stringContaining('<form> has no submit handler'),
      expect.stringContaining('<input> has no change handler'),
    ]));
  });
});
