export type ModuleId =
  | 'dashboard'
  | 'sources'
  | 'vocabulary'
  | 'grammar'
  | 'media'
  | 'practice'
  | 'mock_test'
  | 'review_progress'
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
  wordFamily?: string[];
  paraphrases?: string[];
  usageNoteVi?: string;
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

export interface FsrsCardState {
  version: 'fsrs-6';
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: 0 | 1 | 2 | 3;
  lastReview?: string;
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
  wordFamily?: string[];
  paraphrases?: string[];
  usageNoteVi?: string;
  synonyms?: VocabSynonym[];
  antonyms?: string[];
  mnemonic?: string; // Memory aid/image trigger
  imageUrl?: string;
  cefrLevel?: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topicDeck?: string; // e.g. 'Environment', 'Science & AI', 'Academic Core (AWL)'
  contextHint?: string;
  originSourceId?: string;
  originSourceTitle?: string;
  originModule: ModuleId | 'manual' | 'writing_eval' | 'source_import' | 'curated_deck';
  // Legacy display fields retained during the FSRS migration.
  srsStage: number; // 0 to 5 (0: New, 1: Learning, 2: Review 1, 3: Review 2, 4: Retained, 5: Mastered)
  intervalDays: number;
  nextReviewDate: string; // ISO date string
  lastReviewedDate?: string;
  easeFactor: number; // default 2.5
  repetitions: number;
  audioUrl?: string;
  mastered: boolean;
  fsrs?: FsrsCardState;
  adaptiveProvenance?: {
    topicId: string;
    tier: 'foundation' | 'bridge' | 'advanced';
    generatedAt: string;
  };
}

export type ErrorCategory = 'grammar' | 'vocab' | 'pronunciation' | 'cohesion' | 'task_response';
export type SkillType = 'writing' | 'speaking' | 'listening' | 'reading' | 'grammar';

export type ReadingQuestionType =
  | 'matching_headings'
  | 'true_false_not_given'
  | 'yes_no_not_given'
  | 'matching_information'
  | 'sentence_summary_completion'
  | 'matching_features';

export type ListeningQuestionType =
  | 'form_note_table_completion'
  | 'multiple_choice'
  | 'map_plan_diagram_labelling'
  | 'matching';

export type WritingPracticeType =
  | 'task1_academic'
  | 'task1_general'
  | 'task2_essay';

export type SpeakingPracticePart =
  | 'part1_qa'
  | 'part2_cue_card'
  | 'part3_deep_discussion';

export interface ReadingPracticeExercise {
  id: string;
  type: ReadingQuestionType;
  title: string;
  topic: string;
  difficulty: 'Band 5.5-6.5' | 'Band 7.0-8.0' | 'Band 8.5+';
  targetTimeMinutes: number;
  instructionsVi: string;
  origin?: ContentOrigin;
  provenance?: LiveHubArtifactProvenance;
  isGradeable?: boolean;
  passage: {
    title: string;
    paragraphs: Array<{
      label: string; // 'A', 'B', 'C', 'D', 'E', etc.
      text: string;
    }>;
  };
  // Dành riêng cho Matching Headings
  headingsList?: Array<{
    id: string; // 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'
    text: string;
  }>;
  // Dành riêng cho Matching Features
  featuresList?: {
    categoryName: string; // e.g. 'Researchers / Theorists'
    items: Array<{ id: string; name: string }>; // A: 'Dr. Jane Goodall', B: 'Prof. David Miller'
  };
  questions: Array<{
    id: string;
    questionNumber: number;
    statementOrQuestion: string;
    options?: string[]; // for MC or dropdowns
    correctAnswer: string;
    explanationVi: string;
    paragraphReference?: string;
    trapWarning?: string; // Cảnh báo bẫy thi thường gặp
    relatedGrammarTopicId?: string;
    relatedVocab?: string[];
  }>;
}

export interface ListeningPracticeExercise {
  id: string;
  type: ListeningQuestionType;
  title: string;
  topic: string;
  difficulty: 'Band 5.5-6.5' | 'Band 7.0-8.0' | 'Band 8.5+';
  section: 'Section 1 (Social/Form)' | 'Section 2 (Monologue/Map)' | 'Section 3 (Academic Discussion)' | 'Section 4 (Academic Lecture)';
  targetTimeMinutes: number;
  instructionsVi: string;
  origin?: ContentOrigin;
  provenance?: LiveHubArtifactProvenance;
  isGradeable?: boolean;
  wordLimit?: string; // e.g. "NO MORE THAN TWO WORDS AND/OR A NUMBER"
  audioTranscript: string;
  audioUrl?: string;
  audioBase64?: string;
  audioSpeakers?: Array<{ role: string; name: string }>;
  // Dành riêng cho Map / Plan / Diagram Labelling
  mapDiagramData?: {
    diagramType: 'campus_map' | 'building_floorplan' | 'equipment_diagram' | 'process_flow';
    title: string;
    locationsToLabel: Array<{
      letter: string; // 'A', 'B', 'C', 'D', 'E'
      xPercent: number; // 0 - 100
      yPercent: number; // 0 - 100
      name: string;
    }>;
    fixedLandmarks: Array<{
      xPercent: number;
      yPercent: number;
      label: string;
    }>;
  };
  matchingOptions?: Array<{
    id: string; // 'A', 'B', 'C', 'D'
    text: string;
  }>;
  questions: Array<{
    id: string;
    questionNumber: number;
    prompt: string; // Context or blank text
    options?: string[];
    correctAnswer: string;
    acceptableAnswers?: string[];
    explanationVi: string;
    timestampHint?: string;
    spellingOrGrammarTrap?: string;
    relatedGrammarTopicId?: string;
    relatedVocab?: string[];
  }>;
}

export interface WritingPracticePrompt {
  id: string;
  type: WritingPracticeType;
  category: 'Bar Chart' | 'Line Graph' | 'Pie Chart' | 'Table' | 'Process Diagram' | 'Map' | 'Formal Letter' | 'Semi-formal Letter' | 'Opinion Essay' | 'Discussion Essay' | 'Problem-Solution' | 'Advantages-Disadvantages' | 'Two-part Question';
  title: string;
  topic: string;
  difficulty: 'Band 5.5-6.5' | 'Band 7.0-8.0' | 'Band 8.5+';
  targetWords: number; // 150 for Task 1, 250 for Task 2
  timeLimitMinutes: number; // 20 or 40
  promptStatement: string;
  origin?: ContentOrigin;
  provenance?: LiveHubArtifactProvenance;
  isGradeable?: boolean;
  academicChartData?: {
    type: 'bar' | 'line' | 'pie' | 'table' | 'process' | 'map';
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      unit?: string;
      color?: string;
    }>;
    processSteps?: Array<{ stepNumber: number; title: string; description: string }>;
    mapComparison?: { beforeYear: string; afterYear: string; keyChanges: string[] };
  };
  highBandVocabSuggestions: Array<{
    word: string;
    meaningVi: string;
    contextUsage: string;
  }>;
  sampleBand9Structure: {
    overviewOrThesis: string;
    body1Strategy: string;
    body2Strategy: string;
  };
}

export interface WritingEvaluationResult {
  overallBand: number;
  wordCount: number;
  criteriaScores: {
    taskResponse: {
      band: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    };
    coherenceCohesion: {
      band: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    };
    lexicalResource: {
      band: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    };
    grammaticalRangeAccuracy: {
      band: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    };
  };
  detailedMistakes: Array<{
    id: string;
    originalSegment: string;
    suggestedRewrite: string;
    category: 'grammar' | 'vocab' | 'cohesion' | 'task_response';
    ruleExplanationVi: string;
    suggestedReviewTopic?: string;
  }>;
  sentenceUpgrades: Array<{
    original: string;
    band8Rewrite: string;
    techniqueUsed: string; // e.g. "Nominalization + Advanced Participle Clause"
  }>;
  sampleExaminerResponseBand9?: string;
}

