export type ModuleId =
  | 'dashboard'
  | 'sources'
  | 'vocabulary'
  | 'grammar'
  | 'media'
  | 'practice'
  | 'mock_test'
  | 'knowledge'
  | 'profile';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  currentBand: number; // e.g. 5.5
  targetBand: number; // e.g. 7.5
  examDate: string; // ISO date string
  dailyStudyMinutes: number; // target minutes/day, e.g. 45
  todayMinutesSpent: number;
  streak: number; // days
  lastActiveDate: string;
  xp: number;
  level: number;
  completedDiagnostic: boolean;
  skillBands: {
    listening: number;
    reading: number;
    writing: number;
    speaking: number;
  };
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt?: string;
  }>;
}

export type SourceType = 'pdf' | 'url' | 'docx' | 'youtube' | 'text';

export interface ExtractedVocabItem {
  word: string;
  phonetic: string;
  pos: string; // part of speech
  definitionVi: string;
  definitionEn: string;
  exampleEn: string;
  exampleVi: string;
  collocations: string[];
  cefrLevel: 'B1' | 'B2' | 'C1' | 'C2';
}

export interface ExtractedGrammarItem {
  pattern: string;
  formula: string;
  example: string;
  explanation: string;
}

export interface SourceExercise {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ReadingQuestion {
  id: string;
  type: 'true_false_not_given' | 'multiple_choice' | 'sentence_completion';
  question: string;
  options?: string[]; // for multiple choice
  correctAnswer: string;
  explanation: string;
  paragraphReference?: string;
}

export interface ListeningQuestion {
  id: string;
  type: 'multiple_choice' | 'gap_fill';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface DialogueTurn {
  speaker: string; // e.g. "Dr. Watson (Expert)" | "Emma (Student)"
  gender?: 'male' | 'female';
  text: string;
  translationVi?: string;
}

export interface FourSkillLessonPack {
  targetBand: number; // e.g. 7.0
  topicVi: string;
  estimatedCEFR: 'B2' | 'C1' | 'C2';
  
  // 1. Reading
  reading: {
    title: string;
    adaptedPassage: string; // rewritten for the chosen band
    wordCount: number;
    questions: ReadingQuestion[];
  };

  // 2. Listening
  listening: {
    audioScript: string;
    isDialogue: boolean;
    dialogueTurns?: DialogueTurn[];
    questions: ListeningQuestion[];
  };

  // 3. Speaking
  speaking: {
    discussionQuestions: Array<{
      id: string;
      question: string;
      suggestedIdeasVi: string[];
      bandBoostVocab: string[];
    }>;
    geminiLivePrompt: string; // prompt to initiate natural Gemini voice conversation
  };

