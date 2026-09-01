import { Check, MousePointer2, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SourcesApiError } from '../../lib/sources/sourcesApi';
import type { SourceRecord, SourceSpan, SourceVersion } from '../../types/sources';
import { sourceControlId } from './SourceCard';

export type SourceReaderState = 'ready' | 'loading' | 'stale' | 'degraded' | 'unavailable' | 'rejected';

export interface SourceReaderProps {
  record: SourceRecord;
  version?: SourceVersion;
  versions?: readonly SourceVersion[];
  selectedSpan?: SourceSpan;
  state?: SourceReaderState;
  onSpanChange: (span?: SourceSpan) => void;
  onVersionSelect?: (version: SourceVersion) => void;
  onSaveEditedVersion?: (editedText: string) => Promise<unknown>;
  onRetry?: () => void;
}

function ownerLabel(record: SourceRecord): string | undefined {
  if (record.provenance.owningModule === 'media') return 'Media Lab (P04)';
  if (record.provenance.owningModule === 'mock') return 'Academic Mock (P07)';
  return undefined;
}

function stateMessage(state: SourceReaderState): string {
  switch (state) {
    case 'stale': return 'Trình đọc có thể đã cũ. Làm mới phiên bản nguồn khi có mạng.';
    case 'degraded': return 'Đang ở chế độ chỉ đọc văn bản. Media không được hiển thị tại đây.';
    case 'unavailable': return 'Phiên bản nguồn hiện không khả dụng.';
    case 'rejected': return 'Phiên bản nguồn bị từ chối và không thể hiển thị như nội dung sẵn sàng.';
    default: return '';
  }
}

function spanBlockIds(span: SourceSpan | undefined, versionId: string, sourceId: string): Set<string> {
  if (!span || span.sourceVersionId !== versionId || span.sourceId !== sourceId) return new Set();
  return new Set(span.blockIds ?? []);
}

function blockSpan(record: SourceRecord, version: SourceVersion, blockIds: string[]): SourceSpan | undefined {
  if (blockIds.length === 0) return undefined;
  return { sourceId: record.id, sourceVersionId: version.id, blockIds };
}

function editFailureMessage(error: unknown): string {
  if (error instanceof SourcesApiError && error.userMessageVi) return error.userMessageVi;
  return 'Không lưu được phiên bản mới. Phiên bản cũ vẫn nguyên vẹn.';
}

