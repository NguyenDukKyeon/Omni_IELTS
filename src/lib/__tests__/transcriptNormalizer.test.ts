import { describe, expect, it } from 'vitest';
import { normalizeAndAlignVtt, normalizeRollingVtt, parseTimedCaptionText } from '../transcriptNormalizer';

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

  it('keeps every new sentence from an 11-minute rolling-caption lesson', () => {
    const sentences = Array.from({ length: 220 }, (_, index) =>
      `Sentence ${index + 1} explains shadowing point ${index + 1}.`,
    );
    const cues = sentences.map((_, index) => {
      const start = index * 3;
      const end = start + 3;
      const rollingWindow = sentences.slice(Math.max(0, index - 2), index + 1).join(' ');
      const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remaining = seconds % 60;
        return `00:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}.000`;
      };
      return `${formatTime(start)} --> ${formatTime(end)}\n${rollingWindow}`;
    }).join('\n\n');

    const result = normalizeAndAlignVtt(`WEBVTT\n\n${cues}`);

    expect(result).toHaveLength(220);
    expect(result[0].text).toBe(sentences[0]);
    expect(result.at(-1)).toMatchObject({ end: 660, text: sentences.at(-1) });
  });

  it('splits multiple complete sentences inside one caption cue', () => {
    const result = normalizeAndAlignVtt(`WEBVTT

00:00:00.000 --> 00:00:08.000
Listen to the first sentence. Then repeat the second sentence!`);

    expect(result.map((segment) => segment.text)).toEqual([
      'Listen to the first sentence.',
      'Then repeat the second sentence!',
    ]);
    expect(result[0].start).toBe(0);
    expect(result.at(-1)?.end).toBe(8);
  });

  it('accepts user-owned SRT captions as the no-cookie fallback', () => {
    const result = parseTimedCaptionText(`1
00:00:00,000 --> 00:00:03,000
First uploaded caption.

2
00:00:03,000 --> 00:00:07,000
Second uploaded caption.`);

    expect(result).toEqual([
      { start: 0, end: 3, text: 'First uploaded caption.' },
      { start: 3, end: 7, text: 'Second uploaded caption.' },
    ]);
  });
});
