import { fsrs, Rating, State, type Card, type CardInput, type Grade } from 'ts-fsrs';
import { VocabCard, MistakeEntry, TrapCategory, FsrsCardState } from '../types';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'; // 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)

export interface SRSItemResult {
  srsStage: number; // 0..5
  intervalDays: number;
  nextReviewDate: string;
  easeFactor: number;
  repetitions: number;
  mastered: boolean;
  fsrs: FsrsCardState;
}

interface LegacySrsState {
  srsStage: number;
  intervalDays?: number;
  nextReviewDate: string;
  easeFactor?: number;
  repetitions?: number;
  lastReviewedDate?: string;
  fsrs?: FsrsCardState;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
});

const ratingMap: Record<ReviewRating, Grade> = {
  again: Rating.Again as Grade,
  hard: Rating.Hard as Grade,
  good: Rating.Good as Grade,
  easy: Rating.Easy as Grade,
};

function validDateOr(value: string | undefined, fallback: Date): Date {
  const parsed = value ? new Date(value) : fallback;
  return Number.isFinite(parsed.getTime()) ? parsed : fallback;
}

function isValidFsrsState(state: FsrsCardState | undefined): state is FsrsCardState {
  if (!state || state.version !== 'fsrs-6') return false;
  const finiteNonNegative = [state.elapsedDays, state.scheduledDays, state.learningSteps, state.reps, state.lapses]
    .every((value) => Number.isFinite(value) && value >= 0);
  return Number.isFinite(new Date(state.due).getTime())
    && Number.isFinite(state.stability) && state.stability > 0
    && Number.isFinite(state.difficulty) && state.difficulty >= 1 && state.difficulty <= 10
    && finiteNonNegative
    && [State.New, State.Learning, State.Review, State.Relearning].includes(state.state);
}

export function migrateLegacySrsCard(item: LegacySrsState): FsrsCardState {
  if (isValidFsrsState(item.fsrs)) return item.fsrs;
  const now = new Date();
  const intervalDays = Math.max(0, Number(item.intervalDays) || 0);
  const reps = Math.max(0, Math.trunc(Number(item.repetitions) || 0));
  const stage = Math.max(0, Math.min(5, Math.trunc(Number(item.srsStage) || 0)));
  const state = stage === 0 ? State.New : stage === 1 ? State.Learning : State.Review;
  const easeFactor = Math.max(1.3, Number(item.easeFactor) || 2.5);
  const lastReview = item.lastReviewedDate ? validDateOr(item.lastReviewedDate, now) : undefined;

  return {
    version: 'fsrs-6',
    due: validDateOr(item.nextReviewDate, now).toISOString(),
    stability: Math.max(0.1, intervalDays || 0.1),
    difficulty: Math.max(1, Math.min(10, 11 - easeFactor * 2)),
    elapsedDays: intervalDays,
    scheduledDays: intervalDays,
    learningSteps: state === State.Learning ? 1 : 0,
    reps,
    lapses: 0,
    state,
    lastReview: lastReview?.toISOString(),
  };
}

function toCardInput(state: FsrsCardState): CardInput {
  return {
    due: state.due,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    last_review: state.lastReview,
  };
}

function toPersistedFsrs(card: Card): FsrsCardState {
  return {
    version: 'fsrs-6',
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review?.toISOString(),
  };
}

function legacyStageFromFsrs(state: FsrsCardState) {
  if (state.state === State.New) return 0;
  if (state.state === State.Learning || state.state === State.Relearning) return 1;
  if (state.reps >= 5 && state.scheduledDays >= 30) return 5;
  if (state.scheduledDays >= 14) return 4;
  if (state.scheduledDays >= 3) return 3;
  return 2;
}

export function scheduleFsrsReview(
  item: LegacySrsState,
  rating: ReviewRating,
  now: Date = new Date()
): SRSItemResult {
  const migrated = migrateLegacySrsCard(item);
  const result = scheduler.next(toCardInput(migrated), now, ratingMap[rating]);
  const persisted = toPersistedFsrs(result.card);
  const stage = legacyStageFromFsrs(persisted);
  const dueDeltaDays = Math.max(0, (result.card.due.getTime() - now.getTime()) / DAY_MS);

  return {
    srsStage: stage,
    intervalDays: Math.max(result.card.scheduled_days, Number(dueDeltaDays.toFixed(4))),
    nextReviewDate: result.card.due.toISOString(),
    easeFactor: Number(Math.max(1.3, (11 - result.card.difficulty) / 2).toFixed(2)),
    repetitions: result.card.reps,
    mastered: stage >= 5,
    fsrs: persisted,
  };
}

