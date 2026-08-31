import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DestinationPicker } from '../../components/sources/DestinationPicker';
import { ArtifactDraftPreview } from '../../components/sources/ArtifactDraftPreview';
import { ArtifactStudioModal } from '../../components/sources/ArtifactStudioModal';
import { UX_FLOW_CONTRACTS, UX_CONTROL_CONTRACTS } from '../uxFlowContracts';
import type { SourceRecord, SourceVersion } from '../../types/sources';
import type { DestinationHandoffResult } from '../sources/destinationHandoff';

const record: SourceRecord = {
  id: 'source-1',
  userId: 'learner-1',
  title: 'Urban heat islands',
  summary: 'A source about heat mitigation in cities.',
  type: 'text',
  collectionIds: [],
  tags: [],
  provenance: {
    originType: 'pasted_text',
    retrievalDate: '2026-08-31T00:00:00.000Z',
    rightsState: 'owned_by_learner',
    rawContentHash: 'hash-1',
    canonicalCitation: 'Urban heat islands',
    owningModule: 'sources',
  },
  currentVersionId: 'version-1',
  processingState: 'ready',
  lastUsedAt: '2026-08-31T00:00:00.000Z',
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

const version: SourceVersion = {
  id: 'version-1',
  sourceId: record.id,
  versionNumber: 1,
  stage: 'normalised',
  contentHash: 'hash-1',
  plainText: 'Cities retain heat.',
  blocks: [{ id: 'b_001', order: 1, type: 'paragraph', text: 'Cities retain heat.' }],
  wordCount: 3,
  createdAt: '2026-08-31T00:00:00.000Z',
};

const handoff: DestinationHandoffResult = {
  navigable: true,
  targetModule: 'practice',
  targetRoute: 'practice',
  draftId: 'draft-1',
  draftRef: { draftId: 'draft-1', destination: 'practice', sourceVersionId: 'version-1' },
  ctaPrimaryLabelVi: 'Open artifact',
  ctaSecondaryLabelVi: 'Create another output',
  autoRedirect: false,
  opensOnLearnerAction: true,
};

describe('Artifact Studio UI', () => {
  it('renders exactly five mutually exclusive radio destinations', () => {
    const html = renderToStaticMarkup(
      React.createElement(DestinationPicker, { selected: undefined, onSelect: () => undefined }),
    );
    expect((html.match(/role="radio"/g) || []).length).toBe(5);
    expect(html).toContain('data-ux-control="sources.artifact.destination-practice"');
    expect(html).toContain('data-ux-control="sources.artifact.destination-mock"');
    expect(html).toContain('data-ux-control="sources.artifact.destination-vocabulary"');
    expect(html).toContain('data-ux-control="sources.artifact.destination-note"');
    expect(html).toContain('data-ux-control="sources.artifact.destination-idea-bank"');
  });

  it('keeps Generate disabled until the source and one destination are usable', () => {
    const html = renderToStaticMarkup(
      React.createElement(ArtifactStudioModal, {
        isOpen: true,
        source: record,
        version,
        selectedSpan: undefined,
        onClose: () => undefined,
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('data-ux-control="sources.artifact.generate"');
    expect(html).toMatch(/disabled=""[^>]*data-ux-control="sources\.artifact\.generate"/);
  });

  it('renders handoff actions without auto-navigation or a fake draft', () => {
    const html = renderToStaticMarkup(
      React.createElement(ArtifactDraftPreview, {
        handoff,
        onOpen: () => undefined,
        onCreateAnother: () => undefined,
      }),
    );
    expect(html).toContain('data-ux-control="sources.artifact.open"');
    expect(html).toContain('data-ux-control="sources.artifact.create-another"');
    expect(html).not.toContain('data-auto-redirect="true"');
    expect(html).not.toContain('navigate(');
  });

  it('registers the five destination controls and dialog actions', () => {
    const flowIds = UX_FLOW_CONTRACTS.filter((flow) => flow.module === 'sources').map((flow) => flow.id);
    expect(flowIds).toEqual(expect.arrayContaining([
      'sources.artifact.generate',
      'sources.artifact.open',
      'sources.artifact.create-another',
    ]));
    expect(UX_CONTROL_CONTRACTS.map((control) => control.id)).toEqual(expect.arrayContaining([
      'sources.artifact.generate',
      'sources.artifact.open',
      'sources.artifact.create-another',
      'sources.artifact.close',
    ]));
  });

  it('does not import destination persistence or learning side effects', () => {
    const source = readFileSync('src/components/sources/ArtifactStudioModal.tsx', 'utf8');
    expect(source).not.toMatch(/SourceToLearningPackageModal|awardXP|addVocabCard|mastery|practiceAttempts/);
  });
});
