import { VocabCard, MistakeEntry, TrapCategory } from '../types';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'; // 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)

export interface SRSItemResult {
  srsStage: number; // 0..5
  intervalDays: number;
  nextReviewDate: string;
  easeFactor: number;
  repetitions: number;
  mastered: boolean;
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
 * SuperMemo SM-2 / Leitner Hybrid Engine
 * Used uniformly across Vocabulary, Mistakes, and Grammar topics.
 */
export function calculateNextSRS(
  currentStage: number,
  currentInterval: number = 1,
  currentEaseFactor: number = 2.5,
  currentRepetitions: number = 0,
  rating: ReviewRating
): SRSItemResult {
  let stage = currentStage;
  let interval = currentInterval;
  let ef = currentEaseFactor;
  let reps = currentRepetitions;

  const now = new Date();

  switch (rating) {
    case 'again':
      // Reset or drop stage
      stage = Math.max(0, stage - 1);
      interval = 1;
      reps = 0;
      ef = Math.max(1.3, ef - 0.2);
      break;

    case 'hard':
      // Keep stage or minor step
      interval = Math.max(1, Math.round(interval * 1.2));
      ef = Math.max(1.3, ef - 0.15);
      reps += 1;
      break;

    case 'good':
      // Normal progression (1d -> 3d -> 7d -> 14d -> 30d)
      stage = Math.min(5, stage + 1);
      reps += 1;
      if (reps === 1) {
        interval = 1;
      } else if (reps === 2) {
        interval = 3;
      } else if (reps === 3) {
        interval = 7;
      } else if (reps === 4) {
        interval = 14;
      } else {
        interval = Math.round(interval * ef);
      }
      break;

    case 'easy':
      // Accelerated progression (3d -> 7d -> 14d -> 30d+)
      stage = Math.min(5, stage + 2);
      reps += 1;
      ef = Math.min(3.0, ef + 0.15);
      if (reps === 1) {
        interval = 3;
      } else if (reps === 2) {
        interval = 7;
      } else if (reps === 3) {
        interval = 14;
      } else {
        interval = Math.round(interval * ef * 1.4);
      }
      break;
  }

  // Calculate next review date
  const nextDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    srsStage: stage,
    intervalDays: interval,
    nextReviewDate: nextDate.toISOString(),
    easeFactor: Number(ef.toFixed(2)),
    repetitions: reps,
    mastered: stage >= 5,
  };
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

