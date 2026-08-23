export interface MockValidationResult {
  ready: boolean;
  errors: string[];
  counts: { listening: number; reading: number; writing: number; speaking: number };
}

export type MockSkill = 'listening' | 'reading' | 'writing' | 'speaking';

export interface MockSkillValidationResult {
  ready: boolean;
  errors: string[];
  count: number;
}

const questionCount = (sections: unknown): number => Array.isArray(sections)
  ? sections.reduce((total, section) => total + (Array.isArray((section as any)?.questions) ? (section as any).questions.length : 0), 0)
  : 0;

export function validateMockSkill(skill: MockSkill, value: unknown): MockSkillValidationResult {
  const section = value as any;
  const errors: string[] = [];
  let count = 0;

  if (skill === 'listening') {
    count = questionCount(section?.sections);
    if (count !== 40) errors.push(`Listening phải có đúng 40 câu (hiện có ${count}).`);
    if (!section?.audioTranscript && !section?.audioArtifact?.audioUrl) {
      errors.push('Listening thiếu transcript hoặc audio đã kiểm định.');
    }
  } else if (skill === 'reading') {
    count = questionCount(section?.passages);
    if (count !== 40) errors.push(`Reading phải có đúng 40 câu (hiện có ${count}).`);
  } else if (skill === 'writing') {
    count = Number(Boolean(section?.task1?.prompt)) + Number(Boolean(section?.task2?.prompt));
    if (count !== 2) errors.push('Writing phải có đúng Task 1 và Task 2.');
  } else {
    count = Number(Array.isArray(section?.part1?.questions) && section.part1.questions.length > 0)
      + Number(Boolean(section?.part2?.cueCard?.prompt))
      + Number(Array.isArray(section?.part3?.questions) && section.part3.questions.length > 0);
    if (count !== 3) errors.push('Speaking phải có đủ Part 1, Part 2 và Part 3.');
  }

  return { ready: errors.length === 0, errors, count };
}

export function validateMockPackage(value: unknown): MockValidationResult {
  const pkg = value as any;
  const results = {
    listening: validateMockSkill('listening', pkg?.listening),
    reading: validateMockSkill('reading', pkg?.reading),
    writing: validateMockSkill('writing', pkg?.writing),
    speaking: validateMockSkill('speaking', pkg?.speaking),
  };
  const errors = Object.values(results).flatMap(result => result.errors);
  const { count: listening } = results.listening;
  const { count: reading } = results.reading;
  const { count: writing } = results.writing;
  const { count: speaking } = results.speaking;
  return { ready: errors.length === 0, errors, counts: { listening, reading, writing, speaking } };
}
