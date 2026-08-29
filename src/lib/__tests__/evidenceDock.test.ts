import { describe, expect, it } from 'vitest';
import { buildEvidenceDockModel } from '../evidenceDock';

describe('Evidence Dock', () => {
  it('keeps system-wide due work first and changes contextual content by module', () => {
    const vocabulary = buildEvidenceDockModel({
      activeModule: 'vocabulary',
      dueMistakeCount: 2,
      dueVocabCount: 6,
      recentEvidence: [],
    });
    const media = buildEvidenceDockModel({
      activeModule: 'media',
      dueMistakeCount: 2,
      dueVocabCount: 6,
      currentMediaTitle: 'Urban planning',
      recentEvidence: [],
    });

    expect(vocabulary.sections[0].id).toBe('system-due');
    expect(vocabulary.sections.some(({ id }) => id === 'vocabulary-context')).toBe(true);
    expect(media.sections.some(({ id }) => id === 'media-context')).toBe(true);
  });

  it('returns hidden during an active Mock exam', () => {
    expect(buildEvidenceDockModel({
      activeModule: 'mock_test',
      examMode: true,
      dueMistakeCount: 0,
      dueVocabCount: 0,
      recentEvidence: [],
    }).visibility).toBe('hidden');
  });
});
