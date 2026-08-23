import {
  ReadingQuestionType,
  ReadingPracticeExercise,
  ListeningQuestionType,
  ListeningPracticeExercise,
  WritingPracticeType,
  WritingPracticePrompt,
  WritingEvaluationResult,
  SpeakingPracticePart,
  SpeakingPracticePrompt,
  SpeakingEvaluationResult,
  EssayUpgradeResult,
  SentenceAcademicStylistInput,
  SentenceAcademicStylistResult,
  SpeakingLiveAudioScoringInput,
  QuestionTrapAnalysisInput,
  QuestionTrapAnalysisResult,
  MasterMentorPanelInput,
  MasterMentorPanelReport,
  IntelligentErrorTaggerInput,
  IntelligentErrorTaggerReport,
  ChallengeType,
  SpeedDrillChallenge,
  SpeedDrillEvaluationResult,
  SourceToLearningPackageInput,
  SourceToLearningPackageResult,
  VocabEnricherInput,
  VocabEnricherResult,
  GrammarCurriculumInput,
  GrammarCurriculumResult,
  ItemWriterPracticeInput,
  ItemWriterPracticeResult,
} from '../types';

export async function generateReadingPracticeApi(
  type: ReadingQuestionType,
  topic?: string,
  difficulty: string = 'Band 7.0-8.0'
): Promise<ReadingPracticeExercise> {
  const res = await fetch('/api/practice/generate-reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, topic, difficulty }),
  });
  if (!res.ok) throw new Error('Không thể tạo bài tập Reading.');
  const data = await res.json();
  return data.exercise;
}

export async function generateListeningPracticeApi(
  type: ListeningQuestionType,
  topic?: string,
  difficulty: string = 'Band 7.0-8.0'
): Promise<ListeningPracticeExercise> {
  const res = await fetch('/api/practice/generate-listening', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, topic, difficulty }),
  });
  if (!res.ok) throw new Error('Không thể tạo bài tập Listening.');
  const data = await res.json();
  return data.exercise;
}

export async function generateWritingPracticePromptApi(
  type: WritingPracticeType,
  category?: string,
  topic?: string,
  difficulty: string = 'Band 7.0-8.0'
): Promise<WritingPracticePrompt> {
  const res = await fetch('/api/practice/generate-writing-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, category, topic, difficulty }),
  });
  if (!res.ok) throw new Error('Không thể tạo đề Writing.');
  const data = await res.json();
  return data.prompt;
}

export async function generateSpeakingPracticePromptApi(
  part: SpeakingPracticePart,
  topic?: string,
  difficulty: string = 'Band 7.0-8.0'
): Promise<SpeakingPracticePrompt> {
  const res = await fetch('/api/practice/generate-speaking-prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ part, topic, difficulty }),
  });
  if (!res.ok) throw new Error('Không thể tạo đề Speaking.');
  const data = await res.json();
  return data.prompt;
}

export async function evaluateWritingPracticeApi(
  promptStatement: string,
  essayContent: string,
  taskType: string,
  targetBand: number = 7.5
): Promise<WritingEvaluationResult> {
  const res = await fetch('/api/practice/evaluate-writing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promptStatement, essayContent, taskType, targetBand }),
  });
  if (!res.ok) throw new Error('Lỗi chấm bài Writing.');
  const data = await res.json();
  return data.evaluation;
}

export async function upgradeEssayBandApi(params: {
  promptStatement: string;
  originalEssay: string;
  taskType: string;
  targetBand?: number;
  userCurrentBand?: number;
}): Promise<EssayUpgradeResult> {
  const res = await fetch('/api/gemini/essay-upgrader', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Lỗi nâng cấp bài viết IELTS.');
  }
  return await res.json();
}

export async function rewriteSentence3TiersApi(
  params: SentenceAcademicStylistInput
): Promise<SentenceAcademicStylistResult> {
  const res = await fetch('/api/gemini/sentence-stylist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi nâng cấp câu văn 3 cấp độ (HTTP ${res.status}).`);
  }
  return await res.json();
}


export async function evaluateSpeakingPracticeApi(
  questionPrompt: string,
  userTranscript: string,
  part: string,
  targetBand: number = 7.0
): Promise<SpeakingEvaluationResult> {
  const res = await fetch('/api/practice/evaluate-speaking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionPrompt, userTranscript, part, targetBand }),
  });
  if (!res.ok) throw new Error('Lỗi chấm bài Speaking.');
  const data = await res.json();
  return data.evaluation;
}

// 1:1 AI Virtual Examiner Room APIs
export interface ExaminerTurnResponse {
  examinerReply: string;
  nextQuestion: string;
  isPartFinished: boolean;
  suggestedPart: 'part1' | 'part2' | 'part3' | 'completed';
  timeGuidanceSeconds: number;
  quickTips: string[];
}

export async function callSpeakingExaminerTurnApi(params: {
  currentPart: 'part1' | 'part2' | 'part3';
  turnIndex: number;
  history: Array<{ speaker: string; text: string }>;
  candidateLastSpeech: string;
  currentTopic?: string;
  cueCard?: any;
  targetBand?: number;
  examinerName?: string;
  examinerStyle?: string;
}): Promise<ExaminerTurnResponse> {
  const res = await fetch('/api/gemini/speaking-examiner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Không thể kết nối với Giám khảo AI.');
  return await res.json();
}

export async function evaluateFullSpeakingSessionApi(params: {
  conversationHistory: Array<{
    part: string;
    question: string;
    userTranscript: string;
    durationSeconds: number;
  }>;
  totalDurationSeconds: number;
  targetBand?: number;
}): Promise<any> {
  const res = await fetch('/api/gemini/speaking-evaluation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Không thể tạo bảng điểm Speaking.');
  return await res.json();
}

