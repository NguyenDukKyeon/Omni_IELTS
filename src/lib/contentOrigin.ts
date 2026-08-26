import type {
  ClaimCitation,
  ConsentAction,
  ContentOrigin,
  ComponentProvenance,
  CompletenessCheckResult,
  LiveHubArtifactProvenance,
  RealExamForecastItem,
  FullMockTestPackage,
  LiveHubLearningSkill,
  LiveHubLearningItem,
  BaseLiveHubLearningItem,
} from '../types';

export function isValidAudioUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:audio/')) return isValidAudioBase64(trimmed);
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (!parsed.hostname || parsed.hostname === 'broken' || parsed.hostname === 'invalid') return false;
    return true;
  } catch {
    return false;
  }
}

export function isValidAudioBase64(base64Str: string): boolean {
  if (!base64Str || typeof base64Str !== 'string') return false;
  const trimmed = base64Str.trim();
  if (trimmed.startsWith('data:audio/') && trimmed.length > 30) return true;
  if (trimmed.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) return true;
  return false;
}

function hasValidQuestionAnswer(question: unknown): boolean {
  if (!question || typeof question !== 'object') return false;
  const q = question as Record<string, unknown>;
  return typeof q.correctAnswer === 'string' && q.correctAnswer.trim().length > 0;
}

export function isValidatedPlayableAudio(source: unknown): boolean {
  if (!source) return false;
  if (typeof source === 'string') {
    return isValidAudioUrl(source) || isValidAudioBase64(source);
  }
  if (typeof source === 'object' && source !== null) {
    const s = source as Record<string, unknown>;
    if (s.audioStatus === 'invalid' || s.audioStatus === 'truncated') return false;

    // Direct url/base64 on source
    const directUrl = typeof s.audioUrl === 'string' ? s.audioUrl : (typeof s.mediaUrl === 'string' ? s.mediaUrl : undefined);
    const directBase64 = typeof s.audioBase64 === 'string' ? s.audioBase64 : undefined;
    const hasDirectValidPayload = (directUrl !== undefined && isValidAudioUrl(directUrl)) || (directBase64 !== undefined && isValidAudioBase64(directBase64));

    // Audio artifact on source
    if (s.audioArtifact && typeof s.audioArtifact === 'object') {
      const art = s.audioArtifact as Record<string, unknown>;
      if (art.isValidated === false || art.status === 'invalid' || art.status === 'truncated') return false;
      const artUrl = typeof art.audioUrl === 'string' && isValidAudioUrl(art.audioUrl);
      const artBase64 = typeof art.audioBase64 === 'string' && isValidAudioBase64(art.audioBase64);
      const hasArtPayload = artUrl || artBase64;
      // Must never accept a validation marker without an actual valid payload
      if (hasArtPayload) {
        return true;
      }
      return false;
    }

    if (hasDirectValidPayload) {
      return true;
    }
  }
  return false;
}

export function isValidatedMockAudio(section: unknown): boolean {
  if (!section || typeof section !== 'object') return false;
  const s = section as Record<string, unknown>;
  const artifact = s.audioArtifact;
  if (!artifact || typeof artifact !== 'object') return false;

  const art = artifact as Record<string, unknown>;
  if (art.isValidated === false || art.status === 'invalid' || art.status === 'truncated') return false;

  const hasPayloadUrl = typeof art.audioUrl === 'string' && isValidAudioUrl(art.audioUrl);
  const hasPayloadBase64 = typeof art.audioBase64 === 'string' && isValidAudioBase64(art.audioBase64);
  if (!hasPayloadUrl && !hasPayloadBase64) return false;

  return art.isValidated === true || art.status === 'validated';
}

