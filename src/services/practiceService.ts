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
  SpeakingLiveEvaluationReport,
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
  FullGraderInput,
  FullGraderResult,
  MockAssemblerInput,
  MockAssemblerPackage,
  MockSynthesizerInput,
  MockSynthesizerResult,
} from '../types';
import { validateMockPackage } from '../lib/mockPackageValidator';
import { playVoiceText } from './voiceService';
import { getGeminiRequestHeaders } from './aiTutor';

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
  targetBand: number = 7.0,
  audio?: { base64: string; mimeType: string }
): Promise<SpeakingEvaluationResult> {
  const res = await fetch('/api/practice/evaluate-speaking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionPrompt,
      userTranscript,
      part,
      targetBand,
      userAudioBase64: audio?.base64,
      audioMimeType: audio?.mimeType,
    }),
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

export async function evaluateSpeakingLiveAudioApi(
  params: SpeakingLiveAudioScoringInput
): Promise<SpeakingLiveEvaluationReport> {
  const res = await fetch('/api/speaking/analyze', {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
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

/**
 * Full Grader 4-Criteria Assessment (full-grader-v1) for Writing & Speaking
 */
export async function evaluateFullGraderApi(
  params: FullGraderInput
): Promise<FullGraderResult> {
  const res = await fetch('/api/grade/full-grader-v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi chấm điểm bài thi (HTTP ${res.status}).`);
  }
  return await res.json();
}

/**
 * Assemble Custom 4-Skill Cambridge Mock Exam Package (mock-assembler-v1)
 */
export async function assembleFullMockPackageApi(
  params: MockAssemblerInput,
  onProgress?: (skill: 'listening' | 'reading' | 'writing' | 'speaking' | 'finalize', state: 'building' | 'ready') => void,
): Promise<MockAssemblerPackage> {
  const createResponse = await fetch('/api/mock/builds', {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
    body: JSON.stringify(params),
  });
  if (!createResponse.ok) {
    const errData = await createResponse.json().catch(() => ({}));
    throw new Error(errData.error || `Không thể khởi tạo Mock Build (HTTP ${createResponse.status}).`);
  }
  const build = await createResponse.json() as { id: string };
  localStorage.setItem('omni_pending_mock_build', JSON.stringify({ id: build.id, createdAt: new Date().toISOString() }));

  for (const skill of ['listening', 'reading', 'writing', 'speaking'] as const) {
    onProgress?.(skill, 'building');
    const skillResponse = await fetch(`/api/mock/builds/${encodeURIComponent(build.id)}/skills/${skill}/generate`, {
      method: 'POST',
      headers: getGeminiRequestHeaders(),
      body: JSON.stringify({}),
    });
    if (!skillResponse.ok) {
      const error = await skillResponse.json().catch(() => ({}));
      const detail = Array.isArray(error.validation?.errors) ? ` ${error.validation.errors.join(' ')}` : '';
      throw new Error(`${error.error || `Không thể tạo phần ${skill}.`}${detail}`);
    }
    onProgress?.(skill, 'ready');
  }

  onProgress?.('finalize', 'building');
  const finalizeResponse = await fetch(`/api/mock/builds/${encodeURIComponent(build.id)}/finalize`, {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
    body: JSON.stringify({}),
  });
  if (!finalizeResponse.ok) {
    const error = await finalizeResponse.json().catch(() => ({}));
    throw new Error(error.error || `Không thể hoàn tất Mock Build (HTTP ${finalizeResponse.status}).`);
  }
  const data = await finalizeResponse.json() as MockAssemblerPackage;
  const validation = validateMockPackage(data.fullPackage);
  if (!validation.ready) {
    throw new Error(`Bộ đề chưa sẵn sàng: ${validation.errors.join(' ')}`);
  }
  onProgress?.('finalize', 'ready');
  localStorage.removeItem('omni_pending_mock_build');
  return data;
}

/**
 * Synthesize Final Mock Exam Report with Deterministic Band Rounding (mock-assembler-v1)
 */
export async function synthesizeFinalMockReportApi(
  params: MockSynthesizerInput
): Promise<MockSynthesizerResult> {
  const res = await fetch('/api/mock/synthesize-final-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Lỗi tổng hợp báo cáo thi thử (HTTP ${res.status}).`);
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
  let accent: 'British' | 'Australian' | 'Standard' = 'British';
  let onEnd: (() => void) | undefined = onEndCallback;

  if (typeof accentOrOnEnd === 'function') {
    onEnd = accentOrOnEnd;
    accent = 'British';
  } else if (typeof accentOrOnEnd === 'string') {
    accent = accentOrOnEnd;
  }

  let cancelled = false;
  let stop = () => window.speechSynthesis?.cancel();
  void playVoiceText(text, {
    useCase: 'examiner',
    rate,
    locale: accent === 'Australian' ? 'en-AU' : accent === 'British' ? 'en-GB' : 'en-US',
    style: `${accent} IELTS examiner, clear and mature`,
    onEnd: () => { if (!cancelled) onEnd?.(); },
  }).then((cancel) => {
    stop = cancel;
    if (cancelled) stop();
  });
  return () => { cancelled = true; stop(); };
}

export const playTextToSpeech = speakExaminerText;

export async function fetchRealExamForecastApi(params: {
  skill?: string;
  council?: string;
  customQuery?: string;
  timeframe?: string;
}): Promise<import('../types').ForecastGroundingResponse> {
  const res = await fetch('/api/forecast/refresh', {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
    body: JSON.stringify({
      skill: params.skill || 'all',
      council: params.council || 'all',
      customQuery: params.customQuery || '',
      timeframe: params.timeframe || 'latest',
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Lỗi tra cứu dữ liệu đề thi thật và dự đoán.');
  }

  const data = await res.json();
  return data;
}

