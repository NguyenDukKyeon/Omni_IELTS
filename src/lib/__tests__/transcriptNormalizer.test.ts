import { describe, expect, it } from 'vitest';
import { normalizeRollingVtt } from '../transcriptNormalizer';

describe('normalizeRollingVtt', () => {
  it('deduplicates rolling captions while preserving the complete lesson', () => {
    const vtt = `WEBVTT

00:00:00.000 --> 00:00:02.000
Hello and welcome

00:00:01.500 --> 00:00:04.000
Hello and welcome to the lesson.

00:00:04.000 --> 00:00:07.000
Today we practise shadowing.

00:00:07.000 --> 00:00:10.000
Listen carefully and repeat.`;

    const result = normalizeRollingVtt(vtt);

    expect(result.map((segment) => segment.text)).toEqual([
      'Hello and welcome to the lesson.',
      'Today we practise shadowing.',
      'Listen carefully and repeat.',
    ]);
    expect(result.at(-1)?.end).toBe(10);
  });

  it('does not truncate lessons to 20 sentences or 5,000 characters', () => {
    const cues = Array.from({ length: 30 }, (_, index) => {
      const start = String(index).padStart(2, '0');
      const end = String(index + 1).padStart(2, '0');
      return `00:00:${start}.000 --> 00:00:${end}.000\nSentence ${index + 1} has complete punctuation.`;
    }).join('\n\n');

    expect(normalizeRollingVtt(`WEBVTT\n\n${cues}`)).toHaveLength(30);
  });
});
