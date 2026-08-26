export interface SpeechSegment {
  start: number;
  end: number;
}
export interface SpeakingPartTrend {
  part: 'part_1' | 'part_2' | 'part_3';
  rawWpm: number;
  fillerCount: number;
  fillerRatePer100Words: number;
  speechRatio: number | null;
  acousticStatus: 'measured' | 'unavailable';
}
export interface SpeakingTelemetry {
  rawWpm: number;
  articulationRate: number | null;
  fillerCount: number;
  fillerRatePer100Words: number;
  silentPauses: Array<{ start: number; end: number; duration: number }> | null;
  averagePauseDuration: number | null;
  longPauses: number | null;
  speechRatio: number | null;
  acousticStatus: 'measured' | 'unavailable';
  vadVersion: string | null;
  partTrends: SpeakingPartTrend[] | null;
}

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const FILLER_PATTERN = /\b(?:um+|uh+|erm+|you know|basically|like)\b/gi;

export function calculateSpeakingTelemetry(input: {
  transcript: string;
  durationSeconds: number;
  speechSegments: SpeechSegment[] | null;
  vadVersion?: string;
  partTrends?: SpeakingPartTrend[] | null;
}): SpeakingTelemetry {
  const words = input.transcript.match(WORD_PATTERN) ?? [];
  const duration = Math.max(0, input.durationSeconds);
  const rawWpm = duration > 0 ? Math.round((words.length / duration) * 60) : 0;
  const fillerCount = input.transcript.match(FILLER_PATTERN)?.length ?? 0;
  const fillerRatePer100Words = words.length ? Number(((fillerCount / words.length) * 100).toFixed(1)) : 0;

  if (!input.speechSegments?.length || duration <= 0) {
    return {
      rawWpm,
      articulationRate: null,
      fillerCount,
      fillerRatePer100Words,
      silentPauses: null,
      averagePauseDuration: null,
      longPauses: null,
      speechRatio: null,
      acousticStatus: 'unavailable',
      vadVersion: null,
      partTrends: input.partTrends ?? null,
    };
  }

  const segments = [...input.speechSegments]
    .map((segment) => ({ start: Math.max(0, segment.start), end: Math.min(duration, segment.end) }))
    .filter((segment) => segment.end > segment.start)
    .sort((a, b) => a.start - b.start);
  const speechSeconds = segments.reduce((total, segment) => total + segment.end - segment.start, 0);
  const pauses = segments.slice(1).map((segment, index) => ({
    start: segments[index].end,
    end: segment.start,
    duration: Number(Math.max(0, segment.start - segments[index].end).toFixed(3)),
  })).filter((pause) => pause.duration > 0.25);

  return {
    rawWpm,
    articulationRate: speechSeconds > 0 ? Math.round((words.length / speechSeconds) * 60) : null,
    fillerCount,
    fillerRatePer100Words,
    silentPauses: pauses,
    averagePauseDuration: pauses.length
      ? Number((pauses.reduce((sum, pause) => sum + pause.duration, 0) / pauses.length).toFixed(2))
      : 0,
    longPauses: pauses.filter((pause) => pause.duration > 1.5).length,
    speechRatio: Number((speechSeconds / duration).toFixed(3)),
    acousticStatus: 'measured',
    vadVersion: input.vadVersion ?? 'client-vad',
    partTrends: input.partTrends ?? null,
  };
}

export function calculatePartTrend(input: {
  part: SpeakingPartTrend['part'];
  transcript: string;
  durationSeconds: number;
  speechSegments: SpeechSegment[] | null;
}): SpeakingPartTrend {
  const metrics = calculateSpeakingTelemetry({
    transcript: input.transcript,
    durationSeconds: input.durationSeconds,
    speechSegments: input.speechSegments,
  });
  return {
    part: input.part,
    rawWpm: metrics.rawWpm,
    fillerCount: metrics.fillerCount,
    fillerRatePer100Words: metrics.fillerRatePer100Words,
    speechRatio: metrics.speechRatio,
    acousticStatus: metrics.acousticStatus,
  };
}
