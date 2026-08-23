import { z } from 'zod';

export interface MockValidationResult {
  ready: boolean;
  errors: string[];
  counts: { listening: number; reading: number; writing: number; speaking: number };
}

export type MockSkill = 'listening' | 'reading' | 'writing' | 'speaking';
export type MockSpeakingPart = 'part1' | 'part2' | 'part3';

export interface MockSkillValidationResult {
  ready: boolean;
  errors: string[];
  count: number;
  code?: 'schema_invalid' | 'count_invalid';
}

export interface MockSpeakingPartValidationResult {
  ready: boolean;
  errors: string[];
  code?: 'schema_invalid';
  data?: unknown;
}

const nonEmpty = z.string().trim().min(1);
const questionType = z.enum([
  'multiple_choice', 'gap_fill', 'true_false_not_given', 'yes_no_not_given',
  'matching_headings', 'matching_features', 'map_labelling', 'sentence_completion',
]);

const MockQuestionSchema = z.object({
  id: nonEmpty,
  number: z.number().int().min(1).max(40),
  sectionIndex: z.number().int().min(0).max(3),
  type: questionType,
  prompt: nonEmpty,
  options: z.array(nonEmpty).optional(),
  correctAnswer: nonEmpty,
  acceptableAnswers: z.array(nonEmpty).optional(),
  explanationVi: nonEmpty,
  locationHint: nonEmpty.optional(),
  trapWarning: nonEmpty.optional(),
  relatedGrammarTopicId: nonEmpty.optional(),
  relatedVocab: z.array(nonEmpty).optional(),
}).strict();

const ListeningSchema = z.object({
  title: nonEmpty,
  audioTranscript: nonEmpty.optional(),
  audioArtifact: z.object({
    provider: z.literal('gemini').optional(),
    contentHash: nonEmpty.optional(),
    mimeType: nonEmpty.optional(),
    audioUrl: nonEmpty.optional(),
    audioBase64: nonEmpty.optional(),
    durationSeconds: z.number().positive().optional(),
    validation: z.object({ valid: z.literal(true), warnings: z.array(z.string()) }).strict(),
  }).strict().optional(),
  sections: z.array(z.object({
    sectionNumber: z.number().int().min(1).max(4),
    title: nonEmpty,
    context: nonEmpty,
    audioScriptExcerpt: nonEmpty,
    instructionsVi: nonEmpty,
    questions: z.array(MockQuestionSchema).min(1),
    mapData: z.object({
      title: nonEmpty,
      locations: z.array(z.object({ letter: nonEmpty, name: nonEmpty, x: z.number(), y: z.number() }).strict()),
    }).strict().optional(),
  }).strict()).length(4),
}).strict().superRefine((value, context) => {
  if (!value.audioTranscript && !value.audioArtifact?.audioUrl && !value.audioArtifact?.audioBase64) {
    context.addIssue({ code: 'custom', path: ['audioArtifact'], message: 'thiếu transcript hoặc audio đã kiểm định' });
  }
});

const ReadingSchema = z.object({
  title: nonEmpty,
  passages: z.array(z.object({
    passageNumber: z.number().int().min(1).max(3),
    title: nonEmpty,
    subtitle: z.string(),
    wordCount: z.number().int().positive(),
    paragraphs: z.array(z.object({ label: nonEmpty, text: nonEmpty }).strict()).min(1),
    headingsList: z.array(z.object({ id: nonEmpty, text: nonEmpty }).strict()).optional(),
    featuresList: z.object({
      category: nonEmpty,
      items: z.array(z.object({ id: nonEmpty, name: nonEmpty }).strict()).min(1),
    }).strict().optional(),
    questions: z.array(MockQuestionSchema).min(1),
  }).strict()).length(3),
}).strict();

const WritingSchema = z.object({
  title: nonEmpty,
  task1: z.object({
    category: z.enum(['Bar Chart', 'Line Graph', 'Pie Chart', 'Table', 'Process', 'Map']),
    prompt: nonEmpty,
    chartData: z.object({
      labels: z.array(z.string()),
      datasets: z.array(z.object({
        label: nonEmpty, data: z.array(z.number()), unit: z.string().optional(), color: z.string().optional(),
      }).strict()),
      description: z.string().optional(),
    }).strict().optional(),
    minWords: z.literal(150),
    suggestedMinutes: z.literal(20),
  }).strict(),
  task2: z.object({
    category: z.enum(['Opinion Essay', 'Discussion Essay', 'Problem-Solution', 'Advantages-Disadvantages']),
    prompt: nonEmpty,
    minWords: z.literal(250),
    suggestedMinutes: z.literal(40),
  }).strict(),
}).strict();

