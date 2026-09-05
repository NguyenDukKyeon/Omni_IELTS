import { describe, it, expect } from 'vitest';
import {
  validateTranscriptCoverage,
  parseSubtitleCues,
} from '../media/transcriptValidator';
import { normalizeRollingCaptions } from '../media/transcriptNormalizer';
import { computeTranscriptHash, computeSegmentId } from '../media/contentHash';
import { createMediaJobMachine } from '../media/mediaJobMachine';
import { createActor } from 'xstate';
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

    it('enforces max 50ms overlap tolerance between consecutive segments', () => {
      // 50ms overlap allowed
      const validOverlap: MediaTranscriptSegment[] = [
        { id: 's1', index: 0, startMs: 0, endMs: 10000, text: 'Seg 1', confidence: 'high' },
        { id: 's2', index: 1, startMs: 9950, endMs: 20000, text: 'Seg 2', confidence: 'high' },
      ];
      expect(validateTranscriptCoverage(validOverlap, 20000).valid).toBe(true);

      // 51ms overlap rejected
      const invalidOverlap: MediaTranscriptSegment[] = [
        { id: 's1', index: 0, startMs: 0, endMs: 10000, text: 'Seg 1', confidence: 'high' },
        { id: 's2', index: 1, startMs: 9949, endMs: 20000, text: 'Seg 2', confidence: 'high' },
      ];
      const res = validateTranscriptCoverage(invalidOverlap, 20000);
      expect(res.valid).toBe(false);
      expect(res.issue).toBe('timestamps_invalid');
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

    const makeSeg = (
      startMs: number,
      endMs: number,
      text = 'Valid transcript line.',
      id = 'seg_test',
      index = 0,
    ): MediaTranscriptSegment => ({
      id,
      index,
      startMs,
      endMs,
      text,
      confidence: 'high',
    });

    it('rejects segments outside duration bounds [0, durationMs] (case a)', () => {
      const result = validateTranscriptCoverage([makeSeg(2000, 3000)], 1000);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('timestamps_invalid');
    });

    it('rejects zero duration media (case b)', () => {
      const result = validateTranscriptCoverage([makeSeg(0, 1000)], 0);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('timestamps_invalid');
      expect(result.coverageRatio).toBe(0);
    });

    it('rejects coverage below 65% when rounded display might round to 0.65 (case c)', () => {
      const result = validateTranscriptCoverage([makeSeg(0, 6496)], 10000);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('coverage_insufficient');
    });

    it('accepts coverage at exactly 65% threshold (case d)', () => {
      const result = validateTranscriptCoverage([makeSeg(0, 6500)], 10000);
      expect(result.valid).toBe(true);
      expect(result.coverageRatio).toBe(0.65);
      expect(result.issue).toBeUndefined();
    });

    it('calculates coverage as interval union without double-counting tolerated overlap (case e)', () => {
      const intervals = [
        makeSeg(0, 3300, 'First segment', 's1', 0),
        makeSeg(3250, 6496, 'Second segment', 's2', 1),
      ];
      const result = validateTranscriptCoverage(intervals, 10000);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('coverage_insufficient');
    });

    it('rejects overlap exceeding 50ms tolerance with timestamps_invalid (case f)', () => {
      const invalidOverlap = [
        makeSeg(0, 10000, 'First segment', 's1', 0),
        makeSeg(9949, 20000, 'Second segment', 's2', 1),
      ];
      const result = validateTranscriptCoverage(invalidOverlap, 20000);
      expect(result.valid).toBe(false);
      expect(result.issue).toBe('timestamps_invalid');
    });

    it('rejects zero-duration, negative, fractional, NaN, and Infinity timestamps (case g)', () => {
      expect(validateTranscriptCoverage([makeSeg(1000, 1000)], 10000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(1000, 1000)], 10000).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(-100, 1000)], 10000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(-100, 1000)], 10000).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(0, -1000)], 10000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(0, -1000)], 10000).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(0.5, 1000)], 10000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(0.5, 1000)], 10000).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(0, 1000.5)], 10000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(0, 1000.5)], 10000).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(Number.NaN, 1000)], 10000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(Number.NaN, 1000)], 10000).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(0, Number.NaN)], 10000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(0, Number.NaN)], 10000).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(Number.NEGATIVE_INFINITY, 1000)], 10000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(Number.NEGATIVE_INFINITY, 1000)], 10000).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(0, Number.POSITIVE_INFINITY)], 10000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(0, Number.POSITIVE_INFINITY)], 10000).issue).toBe('timestamps_invalid');
    });

    it('rejects negative, NaN, and Infinity duration (case h)', () => {
      expect(validateTranscriptCoverage([makeSeg(0, 1000)], -1000).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(0, 1000)], -1000).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(0, 1000)], Number.NaN).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(0, 1000)], Number.NaN).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(0, 1000)], Number.POSITIVE_INFINITY).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(0, 1000)], Number.POSITIVE_INFINITY).issue).toBe('timestamps_invalid');

      expect(validateTranscriptCoverage([makeSeg(0, 1000)], Number.NEGATIVE_INFINITY).valid).toBe(false);
      expect(validateTranscriptCoverage([makeSeg(0, 1000)], Number.NEGATIVE_INFINITY).issue).toBe('timestamps_invalid');
    });

    it('differentiates empty array vs whitespace text typed failures (case i)', () => {
      const emptyResult = validateTranscriptCoverage([], 10000);
      expect(emptyResult.valid).toBe(false);
      expect(emptyResult.issue).toBe('empty');
      expect(emptyResult.coverageRatio).toBe(0);

      const whitespaceResult = validateTranscriptCoverage([makeSeg(0, 5000, '   \t\n  ')], 10000);
      expect(whitespaceResult.valid).toBe(false);
      expect(whitespaceResult.issue).toBe('timestamps_invalid');
      expect(whitespaceResult.coverageRatio).toBe(0);
    });

    it('does not mutate input segments or array (case k)', () => {
      const seg1 = makeSeg(0, 3000, 'Segment 1', 's1', 0);
      const seg2 = makeSeg(2980, 7000, 'Segment 2', 's2', 1);
      Object.freeze(seg1);
      Object.freeze(seg2);
      const segments = Object.freeze([seg1, seg2]);

      expect(() => validateTranscriptCoverage(segments as unknown as MediaTranscriptSegment[], 10000)).not.toThrow();
      expect(seg1.startMs).toBe(0);
      expect(seg1.endMs).toBe(3000);
      expect(seg2.startMs).toBe(2980);
      expect(seg2.endMs).toBe(7000);
    });

    it('ensures invalid transcript coverage cannot transition ingestion state machine to ready (case l)', () => {
      const insufficientSegments = [
        makeSeg(0, 3300, 'First segment', 's1', 0),
        makeSeg(3250, 6496, 'Second segment', 's2', 1),
      ];
      const validation = validateTranscriptCoverage(insufficientSegments, 10000);
      expect(validation.valid).toBe(false);

      const machine = createMediaJobMachine();
      const actor = createActor(machine).start();
      actor.send({ type: 'START_PROBING' });
      actor.send({ type: 'PROBE_YOUTUBE_SUCCESS' });
      actor.send({ type: 'CAPTIONS_FETCHED', segmentsCount: insufficientSegments.length });
      actor.send({ type: 'NORMALIZED' });

      if (validation.valid) {
        actor.send({ type: 'VALIDATION_PASSED', coverageRatio: validation.coverageRatio });
      } else if (validation.issue === 'coverage_insufficient') {
        actor.send({ type: 'VALIDATION_DEGRADED', issue: 'coverage_insufficient' });
      } else {
        actor.send({ type: 'VALIDATION_FAILED', category: 'VALIDATION_ERROR', message: 'Invalid timestamps' });
      }

      expect(actor.getSnapshot().value).toBe('degraded');
      expect(actor.getSnapshot().value).not.toBe('ready');
      expect(actor.getSnapshot().context.transcriptState).toBe('coverage_insufficient');
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