export function checkPracticeCompleteness(
  skill: LiveHubLearningSkill | string,
  item: LiveHubLearningItem | RealExamForecastItem | Partial<RealExamForecastItem> | Record<string, unknown>
): CompletenessCheckResult {
  if (!item || typeof item !== 'object') {
    return {
      isComplete: false,
      gradeable: false,
      missingComponents: ['item_data'],
      availableComponents: [],
      summaryVi: 'Dữ liệu bài tập không hợp lệ.',
      actionOptions: ['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant'],
    };
  }

  const it = item as Record<string, unknown>;

  if (it.isComplete === false || (Array.isArray(it.missingComponents) && it.missingComponents.length > 0)) {
    const missing = Array.isArray(it.missingComponents) && it.missingComponents.length > 0
      ? (it.missingComponents as string[])
      : ['incomplete_content'];
    return {
      isComplete: false,
      gradeable: false,
      missingComponents: missing,
      availableComponents: ['partial_content'],
      summaryVi: `Nguồn bài tập chưa hoàn chỉnh (thiếu: ${missing.join(', ')}). Cần lựa chọn hành động xử lý.`,
      actionOptions: ['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant'],
    };
  }

  const missingComponents: string[] = [];
  const availableComponents: string[] = [];
  const normalizedSkill = (typeof skill === 'string' ? skill : String(skill || '')).toLowerCase();

  if (normalizedSkill.startsWith('writing')) {
    const task2 = it.task2 && typeof it.task2 === 'object' ? (it.task2 as Record<string, unknown>) : undefined;
    const task1 = it.task1 && typeof it.task1 === 'object' ? (it.task1 as Record<string, unknown>) : undefined;
    const promptStatement = typeof it.promptStatement === 'string' ? it.promptStatement : undefined;
    const task2Prompt = typeof task2?.prompt === 'string' ? task2.prompt : undefined;
    const task1Prompt = typeof task1?.prompt === 'string' ? task1.prompt : undefined;

    const hasPrompt = Boolean(promptStatement?.trim() || task2Prompt?.trim() || task1Prompt?.trim());
    if (hasPrompt) {
      availableComponents.push('promptStatement');
    } else {
      missingComponents.push('promptStatement');
    }

    const isComplete = hasPrompt;
    const gradeable = isComplete;
    return {
      isComplete,
      gradeable,
      missingComponents,
      availableComponents,
      summaryVi: isComplete
        ? 'Đề thi Writing có đầy đủ câu hỏi để luyện tập và chấm điểm theo tiêu chí band.'
        : 'Đề thi Writing chưa có câu hỏi hoàn chỉnh.',
      actionOptions: isComplete
        ? ['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant']
        : ['search_more', 'ai_fill_missing', 'create_ai_variant'],
    };
  }

  if (normalizedSkill.startsWith('speaking')) {
    const cueCard = it.cueCard && typeof it.cueCard === 'object' ? (it.cueCard as Record<string, unknown>) : undefined;
    const promptStatement = typeof it.promptStatement === 'string' ? it.promptStatement : undefined;
    const cueCardPrompt = typeof cueCard?.prompt === 'string' ? cueCard.prompt : undefined;
    const cueCardPoints = Array.isArray(it.cueCardPoints) ? (it.cueCardPoints as string[]) : undefined;
    const bulletPoints = Array.isArray(cueCard?.bulletPoints) ? (cueCard.bulletPoints as string[]) : undefined;

    const hasPrompt = Boolean(promptStatement?.trim() || cueCardPrompt?.trim() || (cueCardPoints && cueCardPoints.length > 0));
    const isPart2 = normalizedSkill === 'speaking_part2' || normalizedSkill === 'part2';
    const hasCueCard = Array.isArray(cueCardPoints) ? cueCardPoints.length > 0 : Boolean(bulletPoints && bulletPoints.length > 0);

    if (hasPrompt) availableComponents.push('promptStatement');
    else missingComponents.push('promptStatement');

    if (isPart2) {
      if (hasCueCard) availableComponents.push('cueCard');
      else missingComponents.push('cueCard');
    }

    const isComplete = isPart2 ? (hasPrompt && hasCueCard) : hasPrompt;
    const gradeable = isComplete;
    return {
      isComplete,
      gradeable,
      missingComponents,
      availableComponents,
      summaryVi: isComplete
        ? 'Đề thi Speaking có đủ phần gợi ý và chủ đề để ghi âm / chấm điểm.'
        : `Đề thi Speaking thiếu: ${missingComponents.join(', ')}.`,
      actionOptions: isComplete
        ? ['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant']
        : (availableComponents.length > 0
          ? ['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant']
          : ['search_more', 'ai_fill_missing', 'create_ai_variant']),
    };
  }

  if (normalizedSkill === 'reading') {
    const passage = it.passage && typeof it.passage === 'object' ? (it.passage as Record<string, unknown>) : undefined;
    const paragraphs = Array.isArray(passage?.paragraphs) ? passage.paragraphs : undefined;
    const text = typeof passage?.text === 'string' ? passage.text : (typeof it.text === 'string' ? it.text : undefined);
    const promptStatement = typeof it.promptStatement === 'string' ? it.promptStatement : undefined;

    const hasPassage = Boolean((paragraphs && paragraphs.length > 0) || text?.trim() || (promptStatement && promptStatement.length > 100));
    if (hasPassage) availableComponents.push('passage');
    else missingComponents.push('passage');

    const questions = Array.isArray(it.questions) ? it.questions : [];
    if (questions.length > 0) availableComponents.push('questions');
    else missingComponents.push('questions');

    const hasValidAnswers = questions.length > 0 && questions.every(hasValidQuestionAnswer);

    if (hasValidAnswers) availableComponents.push('answers');
    else if (questions.length > 0) missingComponents.push('answers');

    const isComplete = hasPassage && questions.length > 0 && hasValidAnswers;
    const gradeable = isComplete;
    const readingHasAvailable = availableComponents.length > 0;

    return {
      isComplete,
      gradeable,
      missingComponents,
      availableComponents,
      summaryVi: isComplete
        ? 'Đề thi Reading có đầy đủ đoạn văn, câu hỏi và đáp án có thể chấm tự động.'
        : `Đề thi Reading chưa hoàn chỉnh (thiếu: ${missingComponents.join(', ')}). Cần bổ sung câu hỏi hoặc đáp án để có thể chấm điểm.`,
      actionOptions: readingHasAvailable
        ? ['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant']
        : ['search_more', 'ai_fill_missing', 'create_ai_variant'],
    };
  }

  if (normalizedSkill === 'listening') {
    const hasPlayableAudio = isValidatedPlayableAudio(it);

    if (hasPlayableAudio) availableComponents.push('playable_audio');
    else missingComponents.push('playable_audio');

    const audioTranscript = typeof it.audioTranscript === 'string' ? it.audioTranscript : undefined;
    if (audioTranscript?.trim()) availableComponents.push('audioTranscript');

    const questions = Array.isArray(it.questions) ? it.questions : [];
    if (questions.length > 0) availableComponents.push('questions');
    else missingComponents.push('questions');

    const hasValidAnswers = questions.length > 0 && questions.every(hasValidQuestionAnswer);

    if (hasValidAnswers) availableComponents.push('answers');
    else if (questions.length > 0) missingComponents.push('answers');

    const isComplete = hasPlayableAudio && questions.length > 0 && hasValidAnswers;
    const gradeable = isComplete;
    const listeningHasAvailable = availableComponents.length > 0;

    return {
      isComplete,
      gradeable,
      missingComponents,
      availableComponents,
      summaryVi: isComplete
        ? 'Bài nghe có đầy đủ audio có thể phát, câu hỏi và đáp án.'
        : `Bài nghe chưa hoàn chỉnh (thiếu: ${missingComponents.join(', ')}). Không thể chấm điểm nếu thiếu audio hoặc đáp án.`,
      actionOptions: listeningHasAvailable
        ? ['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant']
        : ['search_more', 'ai_fill_missing', 'create_ai_variant'],
    };
  }

  // Fail-closed for unsupported skill
  return {
    isComplete: false,
    gradeable: false,
    missingComponents: [`unsupported_skill_${normalizedSkill || 'unknown'}`],
    availableComponents: [],
    summaryVi: `Kỹ năng "${skill || 'unknown'}" không được hỗ trợ để tự động kiểm định hoàn chỉnh.`,
    actionOptions: ['search_more', 'ai_fill_missing', 'create_ai_variant'],
  };
}