export interface TrapCategoryMeta {
  id: TrapCategory;
  titleVi: string;
  shortLabel: string;
  skill: 'reading' | 'listening' | 'writing' | 'speaking' | 'grammar';
  color: string;
  badgeBg: string;
  badgeText: string;
  descriptionVi: string;
  commonIn: string;
  proTipVi: string;
}

export const TRAP_CATEGORY_METAS: Record<TrapCategory, TrapCategoryMeta> = {
  trap_not_given: {
    id: 'trap_not_given',
    titleVi: 'Bẫy Not Given & False trong Reading',
    shortLabel: 'Not Given / False',
    skill: 'reading',
    color: '#EF4444',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    descriptionVi: 'Nhầm lẫn giữa thông tin trái ngược hoàn toàn (False) với thông tin không được đề cập hoặc chỉ suy diễn cá nhân (Not Given).',
    commonIn: 'Reading Passage 1, 2, 3 (T/F/NG & Y/N/NG)',
    proTipVi: 'Nếu bài đọc không khẳng định hay phủ định 100% chi tiết trong đề bài, đừng suy đoán logic ngoài đời thực -> Chọn NOT GIVEN.',
  },
  trap_matching_headings: {
    id: 'trap_matching_headings',
    titleVi: 'Bẫy Trùng Keyword nhưng Sai Ý Chính (Matching Headings)',
    shortLabel: 'Matching Headings',
    skill: 'reading',
    color: '#F97316',
    badgeBg: 'bg-orange-100 dark:bg-orange-950/60',
    badgeText: 'text-orange-700 dark:text-orange-300',
    descriptionVi: 'Bẫy lừa thí sinh nhìn thấy keyword xuất hiện trong đoạn nhưng đó chỉ là ví dụ nhỏ (supporting detail), không phải ý chủ đạo của toàn đoạn.',
    commonIn: 'Reading Passage 2 & 3',
    proTipVi: 'Đọc câu Topic Sentence (đầu/cuối đoạn) và nắm luồng ý chính (Main Idea), gạch bỏ tiêu đề chứa chi tiết đơn lẻ.',
  },
  trap_listening_plural_spelling: {
    id: 'trap_listening_plural_spelling',
    titleVi: 'Lỗi Số Ít / Số Nhiều (-s/-es) & Chính Tả Listening',
    shortLabel: 'Số Ít / Nhiều & Spelling',
    skill: 'listening',
    color: '#3B82F6',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300',
    descriptionVi: 'Bỏ sót âm đuôi /s/, /z/, /ɪz/ trong danh từ số nhiều, sai chính tả từ vựng học thuật hoặc viết thừa từ quá giới hạn Word Limit.',
    commonIn: 'Listening Section 1 (Form) & Section 4 (Lecture)',
    proTipVi: 'Nhìn trước khoảng trống để đoán loại từ (nếu có "a/an" là số ít, nếu động từ không chia số ít thì danh từ cần thêm -s).',
  },
  trap_distractor_numbers: {
    id: 'trap_distractor_numbers',
    titleVi: 'Bẫy Đổi Ý Phút Chót & Thông Tin Gây Nhiễu (Distractors)',
    shortLabel: 'Bẫy Đổi Ý Listening',
    skill: 'listening',
    color: '#8B5CF6',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-700 dark:text-purple-300',
    descriptionVi: 'Người nói đưa ra một thông tin ban đầu nhưng lập tức sửa lại bằng "Actually, no", "Let me double check", "We used to... but now".',
    commonIn: 'Listening Section 1, 2, 3',
    proTipVi: 'Đừng vội ghi ngay số điện thoại / ngày tháng đầu tiên nghe được; luôn đợi người nói xác nhận sau liên từ "However/Actually".',
  },
  trap_task1_tenses: {
    id: 'trap_task1_tenses',
    titleVi: 'Lỗi Thì Quá Khứ & Mô Tả Xu Hướng Task 1',
    shortLabel: 'Thì & Dữ Liệu Task 1',
    skill: 'writing',
    color: '#EAB308',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    descriptionVi: 'Dùng nhầm thì Hiện tại đơn cho mốc thời gian quá khứ (In 2010), hoặc không phân biệt được dự báo tương lai (is projected to).',
    commonIn: 'Writing Task 1 (Charts, Trends)',
    proTipVi: 'Kiểm tra kỹ trục thời gian của biểu đồ trước khi viết: Mốc năm đã qua dùng Past Simple, mốc tương lai dùng Passive Projection.',
  },
  trap_cohesion_flow: {
    id: 'trap_cohesion_flow',
    titleVi: 'Lỗi Mạch Lạc & Đứt Gãy Liên Từ (Coherence & Cohesion)',
    shortLabel: 'Cohesion & Mạch Lạc',
    skill: 'writing',
    color: '#10B981',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    descriptionVi: 'Dùng từ nối cơ học (First, Second, Furthermore ở đầu mọi câu), thiếu liên kết đại từ quy chiếu hoặc đoạn văn không tuân theo PEEL.',
    commonIn: 'Writing Task 2 (Body Paragraphs)',
    proTipVi: 'Sử dụng liên kết ngữ nghĩa (This trend, Such measures) và cấu trúc câu phức thay vì lạm dụng từ nối cơ bản.',
  },
  trap_lexical_context: {
    id: 'trap_lexical_context',
    titleVi: 'Lỗi Từ Vựng Sai Ngữ Cảnh & Dịch Word-by-Word',
    shortLabel: 'Từ Vựng & Collocation',
    skill: 'writing',
    color: '#EC4899',
    badgeBg: 'bg-pink-100 dark:bg-pink-950/60',
    badgeText: 'text-pink-700 dark:text-pink-300',
    descriptionVi: 'Dùng từ vựng C1 gượng ép không đúng trường ngữ nghĩa, sai giới từ đi kèm, hoặc dịch thô từ tiếng mẹ đẻ sang tiếng Anh.',
    commonIn: 'Writing Task 2 & Speaking Part 3',
    proTipVi: 'Học cả cụm Collocation (Verb + Noun / Adj + Noun) thay vì nhét từ đơn lẻ vào câu.',
  },
  trap_speaking_stress_pronunciation: {
    id: 'trap_speaking_stress_pronunciation',
    titleVi: 'Lỗi Trọng Âm Từ & Phát Âm Đuôi Speaking',
    shortLabel: 'Phát Âm & Trọng Âm',
    skill: 'speaking',
    color: '#06B6D4',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950/60',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    descriptionVi: 'Nhấn sai trọng âm các từ đa âm tiết, nuốt âm đuôi /t/, /d/, /s/, /θ/ hoặc nói với ngữ điệu phẳng (Monotone).',
    commonIn: 'Speaking Part 1, 2, 3',
    proTipVi: 'Nhấn mạnh vào các từ mang nội dung (Content Words) và hạ giọng nhẹ ở cuối câu khẳng định.',
  },
};