export function SourceReader({
  record,
  version,
  versions = [],
  selectedSpan,
  state = 'ready',
  onSpanChange,
  onVersionSelect,
  onSaveEditedVersion,
  onRetry,
}: SourceReaderProps) {
  const blocksRef = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(version?.plainText || '');
  const [editState, setEditState] = useState<'idle' | 'saving' | 'conflict' | 'failed'>('idle');
  const [editError, setEditError] = useState<string>();
  const displayVersions = [...versions].filter((candidate) => candidate.sourceId === record.id);
  if (displayVersions.length === 0 && version?.sourceId === record.id) displayVersions.push(version);
  const isValidVersion = Boolean(version && version.sourceId === record.id && record.processingState === 'ready');
  const isCurrentVersion = Boolean(version && version.id === record.currentVersionId);
  const canEdit = isValidVersion && isCurrentVersion && state === 'ready' && Boolean(onSaveEditedVersion);
  const owner = ownerLabel(record);
  const selectedBlockIds = spanBlockIds(selectedSpan, version?.id ?? '', record.id);

  useEffect(() => {
    setEditedText(version?.plainText || '');
    setIsEditing(false);
    setEditState('idle');
    setEditError(undefined);
  }, [version?.id]);

  const selectBlocks = (blockIds: string[]) => {
    if (!version || !isValidVersion) return;
    onSpanChange(blockSpan(record, version, blockIds));
  };

  const handleTextSelection = () => {
    if (!version || !isValidVersion || typeof window === 'undefined' || !blocksRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const elements = Array.from(blocksRef.current.querySelectorAll('[data-source-block-id]')) as HTMLElement[];
    const selectedBlockIds = elements
      .filter((element) => {
        try { return range.intersectsNode(element); } catch { return false; }
      })
      .map((element) => element.dataset.sourceBlockId)
      .filter((id): id is string => Boolean(id));
    if (selectedBlockIds.length > 0) selectBlocks(selectedBlockIds);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSaveEditedVersion || !version || !canEdit) return;
    setEditState('saving');
    setEditError(undefined);
    try {
      await onSaveEditedVersion(editedText);
      setIsEditing(false);
      setEditState('idle');
    } catch (error) {
      const isConflict = error instanceof SourcesApiError && error.statusLabel === 'version_conflict';
      setEditState(isConflict ? 'conflict' : 'failed');
      setEditError(editFailureMessage(error));
    }
  };

  const orderedBlocks = version ? [...version.blocks].sort((left, right) => left.order - right.order) : [];

  return (
    <section className="omni-source-reader" aria-labelledby="source-reader-title">
      <header className="omni-source-reader__header">
        <div>
          <p className="omni-source-reader__type">{record.type.toUpperCase()} · phiên bản {version?.versionNumber ?? '—'} · {isCurrentVersion ? 'phiên bản hiện tại' : 'phiên bản lịch sử · chỉ đọc'}</p>
          <h2 id="source-reader-title">{record.title}</h2>
        </div>
        <MousePointer2 aria-hidden="true" className="omni-source-reader__header-icon" />
      </header>

      {state !== 'ready' && state !== 'loading' ? (
        <div className={`omni-source-reader__notice omni-source-reader__notice--${state}`} role="status">
          <p>{stateMessage(state)}</p>
          {onRetry && (state === 'stale' || state === 'unavailable') ? (
            <button type="button" data-ux-control="sources.reader.retry" data-ux-flow="sources.manage" onClick={onRetry}>
              <RefreshCw aria-hidden="true" /> Làm mới phiên bản
            </button>
          ) : null}
        </div>
      ) : null}

      {owner || record.processingState === 'handoff_required' ? (
        <div className="omni-source-reader__handoff" role="status">
          <strong>{owner || 'Module khác'} phụ trách nguồn này.</strong>
          <span>{record.provenance.handoffReasonVi || 'Sources không phát media, chép lời hoặc hiển thị biểu đồ tại đây.'}</span>
        </div>
      ) : null}

      {displayVersions.length > 0 ? (
        <div className="omni-source-reader__history">
          <button type="button" data-ux-control="sources.reader.version-history" data-ux-flow="sources.reader.version-history" aria-expanded={historyOpen} onClick={() => setHistoryOpen((open) => !open)}>
            Lịch sử phiên bản ({displayVersions.length})
          </button>
          {historyOpen ? (
            <div role="list" aria-label="Lịch sử phiên bản nguồn">
              {displayVersions.map((candidate) => (
                <button type="button" key={candidate.id} className={candidate.id === version?.id ? 'is-active' : undefined} data-ux-control={sourceControlId('sources.reader.version-select', candidate.id)} data-ux-flow="sources.reader.version-select" onClick={() => { onVersionSelect?.(candidate); setHistoryOpen(false); }}>
                  Phiên bản {candidate.versionNumber}{candidate.stage === 'edited' ? ' · đã chỉnh sửa' : ' · bản gốc'}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {canEdit && !isEditing ? (
        <button type="button" className="omni-source-reader__edit-open" data-ux-control="sources.reader.edit-open" data-ux-flow="sources.reader.edit" onClick={() => { setEditedText(version?.plainText || ''); setEditState('idle'); setEditError(undefined); setIsEditing(true); }}>
          Chỉnh sửa thành phiên bản mới
        </button>
      ) : null}

      {isEditing ? (
        <form className="omni-source-reader__editor" onSubmit={handleSave} data-ux-control="sources.reader.edit-form" data-ux-flow="sources.reader.edit">
          <label>
            <span>Nội dung phiên bản mới</span>
            <textarea value={editedText} maxLength={200_000} data-ux-control="sources.reader.edit-text" data-ux-flow="sources.reader.edit" onChange={(event) => setEditedText(event.target.value)} />
          </label>
          {editError ? <p className="omni-source-reader__edit-error" role="alert">{editError}</p> : null}
          <div className="omni-source-reader__editor-actions">
            <button type="submit" disabled={editState === 'saving'} data-ux-control="sources.reader.edit-save" data-ux-flow="sources.reader.edit">{editState === 'saving' ? 'Đang lưu…' : 'Lưu phiên bản mới'}</button>
            <button type="button" disabled={editState === 'saving'} data-ux-control="sources.reader.edit-cancel" data-ux-flow="sources.reader.edit" onClick={() => { setIsEditing(false); setEditState('idle'); setEditError(undefined); setEditedText(version?.plainText || ''); }}>Huỷ</button>
          </div>
        </form>
      ) : null}

      {state === 'loading' ? (
        <div className="omni-source-reader__blocks omni-source-reader__blocks--skeleton" aria-label="Đang tải nội dung nguồn"><span /><span /><span /><span /></div>
      ) : !isValidVersion || orderedBlocks.length === 0 ? (
        <div className="omni-source-reader__empty" role="status"><h3>Chưa có khối văn bản đã kiểm tra</h3><p>Chọn một phiên bản đã trích xuất và sẵn sàng trước khi đặt câu hỏi có căn cứ.</p></div>
      ) : (
        <>
          <div className="omni-source-reader__selection-note"><span>{selectedBlockIds.size > 0 ? `Đã chọn ${selectedBlockIds.size} khối` : 'Chọn một khối hoặc kéo qua đoạn văn'}</span>{selectedBlockIds.size > 0 ? <Check aria-hidden="true" /> : null}</div>
          <div ref={blocksRef} className="omni-source-reader__blocks" onMouseUp={handleTextSelection}>
            {orderedBlocks.map((block) => {
              const blockSelected = selectedBlockIds.has(block.id);
              return (
                <article key={block.id} className={`omni-source-reader__block${blockSelected ? ' is-selected' : ''}`} data-source-block-id={block.id}>
                  <div className="omni-source-reader__block-meta"><span>Khối {block.id}</span><button type="button" aria-pressed={blockSelected} aria-label={`${blockSelected ? 'Bỏ chọn' : 'Chọn'} khối ${block.id}`} data-ux-control={sourceControlId('sources.reader.select-span', `${record.id}-${block.id}`)} data-ux-flow="sources.selection.toggle" onClick={() => { const next = blockSelected ? [...selectedBlockIds].filter((id) => id !== block.id) : [...selectedBlockIds, block.id]; selectBlocks(next); }}>{blockSelected ? 'Đã chọn' : 'Chọn khối'}</button></div>
                  {block.type === 'heading' ? <h3>{block.text}</h3> : <p>{block.text}</p>}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