export async function evaluateSpeakingLiveAudioApi(
  params: SpeakingLiveAudioScoringInput
): Promise<SpeakingLiveEvaluationReport> {
  const res = await fetch('/api/gemini/speaking-live-audio-evaluation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi chấm điểm Audio Speaking (HTTP ${res.status}).`);
  }
  return await res.json();
}

export async function analyzeQuestionDistractorTrapApi(
  params: QuestionTrapAnalysisInput
): Promise<QuestionTrapAnalysisResult> {
  const res = await fetch('/api/gemini/trap-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi phân tích bẫy câu hỏi (HTTP ${res.status}).`);
  }
  return await res.json();
}

export async function consultMasterMentorPanelApi(
  params: MasterMentorPanelInput
): Promise<MasterMentorPanelReport> {
  const res = await fetch('/api/gemini/mentor-panel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi tham vấn Master Mentor Panel (HTTP ${res.status}).`);
  }
  return await res.json();
}

export async function extractIntelligentErrorTagsApi(
  params: IntelligentErrorTaggerInput
): Promise<IntelligentErrorTaggerReport> {
  const res = await fetch('/api/gemini/intelligent-error-tagger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi bóc tách lỗi sai & tạo thẻ SRS (HTTP ${res.status}).`);
  }
  return await res.json();
}

export async function generateSpeedDrillApi(
  challengeType: ChallengeType,
  topic: string = 'Academic Writing & Natural Lexicon',
  targetBand: number = 7.5
): Promise<SpeedDrillChallenge> {
  const res = await fetch('/api/gemini/generate-speed-drill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeType, topic, targetBand }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi sinh bài tập Speed Drill (HTTP ${res.status}).`);
  }
  return await res.json();
}

export async function evaluateSpeedDrillApi(params: {
  challenge: SpeedDrillChallenge;
  userSubmission: any;
  targetBand?: number;
}): Promise<SpeedDrillEvaluationResult> {
  const res = await fetch('/api/gemini/evaluate-speed-drill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi chấm điểm Speed Drill (HTTP ${res.status}).`);
  }
  return await res.json();
}

export async function generateSourceToLearningPackageApi(
  params: SourceToLearningPackageInput
): Promise<SourceToLearningPackageResult> {
  const res = await fetch('/api/gemini/source-to-learning-package', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi thiết kế gói bài học 4 kỹ năng (HTTP ${res.status}).`);
  }
  return await res.json();
}

export async function enrichVocabCardApi(
  params: VocabEnricherInput
): Promise<VocabEnricherResult> {
  const res = await fetch('/api/gemini/enrich-vocab-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi làm giàu thẻ từ vựng (HTTP ${res.status}).`);
  }
  return await res.json();
}

export async function generateGrammarCurriculumLessonApi(
  params: GrammarCurriculumInput
): Promise<GrammarCurriculumResult> {
  const res = await fetch('/api/gemini/grammar-curriculum-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi thiết kế bài học ngữ pháp (HTTP ${res.status}).`);
  }
  return await res.json();
}

export async function generateItemWriterPracticeApi(
  params: ItemWriterPracticeInput
): Promise<ItemWriterPracticeResult> {
  const res = await fetch('/api/practice/item-writer-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi sinh câu hỏi luyện tập (HTTP ${res.status}).`);
  }
  return await res.json();
}

// Audio Text-To-Speech helper for British/Australian IELTS Examiner Voice
export function speakExaminerText(
  text: string,
  rate: number = 0.95,
  accentOrOnEnd: 'British' | 'Australian' | 'Standard' | (() => void) = 'British',
  onEndCallback?: () => void
): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (typeof accentOrOnEnd === 'function') {
      accentOrOnEnd();
    } else {
      onEndCallback?.();
    }
    return () => {};
  }

  let accent: 'British' | 'Australian' | 'Standard' = 'British';
  let onEnd: (() => void) | undefined = onEndCallback;

  if (typeof accentOrOnEnd === 'function') {
    onEnd = accentOrOnEnd;
    accent = 'British';
  } else if (typeof accentOrOnEnd === 'string') {
    accent = accentOrOnEnd;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = null;

  if (accent === 'British') {
    utterance.lang = 'en-GB';
    selectedVoice = voices.find((v) => v.lang === 'en-GB' || v.name.toLowerCase().includes('british') || v.name.toLowerCase().includes('uk'));
  } else if (accent === 'Australian') {
    utterance.lang = 'en-AU';
    selectedVoice = voices.find((v) => v.lang === 'en-AU' || v.name.toLowerCase().includes('australia'));
  }

  if (!selectedVoice) {
    selectedVoice =
      voices.find((v) => v.lang.includes('en-GB') || v.lang.includes('en-US')) ||
      voices.find((v) => v.lang.startsWith('en'));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  if (onEnd) {
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
  }

  window.speechSynthesis.speak(utterance);

  return () => {
    window.speechSynthesis.cancel();
  };
}

export const playTextToSpeech = speakExaminerText;

export async function fetchRealExamForecastApi(params: {
  skill?: string;
  council?: string;
  customQuery?: string;
  timeframe?: string;
}): Promise<import('../types').ForecastGroundingResponse> {
  const res = await fetch('/api/gemini/forecast-grounding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skill: params.skill || 'all',
      council: params.council || 'all',
      customQuery: params.customQuery || '',
      timeframe: params.timeframe || 'latest',
    }),
  });

  if (!res.ok) {
    throw new Error('Lỗi tra cứu dữ liệu đề thi thật và dự đoán.');
  }

  const data = await res.json();
  return data;
}