export function checkMockCompleteness(itemOrPackage: unknown): CompletenessCheckResult {
  if (!itemOrPackage || typeof itemOrPackage !== 'object') {
    return {
      isComplete: false,
      gradeable: false,
      missingComponents: ['mock_package'],
      availableComponents: [],
      summaryVi: 'Dữ liệu Mock Test không hợp lệ.',
      actionOptions: ['search_more', 'ai_fill_missing', 'create_ai_variant'],
    };
  }

  const pkgObj = itemOrPackage as Record<string, unknown>;

  // Check if it's a FullMockTestPackage
  const isFullPackageStructure = Boolean(
    pkgObj.listening &&
    pkgObj.reading &&
    pkgObj.writing &&
    pkgObj.speaking
  );

  if (isFullPackageStructure) {
    const pkg = itemOrPackage as FullMockTestPackage;
    const missing: string[] = [];
    const available: string[] = [];

    // 1. Listening: 4 sections, 40 questions, playable audio per section, gradeable answers
    const listeningSections = pkg.listening?.sections || [];
    const listeningQuestions = listeningSections.flatMap((s) => s.questions || []);
    const has4Sections = listeningSections.length === 4;
    const has40ListeningQuestions = listeningQuestions.length === 40;
    const hasAllListeningAnswers = has40ListeningQuestions && listeningQuestions.every(hasValidQuestionAnswer);
    const hasAllListeningAudio = has4Sections && listeningSections.every(isValidatedMockAudio);

    if (has4Sections && has40ListeningQuestions && hasAllListeningAnswers && hasAllListeningAudio) {
      available.push('listening_complete_with_audio_and_answers');
    } else {
      if (!has4Sections) missing.push('listening_4_sections');
      if (!has40ListeningQuestions) missing.push(`listening_${listeningQuestions.length}_of_40_questions`);
      if (!hasAllListeningAudio) missing.push('listening_playable_audio');
      if (!hasAllListeningAnswers) missing.push('listening_gradeable_answers');
    }

    // 2. Reading: 3 passages, 40 questions, gradeable answers
    const readingPassages = pkg.reading?.passages || [];
    const readingQuestions = readingPassages.flatMap((p) => p.questions || []);
    const has3Passages = readingPassages.length === 3;
    const has40ReadingQuestions = readingQuestions.length === 40;
    const hasAllReadingAnswers = has40ReadingQuestions && readingQuestions.every(hasValidQuestionAnswer);

    if (has3Passages && has40ReadingQuestions && hasAllReadingAnswers) {
      available.push('reading_complete_with_answers');
    } else {
      if (!has3Passages) missing.push('reading_3_passages');
      if (!has40ReadingQuestions) missing.push(`reading_${readingQuestions.length}_of_40_questions`);
      if (!hasAllReadingAnswers) missing.push('reading_gradeable_answers');
    }

    // 3. Writing: task 1 + task 2
    if (pkg.writing?.task1?.prompt && pkg.writing?.task2?.prompt) {
      available.push('writing_tasks_1_and_2');
    } else {
      missing.push('writing_tasks');
    }

    // 4. Speaking: part 1, part 2, part 3
    if (pkg.speaking?.part1 && pkg.speaking?.part2 && pkg.speaking?.part3) {
      available.push('speaking_parts_1_2_3');
    } else {
      missing.push('speaking_parts');
    }

    const isComplete = missing.length === 0;
    const mockHasAvailable = available.length > 0;
    return {
      isComplete,
      gradeable: isComplete,
      missingComponents: missing,
      availableComponents: available,
      summaryVi: isComplete
        ? 'Bộ đề thi thử IELTS-style có đủ cấu trúc 4 kỹ năng (40L + 40R + 2W + S123).'
        : `Bộ đề chưa đủ 4 kỹ năng chuẩn (thiếu: ${missing.join(', ')}).`,
      actionOptions: mockHasAvailable
        ? ['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant']
        : ['search_more', 'ai_fill_missing', 'create_ai_variant'],
    };
  }

  // It's a single Live Hub item or section
  const sourceSkill = typeof pkgObj.skill === 'string' ? pkgObj.skill : 'writing_task2';
  const sourceCompleteness = checkPracticeCompleteness(sourceSkill, pkgObj);
  const available: string[] = sourceCompleteness.availableComponents.map((component) => `${sourceSkill}_${component}`);
  if (sourceCompleteness.isComplete) available.unshift(sourceSkill);

  const requiredMockComponents = [
    'listening_40_questions',
    'reading_40_questions',
    'writing_task1',
    'writing_task2',
    'speaking_parts_1_2_3',
  ];
  const suppliedFullMockComponent = sourceCompleteness.isComplete
    && (sourceSkill === 'writing_task1' || sourceSkill === 'writing_task2')
    ? sourceSkill
    : null;
  const missing: string[] = requiredMockComponents.filter((component) => component !== suppliedFullMockComponent);
  if (!sourceCompleteness.isComplete) {
    missing.push(...sourceCompleteness.missingComponents.map((component) => `${sourceSkill}_${component}`));
  }

  return {
    isComplete: false,
    gradeable: false,
    missingComponents: missing,
    availableComponents: available,
    summaryVi: `Nguồn từ Live Hub chỉ chứa phần thi ${sourceSkill}. Để làm Full Mock 4 kỹ năng, cần ghép thêm hoặc luyện riêng phần này.`,
    actionOptions: ['search_more', 'practice_available', 'ai_fill_missing', 'create_ai_variant'],
  };
}