/**
 * Compatibility facade for existing callers; scheduling is handled by FSRS-6.
 */
export function calculateNextSRS(
  currentStage: number,
  currentInterval: number = 1,
  currentEaseFactor: number = 2.5,
  currentRepetitions: number = 0,
  rating: ReviewRating,
  existingFsrs?: FsrsCardState,
  now: Date = new Date()
): SRSItemResult {
  return scheduleFsrsReview({
    srsStage: currentStage,
    intervalDays: currentInterval,
    nextReviewDate: now.toISOString(),
    easeFactor: currentEaseFactor,
    repetitions: currentRepetitions,
    fsrs: existingFsrs,
  }, rating, now);
}

/**
 * Filter items that are due for review (scheduled for today or overdue)
 */
export function isDueForReview(nextReviewDateStr: string): boolean {
  if (!nextReviewDateStr) return true;
  const targetDate = new Date(nextReviewDateStr);
  const now = new Date();
  // Set target to end of today to include all due today
  return targetDate.getTime() <= now.getTime();
}

export function getDueVocabCards(cards: VocabCard[]): VocabCard[] {
  return cards.filter((card) => !card.mastered && isDueForReview(card.nextReviewDate));
}

export function getDueMistakes(mistakes: MistakeEntry[]): MistakeEntry[] {
  return mistakes.filter((m) => !m.mastered && isDueForReview(m.nextReviewDate));
}

export interface RadarMetric {
  category: string;
  trapKey: TrapCategory;
  scorePercent: number; // 0..100 (Mastery Score)
  totalMistakes: number;
  activeMistakes: number;
  masteredCount: number;
  fullMark: number;
}

