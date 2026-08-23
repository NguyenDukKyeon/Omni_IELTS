import { describe, expect, it } from 'vitest';
import { splitTextByAnnotations } from '../readingAnnotations';

describe('splitTextByAnnotations', () => {
  it('highlights only the second occurrence when text is repeated', () => {
    const text = 'repeat once, then repeat twice';
    const secondStart = text.lastIndexOf('repeat');
    const parts = splitTextByAnnotations(text, [{ id: 'second', startOffset: secondStart, endOffset: secondStart + 6, color: 'green' }]);

    expect(parts.filter(part => part.highlightIds.length > 0)).toEqual([
      expect.objectContaining({ text: 'repeat', color: 'green', highlightIds: ['second'] }),
    ]);
    expect(parts.map(part => part.text).join('')).toBe(text);
  });

  it('splits overlapping ranges without losing text', () => {
    const text = 'abcdefghij';
    const parts = splitTextByAnnotations(text, [
      { id: 'a', startOffset: 2, endOffset: 7, color: 'yellow' },
      { id: 'b', startOffset: 5, endOffset: 9, color: 'green' },
    ]);

    expect(parts.map(part => part.text).join('')).toBe(text);
    expect(parts.find(part => part.text === 'fg')?.highlightIds).toEqual(['a', 'b']);
  });
});
