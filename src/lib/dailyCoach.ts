import type { ModuleId } from '../types';

export interface DailyCoachInput {
  diagnosticComplete: boolean;
  dueMistakeIds: string[];
  dueVocabIds: string[];
  unfinishedPracticeId?: string;
}

export interface DailyCoachAction {
  id: string;
  kind: 'diagnostic' | 'due_mistake' | 'due_vocab' | 'resume' | 'baseline' | 'manual_module' | 'collect_source';
  title: string;
  reason: string;
  destination: ModuleId;
  command: 'open_module' | 'open_diagnostic' | 'open_module_chooser';
  evidenceRefs: string[];
  estimatedMinutes?: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface DailyCoachModel {
  primary: DailyCoachAction;
  alternatives: readonly [DailyCoachAction, DailyCoachAction];
}

export function buildDailyCoachModel(input: DailyCoachInput): DailyCoachModel {
  const manual: DailyCoachAction = {
    id: 'manual-module',
    kind: 'manual_module',
    title: 'Tự chọn module',
    reason: 'Bạn luôn có thể chọn nội dung phù hợp với kế hoạch của mình.',
    destination: 'dashboard',
    command: 'open_module_chooser',
    evidenceRefs: [],
    confidence: 'high',
  };
  const diagnostic: DailyCoachAction = {
    id: 'resume-diagnostic',
    kind: 'diagnostic',
    title: 'Tạo bằng chứng đầu vào',
    reason: 'Omni chưa có đủ dữ liệu để đề xuất một kỹ năng cụ thể.',
    destination: 'profile',
    command: 'open_diagnostic',
    evidenceRefs: [],
    confidence: 'low',
  };
  const dueMistakes: DailyCoachAction | null = input.dueMistakeIds.length ? {
    id: 'review-due-mistakes',
    kind: 'due_mistake',
    title: 'Ôn lỗi đến hạn',
    reason: 'Các lỗi này đã đến lịch ôn và có liên kết tới bài làm gốc.',
    destination: 'review_progress',
    command: 'open_module',
    evidenceRefs: input.dueMistakeIds.map((id) => 'mistake:' + id),
    estimatedMinutes: 10,
    confidence: 'high',
  } : null;
  const dueVocab: DailyCoachAction | null = input.dueVocabIds.length ? {
    id: 'review-due-vocab',
    kind: 'due_vocab',
    title: 'Ôn từ đến hạn',
    reason: 'Lịch ôn thông minh đã chọn những mục gần ngưỡng quên.',
    destination: 'vocabulary',
    command: 'open_module',
    evidenceRefs: input.dueVocabIds.map((id) => 'vocab:' + id),
    estimatedMinutes: 8,
    confidence: 'high',
  } : null;
  const resume: DailyCoachAction | null = input.unfinishedPracticeId ? {
    id: 'resume-practice',
    kind: 'resume',
    title: 'Tiếp tục bài đang làm',
    reason: 'Một attempt chưa hoàn tất đã được lưu.',
    destination: 'practice',
    command: 'open_module',
    evidenceRefs: ['attempt:' + input.unfinishedPracticeId],
    confidence: 'high',
  } : null;
  const baseline: DailyCoachAction = {
    id: 'independent-baseline',
    kind: 'baseline',
    title: 'Làm một bài tự làm ngắn',
    reason: 'Một bài mới sẽ tạo bằng chứng độc lập cho đề xuất tiếp theo.',
    destination: 'practice',
    command: 'open_module',
    evidenceRefs: [],
    estimatedMinutes: 15,
    confidence: 'medium',
  };
  const sourceCollect: DailyCoachAction = {
    id: 'collect-source',
    kind: 'collect_source',
    title: 'Nhập một nguồn học',
    reason: 'Một nguồn mới sẽ tạo dữ liệu độc lập cho đề xuất tiếp theo.',
    destination: 'sources',
    command: 'open_module',
    evidenceRefs: [],
    confidence: 'medium',
  };

  const ordered = [dueMistakes, dueVocab, resume, baseline, sourceCollect].filter(
    (action): action is DailyCoachAction => action !== null,
  );
  const primary = input.diagnosticComplete ? ordered[0]! : diagnostic;
  const secondary = ordered.find(({ id }) => id !== primary.id && id !== manual.id) ?? sourceCollect;
  return { primary, alternatives: [secondary, manual] };
}
