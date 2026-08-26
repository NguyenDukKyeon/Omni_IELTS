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
  RealExamForecastItem,
  LiveHubPracticeArtifact,
  LiveHubMockBuildResponse,
  ConsentAction,
  CompletenessCheckResult,
} from '../types';
import { validateMockPackage } from '../lib/mockPackageValidator';
import { playVoiceText } from './voiceService';
import { getGeminiRequestHeaders } from './aiTutor';
import { ApiResponseError } from '../lib/apiFailure';
import { savePrivateArtifactIfAuthenticated } from './supabase';

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
  const { getSession } = await import('./supabase');
  const session = await getSession().catch(() => null);
  const res = await fetch('/api/speaking/analyze', {
    method: 'POST',
    headers: {
      ...getGeminiRequestHeaders(),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
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

export async function createLiveHubPracticeArtifactApi(
  item: RealExamForecastItem,
  retrievedAt?: string | null,
  consentAction?: ConsentAction,
): Promise<LiveHubPracticeArtifact> {
  const response = await fetch(`/api/live-hub/items/${encodeURIComponent(item.id)}/practice`, {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
    body: JSON.stringify({ item, retrievedAt, consentAction }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.artifact) {
    const err = new Error(body.error || `Không thể tạo bài luyện từ Live Hub (HTTP ${response.status}).`) as Error & {
      code?: string;
      completeness?: CompletenessCheckResult;
    };
    err.code = body.code;
    err.completeness = body.completeness;
    throw err;
  }
  await savePrivateArtifactIfAuthenticated('source', body.artifact, body.artifact.provenance).catch(() => false);
  return body.artifact as LiveHubPracticeArtifact;
}

export async function createLiveHubMockBuildApi(
  item: RealExamForecastItem,
  targetBand: number,
  retrievedAt?: string | null,
  consentAction?: ConsentAction,
): Promise<LiveHubMockBuildResponse> {
  const response = await fetch(`/api/live-hub/items/${encodeURIComponent(item.id)}/mock`, {
    method: 'POST',
    headers: getGeminiRequestHeaders(),
    body: JSON.stringify({ item, targetBand, retrievedAt, consentAction }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.artifact || !body.mockBuild?.id) {
    const err = new Error(body.error || `Không thể tạo MockBuild từ Live Hub (HTTP ${response.status}).`) as Error & {
      code?: string;
      completeness?: CompletenessCheckResult;
    };
    err.code = body.code;
    err.completeness = body.completeness;
    throw err;
  }
  await savePrivateArtifactIfAuthenticated('source', body.artifact, body.artifact.provenance).catch(() => false);
  return body as LiveHubMockBuildResponse;
}

/**
 * Assemble Custom 4-Skill Cambridge Mock Exam Package (mock-assembler-v1)
 */
export async function assembleFullMockPackageApi(
  params: MockAssemblerInput,
  onProgress?: (
    skill: 'listening' | 'reading' | 'writing' | 'speaking' | 'finalize',
    state: 'building' | 'ready',
    detail?: { part?: 'part1' | 'part2' | 'part3' },
  ) => void,
): Promise<MockAssemblerPackage> {
  type PendingMockBuild = {
    id: string;
    createdAt: string;
    params: MockAssemblerInput;
    skillData: Partial<Record<'listening' | 'reading' | 'writing' | 'speaking', unknown>>;
    speakingParts?: Record<string, unknown>;
    lastFailedSkill?: 'listening' | 'reading' | 'writing' | 'speaking';
    failedParts?: string[];
  };
  const readPending = (): PendingMockBuild | null => {
    try {
      const raw = localStorage.getItem('omni_pending_mock_build');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const writePending = (pending: PendingMockBuild) => localStorage.setItem('omni_pending_mock_build', JSON.stringify(pending));

  let pending = readPending();
  if (pending) {
    pending = {
      ...pending,
      params: pending.params || params,
      skillData: pending.skillData || {},
    };
  }
  let buildState: {
    id: string;
    skillStates?: Record<string, string>;
    speaking?: { readyParts?: Array<'part1' | 'part2' | 'part3'> };
  } | null = null;
  if (pending?.id) {
    const statusResponse = await fetch(`/api/mock/builds/${encodeURIComponent(pending.id)}`, {
      headers: getGeminiRequestHeaders(),
    }).catch(() => null);
    if (statusResponse?.ok) buildState = await statusResponse.json();
  }

  if (!pending || !buildState) {
    const effectiveParams: MockAssemblerInput = {
      ...(pending?.params || {}),
      ...params,
      sourceArtifactId: pending?.params?.sourceArtifactId || params.sourceArtifactId,
      provenance: pending?.params?.provenance || params.provenance,
    };
    const createResponse = await fetch('/api/mock/builds', {
      method: 'POST',
      headers: getGeminiRequestHeaders(),
      body: JSON.stringify({
        ...effectiveParams,
        resumeSkills: pending?.skillData || {},
        resumeSpeakingParts: pending?.speakingParts || {},
      }),
    });
    if (!createResponse.ok) {
      const errData = await createResponse.json().catch(() => ({}));
      throw new Error(errData.error || `Không thể khởi tạo Mock Build (HTTP ${createResponse.status}).`);
    }
    buildState = await createResponse.json() as { id: string; skillStates?: Record<string, string> };
    pending = {
      id: buildState.id,
      createdAt: pending?.createdAt || new Date().toISOString(),
      params: effectiveParams,
      skillData: pending?.skillData || {},
      speakingParts: pending?.speakingParts,
      lastFailedSkill: pending?.lastFailedSkill,
      failedParts: pending?.failedParts,
    };
    writePending(pending);
  }

  for (const skill of ['listening', 'reading', 'writing', 'speaking'] as const) {
    if (buildState.skillStates?.[skill] === 'ready') {
      onProgress?.(skill, 'ready');
      continue;
    }
    if (skill === 'speaking') {
      const readyParts = new Set<'part1' | 'part2' | 'part3'>([
        ...(buildState.speaking?.readyParts || []),
        ...Object.keys(pending.speakingParts || {}).filter((part): part is 'part1' | 'part2' | 'part3' =>
          part === 'part1' || part === 'part2' || part === 'part3',
        ),
      ]);
      for (const part of ['part1', 'part2', 'part3'] as const) {
        if (readyParts.has(part)) continue;
        onProgress?.('speaking', 'building', { part });
        const shouldRetryPart = pending.lastFailedSkill === 'speaking'
          && (pending.failedParts || []).includes(part);
        const endpoint = shouldRetryPart
          ? `/api/mock/builds/${encodeURIComponent(pending.id)}/retry`
          : `/api/mock/builds/${encodeURIComponent(pending.id)}/skills/speaking/generate`;
        const partResponse = await fetch(endpoint, {
          method: 'POST',
          headers: getGeminiRequestHeaders(),
          body: JSON.stringify(shouldRetryPart ? { skill: 'speaking', part } : { part }),
        });
        if (!partResponse.ok) {
          const error = await partResponse.json().catch(() => ({}));
          pending.lastFailedSkill = 'speaking';
          pending.failedParts = Array.isArray(error.failedParts) ? error.failedParts : [part];
          if (error.partial && typeof error.partial === 'object') pending.speakingParts = error.partial;
          writePending(pending);
          const detail = Array.isArray(error.validation?.errors) ? ` ${error.validation.errors.join(' ')}` : '';
          throw new Error(`${error.error || `Không thể tạo Speaking ${part}.`} (${part})${detail}`);
        }
        const partResult = await partResponse.json().catch(() => ({}));
        pending.speakingParts = pending.speakingParts || {};
        if (partResult.partData) pending.speakingParts[part] = partResult.partData;
        if (partResult.data) pending.skillData.speaking = partResult.data;
        readyParts.add(part);
        pending.lastFailedSkill = undefined;
        pending.failedParts = undefined;
        writePending(pending);
      }
      pending.speakingParts = undefined;
      writePending(pending);
      onProgress?.('speaking', 'ready');
      continue;
    }
    onProgress?.(skill, 'building');
    const shouldRetry = pending.lastFailedSkill === skill;
    const endpoint = shouldRetry
      ? `/api/mock/builds/${encodeURIComponent(pending.id)}/retry`
      : `/api/mock/builds/${encodeURIComponent(pending.id)}/skills/${skill}/generate`;
    const skillResponse = await fetch(endpoint, {
      method: 'POST',
      headers: getGeminiRequestHeaders(),
      body: JSON.stringify(shouldRetry ? { skill } : {}),
    });
    if (!skillResponse.ok) {
      const error = await skillResponse.json().catch(() => ({}));
      pending.lastFailedSkill = skill;
      pending.failedParts = Array.isArray(error.failedParts) ? error.failedParts : [];
      if (error.partial && typeof error.partial === 'object') pending.speakingParts = error.partial;
      writePending(pending);
      const detail = Array.isArray(error.validation?.errors) ? ` ${error.validation.errors.join(' ')}` : '';
      const failedPartLabel = pending.failedParts.length ? ` (${pending.failedParts.join(', ')})` : '';
      throw new Error(`${error.error || `Không thể tạo phần ${skill}.`}${failedPartLabel}${detail}`);
    }
    const skillResult = await skillResponse.json().catch(() => ({}));
    if (skillResult.data) pending.skillData[skill] = skillResult.data;
    pending.lastFailedSkill = undefined;
    pending.failedParts = undefined;
    writePending(pending);
    onProgress?.(skill, 'ready');
  }

  onProgress?.('finalize', 'building');
  const finalizeResponse = await fetch(`/api/mock/builds/${encodeURIComponent(pending.id)}/finalize`, {
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
  await savePrivateArtifactIfAuthenticated('mock_package', data.fullPackage, {
    mockBuildId: data.mockBuildId,
    promptVersion: data.promptVersion,
    sourceUrl: params.sourceItem?.groundingSourceUrl,
  }).catch(() => false);
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
    throw new ApiResponseError(error, res.status);
  }

  const data = await res.json();
  return data;
}

