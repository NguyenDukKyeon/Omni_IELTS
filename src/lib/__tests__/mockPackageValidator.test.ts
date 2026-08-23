import { describe, expect, it } from 'vitest';
import { validateMockPackage, validateMockSkill } from '../mockPackageValidator';

describe('validateMockPackage', () => {
  it('rejects summary-only assembler output that cannot enter the exam room', () => {
    const result = validateMockPackage({
      id: 'summary',
      listening: { sections: [] },
      reading: { passages: [] },
      writing: {},
      speaking: {},
    });
    expect(result.ready).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Listening'),
      expect.stringContaining('Reading'),
      expect.stringContaining('Writing'),
      expect.stringContaining('Speaking'),
    ]));
  });

  it('validates staged skills independently so a failed skill can be retried', () => {
    const listening = {
      title: 'Listening',
      audioTranscript: 'A complete transcript',
      sections: [{ questions: Array.from({ length: 40 }, (_, index) => ({ id: `l${index}` })) }],
    };

    expect(validateMockSkill('listening', listening).ready).toBe(true);
    expect(validateMockSkill('reading', { passages: [{ questions: [] }] }).ready).toBe(false);
    expect(validateMockSkill('writing', { task1: { prompt: 'Task 1' }, task2: {} }).errors)
      .toContain('Writing phải có đúng Task 1 và Task 2.');
  });
});