export interface SpeakingPracticePrompt {
  id: string;
  part: SpeakingPracticePart;
  title: string;
  topic: string;
  difficulty: 'Band 5.5-6.5' | 'Band 7.0-8.0' | 'Band 8.5+';
  origin?: ContentOrigin;
  provenance?: LiveHubArtifactProvenance;
  isGradeable?: boolean;
  // Cho Part 1 & 3
  questions?: Array<{
    id: string;
    questionText: string;
    followUpHintVi?: string;
    suggestedVocab: string[];
  }>;
  // Cho Part 2 (Cue Card)
  cueCard?: {
    prompt: string; // e.g. "Describe a memorable journey you took by public transport."
    bulletPoints: string[]; // 4 bullet points
    prepTimeSeconds: number; // 60s
    speakingTimeSeconds: number; // 120s
    keyIdeasVi: string[];
  };
  examinerPersona: string; // "Dr. Jonathan Smith - Oxford Cambridge Examiner"
}

export interface SpeakingEvaluationResult {
  overallBand: number;
  transcript: string;
  criteriaScores: {
    fluencyCoherence: {
      band: number;
      feedback: string;
      fillerWordsCount: number;
      pauseRateAdvice: string;
    };
    lexicalResource: {
      band: number;
      feedback: string;
      collocationsUsed: string[];
      repetitiveWords: string[];
    };
    grammaticalRangeAccuracy: {
      band: number;
      feedback: string;
      complexStructuresUsed: string[];
      grammarSlips: Array<{ original: string; corrected: string; explanation: string }>;
    };
    pronunciation: {
      band: number;
      feedback: string;
      intonationScore: number;
      stressErrors: string[];
    };
  };
  highBandUpgrades: Array<{
    spokenSentence: string;
    band8Upgrade: string;
    focus: string;
  }>;
  actionableStepsVi: string[];
}

export interface SpeakingRoomTurn {
  id: string;
  part: 'part1' | 'part2' | 'part3';
  questionNumber: number;
  examinerSpoken: string;
  question: string;
  candidateTranscript: string;
  durationSeconds: number;
  timestamp: string;
}

export interface SpeakingRoomEvaluation {
  overallBand: number;
  criteriaScores: {
    fluencyCoherence: {
      band: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    };
    lexicalResource: {
      band: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    };
    grammaticalRangeAccuracy: {
      band: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    };
    pronunciation: {
      band: number;
      feedback: string;
      strengths: string[];
      weaknesses: string[];
    };
  };
  telemetry: {
    totalWords: number;
    wpm: number;
    fillerWordsCount: number;
    fillerWordsDetected: Array<{ word: string; count: number }>;
    longPausesDetectedCount: number;
    fluencyRating: 'Excellent' | 'Good' | 'Needs Improvement';
  };
  sampleUpgrades: Array<{
    part: string;
    question: string;
    candidateResponse: string;
    upgradedBand85Response: string;
    keyVocabularyC1C2: Array<{ phrase: string; meaningVi: string; phonetic: string }>;
    examinerAnalysisVi: string;
  }>;
  examinerOverallSummaryVi: string;
  actionableAdvice: string[];
  mistakesForNotebook: Array<{
    errorText: string;
    correctedText: string;
    explanation: string;
    errorType: 'grammar' | 'vocab' | 'collocation' | 'pronunciation';
  }>;
}

export type TrapCategory =
  | 'trap_not_given' // Bẫy Not Given & False trong Reading
  | 'trap_listening_plural_spelling' // Lỗi chia số ít/số nhiều & Chính tả Listening
  | 'trap_task1_tenses' // Lỗi thì quá khứ / xu hướng Task 1
  | 'trap_cohesion_flow' // Lỗi Cohesion & Mạch lạc Task 2
  | 'trap_lexical_context' // Lỗi từ vựng sai ngữ cảnh & Collocations
  | 'trap_distractor_numbers' // Bẫy Đổi ý Phút chót & Số liệu Listening
  | 'trap_matching_headings' // Bẫy Matching Headings & Ý chính
  | 'trap_speaking_stress_pronunciation'; // Lỗi trọng âm & phát âm Speaking

