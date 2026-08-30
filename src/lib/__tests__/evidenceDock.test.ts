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

  it('routes missing evidence to Independent Practice instead of the current module', () => {
    const dashboard = buildEvidenceDockModel({
      activeModule: 'dashboard',
      dueMistakeCount: 0,
      dueVocabCount: 0,
      recentEvidence: [],
    });
    const missing = dashboard.sections.find(({ id }) => id === 'dashboard-context')?.items[0];
    expect(missing?.status).toBe('missing');
    expect(missing?.destination).toBe('practice');
    expect(missing?.action).toBe('collect');
  });

  it('renders missing evidence as non-interactive when already on Practice', () => {
    const practice = buildEvidenceDockModel({
      activeModule: 'practice',
      dueMistakeCount: 0,
      dueVocabCount: 0,
      recentEvidence: [],
    });
    const missing = practice.sections.find(({ id }) => id === 'practice-context')?.items[0];
    expect(missing?.status).toBe('missing');
    expect(missing?.destination).toBeUndefined();
    expect(missing?.action).toBe('none');
  });

  it('does not mark completed recent work as a resume transition', () => {
    const model = buildEvidenceDockModel({
      activeModule: 'dashboard',
      dueMistakeCount: 0,
      dueVocabCount: 0,
      recentEvidence: [{
        id: 'att_1',
        label: 'Writing Task 2',
        destination: 'practice',
      }],
    });
    const recent = model.sections.find(({ id }) => id === 'recent-evidence')?.items[0];
    expect(recent?.status).toBe('recent');
    expect(recent?.action).toBe('open_module');
    expect(recent?.detail).toMatch(/Mở IELTS Practice/);
  });

  it('omits empty recent and continuation regions instead of rendering repeated empty states', () => {
    const model = buildEvidenceDockModel({
      activeModule: 'dashboard',
      dueMistakeCount: 2,
      dueVocabCount: 0,
      recentEvidence: [],
    });

    expect(model.sections.map(({ id }) => id)).toEqual([
      'system-due',
      'dashboard-context',
    ]);
  });
});