export function buildComponentProvenance(params: {
  origin: ContentOrigin;
  sourceItemId?: string;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
  citationUrls?: string[];
  retrievedAt?: string | null;
  evidenceType?: LiveHubArtifactProvenance['evidenceType'];
  aiModel?: string;
  taskTier?: string;
  promptVersion?: string;
  fillReason?: string;
}): ComponentProvenance {
  // Never upgrade evidence classification from URL presence alone. Default missing to 'forecast'.
  const resolvedEvidenceType: LiveHubArtifactProvenance['evidenceType'] = params.evidenceType
    ? params.evidenceType
    : params.origin === 'fully_ai_generated'
    ? 'ai_generated'
    : 'forecast';

  return {
    origin: params.origin,
    sourceItemId: params.sourceItemId,
    sourceTitle: params.sourceTitle || null,
    sourceUrl: params.sourceUrl || null,
    citationUrls: params.citationUrls || [],
    retrievedAt: params.retrievedAt || null,
    evidenceType: resolvedEvidenceType,
    aiMetadata: params.origin !== 'authentic_source' ? {
      model: params.aiModel,
      generatedAt: new Date().toISOString(),
      taskTier: params.taskTier,
      promptVersion: params.promptVersion,
      fillReason: params.fillReason,
    } : undefined,
  };
}

