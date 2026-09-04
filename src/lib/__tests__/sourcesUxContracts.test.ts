import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourceCard } from '../../components/sources/SourceCard';
import { SourcesFilterBar } from '../../components/sources/SourcesFilterBar';
import { SourcesLibraryExplorer } from '../../components/sources/SourcesLibraryExplorer';
import { UX_FLOW_CONTRACTS, UX_CONTROL_CONTRACTS } from '../uxFlowContracts';
import type { SourceRecord } from '../../types/sources';

const source: SourceRecord = {
  id: 'source-1',
  userId: 'learner-1',
  title: 'Urban heat islands',
  summary: 'A text-layer source about heat mitigation in cities.',
  type: 'pdf',
  collectionIds: ['collection-1'],
  tags: ['cities'],
  provenance: {
    originType: 'user_upload',
    originalFilename: 'urban-heat.pdf',
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

const sourceControlIds = [
  'sources.library.search-input',
  'sources.library.filter-format',
  'sources.library.filter-rights',
  'sources.library.filter-sort',
  'sources.library.filter-collection',
  'sources.library.select-toggle',
  'sources.library.open-source',
  'sources.library.retry',
  'sources.import.open',
  'sources.import.empty-cta',
  'sources.import.sign-in',
  'sources.artifact.open-modal',
  'sources.reader.select-span',
  'sources.reader.version-history',
  'sources.reader.version-select',
  'sources.reader.edit-open',
  'sources.reader.edit-form',
  'sources.reader.edit-text',
  'sources.reader.edit-save',
  'sources.reader.edit-cancel',
  'sources.chat.send',
  'sources.chat.web-research',
  'sources.chat.citation-open',
  'sources.chat.citation-close',
  'sources.chat.composer',
  'sources.chat.question-input',
  'sources.chat.retry',
  'sources.chat.research-retry',
  'sources.chat.web-result',
  'sources.reader.retry',
  'sources.artifact.close',
  'sources.artifact.form',
  'sources.artifact.generate',
  'sources.artifact.destination-practice',
  'sources.artifact.destination-mock',
  'sources.artifact.destination-vocabulary',
  'sources.artifact.destination-note',
  'sources.artifact.destination-idea-bank',
  'sources.artifact.retry',
  'sources.artifact.target-band',
  'sources.artifact.custom-instruction',
  'sources.artifact.open',
  'sources.artifact.create-another',
  'sources.view.tab-library',
  'sources.view.tab-reader',
  'sources.view.tab-create',
  'sources.view.open-create',
  'sources.collection.create-button',
  'sources.collection.form',
  'sources.collection.name-input',
  'sources.collection.save-button',
  'sources.collection.cancel-button',
  'sources.collection.all',
  'sources.collection.select',
  'sources.import.close',
  'sources.import.form',
  'sources.import.queue-add',
  'sources.import.title',
  'sources.import.type',
  'sources.import.paste-text',
  'sources.import.url',
  'sources.import.pdf',
  'sources.import.docx',
  'sources.import.vtt',
  'sources.import.youtube',
  'sources.import.submit',
  'sources.import.retry',
  'sources.import.queue-retry',
  'sources.import.queue-remove',
];

describe('Sources Library Explorer UX contracts', () => {
  it('registers the P03 library and collection flows with executable evidence', () => {
    const flowIds = UX_FLOW_CONTRACTS.filter((flow) => flow.module === 'sources').map((flow) => flow.id);
    expect(flowIds).toEqual(expect.arrayContaining([
      'sources.manage',
      'sources.library.filter',
      'sources.selection.toggle',
      'sources.collection.create',
    ]));
    expect(UX_CONTROL_CONTRACTS.map((control) => control.id)).toEqual(expect.arrayContaining(sourceControlIds));
  });

  it('renders labelled filter controls inside the Sources scope', () => {
    const html = renderToStaticMarkup(
      React.createElement(SourcesFilterBar, {
        query: '',
        onQueryChange: () => undefined,
        mediaType: 'all',
        onMediaTypeChange: () => undefined,
      }),
    );
    expect(html).toContain('data-ux-scope="sources-library-v2"');
    expect(html).toContain('data-ux-control="sources.library.search-input"');
    expect(html).toContain('data-ux-control="sources.library.filter-format"');
    expect(html).toContain('data-ux-control="sources.library.filter-rights"');
    expect(html).toContain('data-ux-control="sources.library.filter-sort"');
    expect(html).toContain('data-ux-flow="sources.library.filter"');
  });

  it('uses pressed selection semantics and truthful source provenance on cards', () => {
    const html = renderToStaticMarkup(
      React.createElement(SourceCard, {
        source,
        selected: true,
        onToggleSelection: () => undefined,
        onOpen: () => undefined,
        onCreateArtifact: () => undefined,
      }),
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('PDF');
    expect(html).toContain('Bạn sở hữu');
    expect(html).toContain('urban-heat.pdf');
    expect(html).not.toMatch(/band|progress|score|XP/i);
  });

  it('renders a real retry transition and does not hide handoff sources', () => {
    const handoff: SourceRecord = {
      ...source,
      id: 'source-youtube',
      title: 'Climate lecture',
      type: 'youtube',
      currentVersionId: '',
      processingState: 'handoff_required',
      provenance: {
        ...source.provenance,
        originType: 'youtube_import',
        owningModule: 'media',
        handoffReasonVi: 'Media Lab owns playback and captions.',
      },
    };
    const html = renderToStaticMarkup(
      React.createElement(SourcesLibraryExplorer, {
        sources: [handoff],
        collections: [],
        state: 'retryable_error',
        selectedSourceIds: [],
        onSelectedSourceIdsChange: () => undefined,
        onToggleSource: () => undefined,
        onOpenSource: () => undefined,
        onCreateArtifact: () => undefined,
        onRetry: () => undefined,
        onAddSource: () => undefined,
        onCreateCollection: async () => undefined,
      }),
    );
    expect(html).toContain('Media Lab');
    expect(html).toContain('data-ux-control="sources.library.retry"');
    expect(html).toContain('data-ux-flow="sources.manage"');
  });
});
