import { computeSegmentId } from './contentHash';
import type { MediaTranscriptSegment } from '../../types/media';

export interface RawCaptionCue {
  startMs: number;
  endMs: number;
  text: string;
}

/**
 * Normalizes rolling captions (e.g. YouTube automated subtitles with overlapping phrases)
 * into coherent, non-overlapping sentence segments with deterministic IDs.
 */
export function normalizeRollingCaptions(rawCues: RawCaptionCue[]): MediaTranscriptSegment[] {
  if (!rawCues || rawCues.length === 0) return [];

  const deduped: RawCaptionCue[] = [];

  for (const cue of rawCues) {
    const text = cue.text.replace(/\s+/g, ' ').trim();
    if (!text) continue;

    if (deduped.length > 0) {
      const last = deduped[deduped.length - 1];

      // Check for overlapping rolling subtitle patterns:
      // 1. Current text extends last text (prefix match)
      // 2. Last text is substring of current text with close timing
      const isOverlapping = cue.startMs <= last.endMs + 300;
      const textExtended = text.startsWith(last.text) || text.includes(last.text);
      const textContinuation = last.text.endsWith(text) || last.text.includes(text);

      if (isOverlapping && (textExtended || textContinuation)) {
        last.endMs = Math.max(last.endMs, cue.endMs);
        last.text = text.length > last.text.length ? text : last.text;
        continue;
      }
    }

    deduped.push({
      startMs: cue.startMs,
      endMs: cue.endMs,
      text,
    });
  }

  return deduped.map((cue, index) => ({
    id: computeSegmentId(cue.text, cue.startMs),
    index,
    startMs: cue.startMs,
    endMs: cue.endMs,
    text: cue.text,
    confidence: 'high',
  }));
}