export const SpeakingPartSchemas = {
  part1: z.object({ topic: nonEmpty, questions: z.array(nonEmpty).min(1) }).strict(),
  part2: z.object({
    cueCard: z.object({
      topic: nonEmpty,
      prompt: nonEmpty,
      bulletPoints: z.array(nonEmpty).min(1),
      prepTimeSeconds: z.literal(60),
      speakTimeSeconds: z.literal(120),
    }).strict(),
  }).strict(),
  part3: z.object({ topic: nonEmpty, questions: z.array(nonEmpty).min(1) }).strict(),
} satisfies Record<MockSpeakingPart, z.ZodType>;

const SpeakingSchema = z.object({
  examinerName: nonEmpty,
  examinerAvatar: z.string(),
  part1: SpeakingPartSchemas.part1,
  part2: SpeakingPartSchemas.part2,
  part3: SpeakingPartSchemas.part3,
}).strict();

const SkillSchemas = {
  listening: ListeningSchema,
  reading: ReadingSchema,
  writing: WritingSchema,
  speaking: SpeakingSchema,
} satisfies Record<MockSkill, z.ZodType>;

const questionCount = (sections: unknown): number => Array.isArray(sections)
  ? sections.reduce((total, section) => total + (Array.isArray((section as any)?.questions) ? (section as any).questions.length : 0), 0)
  : 0;

function formatIssues(prefix: string, issues: z.core.$ZodIssue[]): string[] {
  return issues.map((issue) => {
    const path = issue.path.length ? `.${issue.path.join('.')}` : '';
    return `${prefix}${path}: ${issue.message}.`;
  });
}

function normalizeTopicAlias(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  const alias = record.topics;
  const topic = record.topic || (typeof alias === 'string'
    ? alias
    : Array.isArray(alias) && alias.length === 1 && typeof alias[0] === 'string'
      ? alias[0]
      : undefined);
  const { topics: _ignored, ...rest } = record;
  return topic ? { ...rest, topic } : rest;
}

export function normalizeMockSkill(skill: MockSkill, value: unknown): unknown {
  if (skill !== 'speaking' || !value || typeof value !== 'object' || Array.isArray(value)) return value;
  const speaking = value as Record<string, unknown>;
  return { ...speaking, part1: normalizeTopicAlias(speaking.part1), part3: normalizeTopicAlias(speaking.part3) };
}

export function validateSpeakingPart(part: MockSpeakingPart, value: unknown): MockSpeakingPartValidationResult {
  const normalized = part === 'part1' || part === 'part3' ? normalizeTopicAlias(value) : value;
  const parsed = SpeakingPartSchemas[part].safeParse(normalized);
  if (!parsed.success) {
    return { ready: false, code: 'schema_invalid', errors: formatIssues(`Speaking ${part}`, parsed.error.issues) };
  }
  return { ready: true, errors: [], data: parsed.data };
}

export function validateMockSkill(skill: MockSkill, value: unknown): MockSkillValidationResult {
  const normalized = normalizeMockSkill(skill, value);
  const section = normalized as any;
  const errors: string[] = [];
  let count = 0;

  if (skill === 'listening') count = questionCount(section?.sections);
  else if (skill === 'reading') count = questionCount(section?.passages);
  else if (skill === 'writing') count = Number(Boolean(section?.task1?.prompt)) + Number(Boolean(section?.task2?.prompt));
  else {
    const parts = (['part1', 'part2', 'part3'] as const).map((part) => validateSpeakingPart(part, section?.[part]));
    errors.push(...parts.flatMap((result) => result.errors));
    count = parts.filter((result) => result.ready).length;
  }

  const parsed = SkillSchemas[skill].safeParse(normalized);
  if (!parsed.success && skill !== 'speaking') errors.push(...formatIssues(skill[0].toUpperCase() + skill.slice(1), parsed.error.issues));
  else if (!parsed.success && errors.length === 0) errors.push(...formatIssues('Speaking', parsed.error.issues));

  if (skill === 'listening' && count !== 40) errors.push(`Listening phải có đúng 40 câu (hiện có ${count}).`);
  if (skill === 'reading' && count !== 40) errors.push(`Reading phải có đúng 40 câu (hiện có ${count}).`);
  if (skill === 'writing' && count !== 2) errors.push('Writing phải có đúng Task 1 và Task 2.');
  if (skill === 'speaking' && count !== 3 && errors.length === 0) errors.push('Speaking phải có đủ Part 1, Part 2 và Part 3.');

  const uniqueErrors = [...new Set(errors)];
  return {
    ready: uniqueErrors.length === 0,
    errors: uniqueErrors,
    count,
    code: uniqueErrors.length ? (parsed.success ? 'count_invalid' : 'schema_invalid') : undefined,
  };
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
