import { describe, expect, it } from 'vitest';
import {
  addSourceToCollection,
  filterSources,
  removeSourceFromCollection,
  searchSources,
} from '../sources/libraryStore';
import type { SourceRecord } from '../../types/sources';

describe('Library Search & Filter Store', () => {
  const sampleSources: SourceRecord[] = [
    {
      id: 's1',
      userId: 'u1',
      title: 'Renewable Macroeconomics',
      summary: 'Analysis of subsidies in clean energy',
      type: 'pdf',
      collectionIds: ['c_env'],
      tags: ['Economics', 'Environment'],
      provenance: {
        originType: 'user_upload',
        retrievalDate: '2026-08-30T00:00:00Z',
        rightsState: 'owned_by_learner',
        rawContentHash: 'hash1',
        canonicalCitation: 'Doc 1',
      },
      currentVersionId: 'v1',
      processingState: 'ready',
      lastUsedAt: '2026-08-30T10:00:00Z',
      createdAt: '2026-08-30T00:00:00Z',
      updatedAt: '2026-08-30T10:00:00Z',
    },
    {
      id: 's2',
      userId: 'u1',
      title: 'Artificial Intelligence in Healthcare',
      summary: 'Diagnostic algorithms in clinical trials',
      type: 'url',
      collectionIds: ['c_tech'],
      tags: ['Technology', 'AI'],
      provenance: {
        originType: 'web_fetch',
        retrievalDate: '2026-08-29T00:00:00Z',
        rightsState: 'fair_use_academic',
        rawContentHash: 'hash2',
        canonicalCitation: 'Doc 2',
      },
      currentVersionId: 'v2',
      processingState: 'ready',
      lastUsedAt: '2026-08-29T10:00:00Z',
      createdAt: '2026-08-29T00:00:00Z',
      updatedAt: '2026-08-29T10:00:00Z',
    },
  ];

  it('filters sources by media type and collection membership', () => {
    const pdfOnly = filterSources(sampleSources, { mediaType: 'pdf' });
    expect(pdfOnly).toHaveLength(1);
    expect(pdfOnly[0].id).toBe('s1');

    const envCollection = filterSources(sampleSources, { collectionId: 'c_env' });
    expect(envCollection).toHaveLength(1);
    expect(envCollection[0].id).toBe('s1');
  });

  it('performs full-text keyword search across titles, summaries, and tags', () => {
    const results = searchSources(sampleSources, 'Healthcare');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('s2');
  });
});