export function buildLearningArtifactProvenance(params: {
  sourceItem?: LiveHubLearningItem | RealExamForecastItem | Partial<RealExamForecastItem> | null;
  consentAction?: ConsentAction;
  retrievedAt?: string | null;
  filledComponents?: string[];
  aiModel?: string;
  taskTier?: string;
  promptVersion?: string;
}): LiveHubArtifactProvenance {
  const { sourceItem, consentAction = 'direct', retrievedAt, filledComponents, aiModel, taskTier, promptVersion } = params;

  const sourceOrigin: ContentOrigin = sourceItem?.origin || 'authentic_source';
  const createsSeparateVariant = consentAction === 'create_ai_variant';
  const addsAiContent = consentAction === 'ai_fill_missing' || Boolean(filledComponents?.length);
  const origin: ContentOrigin = createsSeparateVariant || !sourceItem || sourceOrigin === 'fully_ai_generated'
    ? 'fully_ai_generated'
    : addsAiContent || sourceOrigin === 'source_plus_ai'
      ? 'source_plus_ai'
      : 'authentic_source';

  // A fully AI artifact can retain a lineage id, but it must never inherit
  // evidence URLs or citations that imply its generated content was sourced.
  const citationUrls = sourceItem && origin !== 'fully_ai_generated'
    ? [...new Set((sourceItem.citations || []).map((c) => c.url).filter(Boolean))]
    : [];

  const components: Record<string, ComponentProvenance> = {};

  if (sourceItem) {
    const sourceSkill = sourceItem.skill || 'writing_task2';
    components[sourceSkill] = buildComponentProvenance({
      origin: origin === 'fully_ai_generated' ? 'fully_ai_generated' : sourceOrigin,
      sourceItemId: sourceItem.id,
      sourceTitle: origin === 'fully_ai_generated' ? null : (sourceItem.groundingSourceTitle || sourceItem.title),
      sourceUrl: origin === 'fully_ai_generated' ? null : (sourceItem.groundingSourceUrl || citationUrls[0] || null),
      citationUrls,
      retrievedAt: retrievedAt || null,
      evidenceType: origin === 'fully_ai_generated' ? 'ai_generated' : sourceItem.evidenceType,
      aiModel: origin === 'fully_ai_generated' ? aiModel : undefined,
      taskTier: origin === 'fully_ai_generated' ? taskTier : undefined,
      promptVersion: origin === 'fully_ai_generated' ? promptVersion : undefined,
      fillReason: createsSeparateVariant ? 'user_requested_separate_ai_variant' : undefined,
    });
  }

  if (filledComponents && filledComponents.length > 0) {
    for (const comp of filledComponents) {
      if (!components[comp]) {
        components[comp] = buildComponentProvenance({
          origin: 'fully_ai_generated',
          aiModel,
          taskTier,
          promptVersion,
          fillReason: 'user_approved_ai_fill',
        });
      }
    }
  }

  const resolvedEvidenceType = origin === 'fully_ai_generated'
    ? 'ai_generated'
    : (sourceItem?.evidenceType || 'forecast');

  return {
    sourceItemId: sourceItem?.id || `ai_gen_${Date.now()}`,
    evidenceType: resolvedEvidenceType,
    sourceTitle: origin === 'fully_ai_generated' ? null : (sourceItem?.groundingSourceTitle || null),
    sourceUrl: origin === 'fully_ai_generated' ? null : (sourceItem?.groundingSourceUrl || citationUrls[0] || null),
    citationUrls,
    retrievedAt: retrievedAt || null,
    origin,
    components,
    aiMetadata: origin !== 'authentic_source' ? {
      model: aiModel || (origin === 'source_plus_ai' ? 'gemini-3.1-pro' : undefined),
      generatedAt: new Date().toISOString(),
      taskTier,
      promptVersion,
      filledComponents: origin === 'source_plus_ai' ? (filledComponents || []) : undefined,
      derivedFromSourceId: sourceItem?.id,
    } : undefined,
  };
}