export interface MistakeEntry {
  id: string;
  errorText: string;
  correctedText: string;
  explanation: string;
  errorType: ErrorCategory;
  trapCategory?: TrapCategory;
  trapCategoryTitleVi?: string;
  trapBreakdownVi?: string;
  examinerTipVi?: string;
  questionContext?: string;
  userAttemptAnswer?: string;
  options?: string[];
  drillType?: 'flashcard' | 'multiple_choice' | 'correction' | 'gap_fill';
  skill: SkillType;
  originModule: ModuleId | 'writing_eval' | 'speaking_eval' | 'dictation' | 'grammar_quiz' | 'ielts_practice_reading' | 'ielts_practice_listening' | 'ielts_practice_writing' | 'ielts_practice_speaking' | 'mock_test';
  srsStage: number; // 0-5 (0: Mới nạp, 1: Hộp 1 - 1d, 2: Hộp 2 - 3d, 3: Hộp 3 - 7d, 4: Hộp 4 - 14d, 5: Mastered - 30d+)
  intervalDays?: number;
  easeFactor?: number;
  repetitions?: number;
  nextReviewDate: string; // ISO date string
  lastReviewedDate?: string;
  reviewCount: number;
  mastered: boolean;
  createdAt: string;
  tags: string[];
  suggestedGrammarTopicId?: string;
  difficulty?: string;
  acceptedAnswers?: string[];
  lifecycle?: 'active' | 'due' | 'mastered' | 'archived' | 'relapsed';
  taxonomyKey?: string;
  relapseCount?: number;
  fsrs?: FsrsCardState;
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
  acousticStatus?: 'measured' | 'unavailable';
  telemetry?: SpeakingTelemetry;
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

export type MediaImportPhase =
  | 'probing'
  | 'captions'
  | 'normalizing'
  | 'transcribing'
  | 'validating'
  | 'ready'
  | 'failed';

export type MediaImportFailureCategory =
  | 'provider_blocked'
  | 'runtime_missing'
  | 'provider_timeout'
  | 'audio_too_large'
  | 'video_too_long'
  | 'ai_quota_exhausted'
  | 'transcript_invalid'
  | 'provider_failed';

export interface MediaImportFailure {
  category: MediaImportFailureCategory;
  code: string;
  message: string;
  retryable: boolean;
  recoveryAction: 'retry' | 'upload_source' | 'retry_or_upload' | 'open_media_help';
  requestId: string;
}

export interface MediaImportJob {
  id: string;
  phase: MediaImportPhase;
  progress: number;
  createdAt: string;
  updatedAt: string;
  source: 'youtube';
  session?: MediaSession;
  failure?: MediaImportFailure;
  validation?: {
    coverage: number;
    segmentCount: number;
    durationSeconds: number;
  };
}

export interface MediaCapabilities {
  youtubeImport: {
    available: boolean;
    ytDlp: boolean;
    jsRuntime: boolean;
    potProvider: boolean;
    reason?: string;
  };
  uploadAudio: boolean;
  uploadCaptions: boolean;
  pasteTranscript: boolean;
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
  level: 'Band 5.5-6.5' | 'Band 7.0-8.0' | 'Band 8.0+' | 'Adaptive';
  durationSeconds: number;
  currentTimestamp: number;
  transcriptSegments: MediaTranscriptSegment[];
  mode: 'shadowing' | 'dictation';
  completed: boolean;
  lastPracticedDate?: string;
  extractedVocab?: MediaExtractedVocab[];
  transcriptVersion?: {
    rawSource: 'yt-dlp' | 'youtube-transcript' | 'gemini-audio' | 'user-upload';
    normalizerVersion: string;
    importedAt: string;
  };
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
  evidenceClass?: 'independent' | 'mock';
  status?: 'in_progress' | 'completed' | 'invalid';
}

export type ExamColorScheme = 'standard' | 'high_contrast' | 'inverted';

export interface ExamPassageNote {
  id: string;
  passageIndex: number;
  paragraphLabel?: string;
  selectedText: string;
  noteText: string;
  color?: string;
  createdAt: string;
  mockAttemptId?: string;
  passageId?: string;
  paragraphId?: string;
  startOffset?: number;
  endOffset?: number;
}

export interface MockQuestionReview {
  number: number;
  sectionIndex: number;
  userAnswer: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  isCorrect: boolean;
  explanationVi: string;
  locationHint?: string;
  evidenceText?: string;
  trapWarning?: string;
  relatedGrammarTopicId?: string;
}

export interface DayStudyPlanItem {
  day: number;
  title: string;
  description: string;
  targetModule: ModuleId;
  targetSkill: SkillType;
  actionLabel: string;
  priority: 'high' | 'medium' | 'normal';
}

export interface MockStudyRoadmap {
  weakestSkill: SkillType;
  targetBandGap: number;
  summaryAdviceVi: string;
  coreGrammarToReview: string[];
  recommendedDecks: string[];
  dayByDayPlan: DayStudyPlanItem[];
}

export interface MockResult {
  id: string;
  testTitle: string;
  testCode?: string;
  overallBand: number;
  listeningBand: number;
  readingBand: number;
  writingBand: number;
  speakingBand: number;
  listeningRawScore?: number; // e.g. 34/40
  readingRawScore?: number; // e.g. 33/40
  completedDate: string;
  timeSpentMinutes: number;
  evidenceClass?: 'independent' | 'mock';
  status?: 'in_progress' | 'completed' | 'invalid';
  provenance?: FullMockTestPackage['provenance'];
  breakdown: string[];
  strengths?: string[];
  weaknesses?: string[];
  writingEvaluation?: {
    task1Band: number;
    task2Band: number;
    criteriaScores: {
      taskResponse: { band: number; feedback: string };
      coherenceCohesion: { band: number; feedback: string };
      lexicalResource: { band: number; feedback: string };
      grammaticalRangeAccuracy: { band: number; feedback: string };
    };
    examinerRemarksVi: string;
    sampleBand9Task2?: string;
  };
  speakingEvaluation?: {
    criteriaScores: {
      fluencyCoherence: { band: number; feedback: string };
      lexicalResource: { band: number; feedback: string };
      grammaticalRangeAccuracy: { band: number; feedback: string };
      pronunciation: { band: number; feedback: string };
    };
    examinerRemarksVi: string;
    transcriptOverview?: string;
    highBandUpgrades?: Array<{ spoken: string; upgrade: string; technique: string }>;
  };
  detailedReview?: {
    listening: MockQuestionReview[];
    reading: MockQuestionReview[];
  };
  roadmap?: MockStudyRoadmap;
}

export type MockExamSkill = 'listening' | 'reading' | 'writing' | 'speaking';

export interface FullMockTestQuestion {
  id: string;
  number: number; // 1 to 40
  sectionIndex: number; // 0, 1, 2, 3 (or passage 0, 1, 2)
  type: 'multiple_choice' | 'gap_fill' | 'true_false_not_given' | 'yes_no_not_given' | 'matching_headings' | 'matching_features' | 'map_labelling' | 'sentence_completion';
  prompt: string;
  options?: string[]; // for MC / matching
  correctAnswer: string;
  acceptableAnswers?: string[];
  explanationVi: string;
  locationHint?: string;
  trapWarning?: string;
  relatedGrammarTopicId?: string;
  relatedVocab?: string[];
}

export interface FullMockTestPackage {
  id: string;
  code: string; // e.g. "CAM-19-ACAD-01"
  title: string;
  subtitle: string;
  difficulty: 'IELTS-style Standard' | 'Hard (Band 7.5 - 8.5+)' | 'Diagnostic Standard';
  description: string;
  estimatedMinutes: number; // ~170 mins
  origin?: ContentOrigin;
  isGradeable?: boolean;
  provenance?: LiveHubArtifactProvenance & { sourceArtifactId?: string };
  // 1. Listening
  listening: {
    title: string;
    audioTranscript: string;
    sections: Array<{
      sectionNumber: number;
      title: string;
      context: string;
      audioUrl?: string;
      audioBase64?: string;
      mediaUrl?: string;
      audioArtifact?: {
        audioUrl?: string;
        audioBase64?: string;
        isValidated?: boolean;
        status?: 'validated' | 'invalid' | 'truncated' | 'pending';
      };
      audioScriptExcerpt: string;
      instructionsVi: string;
      questions: FullMockTestQuestion[];
      mapData?: {
        title: string;
        locations: Array<{ letter: string; name: string; x: number; y: number }>;
      };
    }>;
  };
  // 2. Reading
  reading: {
    title: string;
    passages: Array<{
      passageNumber: number;
      title: string;
      subtitle: string;
      wordCount: number;
      paragraphs: Array<{ label: string; text: string }>;
      headingsList?: Array<{ id: string; text: string }>;
      featuresList?: { category: string; items: Array<{ id: string; name: string }> };
      questions: FullMockTestQuestion[];
    }>;
  };
  // 3. Writing
  writing: {
    title: string;
    task1: {
      category: 'Bar Chart' | 'Line Graph' | 'Pie Chart' | 'Table' | 'Process' | 'Map';
      prompt: string;
      chartData?: {
        labels: string[];
        datasets: Array<{ label: string; data: number[]; unit?: string; color?: string }>;
        description?: string;
      };
      minWords: number;
      suggestedMinutes: number;
    };
    task2: {
      category: 'Opinion Essay' | 'Discussion Essay' | 'Problem-Solution' | 'Advantages-Disadvantages';
      prompt: string;
      minWords: number;
      suggestedMinutes: number;
    };
  };
  // 4. Speaking
  speaking: {
    examinerName: string;
    examinerAvatar: string;
    part1: {
      topic: string;
      questions: string[];
    };
    part2: {
      cueCard: {
        topic: string;
        prompt: string;
        bulletPoints: string[];
        prepTimeSeconds: number;
        speakTimeSeconds: number;
      };
    };
    part3: {
      topic: string;
      questions: string[];
    };
  };
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

export interface StrategyQuizQuestion {
  id: string;
  scenario?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanationVi: string;
  keyTakeaway: string;
}

export interface SkillStrategyTopic {
  id: string;
  skill: 'listening' | 'reading' | 'writing' | 'speaking' | 'general';
  categoryTitleVi: string;
  title: string;
  subtitle: string;
  readTimeMinutes: number;
  difficultyLevel: 'Foundation (5.0 - 6.5)' | 'Advanced (7.0 - 8.0)' | 'Master (8.5+)';
  corePrinciples: string[];
  stepByStepMethod: Array<{
    stepNumber: number;
    stepTitle: string;
    actionVi: string;
    exampleOrCaveat?: string;
  }>;
  proTactics: string[];
  trapAlerts: string[];
  practicalApplicationMarkdown: string;
  strategyQuiz: StrategyQuizQuestion[];
}

export type AnnotationCategory = 'vocab' | 'grammar' | 'cohesion' | 'task_response';

export interface AnnotatedSegment {
  text: string;
  isHighlight?: boolean;
  annotationType?: AnnotationCategory;
  title?: string;
  explanationVi?: string;
  bandImpact?: string; // e.g. "Band 8.5 Lexical Resource"
}

export interface AnnotatedModelAnswer {
  id: string;
  skill: 'writing' | 'speaking';
  taskType: 'Writing Task 1' | 'Writing Task 2' | 'Speaking Part 2' | 'Speaking Part 3';
  topicVi: string;
  questionPrompt: string;
  diagramOrImageDescription?: string;
  targetBand: number; // e.g. 8.5
  examinerOverviewVi: string;
  criteriaAnalysis: {
    criterion1Name: string; // Task Achievement / Fluency
    criterion1Score: number;
    criterion1Notes: string;
    criterion2Name: string; // Coherence & Cohesion
    criterion2Score: number;
    criterion2Notes: string;
    criterion3Name: string; // Lexical Resource
    criterion3Score: number;
    criterion3Notes: string;
    criterion4Name: string; // Grammatical Range & Accuracy
    criterion4Score: number;
    criterion4Notes: string;
  };
  annotatedSegments: AnnotatedSegment[];
  vocabularyGlossary: Array<{
    phrase: string;
    meaningVi: string;
    level: 'C1' | 'C2';
    usageTip: string;
  }>;
}

export interface CommonPitfallTrap {
  id: string;
  skill: 'listening' | 'reading' | 'writing' | 'speaking';
  trapTitle: string;
  impactBand: 'Mất 0.5 - 1.0 Band' | 'Mất 1.0 - 1.5 Band' | 'Bị kẹt ở Band 6.0';
  dangerLevel: 'critical' | 'high' | 'medium';
  frequency: 'Rất phổ biến (>70% thí sinh mắc)' | 'Phổ biến' | 'Bẫy tinh vi';
  howTrapWorks: string;
  riskyExample: string;
  highBandSolution: string;
  examinerSecretInsight: string;
}

export interface BandConversionItem {
  rawScoreRange: string;
  bandScore: number;
  skill: 'listening' | 'reading_academic' | 'reading_general';
  cefrLevel: string;
  competencyDescription: string;
}

export interface AITutorMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  screenContext?: string;
  suggestedFollowUps?: string[];
  citations?: ClaimCitation[];
  retrievedAt?: string;
  researchMode?: boolean;
}

// ==========================================
// ESSAY BAND UPGRADER (TASK 1 & TASK 2)
// ==========================================

export interface DetectedEssayError {
  originalText: string;
  errorType: 'grammar' | 'vocabulary' | 'cohesion' | 'task_response' | 'style';
  correction: string;
  explanation: string;
  severity: 'high' | 'medium' | 'low';
}

export interface UpgradedPhraseDiff {
  id: string;
  originalPhrase: string;
  band7Alternative: string;
  band85Mastery: string;
  category: 'lexical_upgrade' | 'grammatical_inversion' | 'cohesive_device' | 'academic_precision' | 'nominalization';
  whyBetterVi: string;
  contrastAnalysis: {
    spokenOrBasic: string;
    academicC1C2: string;
    examinerInsight: string;
  };
  exampleInSentence: string;
}

export interface GoldenCollocation {
  id: string;
  phrase: string;
  phonetic?: string;
  cefrLevel: 'C1' | 'C2';
  meaningVi: string;
  collocationCategory: string; // e.g. "Verb + Noun", "Adjective + Noun", "Adverb + Adjective"
  exampleSentence: string;
  ieltsTopic: string;
  whyHighBand: string;
}

export interface PEELParagraph {
  paragraphIndex: number;
  paragraphType: 'Introduction' | 'Body Paragraph 1' | 'Body Paragraph 2' | 'Conclusion' | 'Overview';
  point: string; // Point
  explanation: string; // Explanation
  evidenceOrExample: string; // Evidence / Example
  linkOrImplication: string; // Link back / Implication
  fullParagraphText: string;
}

export interface InteractiveDiffSegment {
  type: 'unchanged' | 'modified';
  originalText: string;
  upgradedTextBand7?: string;
  upgradedTextBand85?: string;
  upgradeId?: string;
  diffCategory?: string;
}

export interface EssayUpgradeResult {
  taskType: string;
  promptStatement: string;
  originalAnalysis: {
    estimatedBand: number; // e.g. 5.5 or 6.0
    bandRange: string; // e.g. "Band 5.5 - 6.0"
    wordCount: number;
    overallCritique: string;
    strengths: string[];
    weaknesses: string[];
    detectedErrors: DetectedEssayError[];
  };
  band7Upgrade: {
    bandScore: number; // 7.0
    essayText: string;
    wordCount: number;
    keyImprovements: string[];
    grammarFixedCount: number;
    coherenceEnhancements: string[];
  };
  band85Upgrade: {
    bandScore: number; // 8.5
    essayText: string;
    wordCount: number;
    advancedTechniquesUsed: string[];
    peelBreakdown: PEELParagraph[];
  };
  upgradedPhrasesDiff: UpgradedPhraseDiff[];
  goldenCollocations: GoldenCollocation[];
  interactiveDiffSegments: InteractiveDiffSegment[];
}

export interface EssayPromptBankItem {
  id: string;
  taskType: 'task1_academic' | 'task1_general' | 'task2_essay';
  category: string;
  title: string;
  topic: string;
  promptStatement: string;
  sampleStudentEssayBand55: string;
  studentEstimatedBand: number;
  targetBandSuggestions: number[];
}

export type RealExamSkillType =
  | 'writing_task1'
  | 'writing_task2'
  | 'speaking_part1'
  | 'speaking_part2'
  | 'speaking_part3';

export type RealExamCouncilType =
  | 'idp_vietnam'
  | 'bc_vietnam'
  | 'both_vietnam'
  | 'idp_global'
  | 'bc_global'
  | 'global_general';

export interface RealExamVocabularyItem {
  phrase: string;
  phonetic?: string;
  pos: string; // e.g. "Collocation", "Idiom", "Verb Phrase", "Noun Phrase"
  meaningVi: string;
  exampleSentence: string;
  cefrLevel: 'B2' | 'C1' | 'C2';
  usageNote?: string;
}

export interface RealExamPEELOutline {
  point: string; // [P] Luận điểm then chốt
  explanation: string; // [E] Phân tích cơ chế & nguyên nhân
  evidence: string; // [E] Dẫn chứng / Dữ liệu thực tế
  link: string; // [L] Móc nối lại luận đề & hàm ý vĩ mô
  suggestedParagraphs?: Array<{
    heading: string;
    keyPoints: string[];
  }>;
}

export interface RealExamForecastItem {
  id: string;
  title: string;
  skill: RealExamSkillType;
  council: RealExamCouncilType;
  councilLabel: string; // e.g. "IDP & BC Việt Nam", "IDP Hà Nội / TP.HCM", "British Council Global"
  examDate: string; // e.g. "Thi thật: 18/08/2026", "Dự đoán Quý 3/2026"
  topicDomain: string; // e.g. "Artificial Intelligence & Automation", "Environmental Sustainability", "Urbanization & Housing"
  subCategory?: string; // e.g. "Agree / Disagree", "Discussion", "Describe a person", "Bar Chart"
  promptStatement: string; // Full exact exam question or cue card prompt
  cueCardPoints?: string[]; // For Speaking Part 2
  trendStatus: 'recent_real_exam' | 'quarter_forecast' | 'hot_trend' | 'high_frequency';
  trendBadge: string; // e.g. "🔥 Đề Thi Thật Vừa Ra", "⭐ Trọng Tâm Quý", "📈 Tần Suất Cao"
  frequencyScore?: number; // only present when a cited source supports frequency
  outlinePEEL?: RealExamPEELOutline;
  topicVocabularyC1C2?: RealExamVocabularyItem[];
  band8ModelAnswer?: string;
  modelAnswerWordCount?: number;
  examinerTipsVi?: string;
  groundingSourceTitle?: string;
  groundingSourceUrl?: string;
  isCustomGenerated?: boolean;
  evidenceType?: 'verified_report' | 'reported_recall' | 'forecast' | 'derived_practice';
  citations?: ClaimCitation[];
  enrichmentStatus?: 'not_requested' | 'loading' | 'ready' | 'unavailable';
  origin?: ContentOrigin;
  sourceReceipt?: string;
}

export interface ForecastGroundingResponse {
  status: 'fresh' | 'stale' | 'unavailable';
  cacheStatus?: 'hit' | 'miss' | 'stale';
  provider?: 'gemini' | 'groq' | 'brave';
  gatewayLane?: 'bifrost';
  model?: string;
  fallbackReason?: ApiFailureCategory;
  forecastItems: RealExamForecastItem[];
  searchQueries: string[];
  groundingSources: Array<{ title: string; url: string; snippet?: string; publishedAt?: string }>;
  lastUpdated: string;
  summaryOverviewVi: string;
  detectedTrends?: string[];
  stale?: boolean;
  error?: string;
  failure?: ApiFailure;
}

export type ContentOrigin = 'authentic_source' | 'source_plus_ai' | 'fully_ai_generated';

export type ConsentAction =
  | 'direct'
  | 'search_more'
  | 'practice_available'
  | 'ai_fill_missing'
  | 'create_ai_variant';

export interface ComponentProvenance {
  origin: ContentOrigin;
  sourceItemId?: string;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  citationUrls?: string[];
  retrievedAt?: string | null;
  evidenceType?: 'verified_report' | 'reported_recall' | 'forecast' | 'derived_practice' | 'ai_generated';
  aiMetadata?: {
    model?: string;
    generatedAt?: string;
    taskTier?: string;
    promptVersion?: string;
    fillReason?: string;
  };
}

export interface CompletenessCheckResult {
  isComplete: boolean;
  gradeable: boolean;
  missingComponents: string[];
  availableComponents: string[];
  summaryVi: string;
  actionOptions: Array<'search_more' | 'practice_available' | 'ai_fill_missing' | 'create_ai_variant'>;
}

export interface LiveHubArtifactProvenance {
  sourceItemId: string;
  evidenceType: 'verified_report' | 'reported_recall' | 'forecast' | 'derived_practice' | 'ai_generated';
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  citationUrls?: string[];
  retrievedAt?: string | null;
  origin?: ContentOrigin;
  aiMetadata?: {
    model?: string;
    generatedAt?: string;
    taskTier?: string;
    promptVersion?: string;
    filledComponents?: string[];
    fillReason?: string;
    derivedFromSourceId?: string;
  };
  components?: Record<string, ComponentProvenance>;
}

export type LiveHubLearningSkill =
  | 'writing'
  | 'writing_task1'
  | 'writing_task2'
  | 'speaking'
  | 'speaking_part1'
  | 'speaking_part2'
  | 'speaking_part3'
  | 'reading'
  | 'listening';

export interface BaseLiveHubLearningItem {
  id: string;
  title: string;
  skill: LiveHubLearningSkill;
  council?: string;
  councilLabel?: string;
  examDate?: string;
  topicDomain?: string;
  subCategory?: string;
  evidenceType?: 'verified_report' | 'reported_recall' | 'forecast' | 'derived_practice' | 'ai_generated';
  trendStatus?: 'recent_real_exam' | 'quarter_forecast' | 'hot_trend' | 'high_frequency';
  trendBadge?: string;
  groundingSourceTitle?: string;
  groundingSourceUrl?: string;
  citations?: ClaimCitation[];
  isComplete?: boolean;
  missingComponents?: string[];
  availableComponents?: string[];
  origin?: ContentOrigin;
  sourceReceipt?: string;
}

export interface WritingLiveHubItem extends BaseLiveHubLearningItem {
  skill: 'writing' | 'writing_task1' | 'writing_task2';
  promptStatement?: string;
  task1?: { prompt?: string; minWords?: number; suggestedMinutes?: number; category?: string };
  task2?: { prompt?: string; minWords?: number; suggestedMinutes?: number; category?: string };
}

export interface SpeakingLiveHubItem extends BaseLiveHubLearningItem {
  skill: 'speaking' | 'speaking_part1' | 'speaking_part2' | 'speaking_part3';
  promptStatement?: string;
  cueCardPoints?: string[];
  cueCard?: { topic?: string; prompt?: string; bulletPoints?: string[]; prepTimeSeconds?: number; speakTimeSeconds?: number };
  questions?: Array<string | { id?: string; question?: string; prompt?: string }>;
}

export interface ReadingLiveHubItem extends BaseLiveHubLearningItem {
  skill: 'reading';
  promptStatement?: string;
  passage?: {
    title?: string;
    subtitle?: string;
    wordCount?: number;
    paragraphs?: Array<{ label: string; text: string }>;
    text?: string;
  };
  questions?: Array<{
    id?: string;
    number?: number;
    questionNumber?: number;
    sectionIndex?: number;
    type?: string;
    prompt?: string;
    statementOrQuestion?: string;
    correctAnswer?: string;
    explanationVi?: string;
    options?: string[];
  }>;
}

export interface ListeningLiveHubItem extends BaseLiveHubLearningItem {
  skill: 'listening';
  promptStatement?: string;
  audioUrl?: string;
  audioBase64?: string;
  mediaUrl?: string;
  audioTranscript?: string;
  audioArtifact?: {
    audioUrl?: string;
    audioBase64?: string;
    isValidated?: boolean;
    status?: 'validated' | 'invalid' | 'truncated' | 'pending';
  };
  sections?: Array<{
    sectionNumber?: number;
    title?: string;
    context?: string;
    audioUrl?: string;
    audioBase64?: string;
    mediaUrl?: string;
    audioArtifact?: {
      audioUrl?: string;
      audioBase64?: string;
      isValidated?: boolean;
      status?: 'validated' | 'invalid' | 'truncated' | 'pending';
    };
    audioScriptExcerpt?: string;
    instructionsVi?: string;
    questions?: FullMockTestQuestion[];
  }>;
  questions?: Array<{
    id?: string;
    number?: number;
    questionNumber?: number;
    sectionIndex?: number;
    type?: string;
    prompt?: string;
    correctAnswer?: string;
    explanationVi?: string;
    options?: string[];
  }>;
}

export type LiveHubLearningItem =
  | WritingLiveHubItem
  | SpeakingLiveHubItem
  | ReadingLiveHubItem
  | ListeningLiveHubItem;

export interface LiveHubPracticeArtifact {
  id: string;
  kind: 'derived_practice';
  skill: LiveHubLearningSkill;
  prompt: string;
  sourceItem?: LiveHubLearningItem | RealExamForecastItem;
  provenance: LiveHubArtifactProvenance;
  createdAt: string;
  isGradeable?: boolean;
  status?: 'ready' | 'draft_generation_required' | 'available_portion_only';
  requiresGeneration?: boolean;
  completeness?: CompletenessCheckResult;
}

export interface LiveHubMockArtifact {
  id: string;
  kind: 'derived_mock_section';
  skill: LiveHubLearningSkill;
  sourceItem?: LiveHubLearningItem | RealExamForecastItem;
  requiresPreview: boolean;
  provenance: LiveHubArtifactProvenance;
  createdAt: string;
  status?: 'ready' | 'draft_generation_required';
  requiresGeneration?: boolean;
  completeness?: CompletenessCheckResult;
}

export interface LiveHubMockBuildResponse {
  artifact: LiveHubMockArtifact;
  mockBuild: {
    id: string;
    status: 'draft' | 'generating' | 'validating' | 'repairing' | 'ready' | 'failed';
    skillStates: Record<'listening' | 'reading' | 'writing' | 'speaking', 'pending' | 'ready'>;
    createdAt: string;
    provenance?: LiveHubArtifactProvenance;
    sourceMode?: 'preserve' | 'lineage_only';
  };
}

// ==========================================
// 8-Axis Diagnostic Psychometrician Types
// ==========================================

export type DiagnosticSkillType = 'writing' | 'speaking' | 'reading' | 'listening';

export type EightAxisKey =
  | 'taskResponse'
  | 'coherence'
  | 'lexicalResource'
  | 'grammaticalAccuracy'
  | 'pronunciationAndFluency'
  | 'readingDistractorFilter'
  | 'listeningComprehension'
  | 'criticalHedging';

export interface EightAxisCompetencyRadar {
  taskResponse: number | null;
  coherence: number | null;
  lexicalResource: number | null;
  grammaticalAccuracy: number | null;
  pronunciationAndFluency: number | null;
  readingDistractorFilter: number | null;
  listeningComprehension: number | null;
  criticalHedging: number | null;
}

export interface RoadmapWeek {
  week: number;
  coreFocus: string;
  dailyQuests: string[];
}

export interface DiagnosticQuestionAnswer {
  questionId: string;
  questionText: string;
  userAnswer: string;
  correctAnswer?: string;
  isCorrect?: boolean;
}

export interface DiagnosticMultiSkillInput {
  submittedSkills: DiagnosticSkillType[];
  writingSample?: string | null;
  speakingAudioRef?: string | null; // Real audio base64 or reference
  readingAnswers?: DiagnosticQuestionAnswer[] | null;
  listeningAnswers?: DiagnosticQuestionAnswer[] | null;
  targetBand?: number;
}

export interface DiagnosticPsychometricianReport {
  overallEstimatedBand: number;
  confidenceInterval: string;
  disclaimerVi: string;
  projectedBandIn60Days: number;
  insufficientDataAxes: string[];
  competencyRadar: EightAxisCompetencyRadar;
  primaryBottlenecks: string[];
  personalized30DayRoadmap: RoadmapWeek[];
}

// ==========================================
// 3-Tier Sentence Academic Stylist Types
// ==========================================

export interface StandardErrorObject {
  errorSubstring: string;
  errorCategory: string; // e.g., "Grammar", "Syntax", "Collocation", "Register", "Hedging", "Punctuation"
  explanationVi: string;
  severity?: 'minor' | 'medium' | 'major';
}

export interface SentenceUpgradeTier65 {
  text: string;
  keyFixesVi: string;
}

export interface SentenceUpgradeTier75 {
  text: string;
  keyCollocations: string[];
  keyFixesVi: string;
}

export interface SentenceUpgradeTier85 {
  text: string;
  grammaticalTechnique: string;
  keyCollocations: string[];
  keyFixesVi: string;
}

export interface SentenceAcademicStylistResult {
  originalSentence: string;
  essayTopicContext: string;
  detectedErrors: StandardErrorObject[];
  upgradedVersions: {
    band65: SentenceUpgradeTier65;
    band75: SentenceUpgradeTier75;
    band85: SentenceUpgradeTier85;
  };
}

export interface SentenceAcademicStylistInput {
  sentence: string;
  essayTopic?: string;
  targetBand?: number;
}

// ==========================================
// IELTS Speaking Live Audio Assessment Types
// ==========================================

export interface SpeakingCriterionScore {
  band: number;
  feedbackVi: string;
}

export interface SpeakingFluencyEvaluation extends SpeakingCriterionScore {
  wpmEstimated: number;
  fillerWordCount: number;
}

export interface SpeakingLexicalEvaluation extends SpeakingCriterionScore {
  idiomaticPhrasesUsed: string[];
}

export interface SpeakingGrammarEvaluation extends SpeakingCriterionScore {
  complexStructuresUsed: number;
}

export interface SpeakingPronunciationEvaluation extends SpeakingCriterionScore {
  intonationIssues: string[];
}

export interface SpeakingLiveEvaluationReport {
  disclaimerVi: string;
  fluencyAndCoherence: SpeakingFluencyEvaluation;
  lexicalResource: SpeakingLexicalEvaluation;
  grammaticalRange: SpeakingGrammarEvaluation;
  pronunciation: SpeakingPronunciationEvaluation;
  detectedErrors: StandardErrorObject[];
  overallSpeakingBand: number;
  examinerSummaryVi: string;
  telemetry?: SpeakingTelemetry;
}

export interface SpeakingLiveAudioScoringInput {
  fullAudioBase64: string; // Real audio recording (audio/webm, audio/mp3, audio/wav)
  mimeType?: string;
  conversationHistory?: Array<{
    turnIndex: number;
    part: string;
    question: string;
    userTranscript?: string;
    timestampSeconds?: number;
    durationSeconds?: number;
  }>;
  targetBand?: number;
  totalDurationSeconds?: number;
  speechSegments?: Array<{ start: number; end: number }> | null;
}

// ==========================================
// Reading & Listening Trap Taxonomy Types
// ==========================================

export type TrapTypeIdentified =
  | 'Trap 1'
  | 'Trap 2'
  | 'Trap 3'
  | 'Trap 4'
  | 'Trap 5'
  | 'Trap 6'
  | 'Other';

export interface TrapParaphraseMapping {
  questionKeyword: string;
  passageEquivalent: string;
}

export interface QuestionTrapAnalysisResult {
  questionNumber: number;
  questionType: string;
  userAnswer: string;
  correctAnswer: string;
  trapTypeIdentified: TrapTypeIdentified;
  trapDescriptionIfOther?: string | null;
  distractorMechanismVi: string;
  paraphraseMapping: TrapParaphraseMapping[];
  examinerAdviceVi: string;
}

export interface QuestionTrapAnalysisInput {
  questionNumber: number;
  questionType: string;
  questionStatement: string;
  passageSnippet: string; // Minimum passage text needed to prove trap
  userAnswer: string;
  correctAnswer: string;
  targetBand?: number;
}

// ==========================================
// Master Mentor Panel Types (3 Personas)
// ==========================================

export interface MentorIdeaExpansion {
  pointOrParagraph: string;
  currentArgument: string;
  peelScaffolding: {
    point: string;
    explanation: string;
    example: string;
    link: string;
  };
  counterArgumentOrNuance?: string;
  coachAdviceVi: string;
}

export interface MentorCollocationUpgrade {
  originalPhrase: string;
  fixedBaseSentence: string; // Must build on Dr. Vance's fixed version if flawed
  upgradedC1C2Collocation: string;
  academicHedgingOption: string;
  maestroNotesVi: string;
}

export interface MasterMentorPerspectiveTension {
  issue: string;
  examinerStance: string;
  coachStance: string;
  resolutionAdviceVi: string;
}

export interface MasterMentorPanelReport {
  disclaimerVi?: string;
  criticalFlaws: StandardErrorObject[]; // 🔴 Critical Flaws (Dr. Vance - Cambridge Examiner)
  ideaExpansion: MentorIdeaExpansion[]; // 💡 Idea Expansion (Mia - Band Booster Coach)
  collocationUpgrades: MentorCollocationUpgrade[]; // ✨ C1/C2 Collocations (Prof. Arthur - Lexical Maestro)
  perspectiveTensions?: MasterMentorPerspectiveTension[];
  panelSummaryVi: string;
}

export interface MasterMentorPanelInput {
  contentOrEssay: string;
  taskType?: string;
  taskPrompt?: string;
  targetBand?: number;
}

// ==========================================
// Intelligent Error Tagger & SRS Card Types
// ==========================================

export interface ErrorTaggerCardContent {
  front: string;
  backDefinitionVi: string;
  phonetic: string;
  cefrLevel: string; // e.g. "B2", "C1", "C2"
  sampleSentence: string;
}

export interface ExtractedErrorTaggerItem {
  errorTag: string; // e.g. "LEXICAL_COLLOCATION", "GRAMMAR_MODAL", "SUBJECT_VERB_AGREEMENT", "PHONETIC_STRESS", etc.
  skillSource: string; // e.g. "writing_task2", "writing_task1", "speaking_part2", "reading", "listening"
  originalText: string;
  correctedText: string;
  explanationVi: string;
  severity: 'minor' | 'moderate' | 'major';
  srsCardContent: ErrorTaggerCardContent;
}

export interface IntelligentErrorTaggerReport {
  disclaimerVi?: string;
  extractedErrors: ExtractedErrorTaggerItem[];
}

export interface IntelligentErrorTaggerInput {
  submissionText: string;
  skillSource?: string;
  contextOrPrompt?: string;
  targetBand?: number;
}

// ==========================================
// Daily Speed Drill Challenge Types (60s)
// ==========================================

export type ChallengeType = 'paraphrase_blitz' | 'cohesive_jigsaw' | 'collocation_match';

export interface ParaphraseBlitzChallenge {
  challengeType: 'paraphrase_blitz';
  timeLimitSeconds: number; // 60
  promptSentence: string;
  targetTechniques: string[]; // e.g. ["Passive Voice", "Nominalization", "Inversion"]
  expectedBand85Answers: string[]; // Natural, precise, avoiding thesaurus stuffing
  scoringRubricVi: string;
}

export interface CohesiveJigsawConnectorPlacement {
  sentenceIndex: number;
  connector: string;
}

export interface CohesiveJigsawChallenge {
  challengeType: 'cohesive_jigsaw';
  timeLimitSeconds: number; // 60
  sentences: string[]; // 3 sentences missing connectors
  missingConnectors: string[];
  correctOrderAndConnectors: CohesiveJigsawConnectorPlacement[];
  scoringRubricVi: string;
}

export interface CollocationMatchPair {
  word: string;
  correctPartner: string;
  distractorPartners: string[];
}

export interface CollocationMatchChallenge {
  challengeType: 'collocation_match';
  timeLimitSeconds: number; // 60
  pairs: CollocationMatchPair[];
  scoringRubricVi: string;
}

export type SpeedDrillChallenge =
  | ParaphraseBlitzChallenge
  | CohesiveJigsawChallenge
  | CollocationMatchChallenge;

export interface SpeedDrillEvaluationBreakdown {
  item: string;
  userResponse: string;
  correctTarget: string;
  isCorrect: boolean;
  explanationVi: string;
}

export interface SpeedDrillEvaluationResult {
  scorePercentage: number;
  bandEstimate: number;
  isPerfect: boolean;
  feedbackVi: string;
  detailedBreakdown: SpeedDrillEvaluationBreakdown[];
}

// ==========================================
// Source-To-Learning Package Designer Types
// ==========================================

export interface LearnerProfileWeighting {
  targetBand?: number;
  weakestAxes?: string[]; // e.g. ["lexicalResource", "coherence", "taskResponse", "grammaticalAccuracy"]
  recentMistakeTags?: string[]; // e.g. ["LEXICAL_COLLOCATION", "GRAMMAR_TENSE"]
}

export interface SourceToLearningPackageInput {
  sourceText: string;
  targetBand?: number;
  learnerProfile?: LearnerProfileWeighting;
}

export interface CourseDesignerReadingQuestion {
  type: 'true_false_not_given' | 'matching_headings' | 'sentence_completion' | 'multiple_choice' | 'summary_completion';
  text: string;
  options?: string[];
  answer: string;
  explanationVi?: string;
}

export interface CourseDesignerListeningQuestion {
  type: 'gap_fill' | 'multiple_choice' | 'short_answer';
  text: string;
  options?: string[];
  answer: string;
  explanationVi?: string;
}

export interface CourseDesignerVocabItem {
  word: string;
  meaningVi: string;
  phonetic?: string;
  cefrLevel?: string;
  collocation?: string;
  example?: string;
}

export interface SourceToLearningPackageResult {
  promptVersion: string; // "source-to-learning-v1"
  detectedTopic: string;
  estimatedSourceDifficulty: string; // "B2" | "C1" | "C2"
  reading: {
    passage: string;
    questions: CourseDesignerReadingQuestion[];
  };
  listening: {
    script: string;
    speakerCount: number;
    questions: CourseDesignerListeningQuestion[];
  };
  speaking: {
    discussionQuestions: string[];
  };
  writing: {
    prompt: string;
  };
  extractedVocabulary: CourseDesignerVocabItem[];
}

// ==========================================
// Lexicographer Vocab Enricher Types
// ==========================================

export interface VocabEnricherInput {
  word: string;
  userInterestContext?: string;
}

export interface VocabEnricherResult {
  promptVersion: string; // "vocab-enricher-v1"
  invalidInput: boolean;
  word: string;
  definitionSimpleVi?: string;
  definitionAcademicVi?: string;
  exampleSentences?: string[];
  synonyms?: string[];
  antonyms?: string[];
  collocations?: string[];
  mnemonicVi?: string;
  cefrLevel?: string;
  ttsScript?: string;
}

// ==========================================
// Grammar Curriculum Designer Types (grammar-lesson-v1)
// ==========================================

export interface GrammarCurriculumInput {
  grammarTopic: string;
  learnerProfile?: LearnerProfileWeighting;
  exerciseCount?: number;
}

export interface GrammarCurriculumExercise {
  type: string; // "fill_blank" | "multiple_choice" | "error_correction" | "sentence_transformation"
  question: string;
  options?: string[];
  answer: string;
  explanationVi: string;
}

export interface GrammarCurriculumResult {
  promptVersion: string; // "grammar-lesson-v1"
  topic: string;
  explanationVi: string;
  exampleSentences: string[];
  exercises: GrammarCurriculumExercise[];
}

// ==========================================
// Audio Transcription & Segmentation Types (media-transcribe-v1)
// ==========================================

export interface AudioTranscribeSegment {
  startSec: number;
  endSec: number;
  speaker: string;
  text: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface AudioTranscribeVocabItem {
  word: string;
  meaningVi: string;
}

export interface AudioTranscribeResult {
  promptVersion: string; // "media-transcribe-v1"
  segments: AudioTranscribeSegment[];
  detectedVocabulary: AudioTranscribeVocabItem[];
}

export interface AudioTranscribeInput {
  audioBase64?: string;
  mimeType?: string;
  audioUrl?: string;
  topicContext?: string;
}

// ==========================================
// Cambridge Item Writer Practice Generator (practice-generator-v1)
// ==========================================

export interface ItemWriterPracticeInput {
  skill: 'reading' | 'listening';
  questionType: string;
  topicDomain?: string;
  difficultyBand?: number;
  learnerProfile?: LearnerProfileWeighting;
}

export interface ItemWriterQuestionItem {
  statement?: string;
  question?: string;
  prompt?: string;
  options?: string[];
  answer: string;
  explanationVi: string;
}

export interface ItemWriterPracticeResult {
  promptVersion: string; // "practice-generator-v1"
  skill: 'reading' | 'listening';
  questionType: string;
  passage: string;
  paragraphs?: string[];
  headingOptions?: string[];
  correctMapping?: Record<string, string>;
  questions?: ItemWriterQuestionItem[];
  explanationVi?: string;
}

// ==========================================
// IELTS Examiner 4-Criteria Full Grader (full-grader-v1)
// ==========================================

export interface FullGraderCriterionScore {
  band: number;
  feedbackVi: string;
}

export interface FullGraderInlineAnnotation {
  location: string;
  issue: string;
  suggestionVi: string;
}

export interface FullGraderInput {
  taskType:
    | 'writing_task1'
    | 'writing_task2'
    | 'speaking'
    | 'speaking_part1'
    | 'speaking_part2'
    | 'speaking_part3';
  prompt: string;
  submission: string;
  learnerProfile?: LearnerProfileWeighting;
}

export interface FullGraderResult {
  promptVersion: string; // "full-grader-v1"
  disclaimerVi: string;
  insufficientData: boolean;
  insufficientDataReasonVi?: string;
  criteria: {
    taskResponse?: FullGraderCriterionScore;
    coherenceAndCohesion?: FullGraderCriterionScore;
    fluencyAndCoherence?: FullGraderCriterionScore;
    lexicalResource?: FullGraderCriterionScore;
    grammaticalRangeAndAccuracy?: FullGraderCriterionScore;
    pronunciation?: FullGraderCriterionScore;
  };
  overallBand: number;
  inlineAnnotations: FullGraderInlineAnnotation[];
  detectedErrors: StandardErrorObject[];
}

// ==========================================
// Mock Test Orchestrator & Assembler (mock-assembler-v1)
// ==========================================

export interface MockAssemblerInput {
  targetBand?: number;
  recentPromptIds?: string[];
  learnerProfile?: LearnerProfileWeighting;
  sourceItem?: RealExamForecastItem;
  sourceArtifactId?: string;
  provenance?: LiveHubArtifactProvenance;
}

export interface MockAssemblerPackage {
  promptVersion: string; // "mock-assembler-v1"
  testId: string;
  testTitle: string;
  readingPackage: {
    passages: Array<{
      passageIndex: number;
      title: string;
      text: string;
      questionTypesIncluded: string[];
      questionCount: number;
    }>;
    totalQuestions: number;
  };
  listeningPackage: {
    sections: Array<{
      sectionIndex: number;
      scenario: string;
      difficultyLevel: string;
      questionCount: number;
    }>;
    totalQuestions: number;
  };
  writingPackage: {
    task1: {
      type: string;
      prompt: string;
      chartDescription: string;
    };
    task2: {
      category: string;
      prompt: string;
    };
  };
  speakingPackage: {
    examinerName: string;
    part1Topics: string[];
    part2CueCard: {
      topic: string;
      bulletPoints: string[];
    };
    part3AbstractThemes: string[];
  };
  fullPackage?: FullMockTestPackage;
  validation?: MockValidationReport;
  mockBuildId?: string;
  origin?: ContentOrigin;
}

export interface AiTaskProfile {
  tier: 'instant' | 'balanced' | 'deep' | 'grounded' | 'audio_eval' | 'tts';
  provider: 'gemini' | 'groq' | 'nvidia_nim' | 'openrouter';
  model: string;
  modelAlias: string;
  capability: 'text' | 'search' | 'audio-input' | 'audio-output';
  costClass: 'free' | 'metered' | 'paid';
  thinkingLevel?: 'low' | 'high';
  tools: Array<'googleSearch'>;
  timeoutMs: number;
  fallbackModels: string[];
  fallbackChain: Array<{
    provider: 'gemini' | 'groq' | 'nvidia_nim' | 'openrouter';
    model: string;
    modelAlias: string;
    capability: 'text' | 'search' | 'audio-input' | 'audio-output';
    costClass: 'free' | 'metered' | 'paid';
  }>;
  validator?: string;
}

export interface ClaimCitation {
  claimId: string;
  title: string;
  url: string;
  snippet?: string;
}

export interface GroundedResponse<T> {
  data: T;
  citations: ClaimCitation[];
  searchQueries: string[];
  retrievedAt: string;
  confidence: 'high' | 'medium' | 'low';
  stale?: boolean;
}

export type ApiFailureCategory =
  | 'auth_missing'
  | 'auth_invalid'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'provider_overloaded'
  | 'network_failed'
  | 'schema_invalid'
  | 'no_results'
  | 'gateway_unavailable'
  | 'all_providers_exhausted'
  | 'unknown';

export interface ApiFailure {
  provider?: 'gemini' | 'gemini_web' | 'groq' | 'brave' | 'nvidia_nim' | 'openrouter' | 'bifrost';
  category: ApiFailureCategory;
  httpStatus: number;
  retryable: boolean;
  retryAfterMs?: number;
  requestId: string;
  messageVi: string;
  action: 'retry' | 'open_api_settings' | 'open_quota' | 'refine_query' | 'contact_support';
}

export interface VoiceDescriptor {
  provider: 'browser' | 'gemini';
  id: string;
  name: string;
  locale: string;
  accent?: 'British' | 'Australian' | 'American' | 'International';
  style?: string;
  gender?: 'female' | 'male' | 'neutral';
  previewSupported: boolean;
  localService?: boolean;
}

export interface TtsRequest {
  text: string;
  voiceId: string;
  style?: string;
  pace?: number;
  speakers?: Array<{ name: string; voiceId: string }>;
}

export interface TtsArtifact {
  provider: 'gemini';
  contentHash: string;
  mimeType: string;
  audioBase64: string;
  durationSeconds?: number;
  validation: { valid: boolean; warnings: string[] };
}

export interface MockValidationReport {
  ready: boolean;
  errors: string[];
  repairAttempts: number;
}

export interface MockBuild {
  id: string;
  status: 'draft' | 'generating' | 'validating' | 'ready' | 'failed';
  skills: Record<'listening' | 'reading' | 'writing' | 'speaking', {
    status: 'pending' | 'generating' | 'ready' | 'failed';
    error?: string;
  }>;
  validation: MockValidationReport;
  package?: FullMockTestPackage;
  createdAt: string;
}

export interface ReadingAnnotation {
  id: string;
  mockAttemptId: string;
  passageId: string;
  paragraphId: string;
  startOffset: number;
  endOffset: number;
  color: 'yellow' | 'green' | 'blue';
  note?: string;
  createdAt: string;
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
}

export interface MockSynthesizerInput {
  skillBands: {
    reading: number;
    listening: number;
    writing: number;
    speaking: number;
  };
  learnerProfile?: LearnerProfileWeighting;
  detailedSubmissions?: {
    readingScoreRaw?: number;
    listeningScoreRaw?: number;
    writingTask1Summary?: string;
    writingTask2Summary?: string;
    speakingTranscript?: string;
  };
}

export interface MockSynthesizerResult {
  promptVersion: string; // "mock-assembler-v1"
  disclaimerVi: string;
  skillBands: {
    reading: number;
    listening: number;
    writing: number;
    speaking: number;
  };
  overallBand: number;
  strongestSkill: 'reading' | 'listening' | 'writing' | 'speaking';
  weakestSkill: 'reading' | 'listening' | 'writing' | 'speaking';
  recommendedNextStepsVi: string[];
}