export interface WeaknessAnalysisResult {
  radarData: RadarMetric[];
  weakestTrap: TrapCategoryMeta | null;
  highestRiskScore: number;
  masteredPercent: number;
  totalMistakesCount: number;
  dueTodayCount: number;
  heatmapItems: Array<{
    trap: TrapCategoryMeta;
    total: number;
    active: number;
    mastered: number;
    masteryRate: number;
    riskLevel: 'high' | 'medium' | 'low';
  }>;
}

export function calculateWeaknessStats(mistakes: MistakeEntry[]): WeaknessAnalysisResult {
  const trapKeys = Object.keys(TRAP_CATEGORY_METAS) as TrapCategory[];

  const counts: Record<TrapCategory, { total: number; active: number; mastered: number }> = {
    trap_not_given: { total: 0, active: 0, mastered: 0 },
    trap_matching_headings: { total: 0, active: 0, mastered: 0 },
    trap_listening_plural_spelling: { total: 0, active: 0, mastered: 0 },
    trap_distractor_numbers: { total: 0, active: 0, mastered: 0 },
    trap_task1_tenses: { total: 0, active: 0, mastered: 0 },
    trap_cohesion_flow: { total: 0, active: 0, mastered: 0 },
    trap_lexical_context: { total: 0, active: 0, mastered: 0 },
    trap_speaking_stress_pronunciation: { total: 0, active: 0, mastered: 0 },
  };

  mistakes.forEach((m) => {
    let key: TrapCategory = m.trapCategory || 'trap_lexical_context';
    if (!counts[key]) {
      // Fallback heuristics
      if (m.skill === 'reading') key = 'trap_not_given';
      else if (m.skill === 'listening') key = 'trap_listening_plural_spelling';
      else if (m.skill === 'speaking') key = 'trap_speaking_stress_pronunciation';
      else if (m.errorType === 'grammar') key = 'trap_task1_tenses';
      else if (m.errorType === 'cohesion') key = 'trap_cohesion_flow';
      else key = 'trap_lexical_context';
    }

    counts[key].total += 1;
    if (m.mastered || m.srsStage >= 5) {
      counts[key].mastered += 1;
    } else {
      counts[key].active += 1;
    }
  });

  const radarData: RadarMetric[] = trapKeys.map((key) => {
    const meta = TRAP_CATEGORY_METAS[key];
    const data = counts[key];
    // Mastery score formula: 100 if 0 mistakes or proportion of mastered
    let score = 100;
    if (data.total > 0) {
      score = Math.round((data.mastered / data.total) * 100);
      // If active mistakes exist, decrease score proportional to active mistakes
      score = Math.max(15, Math.round(100 - (data.active / Math.max(1, data.total)) * 75));
    }
    return {
      category: meta.shortLabel,
      trapKey: key,
      scorePercent: score,
      totalMistakes: data.total,
      activeMistakes: data.active,
      masteredCount: data.mastered,
      fullMark: 100,
    };
  });

  // Find weakest trap (highest active mistakes or lowest score)
  let weakestTrapKey: TrapCategory | null = null;
  let maxActive = -1;
  trapKeys.forEach((key) => {
    if (counts[key].active > maxActive && counts[key].active > 0) {
      maxActive = counts[key].active;
      weakestTrapKey = key;
    }
  });

  if (!weakestTrapKey && trapKeys.length > 0) {
    weakestTrapKey = trapKeys[0];
  }

  const totalMistakesCount = mistakes.length;
  const masteredCount = mistakes.filter((m) => m.mastered || m.srsStage >= 5).length;
  const masteredPercent = totalMistakesCount > 0 ? Math.round((masteredCount / totalMistakesCount) * 100) : 100;
  const dueTodayCount = getDueMistakes(mistakes).length;

  const heatmapItems = trapKeys.map((key) => {
    const meta = TRAP_CATEGORY_METAS[key];
    const data = counts[key];
    const rate = data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 100;
    let riskLevel: 'high' | 'medium' | 'low' = 'low';
    if (data.active >= 3) riskLevel = 'high';
    else if (data.active >= 1) riskLevel = 'medium';

    return {
      trap: meta,
      total: data.total,
      active: data.active,
      mastered: data.mastered,
      masteryRate: rate,
      riskLevel,
    };
  });

  return {
    radarData,
    weakestTrap: weakestTrapKey ? TRAP_CATEGORY_METAS[weakestTrapKey] : null,
    highestRiskScore: maxActive,
    masteredPercent,
    totalMistakesCount,
    dueTodayCount,
    heatmapItems,
  };
}

