import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GEMINI_LIVE_VOICE,
  GEMINI_LIVE_VOICE_IDS,
  PART_1_QUESTION_COUNT,
  PART_3_QUESTION_COUNT,
  bargeInAllowedForPart,
  encodeExamDataMessage,
  nextQuestionIndexAfterAnswer,
  parseExamDataMessage,
  questionForPart,
  resolveGeminiLiveVoiceId,
  speakingControlIds,
} from '../speakingExamProtocol';

describe('speaking exam protocol', () => {
  it('resolves only allowlisted Gemini Live voices and defaults to Kore', () => {
    expect(resolveGeminiLiveVoiceId('Puck')).toBe('Puck');
    expect(resolveGeminiLiveVoiceId('Fenrir')).toBe('Fenrir');
    expect(resolveGeminiLiveVoiceId('not-a-voice')).toBe(DEFAULT_GEMINI_LIVE_VOICE);
    expect(resolveGeminiLiveVoiceId('')).toBe('Kore');
    expect(GEMINI_LIVE_VOICE_IDS).toContain('Puck');
  });

  it('advances Part 1 → Part 2 prep → Part 2 speak → Part 3 → finalizing', () => {
    let part: ReturnType<typeof nextQuestionIndexAfterAnswer>['nextPart'] = 'part_1';
    let index = 0;
    for (let question = 0; question < PART_1_QUESTION_COUNT - 1; question += 1) {
      const next = nextQuestionIndexAfterAnswer('part_1', question);
      expect(next.nextPart).toBe('part_1');
      index = next.nextIndex;
    }
    expect(index).toBe(PART_1_QUESTION_COUNT - 1);
    expect(nextQuestionIndexAfterAnswer('part_1', PART_1_QUESTION_COUNT - 1)).toEqual({
      nextPart: 'part_2_preparation',
      nextIndex: 0,
    });
    expect(nextQuestionIndexAfterAnswer('part_2_preparation', 0)).toEqual({
      nextPart: 'part_2_speaking',
      nextIndex: 0,
    });
    expect(nextQuestionIndexAfterAnswer('part_2_speaking', 0)).toEqual({
      nextPart: 'part_3',
      nextIndex: 0,
    });
    for (let question = 0; question < PART_3_QUESTION_COUNT - 1; question += 1) {
      expect(nextQuestionIndexAfterAnswer('part_3', question).nextPart).toBe('part_3');
    }
    expect(nextQuestionIndexAfterAnswer('part_3', PART_3_QUESTION_COUNT - 1).nextPart).toBe('finalizing');
    expect(part).toBe('part_1');
  });

  it('allows barge-in only in Part 1 and Part 3', () => {
    expect(bargeInAllowedForPart('part_1')).toBe(true);
    expect(bargeInAllowedForPart('part_3')).toBe(true);
    expect(bargeInAllowedForPart('part_2_preparation')).toBe(false);
    expect(bargeInAllowedForPart('part_2_speaking')).toBe(false);
  });

  it('round-trips exam data messages through Zod and rejects garbage', () => {
    const encoded = encodeExamDataMessage({
      type: 'exam_state',
      state: 'part_2_preparation',
      questionIndex: 0,
      question: questionForPart('part_2_preparation', 0),
    });
    expect(parseExamDataMessage(encoded)).toMatchObject({
      type: 'exam_state',
      state: 'part_2_preparation',
    });
    expect(parseExamDataMessage('{"type":"nope"}')).toBeNull();
    expect(parseExamDataMessage('not-json')).toBeNull();
  });

  it('exports unique speaking control ids used by the UX proof gate', () => {
    const ids = Object.values(speakingControlIds());
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      'start-realtime-session',
      'reconnect',
      'resume-interrupted-session',
      'retry-provider',
      'switch-to-turn-based-from-permission',
    ]));
  });
});
