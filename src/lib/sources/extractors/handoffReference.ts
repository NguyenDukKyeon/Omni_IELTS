import { failExtraction, type ExtractionResult } from './types';

export function createHandoffRecord(owningModule: 'media' | 'mock'): ExtractionResult {
  if (owningModule === 'media') {
    return failExtraction(
      'HANDOFF_REQUIRED',
      'P03 không trích xuất YouTube hay audio. Hãy dùng Media Lab để lấy phụ đề và phát lại.',
      {
        owningModule: 'media',
        suggestedActionVi: 'Mở Media Lab (P04) để nhập phụ đề hoặc phiên âm.',
        retryable: false,
      },
    );
  }

  return failExtraction(
    'HANDOFF_REQUIRED',
    'P03 không phân tích biểu đồ Task 1. Hãy dùng Academic Mock để render biểu đồ.',
    {
      owningModule: 'mock',
      suggestedActionVi: 'Mở Academic Mock (P07) để xử lý hình Task 1.',
      retryable: false,
    },
  );
}