  // 4. Writing
  writing: {
    taskType: 'Task 1 Summary' | 'Task 2 Opinion / Discussion';
    prompt: string;
    sampleOutline: string[];
    bandDescriptorsFocus: string;
  };
}

export interface LearningSource {
  id: string;
  title: string;
  type: SourceType;
  sourceUrlOrName: string;
  originalContent: string;
  summary: string;
  targetBand?: number;
  extractedVocab: ExtractedVocabItem[];
  extractedGrammar: ExtractedGrammarItem[];
  exercises: SourceExercise[];
  lessonPack?: FourSkillLessonPack;
  lessonsCount: number;
  tags: string[];
  createdAt: string;
}

export interface VocabExample {
  en: string;
  vi: string;
  context?: 'IELTS Task 2' | 'Speaking' | 'General' | 'Reading' | 'Academic';
}

export interface VocabSynonym {
  word: string;
  nuance?: string;
}

export interface VocabCard {
  id: string;
  word: string;
  phonetic: string; // default IPA
  ukPhonetic?: string; // e.g. /ˌpær.ə.daɪm/
  usPhonetic?: string; // e.g. /ˈper.ə.daɪm/
  pos: string; // noun, verb, adj, adv, phrase
  definitionVi: string;
  definitionEn: string;
  definitionAcademicEn?: string; // Oxford/Cambridge academic definition
  exampleEn: string;
  exampleVi: string;
  examples?: VocabExample[]; // 2-3 rich contextual examples
  collocations: string[];
  synonyms?: VocabSynonym[];
  antonyms?: string[];
  mnemonic?: string; // Memory aid/image trigger
  imageUrl?: string;
  cefrLevel?: 'B1' | 'B2' | 'C1' | 'C2';
  topicDeck?: string; // e.g. 'Environment', 'Science & AI', 'Academic Core (AWL)'
  contextHint?: string;
  originSourceId?: string;
  originSourceTitle?: string;
  originModule: ModuleId | 'manual' | 'writing_eval' | 'source_import' | 'curated_deck';
  // Leitner / SuperMemo SRS Fields
  srsStage: number; // 0 to 5 (0: New, 1: Learning, 2: Review 1, 3: Review 2, 4: Retained, 5: Mastered)
  intervalDays: number;
  nextReviewDate: string; // ISO date string
  lastReviewedDate?: string;
  easeFactor: number; // default 2.5
  repetitions: number;
  audioUrl?: string;
  mastered: boolean;
}

export type ErrorCategory = 'grammar' | 'vocab' | 'pronunciation' | 'cohesion' | 'task_response';
export type SkillType = 'writing' | 'speaking' | 'listening' | 'reading' | 'grammar';

export interface MistakeEntry {
  id: string;
  errorText: string;
  correctedText: string;
  explanation: string;
  errorType: ErrorCategory;
  skill: SkillType;
  originModule: ModuleId | 'writing_eval' | 'speaking_eval' | 'dictation' | 'grammar_quiz';
  srsStage: number; // 0-5
  nextReviewDate: string; // ISO date string
  reviewCount: number;
  mastered: boolean;
  createdAt: string;
  tags: string[];
}

export interface MediaShadowingEvaluation {
  overallScore: number;
  fluencyScore: number;
  intonationScore: number;
  accuracyScore: number;
  feedbackVi: string;
  swallowedWords?: string[];
  stressHighlights?: Array<{ word: string; isCorrect: boolean; tip?: string }>;
  actionableAdvice?: string;
}

export interface MediaExtractedVocab {
  id?: string;
  word: string;
  phonetic?: string;
  pos: string;
  definitionVi: string;
  definitionEn: string;
  exampleEn: string;
  exampleVi?: string;
  collocations: string[];
  cefrLevel: 'B2' | 'C1' | 'C2';
  topicDeck?: string;
}

export interface MediaTranscriptSegment {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
  translation: string;
  speaker?: string;
  userRecordedAudio?: string;
  userDictationInput?: string;
  dictationScore?: number; // 0-100
  pitchAccuracy?: number; // 0-100 for Shadowing
  shadowingScore?: number; // 0-100
  shadowingEvaluation?: MediaShadowingEvaluation;
}

export interface MediaSession {
  id: string;
  title: string;
  mediaType: 'youtube' | 'audio' | 'article_audio';
  mediaUrl: string;
  youtubeId?: string;
  channelTitle?: string;
  thumbnail?: string;
  topic: string;
  level: 'Band 5.5-6.5' | 'Band 7.0-8.0' | 'Band 8.0+';
  durationSeconds: number;
  currentTimestamp: number;
  transcriptSegments: MediaTranscriptSegment[];
  mode: 'shadowing' | 'dictation';
  completed: boolean;
  lastPracticedDate?: string;
  extractedVocab?: MediaExtractedVocab[];
  shadowingAccuracyAvg?: number;
  dictationAccuracyAvg?: number;
}

export interface PracticeAttempt {
  id: string;
  skill: SkillType;
  topic: string;
  taskType: string; // e.g. 'Writing Task 2', 'Speaking Part 2', 'Reading Passage 1'
  scoreBand: number;
  feedbackSummary: string;
  detailedCriteria?: {
    taskResponse?: number;
    coherenceCohesion?: number;
    lexicalResource?: number;
    grammaticalAccuracy?: number;
    fluencyCoherence?: number;
    pronunciation?: number;
  };
  mistakesGeneratedCount: number;
  timestamp: string;
  durationMinutes: number;
}

export interface MockResult {
  id: string;
  testTitle: string;
  overallBand: number;
  listeningBand: number;
  readingBand: number;
  writingBand: number;
  speakingBand: number;
  completedDate: string;
  timeSpentMinutes: number;
  breakdown: string[];
}

export type GrammarExerciseType = 'multiple_choice' | 'gap_fill' | 'error_correction' | 'sentence_transformation';

export interface GrammarExercise {
  id: string;
  type: GrammarExerciseType;
  question: string;
  promptVi?: string;
  options?: string[]; // for multiple_choice
  correctIndex?: number; // for multiple_choice
  correctAnswer: string; // canonical answer or accepted pattern
  alternativeAnswers?: string[];
  explanation: string;
  hint?: string;
  targetStructure?: string;
  originalSentenceWithMistake?: string; // for error_correction
  baseSentenceToTransform?: string; // for sentence_transformation
}

export interface GrammarTopic {
  id: string;
  title: string;
  titleVi: string;
  bandImpact: 'Band 6.0' | 'Band 7.0' | 'Band 8.0+';
  level: 'Foundation' | 'Intermediate' | 'Advanced Master';
  orderIndex: number;
  category: 'tenses' | 'conditionals' | 'clauses' | 'passive' | 'inversion' | 'cohesion' | 'verb_forms' | 'cleft' | 'comparison' | 'nominalization' | 'subjunctive' | 'parallelism';
  categoryVi: string;
  // Pedagogy: Example first, terminology later
  intuitiveIntro: string; // Real-life / natural intuition explanation before jargon
  ruleSummary: string;
  keyFormulas: string[];
  commonPitfalls: string[];
  relatedMistakeTags: string[]; // for matching with MistakeEntry tags (e.g. ['Inversion', 'Subject-Verb Agreement', 'Conjunctions'])
  sampleSentences: Array<{
    before: string; // Band 5.5 - 6.0 original simple/clunky sentence
    after: string; // Band 7.5 - 8.5 academic high-impact sentence
    explanation: string;
    targetContext?: 'Writing Task 1' | 'Writing Task 2' | 'Speaking Part 3';
  }>;
  exercises: GrammarExercise[];
  userMasteryPercent: number;
  lastPracticedDate?: string;
}

export interface GrammarDiagnosticResult {
  originalText: string;
  overallGrammarScore: number; // 0-100
  estimatedBand: number;
  detectedErrors: Array<{
    errorSubstring: string;
    correctedSubstring: string;
    explanationVi: string;
    category: string;
    relatedTopicId?: string;
    severity: 'minor' | 'major' | 'critical';
  }>;
  upgradedSentences: Array<{
    original: string;
    upgradedBand8: string;
    enhancementType: string;
    relatedTopicId?: string;
  }>;
  recommendedTopicIds: string[];
}

export interface IELTSKnowledgeArticle {
  id: string;
  category: 'overview' | 'band_descriptors' | 'writing_templates' | 'speaking_strategies' | 'reading_skimming' | 'listening_distractors';
  categoryTitleVi: string;
  title: string;
  readTimeMinutes: number;
  excerpt: string;
  contentMarkdown: string;
  tags: string[];
  keyTakeaway: string;
}

export interface AITutorMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  screenContext?: string;
  suggestedFollowUps?: string[];
}
