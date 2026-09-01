import { FileUp, LoaderCircle, Plus, Send, X } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { importSource, SourcesApiError, type SourceImportResponse } from '../../lib/sources/sourcesApi';
import type { SourceImportRequest } from '../../lib/sources/importTransport.server';
import {
  assertImportQueueAdmission,
  ImportQueueLimitError,
  runImportQueue,
  SOURCE_IMPORT_QUEUE_CONCURRENCY,
  SOURCE_IMPORT_QUEUE_MAX_BINARY_BYTES,
  SOURCE_IMPORT_QUEUE_MAX_ITEMS,
  SOURCE_IMPORT_QUEUE_MAX_TEXT_CODE_POINTS,
  type ImportQueueItem,
  type ImportQueueItemState,
} from '../../lib/sources/importQueue';
import { SOURCE_IMPORT_MAX_BINARY_BYTES } from '../../lib/sources/importLimits';

type ImportSourceType = 'text' | 'url' | 'pdf' | 'docx' | 'vtt_srt' | 'youtube';
type ImportPanelState = 'idle' | 'failed';

const TYPE_OPTIONS: Array<{ value: ImportSourceType; label: string }> = [
  { value: 'text', label: 'Văn bản / Markdown' },
  { value: 'url', label: 'URL bài viết' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'vtt_srt', label: 'VTT / SRT' },
  { value: 'youtube', label: 'Tham chiếu YouTube' },
];

const CONTENT_CONTROLS: Record<ImportSourceType, string> = {
  text: 'sources.import.paste-text',
  url: 'sources.import.url',
  pdf: 'sources.import.pdf',
  docx: 'sources.import.docx',
  vtt_srt: 'sources.import.vtt',
  youtube: 'sources.import.youtube',
};

const QUEUE_STATE_LABELS: Record<ImportQueueItemState, string> = {
  queued: 'Đang chờ',
  processing: 'Đang xử lý',
  ready: 'Sẵn sàng',
  handoff_required: 'Do module khác tiếp nhận',
  retry_wait: 'Có thể thử lại',
  failed: 'Xử lý lỗi',
};

function fileToBase64(file: File): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
    }
    return window.btoa(binary);
  });
}

function countCodePoints(value: string): number {
  let count = 0;
  for (const _codePoint of value) count += 1;
  return count;
}

function safeFormError(error: unknown): string {
  if (error instanceof ImportQueueLimitError) return error.userMessageVi;
  if (error instanceof SourcesApiError && error.userMessageVi) return error.userMessageVi;
  if (error instanceof Error && error.message === 'file_required') return 'Chọn tệp PDF hoặc DOCX trước khi thêm vào hàng đợi.';
  return 'Nhập tên nguồn và nội dung trong giới hạn trước khi thêm vào hàng đợi.';
}

