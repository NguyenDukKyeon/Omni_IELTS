import { describe, expect, it } from 'vitest';
import {
  auditInteractiveSource,
  auditMigratedControlScope,
  validateUxControlContracts,
  validateUxFlowContracts,
  type UxControlContract,
  type UxFlowContract,
} from '../uxFlowContracts';

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

const control: UxControlContract = {
  id: 'shell.nav.sources',
  flowId: 'app.navigation',
  owner: 'AppShell',
  preconditions: ['shell visible'],
  action: 'activate Sources',
  beforeState: 'dashboard',
  afterState: 'sources',
  sideEffects: ['set active module'],
  failureCategories: ['route_unavailable'],
  recoveryActions: ['return to dashboard'],
  evidence: ['e2e/app-shell-redesign.spec.ts'],
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

describe('validateUxControlContracts', () => {
  it('requires unique control contracts and executable evidence', () => {
    const unmentionedControl = { ...control, evidence: ['e2e/app-navigation.spec.ts'] };
    const issues = validateUxControlContracts([unmentionedControl, unmentionedControl]);

    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining('Duplicate control id: shell.nav.sources'),
      expect.stringContaining('shell.nav.sources evidence does not mention control id'),
    ]));
  });

  it('rejects missing flows, transitions, evidence files, and evidence mentions', () => {
    const issues = validateUxControlContracts([
      {
        ...control,
        id: 'shell.invalid-flow',
        flowId: 'missing.flow',
        beforeState: '',
        afterState: '',
        evidence: ['e2e/does-not-exist.spec.ts'],
      },
      {
        ...control,
        id: 'shell.unmentioned',
        evidence: ['e2e/app-navigation.spec.ts'],
      },
    ]);

    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining('shell.invalid-flow references unknown UX flow missing.flow'),
      expect.stringContaining('shell.invalid-flow has no before state'),
      expect.stringContaining('shell.invalid-flow has no after state'),
      expect.stringContaining('shell.invalid-flow evidence is missing'),
      expect.stringContaining('shell.unmentioned evidence does not mention control id'),
    ]));
  });
});

describe('auditMigratedControlScope', () => {
  it('requires literal, registered control IDs inside app-shell-v2', () => {
    const issues = auditMigratedControlScope(
      '<nav data-ux-scope="app-shell-v2">'
        + '<button data-ux-flow="app.navigation" onClick={() => go()}>Missing</button>'
        + '<button data-ux-flow="app.navigation" data-ux-control={controlId} onClick={() => go()}>Dynamic</button>'
        + '<button data-ux-flow="app.navigation" data-ux-control="shell.unknown" onClick={() => go()}>Unknown</button>'
        + '</nav>',
      'src/components/shell/Test.tsx',
      [control],
    );

    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining('missing data-ux-control'),
      expect.stringContaining('must use a literal data-ux-control id'),
      expect.stringContaining('unknown UX control shell.unknown'),
    ]));
  });

  it('rejects duplicate and decorative controls inside the migrated scope', () => {
    const issues = auditMigratedControlScope(
      '<nav data-ux-scope="app-shell-v2">'
        + '<button data-ux-flow="app.navigation" data-ux-control="shell.nav.sources" onClick={() => go()}>First</button>'
        + '<button data-ux-flow="app.navigation" data-ux-control="shell.nav.sources">Duplicate</button>'
        + '<button data-ux-flow="app.navigation" data-ux-control="shell.nav.sources" onClick={() => undefined}>Decorative</button>'
        + '</nav>',
      'src/components/shell/Test.tsx',
      [control],
    );

    expect(issues).toEqual(expect.arrayContaining([
      expect.stringContaining('Duplicate data-ux-control "shell.nav.sources"'),
      expect.stringContaining('has no action handler or submit transition'),
      expect.stringContaining('has a decorative or no-op transition'),
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
