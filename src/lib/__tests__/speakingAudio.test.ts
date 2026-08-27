import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateSpeakingTelemetry } from '../speakingTelemetry';
import { interpretSpeakingAnalyzeRequest } from '../speakingAnalyze';
import {
  canonicalExamDurationSeconds,
  composeSpeakingTurnsForAnalysis,
  decodeWavPcm16,
  encodePcm16Wav,
  measuredDurationSeconds,
  measureSpeechSegmentsFromBlob,
  totalTurnDurationSeconds,
  type RecordedTurnAudio,
} from '../speakingAudio';

const SAMPLE_RATE = 16_000;

function toneTurn(durationSeconds: number, frequency: number): RecordedTurnAudio {
  const frameCount = Math.round(durationSeconds * SAMPLE_RATE);
  const samples = new Int16Array(frameCount);
  const speechUntil = Math.floor(frameCount * 0.8);
  for (let index = 0; index < speechUntil; index += 1) {
    samples[index] = Math.round(Math.sin((2 * Math.PI * frequency * index) / SAMPLE_RATE) * 12_000);
  }
  const wav = encodePcm16Wav(samples, SAMPLE_RATE);
  return {
    blob: new Blob([wav], { type: 'audio/wav' }),
    mimeType: 'audio/wav',
    durationSeconds,
    startedAtMs: 0,
    endedAtMs: durationSeconds * 1000,
    speechSegments: [{ start: 0, end: Number((speechUntil / SAMPLE_RATE).toFixed(3)) }],
  };
}

