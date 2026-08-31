import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourceGroundedChat } from '../../components/sources/SourceGroundedChat';
import { SourceReader } from '../../components/sources/SourceReader';
import { CitationDrawer } from '../../components/sources/CitationDrawer';
import { UX_FLOW_CONTRACTS, UX_CONTROL_CONTRACTS } from '../uxFlowContracts';
import type { SourceRecord, SourceVersion } from '../../types/sources';

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
  plainText: 'Cities retain heat. Tree cover lowers surface temperature.',
  blocks: [
    { id: 'b_002', order: 2, type: 'paragraph', text: 'Tree cover lowers surface temperature.' },
    { id: 'b_001', order: 1, type: 'heading', text: 'Cities retain heat.' },
  ],
  wordCount: 9,
  createdAt: '2026-08-31T00:00:00.000Z',
};

describe('Sources Reader and Grounded Chat UI', () => {
  it('renders validated blocks in source order with real span selection controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(SourceReader, {
        record,
        version,
        selectedSpan: undefined,
        onSpanChange: () => undefined,
      }),
    );
    expect(html.indexOf('Cities retain heat.')).toBeLessThan(html.indexOf('Tree cover lowers surface temperature.'));
    expect(html).toContain('data-ux-control="sources.reader.select-span');
    expect(html).toContain('data-ux-flow="sources.selection.toggle"');
    expect(html).not.toContain('<audio');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<canvas');
  });

  it('keeps grounded send and explicit web research as separate labelled controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(SourceGroundedChat, {
        selectedVersionIds: ['version-1'],
        contextLabel: 'Context: 1 source',
      }),
    );
    expect(html).toContain('data-ux-control="sources.chat.send"');
    expect(html).toContain('data-ux-flow="sources.chat.send"');
    expect(html).toContain('data-ux-control="sources.chat.web-research"');
    expect(html).toContain('data-ux-flow="sources.chat.web-research"');
    expect(html).toContain('Tra cứu dẫn chứng');
    expect(html).toContain('role="status"');
  });

  it('only renders a citation drawer for citations returned by the server', () => {
    const empty = renderToStaticMarkup(React.createElement(CitationDrawer, { citations: [] }));
    expect(empty).toBe('');
    const html = renderToStaticMarkup(
      React.createElement(CitationDrawer, {
        citations: [{
          sourceVersionId: 'version-1',
          sourceTitle: 'Urban heat islands',
          blockId: 'b_001',
          exactSnippet: 'Cities retain heat.',
        }],
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Cities retain heat.');
    expect(html).toContain('data-ux-control="sources.chat.citation-close"');
  });

  it('registers the private chat, web research, citation, and reader controls', () => {
    const flowIds = UX_FLOW_CONTRACTS.filter((flow) => flow.module === 'sources').map((flow) => flow.id);
    expect(flowIds).toEqual(expect.arrayContaining([
      'sources.chat.send',
      'sources.chat.web-research',
    ]));
    expect(UX_CONTROL_CONTRACTS.map((control) => control.id)).toEqual(expect.arrayContaining([
      'sources.chat.send',
      'sources.chat.web-research',
      'sources.chat.citation-open',
      'sources.reader.select-span',
    ]));
  });

  it('uses the authenticated client wrappers rather than direct browser provider calls', () => {
    const source = readFileSync('src/components/sources/SourceGroundedChat.tsx', 'utf8');
    expect(source).toContain('executeGroundedChat');
    expect(source).toContain('requestWebResearch');
    expect(source).not.toMatch(/GoogleGenAI|@google\/genai|localStorage|access_token/);
  });
});
