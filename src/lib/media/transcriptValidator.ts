import type { MediaTranscriptSegment } from '../../types/media';

export interface TranscriptValidationResult {
  valid: boolean;
  coverageRatio: number;
  issue?: 'empty' | 'timestamps_invalid' | 'coverage_insufficient';
}

export interface SubtitleParseCue {
  startMs: number;
  endMs: number;
  text: string;
}

export interface SubtitleParseResult {
  success: boolean;
  code?: 'SUBTITLE_PARSE_ERROR';
  cues: SubtitleParseCue[];
  messageVi?: string;
}

function parseSrtTimestamp(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const millis = parseInt(match[4], 10);
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;
}

function parseVttTimestamp(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})$/);
  if (!match) return null;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const millis = parseInt(match[4], 10);
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + millis;
}

function cleanSubtitleText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // remove WebVTT cue tags (<b>, <i>, <c>, <v ...>)
    .replace(/\{[^}]+\}/g, '') // remove SRT style formatting if present
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses raw SRT or WebVTT content into timed cues.
 * On any syntax or timestamp error, returns typed SUBTITLE_PARSE_ERROR without inventing fallback timings.
 */
export function parseSubtitleCues(rawText: string, format: 'vtt' | 'srt'): SubtitleParseResult {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  const cues: SubtitleParseCue[] = [];
  let i = 0;

  // Skip WEBVTT header for vtt
  if (format === 'vtt') {
    while (i < lines.length && (lines[i].trim().startsWith('WEBVTT') || lines[i].trim().startsWith('NOTE') || lines[i].trim() === '')) {
      i++;
    }
  }

  let hasTimingLine = false;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // Check for sequence number in SRT or cue ID
    if (/^\d+$/.test(line) && i + 1 < lines.length && lines[i + 1].includes('-->')) {
      i++; // skip sequence number
      continue;
    }

    if (line.includes('-->')) {
      hasTimingLine = true;
      const parts = line.split('-->');
      if (parts.length !== 2) {
        return {
          success: false,
          code: 'SUBTITLE_PARSE_ERROR',
          cues: [],
          messageVi: 'Định dạng mốc thời gian không hợp lệ trong tệp phụ đề.',
        };
      }

      // Timing line may have positioning tags after the end time in VTT (e.g. "00:01.000 --> 00:03.500 align:start")
      const startStr = parts[0].trim();
      const endStr = parts[1].trim().split(/\s+/)[0];

      const startMs = format === 'vtt' ? parseVttTimestamp(startStr) : parseSrtTimestamp(startStr);
      const endMs = format === 'vtt' ? parseVttTimestamp(endStr) : parseSrtTimestamp(endStr);

      if (startMs === null || endMs === null || endMs <= startMs) {
        return {
          success: false,
          code: 'SUBTITLE_PARSE_ERROR',
          cues: [],
          messageVi: 'Mốc thời gian phụ đề không thể phân tích hoặc thời gian kết thúc trước thời gian bắt đầu.',
        };
      }

      // Collect following text lines until empty line or next cue
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
        // If it's a digit followed immediately by a timing line, break
        if (/^\d+$/.test(lines[i].trim()) && i + 1 < lines.length && lines[i + 1].includes('-->')) {
          break;
        }
        textLines.push(lines[i].trim());
        i++;
      }

      const text = cleanSubtitleText(textLines.join(' '));
      if (text) {
        cues.push({ startMs, endMs, text });
      }
      continue;
    }

    i++;
  }

  if (!hasTimingLine || cues.length === 0) {
    return {
      success: false,
      code: 'SUBTITLE_PARSE_ERROR',
      cues: [],
      messageVi: 'Không tìm thấy dòng mốc thời gian (-->) hợp lệ trong tệp phụ đề.',
    };
  }

  return { success: true, cues };
}

/**
 * Validates monotonic timestamps, non-overlapping ordering, bounded intervals, and coverage ratio.
 * Enforces >= 65% coverage for complete ready transcripts based on interval union.
 */
export function validateTranscriptCoverage(
  segments: MediaTranscriptSegment[],
  durationMs: number,
): TranscriptValidationResult {
  if (!segments || segments.length === 0) {
    return { valid: false, coverageRatio: 0, issue: 'empty' };
  }

  // Duration must be finite, positive, and known
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) {
    return { valid: false, coverageRatio: 0, issue: 'timestamps_invalid' };
  }

  let previousStart = -1;
  let previousEnd = -1;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Timestamps must be finite integers, non-negative, with endMs > startMs
    if (
      typeof seg.startMs !== 'number' ||
      !Number.isInteger(seg.startMs) ||
      typeof seg.endMs !== 'number' ||
      !Number.isInteger(seg.endMs) ||
      seg.startMs < 0 ||
      seg.endMs <= seg.startMs
    ) {
      return { valid: false, coverageRatio: 0, issue: 'timestamps_invalid' };
    }

    // Intervals must be within [0, durationMs]
    if (seg.startMs > durationMs || seg.endMs > durationMs) {
      return { valid: false, coverageRatio: 0, issue: 'timestamps_invalid' };
    }

    // Monotonic ordering and overlap tolerance (next.startMs >= previous.endMs - 50 ms)
    if (i > 0) {
      if (seg.startMs < previousStart || seg.startMs < previousEnd - 50) {
        return { valid: false, coverageRatio: 0, issue: 'timestamps_invalid' };
      }
    }

    // Text must not be empty or whitespace-only
    if (typeof seg.text !== 'string' || !seg.text.trim()) {
      return { valid: false, coverageRatio: 0, issue: 'timestamps_invalid' };
    }

    previousStart = seg.startMs;
    previousEnd = seg.endMs;
  }

  // Compute coverage as interval union without double-counting overlap
  let unionCoveredMs = 0;
  let currentStart = segments[0].startMs;
  let currentEnd = segments[0].endMs;

  for (let i = 1; i < segments.length; i++) {
    const nextStart = segments[i].startMs;
    const nextEnd = segments[i].endMs;

    if (nextStart <= currentEnd) {
      currentEnd = Math.max(currentEnd, nextEnd);
    } else {
      unionCoveredMs += (currentEnd - currentStart);
      currentStart = nextStart;
      currentEnd = nextEnd;
    }
  }
  unionCoveredMs += (currentEnd - currentStart);

  // Compare unrounded coverage ratio against 0.65 threshold
  const rawCoverageRatio = unionCoveredMs / durationMs;
  const displayCoverageRatio = Math.min(1, Math.round(rawCoverageRatio * 1000) / 1000);

  if (rawCoverageRatio < 0.65) {
    return {
      valid: false,
      coverageRatio: displayCoverageRatio,
      issue: 'coverage_insufficient',
    };
  }

  return { valid: true, coverageRatio: displayCoverageRatio };
}
