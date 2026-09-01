import type { SourceImportRequest } from './importTransport.server';
import { SourcesApiError, type SourceImportResponse } from './sourcesApi';

export const SOURCE_IMPORT_QUEUE_CONCURRENCY = 2;
export const SOURCE_IMPORT_QUEUE_MAX_ITEMS = 12;
export const SOURCE_IMPORT_QUEUE_MAX_BINARY_BYTES = 16 * 1024 * 1024;
export const SOURCE_IMPORT_QUEUE_MAX_TEXT_CODE_POINTS = 1_000_000;

export class ImportQueueLimitError extends Error {
  readonly code = 'QUEUE_LIMIT_EXCEEDED';
  readonly userMessageVi: string;

  constructor(userMessageVi: string) {
    super(userMessageVi);
    this.name = 'ImportQueueLimitError';
    this.userMessageVi = userMessageVi;
  }
}

export type ImportQueueItemState =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'handoff_required'
  | 'retry_wait'
  | 'failed';

export type ImportQueueItem = {
  id: string;
  request: SourceImportRequest;
  state: ImportQueueItemState;
  response?: SourceImportResponse;
  errorMessage?: string;
  attempts?: number;
  rawBinaryBytes?: number;
  textCodePoints?: number;
};

export type ImportQueueAdmissionCandidate = {
  type: SourceImportRequest['type'];
  rawBinaryBytes?: number;
  textCodePoints?: number;
};

export type ImportQueueRequest = (request: SourceImportRequest) => Promise<SourceImportResponse>;
export type ImportQueueUpdate = (items: ImportQueueItem[]) => void;

export function assertImportQueueAdmission(
  items: readonly ImportQueueItem[],
  candidate: ImportQueueAdmissionCandidate,
): void {
  if (items.length >= SOURCE_IMPORT_QUEUE_MAX_ITEMS) {
    throw new ImportQueueLimitError(`Hàng đợi đã đủ ${SOURCE_IMPORT_QUEUE_MAX_ITEMS} nguồn. Xoá một mục rồi thêm nguồn khác.`);
  }

  if (candidate.rawBinaryBytes !== undefined) {
    const binaryBytes = items.reduce((sum, item) => sum + (item.rawBinaryBytes || 0), 0) + candidate.rawBinaryBytes;
    if (!Number.isSafeInteger(candidate.rawBinaryBytes) || candidate.rawBinaryBytes < 0 || binaryBytes > SOURCE_IMPORT_QUEUE_MAX_BINARY_BYTES) {
      throw new ImportQueueLimitError('Tổng dung lượng tệp trong hàng đợi vượt quá giới hạn 16 MB an toàn. Xoá tệp khác rồi thử lại.');
    }
  }

  if (candidate.textCodePoints !== undefined) {
    const textCodePoints = items.reduce((sum, item) => sum + (item.textCodePoints || 0), 0) + candidate.textCodePoints;
    if (!Number.isSafeInteger(candidate.textCodePoints) || candidate.textCodePoints < 0 || textCodePoints > SOURCE_IMPORT_QUEUE_MAX_TEXT_CODE_POINTS) {
      throw new ImportQueueLimitError('Tổng nội dung văn bản trong hàng đợi vượt quá giới hạn an toàn. Xoá một mục rồi thử lại.');
    }
  }
}

function stateForResponse(response: SourceImportResponse): ImportQueueItemState {
  return response.status;
}

function stateForError(error: unknown): Pick<ImportQueueItem, 'state' | 'errorMessage'> {
  if (error instanceof SourcesApiError) {
    const retryable = error.statusLabel === 'retry_wait'
      || error.statusLabel === 'quota_exceeded'
      || error.statusLabel === 'unavailable';
    return {
      state: retryable ? 'retry_wait' : 'failed',
      errorMessage: error.userMessageVi || 'Nguồn chưa được xử lý. Hãy kiểm tra rồi thử lại.',
    };
  }
  return {
    state: 'failed',
    errorMessage: 'Nguồn chưa được xử lý. Hãy kiểm tra rồi thử lại.',
  };
}

/**
 * Runs only the supplied queued items with a fixed worker count. Each item owns its
 * state transition, so a failure or module handoff cannot reject sibling work.
 */
export async function runImportQueue(
  inputItems: readonly ImportQueueItem[],
  importRequest: ImportQueueRequest,
  onUpdate: ImportQueueUpdate = () => undefined,
  concurrency = SOURCE_IMPORT_QUEUE_CONCURRENCY,
): Promise<ImportQueueItem[]> {
  const items = inputItems.map((item) => ({ ...item }));
  const pending = items.filter((item) => item.state === 'queued');
  const workerCount = Math.max(1, Math.min(Math.floor(concurrency), pending.length || 1));
  let nextIndex = 0;

  const update = () => onUpdate(items.map((item) => ({ ...item })));

  async function worker(): Promise<void> {
    while (true) {
      const itemIndex = nextIndex++;
      const item = pending[itemIndex];
      if (!item) return;
      const liveItem = items.find((candidate) => candidate.id === item.id);
      if (!liveItem) continue;
      liveItem.state = 'processing';
      liveItem.attempts = (liveItem.attempts || 0) + 1;
      liveItem.errorMessage = undefined;
      update();
      try {
        const response = await importRequest(liveItem.request);
        liveItem.response = response;
        liveItem.state = stateForResponse(response);
      } catch (error) {
        Object.assign(liveItem, stateForError(error));
      }
      update();
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return items;
}
