import { describe, expect, it } from 'vitest';
import { extractDocument } from '../sources/extractors';

describe('P03 extraction pipeline', () => {
  it('extracts plain text into structured paragraphs and word count', async () => {
    const raw = 'Paragraph one on climate policy.\n\nParagraph two with academic analysis.';
    const result = await extractDocument({ type: 'text', content: raw, title: 'Climate Policy' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.version.blocks).toHaveLength(2);
      expect(result.version.wordCount).toBe(10);
      expect(result.version.blocks[0].text).toBe('Paragraph one on climate policy.');
    }
  });

  it('rejects empty or whitespace-only inputs without fabricating filler', async () => {
    const result = await extractDocument({ type: 'text', content: '   \n  ', title: 'Blank' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
      expect(result.error.userMessageVi).toContain('không hợp lệ');
    }
  });

  it('parses subtitle lines into timestamped dialogue blocks', async () => {
    const srt = `1\n00:00:01,000 --> 00:00:04,000\nHello and welcome to the lecture.\n\n2\n00:00:04,500 --> 00:00:08,000\nToday we examine renewable energy subsidies.`;
    const result = await extractDocument({ type: 'vtt_srt', content: srt, title: 'Lecture Subtitles' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.version.blocks).toHaveLength(2);
      expect(result.version.blocks[0].startMs).toBe(1000);
      expect(result.version.blocks[0].endMs).toBe(4000);
    }
  });

  it('does not extract or transcribe YouTube, audio, or chart inputs', async () => {
    const yt = await extractDocument({
      type: 'youtube',
      content: 'https://youtube.com/watch?v=example',
      title: 'Lecture',
    });
    expect(yt.success).toBe(false);
    if (!yt.success) {
      expect(yt.error.code).toBe('HANDOFF_REQUIRED');
      expect(yt.error.owningModule).toBe('media');
      expect(yt.error.userMessageVi).toMatch(/Media/i);
    }

    const audio = await extractDocument({ type: 'audio', content: 'fixture.mp3', title: 'Talk' });
    expect(audio.success).toBe(false);
    if (!audio.success) expect(audio.error.owningModule).toBe('media');

    const chart = await extractDocument({ type: 'chart_image', content: 'chart.png', title: 'Task 1' });
    expect(chart.success).toBe(false);
    if (!chart.success) {
      expect(chart.error.code).toBe('HANDOFF_REQUIRED');
      expect(chart.error.owningModule).toBe('mock');
    }
  });
});
