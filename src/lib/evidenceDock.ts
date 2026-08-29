import type { ModuleId } from '../types';

export interface EvidenceDockInput {
  activeModule: ModuleId;
  examMode?: boolean;
  dueMistakeCount: number;
  dueVocabCount: number;
  currentMediaTitle?: string;
  recentEvidence: Array<{ id: string; label: string; destination?: ModuleId }>;
}

export interface EvidenceDockItem {
  id: string;
  label: string;
  detail: string;
  status: 'due' | 'recent' | 'unfinished' | 'missing' | 'unavailable';
  destination?: ModuleId;
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
    } : null,
    input.dueVocabCount > 0 ? {
      id: 'due-vocab',
      label: input.dueVocabCount + ' từ đến hạn',
      detail: 'Ôn theo lịch FSRS',
      status: 'due',
      destination: 'vocabulary',
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
      }]
    : [{
        id: 'missing-context-evidence',
        label: 'Chưa đủ bằng chứng',
        detail: 'Hoàn thành một hoạt động độc lập để cập nhật.',
        status: 'missing',
        destination: input.activeModule,
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
          ...item,
          detail: 'Mở attempt đã lưu',
          status: 'recent' as const,
        })),
      },
    ],
  };
}
