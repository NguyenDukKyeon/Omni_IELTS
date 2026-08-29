import type { ModuleId } from '../types';

export interface EvidenceDockInput {
  activeModule: ModuleId;
  examMode?: boolean;
  dueMistakeCount: number;
  dueVocabCount: number;
  currentMediaTitle?: string;
  recentEvidence: Array<{
    id: string;
    label: string;
    destination?: ModuleId;
    canResume?: boolean;
  }>;
}

export type EvidenceDockAction = 'collect' | 'open_module' | 'resume' | 'none';

export interface EvidenceDockItem {
  id: string;
  label: string;
  detail: string;
  status: 'due' | 'recent' | 'unfinished' | 'missing' | 'unavailable';
  destination?: ModuleId;
  action?: EvidenceDockAction;
}

export interface EvidenceDockSection {
  id: string;
  title: string;
  items: EvidenceDockItem[];
}

export interface EvidenceDockModel {
  visibility: 'open' | 'collapsed' | 'hidden';
  sections: EvidenceDockSection[];
}

function openModuleCopy(destination?: ModuleId): string {
  if (destination === 'practice') return 'Mở IELTS Practice';
  if (destination === 'mock_test') return 'Mở IELTS Mock';
  return 'Mở module tương ứng';
}

export function buildEvidenceDockModel(input: EvidenceDockInput): EvidenceDockModel {
  if (input.examMode && input.activeModule === 'mock_test') {
    return { visibility: 'hidden', sections: [] };
  }

  const dueCandidates: Array<EvidenceDockItem | null> = [
    input.dueMistakeCount > 0 ? {
      id: 'due-mistakes',
      label: input.dueMistakeCount + ' lỗi đến hạn',
      detail: 'Mở Review & Progress để luyện lại',
      status: 'due',
      destination: 'review_progress',
      action: 'open_module',
    } : null,
    input.dueVocabCount > 0 ? {
      id: 'due-vocab',
      label: input.dueVocabCount + ' từ đến hạn',
      detail: 'Ôn theo lịch ôn thông minh',
      status: 'due',
      destination: 'vocabulary',
      action: 'open_module',
    } : null,
  ];
  const dueItems = dueCandidates.filter(
    (item): item is EvidenceDockItem => item !== null,
  );

  const contextId = input.activeModule === 'vocabulary'
    ? 'vocabulary-context'
    : input.activeModule === 'media'
      ? 'media-context'
      : input.activeModule + '-context';
  const contextItems: EvidenceDockItem[] = input.activeModule === 'media'
    && input.currentMediaTitle
    ? [{
        id: 'current-media',
        label: input.currentMediaTitle,
        detail: 'Tiếp tục từ segment đã lưu',
        status: 'unfinished',
        destination: 'media',
        action: 'open_module',
      }]
    : input.activeModule === 'practice'
      ? [{
          id: 'missing-context-evidence',
          label: 'Chưa đủ bằng chứng',
          detail: 'Hoàn thành một bài tự làm để cập nhật.',
          status: 'missing',
          action: 'none',
        }]
      : [{
          id: 'missing-context-evidence',
          label: 'Chưa đủ bằng chứng',
          detail: 'Làm một bài tự làm để tạo bằng chứng mới.',
          status: 'missing',
          destination: 'practice',
          action: 'collect',
        }];

  return {
    visibility: 'open',
    sections: [
      { id: 'system-due', title: 'Đến hạn', items: dueItems },
      { id: contextId, title: 'Trong module này', items: contextItems },
      {
        id: 'recent-evidence',
        title: 'Bằng chứng gần đây',
        items: input.recentEvidence.map((item) => ({
          id: item.id,
          label: item.label,
          destination: item.destination,
          status: 'recent' as const,
          action: item.canResume ? 'resume' : 'open_module',
          detail: item.canResume
            ? 'Tiếp tục bài đang làm'
            : openModuleCopy(item.destination),
        })),
      },
    ],
  };
}
