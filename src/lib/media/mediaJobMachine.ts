import { setup, assign } from 'xstate';
import type { MediaTranscriptState } from '../../types/media';

export interface MediaJobContext {
  failureCategory?: string;
  failureMessage?: string;
  transcriptState?: MediaTranscriptState;
  mediaPlayable?: boolean;
  coverageRatio?: number;
  segmentsCount?: number;
}

export type MediaJobEvent =
  | { type: 'START_PROBING' }
  | { type: 'PROBE_YOUTUBE_SUCCESS' }
  | { type: 'PROBE_AUDIO_SUCCESS' }
  | { type: 'PROBE_AUDIO_REQUIRES_ORIGINAL'; message: string }
  | { type: 'CAPTIONS_FETCHED'; segmentsCount: number }
  | { type: 'CAPTIONS_NOT_FOUND'; message: string }
  | { type: 'CAPTIONS_FAILED'; category: string; message: string }
  | { type: 'AUDIO_TRANSCRIBED'; segmentsCount: number }
  | { type: 'TRANSCRIPTION_FAILED'; category: string; message: string }
  | { type: 'NORMALIZED' }
  | { type: 'VALIDATION_PASSED'; coverageRatio: number }
  | { type: 'VALIDATION_DEGRADED'; issue: 'coverage_insufficient' }
  | { type: 'VALIDATION_NEEDS_REVIEW'; issue: 'SUBTITLE_PARSE_ERROR'; message: string }
  | { type: 'VALIDATION_FAILED'; category: string; message: string }
  | { type: 'MEDIA_UNAVAILABLE'; category: string; message: string };

/**
 * Pure XState v5 state machine for Media Ingestion & Lifecycle.
 * Implements truthful availability:
 * - No-caption YouTube degrades to degraded + unavailable_transcript with mediaPlayable: true.
 * - P03 audio without playable artifact resolves to requires_original_audio.
 * - Malformed subtitles transition to needs_review without fabricated timings.
 */
export function createMediaJobMachine() {
  return setup({
    types: {
      context: {} as MediaJobContext,
      events: {} as MediaJobEvent,
    },
  }).createMachine({
    id: 'mediaJob',
    initial: 'queued',
    context: {},
    states: {
      queued: {
        on: {
          START_PROBING: 'probing',
        },
      },
      probing: {
        on: {
          PROBE_YOUTUBE_SUCCESS: 'captions',
          PROBE_AUDIO_SUCCESS: 'transcribing',
          PROBE_AUDIO_REQUIRES_ORIGINAL: {
            target: 'requires_original_audio',
            actions: assign({
              failureMessage: ({ event }) => event.message,
              mediaPlayable: () => false,
            }),
          },
          MEDIA_UNAVAILABLE: {
            target: 'unavailable',
            actions: assign({
              failureCategory: ({ event }) => event.category,
              failureMessage: ({ event }) => event.message,
              mediaPlayable: () => false,
            }),
          },
        },
      },
      captions: {
        on: {
          CAPTIONS_FETCHED: {
            target: 'normalizing',
            actions: assign({
              segmentsCount: ({ event }) => event.segmentsCount,
            }),
          },
          CAPTIONS_NOT_FOUND: {
            target: 'degraded',
            actions: assign({
              transcriptState: () => 'unavailable_transcript' as const,
              mediaPlayable: () => true, // Truthfully represents original player availability
              failureMessage: ({ event }) => event.message,
            }),
          },
          CAPTIONS_FAILED: {
            target: 'failed',
            actions: assign({
              failureCategory: ({ event }) => event.category,
              failureMessage: ({ event }) => event.message,
            }),
          },
          MEDIA_UNAVAILABLE: {
            target: 'unavailable',
            actions: assign({
              failureCategory: ({ event }) => event.category,
              failureMessage: ({ event }) => event.message,
            }),
          },
        },
      },
      transcribing: {
        on: {
          AUDIO_TRANSCRIBED: {
            target: 'normalizing',
            actions: assign({
              segmentsCount: ({ event }) => event.segmentsCount,
            }),
          },
          TRANSCRIPTION_FAILED: {
            target: 'failed',
            actions: assign({
              failureCategory: ({ event }) => event.category,
              failureMessage: ({ event }) => event.message,
            }),
          },
          MEDIA_UNAVAILABLE: {
            target: 'unavailable',
            actions: assign({
              failureCategory: ({ event }) => event.category,
              failureMessage: ({ event }) => event.message,
            }),
          },
        },
      },
      normalizing: {
        on: {
          NORMALIZED: 'validating',
        },
      },
      validating: {
        on: {
          VALIDATION_PASSED: {
            target: 'ready',
            actions: assign({
              coverageRatio: ({ event }) => event.coverageRatio,
              transcriptState: () => 'ready' as const,
              mediaPlayable: () => true,
            }),
          },
          VALIDATION_DEGRADED: {
            target: 'degraded',
            actions: assign({
              transcriptState: () => 'coverage_insufficient' as const,
              mediaPlayable: () => true,
            }),
          },
          VALIDATION_NEEDS_REVIEW: {
            target: 'needs_review',
            actions: assign({
              transcriptState: () => 'needs_review' as const,
              failureMessage: ({ event }) => event.message,
            }),
          },
          VALIDATION_FAILED: {
            target: 'failed',
            actions: assign({
              failureCategory: ({ event }) => event.category,
              failureMessage: ({ event }) => event.message,
            }),
          },
        },
      },
      ready: {
        type: 'final',
      },
      degraded: {
        type: 'final',
      },
      needs_review: {
        type: 'final',
      },
      unavailable: {
        type: 'final',
      },
      failed: {
        type: 'final',
      },
      requires_original_audio: {
        type: 'final',
      },
    },
  });
}
