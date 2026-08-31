import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourcesView } from '../../views/SourcesView';
import { resolveSourcesViewName } from '../sources/featureFlags';
import { UX_CONTROL_CONTRACTS, UX_FLOW_CONTRACTS } from '../uxFlowContracts';

describe('Sources route facade', () => {
  it('keeps the feature flag OFF on the legacy SourceIngestionView', () => {
    expect(resolveSourcesViewName()).toBe('SourceIngestionView');
    expect(resolveSourcesViewName(false)).toBe('SourceIngestionView');
  });

  it('routes to SourcesView only when the client flag is explicitly ON', () => {
    expect(resolveSourcesViewName(true)).toBe('SourcesView');
  });

  it('mounts the flag-on workspace with three desktop/mobile zones', () => {
    const html = renderToStaticMarkup(React.createElement(SourcesView));
    expect(html).toContain('data-ux-scope="sources-library-v2"');
    expect(html).toContain('Library');
    expect(html).toContain('Reader &amp; Chat');
    expect(html).toContain('Create');
    expect(html).toContain('data-ux-control="sources.view.tab-library"');
    expect(html).toContain('data-ux-control="sources.view.tab-reader"');
    expect(html).toContain('data-ux-control="sources.view.tab-create"');
  });

  it('does not bring legacy four-skill generation or learning side effects into SourcesView', () => {
    const source = readFileSync('src/views/SourcesView.tsx', 'utf8');
    expect(source).not.toMatch(/SourceToLearningPackageModal|awardXP|addVocabCard|bulkAddVocabCards|mastery|SkillEvidence|MistakeEvidence/);
    expect(source).not.toMatch(/initialSources|initialData/);
  });

  it('registers the Sources workspace tab controls', () => {
    expect(UX_FLOW_CONTRACTS.map((flow) => flow.id)).toContain('sources.view.tabs');
    expect(UX_CONTROL_CONTRACTS.map((control) => control.id)).toEqual(expect.arrayContaining([
      'sources.view.tab-library',
      'sources.view.tab-reader',
      'sources.view.tab-create',
    ]));
  });

  it('keeps App route mapping on the explicit client-safe facade resolver', () => {
    const source = readFileSync('src/App.tsx', 'utf8');
    expect(source).toContain('SourceIngestionView');
    expect(source).toContain('SourcesView');
    expect(source).toContain('resolveSourcesViewName');
  });
});