describe('speaking audio helpers', () => {
  it('measures duration from real timestamps instead of a hard-coded 20s', () => {
    expect(measuredDurationSeconds(1_000, 2_450)).toBe(1.45);
    expect(measuredDurationSeconds(5_000, 5_000)).toBe(0);
  });

  it('sums two recorded turns as 5.5s once, not 11s', () => {
    const recorded = [
      { durationSeconds: 2 },
      { durationSeconds: 3.5 },
    ];
    expect(totalTurnDurationSeconds(recorded)).toBe(5.5);
    expect(canonicalExamDurationSeconds({
      durationSeconds: 5.5,
      decodedTurnCount: 2,
      expectedTurnCount: 2,
    }, recorded)).toBe(5.5);
    expect(canonicalExamDurationSeconds({
      durationSeconds: 5.5,
      decodedTurnCount: 2,
      expectedTurnCount: 2,
    }, recorded)).not.toBe(11);
    const doubled = totalTurnDurationSeconds(recorded) + totalTurnDurationSeconds(recorded);
    expect(doubled).toBe(11);
  });

  it('remuxes independently recorded turns into one valid WAV the decoder reads in full', async () => {
    const first = toneTurn(2, 440);
    const second = toneTurn(3.5, 660);
    const composed = await composeSpeakingTurnsForAnalysis([first, second]);
    expect(composed.decodedTurnCount).toBe(2);
    expect(composed.expectedTurnCount).toBe(2);
    expect(composed.durationSeconds).toBeCloseTo(5.5, 2);
    expect(composed.durationSeconds).not.toBe(11);
    expect(composed.audioBase64).toBeTruthy();
    expect(composed.mimeType).toBe('audio/wav');
    expect(composed.acousticStatus).toBe('measured');
    expect(canonicalExamDurationSeconds(composed, [first, second])).toBeCloseTo(5.5, 2);

    const decoded = decodeWavPcm16(Buffer.from(composed.audioBase64 || '', 'base64'));
    expect(decoded).not.toBeNull();
    expect(decoded?.durationSeconds).toBeCloseTo(5.5, 2);
    expect(decoded?.durationSeconds).toBeCloseTo(composed.durationSeconds, 3);

    const laterSegment = (composed.speechSegments || []).find((segment) => segment.start >= 1.9);
    expect(laterSegment).toBeTruthy();
    expect(laterSegment!.end).toBeGreaterThan(2.5);

    const telemetry = calculateSpeakingTelemetry({
      transcript: 'My hometown is quiet then I describe the coast.',
      durationSeconds: composed.durationSeconds,
      speechSegments: composed.speechSegments,
    });
    expect(telemetry.acousticStatus).toBe('measured');
    const doubled = calculateSpeakingTelemetry({
      transcript: 'My hometown is quiet then I describe the coast.',
      durationSeconds: 11,
      speechSegments: composed.speechSegments,
    });
    expect(telemetry.rawWpm).toBeGreaterThan(doubled.rawWpm);
  });

  it('does not treat byte-concatenated independent containers as a valid multi-turn recording', async () => {
    const first = toneTurn(2, 440);
    const second = toneTurn(3.5, 660);
    const naive = new Blob([first.blob, second.blob], { type: 'audio/wav' });
    const naiveDecoded = decodeWavPcm16(new Uint8Array(await naive.arrayBuffer()));
    expect(naiveDecoded?.durationSeconds).toBeCloseTo(2, 1);
    expect(naiveDecoded?.durationSeconds).not.toBeCloseTo(5.5, 1);

    const composed = await composeSpeakingTurnsForAnalysis([first, second]);
    const remuxed = decodeWavPcm16(Buffer.from(composed.audioBase64 || '', 'base64'));
    expect(remuxed?.durationSeconds).toBeCloseTo(5.5, 2);
  });

  it('marks acoustic metrics unavailable when a turn cannot be decoded', async () => {
    const valid = toneTurn(2, 440);
    const invalid: RecordedTurnAudio = {
      blob: new Blob(['not-a-container'], { type: 'audio/webm' }),
      mimeType: 'audio/webm',
      durationSeconds: 3.5,
      startedAtMs: 0,
      endedAtMs: 3500,
      speechSegments: [{ start: 0, end: 3 }],
    };
    const composed = await composeSpeakingTurnsForAnalysis([valid, invalid]);
    expect(composed.durationSeconds).toBe(5.5);
    expect(composed.audioBase64).toBeNull();
    expect(composed.speechSegments).toBeNull();
    expect(composed.acousticStatus).toBe('unavailable');
    expect(composed.decodedTurnCount).toBeLessThan(composed.expectedTurnCount);
    expect(canonicalExamDurationSeconds(composed, [valid, invalid])).toBe(5.5);
    const telemetry = calculateSpeakingTelemetry({
      transcript: 'I live near the sea.',
      durationSeconds: composed.durationSeconds,
      speechSegments: composed.speechSegments,
    });
    expect(telemetry.acousticStatus).toBe('unavailable');
    expect(telemetry.longPauses).toBeNull();
  });

  it('returns unavailable VAD segments when the blob is not decodable audio', async () => {
    const measured = await measureSpeechSegmentsFromBlob(new Blob(['not-audio'], { type: 'audio/webm' }));
    expect(measured.speechSegments).toBeNull();
  });

  it('decodes the committed English canary fixture as real PCM, not a tone', () => {
    const wav = decodeWavPcm16(new Uint8Array(readFileSync(resolve(process.cwd(), 'scripts/fixtures/speaking-canary-hometown.wav'))));
    expect(wav).not.toBeNull();
    expect(wav?.sampleRate).toBe(16_000);
    expect(wav?.durationSeconds).toBeGreaterThan(2);
    expect(wav?.samples.length).toBeGreaterThan(16_000);

    const hop = Math.floor((wav?.sampleRate || SAMPLE_RATE) * 0.02);
    const zcrs: number[] = [];
    const samples = wav!.samples;
    for (let offset = 0; offset + hop < samples.length; offset += hop) {
      let crossings = 0;
      for (let index = 1; index < hop; index += 1) {
        if ((samples[offset + index] >= 0) !== (samples[offset + index - 1] >= 0)) crossings += 1;
      }
      zcrs.push(crossings);
    }
    const buckets = new Set(zcrs.map((value) => Math.round(value / 8)));
    expect(buckets.size).toBeGreaterThan(2);
  });
});

describe('speaking analyze duration is not double-counted', () => {
  it('uses totalDurationSeconds 5.5 from two recorded turns, not 11', () => {
    const body = {
      fullAudioBase64: 'A'.repeat(80),
      conversationHistory: [
        { part: 'part_1' as const, userTranscript: 'My hometown is quiet', durationSeconds: 2 },
        { part: 'part_1' as const, userTranscript: 'It is a coastal city', durationSeconds: 3.5 },
      ],
      totalDurationSeconds: 5.5,
      speechSegments: [{ start: 0, end: 1.6 }, { start: 2.1, end: 4.9 }],
      consentStorage: false,
    };
    const result = interpretSpeakingAnalyzeRequest(body);
    expect(result.ok).toBe(true);
    expect(result.request?.totalDurationSeconds).toBe(5.5);
    expect(result.telemetry.rawWpm).toBe(Math.round((9 / 5.5) * 60));
    expect(result.telemetry.acousticStatus).toBe('measured');

    const doubled = interpretSpeakingAnalyzeRequest({ ...body, totalDurationSeconds: 11 });
    expect(doubled.telemetry.rawWpm).toBe(Math.round((9 / 11) * 60));
    expect(result.telemetry.rawWpm).toBeGreaterThan(doubled.telemetry.rawWpm);
  });
});