describe('Library store processing, search, and collection updates', () => {
  const readyPdf: SourceRecord = {
    id: 's1',
    userId: 'u1',
    title: 'Renewable Macroeconomics',
    summary: 'Analysis of subsidies in clean energy',
    type: 'pdf',
    collectionIds: ['c_env'],
    tags: ['Economics', 'Environment'],
    provenance: {
      originType: 'user_upload',
      retrievalDate: '2026-08-30T00:00:00Z',
      rightsState: 'owned_by_learner',
      rawContentHash: 'hash1',
      canonicalCitation: 'Doc 1',
    },
    currentVersionId: 'v1',
    processingState: 'ready',
    lastUsedAt: '2026-08-30T10:00:00Z',
    createdAt: '2026-08-30T00:00:00Z',
    updatedAt: '2026-08-30T10:00:00Z',
  };

  const readyUrl: SourceRecord = {
    id: 's2',
    userId: 'u1',
    title: 'Artificial Intelligence in Healthcare',
    summary: 'Diagnostic algorithms in clinical trials',
    type: 'url',
    collectionIds: ['c_tech'],
    tags: ['Technology', 'AI'],
    provenance: {
      originType: 'web_fetch',
      retrievalDate: '2026-08-29T00:00:00Z',
      rightsState: 'fair_use_academic',
      rawContentHash: 'hash2',
      canonicalCitation: 'Doc 2',
    },
    currentVersionId: 'v2',
    processingState: 'ready',
    lastUsedAt: '2026-08-29T10:00:00Z',
    createdAt: '2026-08-29T00:00:00Z',
    updatedAt: '2026-08-29T10:00:00Z',
  };

  const processingDocx: SourceRecord = {
    id: 's3',
    userId: 'u1',
    title: 'Policy Brief Draft',
    summary: 'Working notes on tariff reform',
    type: 'docx',
    collectionIds: ['c_env', 'c_policy'],
    tags: ['Policy'],
    provenance: {
      originType: 'user_upload',
      retrievalDate: '2026-08-28T00:00:00Z',
      rightsState: 'owned_by_learner',
      rawContentHash: 'hash3',
      canonicalCitation: 'Doc 3',
    },
    currentVersionId: 'v3',
    processingState: 'processing',
    lastUsedAt: '2026-08-28T10:00:00Z',
    createdAt: '2026-08-28T00:00:00Z',
    updatedAt: '2026-08-28T10:00:00Z',
  };

  const handoffYoutube: SourceRecord = {
    id: 's4',
    userId: 'u1',
    title: 'Climate Lecture',
    summary: 'YouTube lecture on clean energy subsidies',
    type: 'youtube',
    collectionIds: ['c_env'],
    tags: ['Lecture', 'Climate'],
    provenance: {
      originType: 'youtube_import',
      retrievalDate: '2026-08-27T00:00:00Z',
      rightsState: 'restricted_citation_only',
      rawContentHash: 'hash4',
      canonicalCitation: 'YT 1',
      owningModule: 'media',
      handoffReasonVi: 'P04 Media Lab owns caption retrieval and playback.',
    },
    currentVersionId: '',
    processingState: 'handoff_required',
    lastUsedAt: '2026-08-27T10:00:00Z',
    createdAt: '2026-08-27T00:00:00Z',
    updatedAt: '2026-08-27T10:00:00Z',
  };

  const library: SourceRecord[] = [readyPdf, readyUrl, processingDocx, handoffYoutube];

  it('filters by processing state while keeping input order and handoff_required records', () => {
    const handoffOnly = filterSources(library, { processingState: 'handoff_required' });
    expect(handoffOnly.map((source) => source.id)).toEqual(['s4']);
    expect(handoffOnly[0]?.processingState).toBe('handoff_required');
    expect(handoffOnly[0]?.currentVersionId).toBe('');

    const envMembers = filterSources(library, { collectionId: 'c_env' });
    expect(envMembers.map((source) => source.id)).toEqual(['s1', 's3', 's4']);
    expect(envMembers.find((source) => source.id === 's4')?.processingState).toBe('handoff_required');

    const envPdfs = filterSources(library, { mediaType: 'pdf', collectionId: 'c_env', processingState: 'ready' });
    expect(envPdfs.map((source) => source.id)).toEqual(['s1']);

    const unfiltered = filterSources(library, {});
    expect(unfiltered.map((source) => source.id)).toEqual(['s1', 's2', 's3', 's4']);
    expect(unfiltered.find((source) => source.id === 's4')?.processingState).toBe('handoff_required');
  });

  it('does not hide sources for blank or whitespace search queries', () => {
    expect(searchSources(library, '').map((source) => source.id)).toEqual(['s1', 's2', 's3', 's4']);
    expect(searchSources(library, '   ').map((source) => source.id)).toEqual(['s1', 's2', 's3', 's4']);
    expect(searchSources(library, '\t\n').map((source) => source.id)).toEqual(['s1', 's2', 's3', 's4']);
    expect(searchSources(library, '')[3]?.processingState).toBe('handoff_required');
  });

  it('searches case-insensitively across title, summary, and tags', () => {
    expect(searchSources(library, 'healthcare').map((source) => source.id)).toEqual(['s2']);
    expect(searchSources(library, 'SUBSIDIES').map((source) => source.id)).toEqual(['s1', 's4']);
    expect(searchSources(library, 'ai').map((source) => source.id)).toEqual(['s2']);
    expect(searchSources(library, 'climate').map((source) => source.id)).toEqual(['s4']);
    expect(searchSources(library, 'tariff').map((source) => source.id)).toEqual(['s3']);
  });

  it('adds a collection without mutating the caller-owned record', () => {
    const originalIds = [...readyPdf.collectionIds];
    const originalSnapshot = structuredClone(readyPdf);

    const updated = addSourceToCollection(readyPdf, 'c_policy');

    expect(readyPdf).toEqual(originalSnapshot);
    expect(readyPdf.collectionIds).toEqual(originalIds);
    expect(updated).not.toBe(readyPdf);
    expect(updated.collectionIds).not.toBe(readyPdf.collectionIds);
    expect(updated.collectionIds).toEqual(['c_env', 'c_policy']);
    expect(updated).toEqual({ ...readyPdf, collectionIds: ['c_env', 'c_policy'] });
    expect(updated.processingState).toBe('ready');
  });

  it('is idempotent when adding a collection that already exists', () => {
    const originalSnapshot = structuredClone(readyPdf);
    const updated = addSourceToCollection(readyPdf, 'c_env');

    expect(readyPdf).toEqual(originalSnapshot);
    expect(updated).not.toBe(readyPdf);
    expect(updated.collectionIds).toEqual(['c_env']);
    expect(updated).toEqual({ ...readyPdf, collectionIds: ['c_env'] });
  });

  it('removes a collection without mutating the caller-owned record', () => {
    const originalSnapshot = structuredClone(processingDocx);
    const updated = removeSourceFromCollection(processingDocx, 'c_env');

    expect(processingDocx).toEqual(originalSnapshot);
    expect(updated).not.toBe(processingDocx);
    expect(updated.collectionIds).not.toBe(processingDocx.collectionIds);
    expect(updated.collectionIds).toEqual(['c_policy']);
    expect(updated).toEqual({ ...processingDocx, collectionIds: ['c_policy'] });
  });

  it('is a no-op when removing a missing collection and keeps handoff state honest', () => {
    const originalSnapshot = structuredClone(handoffYoutube);
    const updated = removeSourceFromCollection(handoffYoutube, 'c_missing');

    expect(handoffYoutube).toEqual(originalSnapshot);
    expect(updated).not.toBe(handoffYoutube);
    expect(updated.collectionIds).toEqual(['c_env']);
    expect(updated.processingState).toBe('handoff_required');
    expect(updated.currentVersionId).toBe('');
    expect(updated).toEqual({ ...handoffYoutube, collectionIds: ['c_env'] });
  });
});
