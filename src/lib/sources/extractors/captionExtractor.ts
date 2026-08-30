import { failExtraction, succeedExtraction, toBlockId, type ExtractionInput, type ExtractionResult } from './types';
import type { SourceBlock } from '../../../types/sources';

function parseTimestamp(value: string): number | null {
  const match = value.trim().match(/^(?:(\d{2}):)?(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) return null;
  const hours = Number(match[1] ?? '00');
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4]);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

export function extractCaptions(input: ExtractionInput): ExtractionResult {
  const raw = typeof input.content === 'string' ? input.content : new TextDecoder().decode(input.content);
  const body = raw.replace(/^\uFEFF/, '').replace(/^WEBVTT[^\n]*\n+/i, '');
  const chunks = body.split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean);
  const blocks: SourceBlock[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const timestampIndex = lines.findIndex((line) => line.includes('-->'));
    if (timestampIndex < 0) continue;
    const [startRaw, endRaw] = lines[timestampIndex].split('-->').map((part) => part.trim().split(/\s+/)[0]);
    const startMs = parseTimestamp(startRaw);
    const endMs = parseTimestamp(endRaw);
    const text = lines.slice(timestampIndex + 1).join(' ').trim();
    if (startMs === null || endMs === null || !text) continue;
    const order = blocks.length + 1;
    blocks.push({
      id: toBlockId(order),
      order,
      type: 'transcript_turn',
      text,
      startMs,
      endMs,
    });
  }

  if (blocks.length === 0) {
    return failExtraction(
      'SUBTITLE_PARSE_ERROR',
      'Không đọc được phụ đề VTT/SRT. Hãy kiểm tra cú pháp thời gian rồi thử lại.',
      { suggestedActionVi: 'Tải lại tệp phụ đề hợp lệ hoặc dán văn bản.' },
    );
  }

  return succeedExtraction(blocks.map((block) => block.text).join('\n'), blocks, 'vtt_srt');
}
