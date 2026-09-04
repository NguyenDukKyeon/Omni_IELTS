import { describe, it, expect } from 'vitest';
import {
  validateTranscriptCoverage,
  parseSubtitleCues,
} from '../media/transcriptValidator';
import { normalizeRollingCaptions } from '../media/transcriptNormalizer';
import { computeTranscriptHash, computeSegmentId } from '../media/contentHash';
import type { MediaTranscriptSegment } from '../../types/media';

describe('Transcript Validation, Normalization, and Deterministic Identity', () => {
  describe('validateTranscriptCoverage', () => {
    it('detects insufficient coverage when covered duration is less than 65% of total duration', () => {
      const segments: MediaTranscriptSegment[] = [
        {
          id: 'seg_1',
          index: 0,
          startMs: 0,
          endMs: 10000,
          text: 'Opening remarks.',
          confidence: 'high',
        },
      ];
      // 10s out of 100s = 10%
      const result = validateTranscriptCoverage(segments, 100000);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('coverage_insufficient');
      expect(result.coverageRatio).toBe(0.1);
    });

    it('passes when coverage is >= 65% and timestamps are monotonic', () => {
      const segments: MediaTranscriptSegment[] = [
        {
          id: 'seg_1',
          index: 0,
          startMs: 0,
          endMs: 70000,
          text: 'Substantial content covered.',
          confidence: 'high',
        },
      ];
      const result = validateTranscriptCoverage(segments, 100000);
      expect(result.valid).toBe(true);
      expect(result.coverageRatio).toBe(0.7);
      expect(result.issue).toBeUndefined();
    });

    it('rejects non-monotonic or backwards overlapping timestamps', () => {
      const segments: MediaTranscriptSegment[] = [
        {
          id: 'seg_1',
          index: 0,
          startMs: 10000,
          endMs: 20000,
          text: 'First segment.',
          confidence: 'high',
        },
        {
          id: 'seg_2',
          index: 1,
          startMs: 5000, // Backwards jump!
          endMs: 25000,
          text: 'Invalid segment.',
          confidence: 'high',
        },
      ];
      const result = validateTranscriptCoverage(segments, 30000);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('timestamps_invalid');
    });

    it('rejects segments with empty text or invalid start/end bounds', () => {
      const emptyTextSegments: MediaTranscriptSegment[] = [
        {
          id: 'seg_1',
          index: 0,
          startMs: 0,
          endMs: 5000,
          text: '   ',
          confidence: 'high',
        },
      ];
      expect(validateTranscriptCoverage(emptyTextSegments, 10000).valid).toBe(false);

      const invertedSegments: MediaTranscriptSegment[] = [
        {
          id: 'seg_1',
          index: 0,
          startMs: 5000,
          endMs: 4000,
          text: 'Inverted bounds.',
          confidence: 'high',
        },
      ];
      expect(validateTranscriptCoverage(invertedSegments, 10000).valid).toBe(false);
    });

    it('handles empty segments array with issue empty', () => {
      const result = validateTranscriptCoverage([], 10000);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('empty');
      expect(result.coverageRatio).toBe(0);
    });
  });

  describe('parseSubtitleCues', () => {
    it('rejects malformed subtitle timestamps with typed SUBTITLE_PARSE_ERROR and zero fallback timing', () => {
      const malformedSrt = `1\ncorrupt_time --> bad_time\nBroken subtitle text.`;
      const result = parseSubtitleCues(malformedSrt, 'srt');
      expect(result.success).toBe(false);
      expect(result.code).toBe('SUBTITLE_PARSE_ERROR');
      expect(result.cues).toHaveLength(0);
      expect(result.messageVi).toBeDefined();
    });

    it('rejects subtitle without any timestamp cues', () => {
      const noCues = `This is just a plain text file without any timing cues.`;
      const result = parseSubtitleCues(noCues, 'vtt');
      expect(result.success).toBe(false);
      expect(result.code).toBe('SUBTITLE_PARSE_ERROR');
      expect(result.cues).toHaveLength(0);
    });

    it('rejects cues where end time is not after start time', () => {
      const invertedSrt = `1\n00:00:05,000 --> 00:00:03,000\nInverted cue.`;
      const result = parseSubtitleCues(invertedSrt, 'srt');
      expect(result.success).toBe(false);
      expect(result.code).toBe('SUBTITLE_PARSE_ERROR');
    });

    it('parses valid SRT subtitle file into cues', () => {
      const validSrt = `1
00:00:01,500 --> 00:00:04,200
Good morning learners.

2
00:00:04,500 --> 00:00:08,000
Welcome to the IELTS preparation room.`;

      const result = parseSubtitleCues(validSrt, 'srt');
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(2);
      expect(result.cues[0]).toEqual({
        startMs: 1500,
        endMs: 4200,
        text: 'Good morning learners.',
      });
      expect(result.cues[1]).toEqual({
        startMs: 4500,
        endMs: 8000,
        text: 'Welcome to the IELTS preparation room.',
      });
    });

    it('parses valid WebVTT subtitle file with WEBVTT header and formatting tags removed', () => {
      const validVtt = `WEBVTT - Sample Lecture

00:01.000 --> 00:03.500
<v Lecturer>Good <b>morning</b> everyone.</v>

00:00:04.000 --> 00:00:07.500
Today we discuss urban planning.`;

      const result = parseSubtitleCues(validVtt, 'vtt');
      expect(result.success).toBe(true);
      expect(result.cues).toHaveLength(2);
      expect(result.cues[0]).toEqual({
        startMs: 1000,
        endMs: 3500,
        text: 'Good morning everyone.',
      });
      expect(result.cues[1]).toEqual({
        startMs: 4000,
        endMs: 7500,
        text: 'Today we discuss urban planning.',
      });
    });
  });

  describe('normalizeRollingCaptions', () => {
    it('normalizes rolling YouTube captions into non-overlapping sentence units', () => {
      const rollingRaw = [
        { startMs: 0, endMs: 1200, text: 'Today we' },
        { startMs: 1000, endMs: 2500, text: 'Today we discuss' },
        { startMs: 2200, endMs: 4000, text: 'Today we discuss urban planning.' },
      ];
      const normalized = normalizeRollingCaptions(rollingRaw);
      expect(normalized).toHaveLength(1);
      expect(normalized[0].text).toBe('Today we discuss urban planning.');
      expect(normalized[0].startMs).toBe(0);
      expect(normalized[0].endMs).toBe(4000);
      expect(normalized[0].index).toBe(0);
      expect(normalized[0].id).toMatch(/^seg_[0-9a-f]{12}$/);
    });

    it('preserves distinct non-overlapping sentences', () => {
      const distinctCues = [
        { startMs: 0, endMs: 2000, text: 'Sentence one.' },
        { startMs: 2500, endMs: 5000, text: 'Sentence two.' },
      ];
      const normalized = normalizeRollingCaptions(distinctCues);
      expect(normalized).toHaveLength(2);
      expect(normalized[0].text).toBe('Sentence one.');
      expect(normalized[1].text).toBe('Sentence two.');
      expect(normalized[0].index).toBe(0);
      expect(normalized[1].index).toBe(1);
    });
  });

  describe('contentHash', () => {
    it('computes deterministic SHA-256 hash for identical transcript segments', () => {
      const segments: MediaTranscriptSegment[] = [
        {
          id: 'seg_1',
          index: 0,
          startMs: 0,
          endMs: 2000,
          text: 'Identical sentence.',
          confidence: 'high',
        },
      ];
      const hash1 = computeTranscriptHash(segments);
      const hash2 = computeTranscriptHash(segments);
      expect(hash1).toEqual(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('changes content hash when text or timestamps change', () => {
      const seg1: MediaTranscriptSegment[] = [
        { id: 's1', index: 0, startMs: 0, endMs: 2000, text: 'Hello', confidence: 'high' },
      ];
      const seg2: MediaTranscriptSegment[] = [
        { id: 's1', index: 0, startMs: 0, endMs: 2000, text: 'Hello.', confidence: 'high' },
      ];
      const seg3: MediaTranscriptSegment[] = [
        { id: 's1', index: 0, startMs: 100, endMs: 2000, text: 'Hello', confidence: 'high' },
      ];
      expect(computeTranscriptHash(seg1)).not.toEqual(computeTranscriptHash(seg2));
      expect(computeTranscriptHash(seg1)).not.toEqual(computeTranscriptHash(seg3));
    });

    it('computes deterministic segment ID seg_<hash>', () => {
      const id1 = computeSegmentId('Hello World', 1000);
      const id2 = computeSegmentId('hello world', 1000); // Case-insensitive normalized
      const id3 = computeSegmentId('Different text', 1000);
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^seg_[0-9a-f]{12}$/);
      expect(id1).not.toBe(id3);
    });
  });
});
