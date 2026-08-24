import { describe, expect, it } from 'vitest';
import {
  normalizeMockSkill,
  validateMockPackage,
  validateMockSkill,
  validateListeningSection,
  validateSpeakingPart,
  validateMockSourcePreservation,
} from '../mockPackageValidator';

const question = (number: number, sectionIndex = 0) => ({
  id: `q_${number}`,
  number,
  sectionIndex,
  type: 'gap_fill',
  prompt: `Question ${number}`,
  correctAnswer: `answer ${number}`,
  explanationVi: `Giải thích ${number}`,
});

const validSpeaking = {
  examinerName: 'Omni Examiner',
  examinerAvatar: '',
  part1: { topic: 'Study', questions: ['What do you study?'] },
  part2: {
    cueCard: {
      topic: 'A useful object',
      prompt: 'Describe a useful object you own.',
      bulletPoints: ['what it is', 'how you use it'],
      prepTimeSeconds: 60,
      speakTimeSeconds: 120,
    },
  },
  part3: { topic: 'Technology', questions: ['How does technology change daily life?'] },
};

describe('validateMockPackage', () => {
  it('accepts only a complete ten-question Listening section with its assigned number range', () => {
    const section = {
      sectionNumber: 2,
      title: 'Section 2',
      context: 'A workplace conversation',
      audioScriptExcerpt: 'A complete script containing all ten answers.',
      instructionsVi: 'Nghe và trả lời câu hỏi 11 đến 20.',
      questions: Array.from({ length: 10 }, (_, index) => question(index + 11, 1)),
    };

    expect(validateListeningSection(2, section)).toMatchObject({ ready: true, count: 10 });
    expect(validateListeningSection(2, {
      ...section,
      questions: section.questions.map((item, index) => index === 9 ? { ...item, number: 21 } : item),
    })).toMatchObject({ ready: false, count: 10, code: 'count_invalid' });
    expect(validateListeningSection(2, {
      ...section,
      questions: section.questions.slice(0, 9),
    })).toMatchObject({ ready: false, count: 9, code: 'count_invalid' });
  });

  it('rejects summary-only assembler output that cannot enter the exam room', () => {
    const result = validateMockPackage({
      id: 'summary',
      listening: { sections: [] },
      reading: { passages: [] },
      writing: {},
      speaking: {},
    });
    expect(result.ready).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Listening'),
      expect.stringContaining('Reading'),
      expect.stringContaining('Writing'),
      expect.stringContaining('Speaking'),
    ]));
  });

  it('validates staged skills independently so a failed skill can be retried', () => {
    const listening = {
      title: 'Listening',
      audioTranscript: 'A complete transcript',
      sections: Array.from({ length: 4 }, (_, sectionIndex) => ({
        sectionNumber: sectionIndex + 1,
        title: `Section ${sectionIndex + 1}`,
        context: 'Academic conversation',
        audioScriptExcerpt: 'A complete transcript',
        instructionsVi: 'Điền đáp án.',
        questions: Array.from({ length: 10 }, (_, index) => question(sectionIndex * 10 + index + 1, sectionIndex)),
      })),
    };

    expect(validateMockSkill('listening', listening).ready).toBe(true);
    expect(validateMockSkill('reading', { passages: [{ questions: [] }] }).ready).toBe(false);
    expect(validateMockSkill('writing', { task1: { prompt: 'Task 1' }, task2: {} }).errors)
      .toContain('Writing phải có đúng Task 1 và Task 2.');
  });

  it('normalizes only the safe topics alias before validating a Speaking part', () => {
    const normalized = normalizeMockSkill('speaking', {
      ...validSpeaking,
      part1: { topics: ['Study'], questions: ['What do you study?'] },
      part3: { topics: 'Technology', questions: ['How does technology change daily life?'] },
    }) as typeof validSpeaking;

    expect(normalized.part1.topic).toBe('Study');
    expect(normalized.part3.topic).toBe('Technology');
    expect(validateMockSkill('speaking', normalized).ready).toBe(true);
  });

  it.each(['part1', 'part2', 'part3'] as const)('reports the exact missing Speaking %s', (part) => {
    const broken = structuredClone(validSpeaking) as Record<string, unknown>;
    delete broken[part];

    const result = validateMockSkill('speaking', broken);

    expect(result.ready).toBe(false);
    expect(result.errors.join(' ')).toContain(`Speaking ${part}`);
  });

  it('rejects schema-invalid Speaking content instead of accepting a truthy placeholder', () => {
    const result = validateSpeakingPart('part2', {
      cueCard: {
        topic: 'Travel',
        prompt: true,
        bulletPoints: 'where you went',
        prepTimeSeconds: '60',
        speakTimeSeconds: 120,
      },
    });

    expect(result.ready).toBe(false);
    expect(result.code).toBe('schema_invalid');
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('prompt'),
      expect.stringContaining('bulletPoints'),
      expect.stringContaining('prepTimeSeconds'),
    ]));
  });

  it('requires a Live Hub source prompt to remain verbatim in its target Mock section', () => {
    const source = {
      id: 'source-writing',
      skill: 'writing_task2',
      promptStatement: 'Discuss whether university education should be free.',
    } as any;

    expect(validateMockSourcePreservation('writing', {
      task2: { prompt: source.promptStatement },
    }, source)).toEqual([]);
    expect(validateMockSourcePreservation('writing', {
      task2: { prompt: 'A rewritten prompt with a different meaning.' },
    }, source)).toEqual([expect.stringContaining('giữ nguyên nguyên văn')]);
  });
});
