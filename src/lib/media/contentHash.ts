import { createHash } from 'node:crypto';
import type { MediaTranscriptSegment } from '../../types/media';

/**
 * Computes a deterministic SHA-256 hash for a full sequence of transcript segments.
 * Segments are serialized with startMs, endMs, and trimmed text.
 */
export function computeTranscriptHash(segments: MediaTranscriptSegment[]): string {
  const content = segments
    .map((s) => `${s.startMs}:${s.endMs}:${s.text.trim()}`)
    .join('|');
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Computes a deterministic stable segment ID: seg_<sha256(startMs + normalizedText).slice(0, 12)>.
 * Unchanged segments preserve their ID across user edits, maintaining attempt linkability.
 */
export function computeSegmentId(text: string, startMs: number): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const digest = createHash('sha256').update(`${startMs}:${normalized}`).digest('hex').slice(0, 12);
  return `seg_${digest}`;
}