function queueItemId(): string {
  return globalThis.crypto?.randomUUID?.() || `source-queue-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function queueItemMessage(item: ImportQueueItem): string {
  if (item.errorMessage) return item.errorMessage;
  if (item.state === 'handoff_required') return 'Đã lưu tham chiếu. Module sở hữu sẽ phụ trách phát hoặc hiển thị nguồn.';
  if (item.state === 'ready') return 'Nguồn đã được lưu cùng một phiên bản bất biến.';
  if (item.state === 'retry_wait') return 'Có thể thử lại mà không cần chọn lại nội dung.';
  if (item.state === 'failed') return 'Nguồn chưa được lưu dưới dạng nội dung sẵn sàng.';
  return '';
}

export interface SourceImportPanelProps {
  onClose: () => void;
  onImported: (response: SourceImportResponse) => void;
  importSourceRequest?: (request: SourceImportRequest) => Promise<SourceImportResponse>;
}

export function SourceImportPanel({
  onClose,
  onImported,
  importSourceRequest = importSource,
}: SourceImportPanelProps) {
  const [type, setType] = useState<ImportSourceType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | undefined>();
  const [formState, setFormState] = useState<ImportPanelState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [queue, setQueue] = useState<ImportQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const buildRequest = async (): Promise<SourceImportRequest> => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) throw new Error('title_required');
    if (type === 'pdf' || type === 'docx') {
      if (!file) throw new Error('file_required');
      const contentBase64 = await fileToBase64(file);
      return {
        title: trimmedTitle,
        type,
        declaredMimeType: file.type || (type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        originalFilename: file.name,
        contentBase64,
      } as SourceImportRequest;
    }
    return { title: trimmedTitle, type, content: content.trim() } as SourceImportRequest;
  };

  const mergeQueue = (nextItems: ImportQueueItem[]) => {
    setQueue((current) => current.map((item) => nextItems.find((next) => next.id === item.id) || item));
  };

  const processItems = async (items: ImportQueueItem[]) => {
    if (items.length === 0) return;
    setIsProcessing(true);
    const completed = await runImportQueue(items, importSourceRequest, mergeQueue);
    mergeQueue(completed);
    completed.forEach((item) => {
      if (item.response) onImported(item.response);
    });
    setIsProcessing(false);
  };

  const stageCurrent = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    try {
      const binaryType = type === 'pdf' || type === 'docx';
      const textCodePoints = binaryType ? undefined : countCodePoints(content);
      if (binaryType) {
        if (!file) throw new Error('file_required');
        assertImportQueueAdmission(queue, { type, rawBinaryBytes: file.size });
      } else {
        assertImportQueueAdmission(queue, { type, textCodePoints });
      }
      const request = await buildRequest();
      setQueue((current) => [...current, {
        id: queueItemId(),
        request,
        state: 'queued',
        ...(binaryType ? { rawBinaryBytes: file?.size || 0 } : { textCodePoints }),
      }]);
      setFormState('idle');
      setErrorMessage(undefined);
      setTitle('');
      setContent('');
      setFile(undefined);
    } catch (error) {
      setFormState('failed');
      setErrorMessage(safeFormError(error));
    }
  };

  const submitQueue = () => {
    const pending = queue.filter((item) => item.state === 'queued');
    void processItems(pending);
  };

  const retryItem = (item: ImportQueueItem) => {
    const retry = { ...item, state: 'queued' as const, errorMessage: undefined };
    mergeQueue([retry]);
    void processItems([retry]);
  };

  const removeItem = (itemId: string) => {
    setQueue((current) => current.filter((item) => item.id !== itemId || item.state === 'processing'));
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (nextFile && nextFile.size > SOURCE_IMPORT_MAX_BINARY_BYTES) {
      event.target.value = '';
      setFile(undefined);
      setFormState('failed');
      setErrorMessage('Tệp vượt quá giới hạn 8 MB. Hãy chọn tệp nhỏ hơn.');
      return;
    }
    setFile(nextFile);
    setFormState('idle');
    setErrorMessage(undefined);
  };

  const isBinary = type === 'pdf' || type === 'docx';
  const hasQueuedItems = queue.length > 0;
  const hasPendingItems = queue.some((item) => item.state === 'queued');
  const retryableItems = queue.filter((item) => item.state === 'retry_wait' || item.state === 'failed');

  return (
    <section className="omni-source-import" aria-labelledby="source-import-title">
      <header className="omni-source-import__header">
        <div>
          <p className="omni-source-import__label">Thêm nguồn riêng</p>
          <h2 id="source-import-title">Thêm nhiều nguồn</h2>
          <p>Tối đa {SOURCE_IMPORT_QUEUE_MAX_ITEMS} mục, tổng tệp {SOURCE_IMPORT_QUEUE_MAX_BINARY_BYTES / (1024 * 1024)} MB và tổng văn bản {SOURCE_IMPORT_QUEUE_MAX_TEXT_CODE_POINTS.toLocaleString('vi-VN')} ký tự Unicode; xử lý độc lập tối đa {SOURCE_IMPORT_QUEUE_CONCURRENCY} nguồn cùng lúc. Không tự tạo bản nháp.</p>
        </div>
        <button type="button" className="omni-source-import__close" aria-label="Đóng bước thêm nguồn" data-ux-control="sources.import.close" data-ux-flow="sources.import.submit" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>

      <form className="omni-source-import__form" onSubmit={stageCurrent} data-ux-control="sources.import.form" data-ux-flow="sources.import.submit">
        <label>
          <span>Tên nguồn</span>
          <input type="text" value={title} maxLength={240} required data-ux-control="sources.import.title" data-ux-flow="sources.import.submit" onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          <span>Loại nguồn</span>
          <select value={type} data-ux-control="sources.import.type" data-ux-flow="sources.import.submit" onChange={(event) => { setType(event.target.value as ImportSourceType); setFile(undefined); setContent(''); setFormState('idle'); setErrorMessage(undefined); }}>
            {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        {isBinary ? (
          <label className="omni-source-import__file">
            <span>{type === 'pdf' ? 'Tệp PDF' : 'Tệp DOCX'}</span>
            <input type="file" accept={type === 'pdf' ? 'application/pdf,.pdf' : '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'} data-ux-control={CONTENT_CONTROLS[type]} data-ux-flow="sources.import.submit" onChange={onFileChange} />
            <span className="omni-source-import__file-name">{file?.name || 'Chưa chọn tệp'}</span>
          </label>
        ) : (
          <label>
            <span>{type === 'youtube' ? 'URL YouTube' : type === 'url' ? 'URL bài viết' : 'Nội dung có giới hạn'}</span>
            <textarea value={content} maxLength={1_000_000} required placeholder={type === 'youtube' ? 'https://www.youtube.com/watch?v=…' : 'Dán nội dung nguồn tại đây…'} data-ux-control={CONTENT_CONTROLS[type]} data-ux-flow="sources.import.submit" onChange={(event) => setContent(event.target.value)} />
          </label>
        )}

        {formState === 'failed' && errorMessage ? <div className="omni-source-import__state omni-source-import__state--failed" role="alert"><p>{errorMessage}</p></div> : null}

        <button type="submit" className="omni-source-import__submit" data-ux-control="sources.import.queue-add" data-ux-flow="sources.import.submit"><Plus aria-hidden="true" /> Thêm vào hàng đợi</button>
      </form>

      {hasQueuedItems ? (
        <section className="omni-source-import__queue" aria-labelledby="source-import-queue-title" aria-live="polite">
          <div className="omni-source-import__queue-heading">
            <div><h3 id="source-import-queue-title">Hàng đợi nguồn</h3><p>{queue.length} mục · mỗi mục có trạng thái riêng</p></div>
            <button type="button" className="omni-source-import__queue-submit" disabled={!hasPendingItems || isProcessing} data-ux-control="sources.import.submit" data-ux-flow="sources.import.submit" onClick={submitQueue}>
              {isProcessing ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />} Gửi hàng đợi
            </button>
            {retryableItems.length > 0 ? (
              <button type="button" disabled={isProcessing} data-ux-control="sources.import.retry" data-ux-flow="sources.import.submit" onClick={() => {
                const retryItems = retryableItems.map((item) => ({ ...item, state: 'queued' as const, errorMessage: undefined }));
                mergeQueue(retryItems);
                void processItems(retryItems);
              }}>
                Thử lại mục lỗi
              </button>
            ) : null}
          </div>
          <ul className="omni-source-import__queue-list">
            {queue.map((item) => (
              <li className={`omni-source-import__queue-item omni-source-import__queue-item--${item.state}`} key={item.id} role={item.state === 'failed' || item.state === 'retry_wait' ? 'alert' : 'status'}>
                <div><strong>{item.request.title}</strong><span>{item.request.type.toUpperCase()} · {QUEUE_STATE_LABELS[item.state]}</span>{queueItemMessage(item) ? <small>{queueItemMessage(item)}</small> : null}</div>
                <div className="omni-source-import__queue-actions">
                  {(item.state === 'retry_wait' || item.state === 'failed') ? <button type="button" data-ux-control={`sources.import.queue-retry:${item.id}`} data-ux-flow="sources.import.submit" onClick={() => retryItem(item)}>Thử lại</button> : null}
                  {item.state !== 'processing' ? <button type="button" aria-label={`Xoá ${item.request.title} khỏi hàng đợi`} data-ux-control={`sources.import.queue-remove:${item.id}`} data-ux-flow="sources.import.submit" onClick={() => removeItem(item.id)}>Xoá</button> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="omni-source-import__footnote"><FileUp aria-hidden="true" /> Thêm nguồn lên đám mây cần phiên đăng nhập đã xác thực. Bạn có thể đóng panel sau khi hàng đợi hoàn tất.</p>
    </section>
  );
}