export function getContentOriginBadge(
  origin: ContentOrigin,
  context: 'practice' | 'mock' | string = 'practice',
  evidenceType?: LiveHubArtifactProvenance['evidenceType']
): {
  labelVi: string;
  labelEn: string;
  badgeClass: string;
  isAuthentic: boolean;
  isHybrid: boolean;
  isAi: boolean;
} {
  if (origin === 'authentic_source') {
    const isVerified = evidenceType === 'verified_report';
    const isRecall = evidenceType === 'reported_recall';
    return {
      labelVi: isVerified
        ? (context === 'mock' ? 'Nguồn đã xác minh từ Live Hub' : 'Nguồn đã xác minh')
        : isRecall
          ? 'Nguồn hồi tưởng có dẫn chứng'
          : 'Nguồn Live Hub — chưa xác minh',
      labelEn: isVerified
        ? 'Verified Source'
        : isRecall
          ? 'Cited Exam Recall'
          : 'Live Hub Forecast (Unverified)',
      badgeClass: !isVerified
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      isAuthentic: isVerified,
      isHybrid: false,
      isAi: false,
    };
  }

  if (origin === 'source_plus_ai') {
    const isVerified = evidenceType === 'verified_report';
    const isRecall = evidenceType === 'reported_recall';
    return {
      labelVi: isVerified
        ? 'Nguồn đã xác minh + AI bổ sung'
        : isRecall
          ? 'Nguồn hồi tưởng có dẫn chứng + AI bổ sung'
          : 'Nguồn Live Hub chưa xác minh + AI bổ sung',
      labelEn: isVerified
        ? 'Verified Source + AI Fill'
        : isRecall
          ? 'Cited Exam Recall + AI Fill'
          : 'Live Hub Forecast (Unverified) + AI Fill',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      isAuthentic: false,
      isHybrid: true,
      isAi: false,
    };
  }

  return {
    labelVi: context === 'mock' ? 'AI tạo Full Mock' : 'AI tạo bài mới',
    labelEn: context === 'mock' ? 'AI-generated IELTS-style Mock' : 'AI-generated IELTS-style Practice',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    isAuthentic: false,
    isHybrid: false,
    isAi: true,
  };
}

export function filterSupportedCitations(
  citations?: ClaimCitation[] | null,
  origin?: ContentOrigin | string
): ClaimCitation[] {
  if (!citations || !Array.isArray(citations) || origin === 'fully_ai_generated') {
    return [];
  }

  return citations.filter((c) => Boolean(c && typeof c.url === 'string' && c.url.trim().startsWith('http')));
}
