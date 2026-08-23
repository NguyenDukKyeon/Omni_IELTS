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
  wordLimit?: string; // e.g. "NO MORE THAN TWO WORDS AND/OR A NUMBER"
  audioTranscript: string;
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

export type ExamColorScheme = 'standard' | 'high_contrast' | 'inverted';

export interface ExamPassageNote {
  id: string;
  passageIndex: number;
  paragraphLabel?: string;
  selectedText: string;
  noteText: string;
  color?: string;
  createdAt: string;
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
  difficulty: 'Cambridge Official Standard' | 'Hard (Band 7.5 - 8.5+)' | 'Diagnostic Standard';
  description: string;
  estimatedMinutes: number; // ~170 mins
  // 1. Listening
  listening: {
    title: string;
    audioTranscript: string;
    sections: Array<{
      sectionNumber: number;
      title: string;
      context: string;
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
  frequencyScore: number; // 0 - 100
  outlinePEEL: RealExamPEELOutline;
  topicVocabularyC1C2: RealExamVocabularyItem[];
  band8ModelAnswer: string;
  modelAnswerWordCount?: number;
  examinerTipsVi: string;
  groundingSourceTitle?: string;
  groundingSourceUrl?: string;
  isCustomGenerated?: boolean;
}

export interface ForecastGroundingResponse {
  forecastItems: RealExamForecastItem[];
  searchQueries: string[];
  groundingSources: Array<{ title: string; url: string }>;
  lastUpdated: string;
  summaryOverviewVi: string;
  detectedTrends?: string[];
}


