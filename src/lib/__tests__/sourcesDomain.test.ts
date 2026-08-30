import { describe, expect, it } from 'vitest';
import {
  createSourceRecord,
  createSourceVersion,
  computeContentHash,
  type SourceProvenance,
} from '../../types/sources';

describe('Sources Domain Contracts', () => {
  it('computes deterministic SHA-256 content hashes for versions', () => {
    const text = 'The transition toward renewable energy represents a monumental macroeconomic shift.';
    const hash1 = computeContentHash(text);
    const hash2 = computeContentHash(text);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('creates an immutable SourceRecord with initial v1 version and provenance', () => {
    const provenance: SourceProvenance = {
      originType: 'pasted_text',
      retrievalDate: new Date().toISOString(),
      rightsState: 'owned_by_learner',
      rawContentHash: computeContentHash('Sample text'),
      canonicalCitation: 'Learner Note: Renewable Energy',
    };

    const record = createSourceRecord({
      userId: 'user_123',
      title: 'Renewable Subsidies',
      type: 'text',
      provenance,
    });

    expect(record.id).toBeDefined();
    expect(record.userId).toBe('user_123');
    expect(record.processingState).toBe('queued');
    expect(record.provenance.rightsState).toBe('owned_by_learner');

    const version = createSourceVersion({
      sourceId: record.id,
      versionNumber: 1,
      stage: 'raw',
      plainText: 'Sample text',
    });

    expect(version.versionNumber).toBe(1);
    expect(version.stage).toBe('raw');
    expect(version.contentHash).toBe(provenance.rawContentHash);
  });

  it('stores YouTube/audio/chart records as handoff_required without a fake version', () => {
    const record = createSourceRecord({
      userId: 'user_123',
      title: 'Lecture URL',
      type: 'youtube',
      provenance: {
        originType: 'youtube_import',
        retrievalDate: new Date().toISOString(),
        rightsState: 'restricted_citation_only',
        rawContentHash: computeContentHash('https://youtube.com/watch?v=example'),
        canonicalCitation: 'YouTube reference',
        owningModule: 'media',
        handoffReasonVi: 'P04 Media Lab owns caption retrieval and playback.',
      },
      processingState: 'handoff_required',
    });
    expect(record.processingState).toBe('handoff_required');
    expect(record.currentVersionId).toBe('');
  });
});
