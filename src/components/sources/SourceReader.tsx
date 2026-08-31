import { Check, MousePointer2, RefreshCw } from 'lucide-react';
import { useRef } from 'react';
import type { SourceRecord, SourceSpan, SourceVersion } from '../../types/sources';
import { sourceControlId } from './SourceCard';

export type SourceReaderState = 'ready' | 'loading' | 'stale' | 'degraded' | 'unavailable' | 'rejected';

export interface SourceReaderProps {
  record: SourceRecord;
  version?: SourceVersion;
  selectedSpan?: SourceSpan;
  state?: SourceReaderState;
  onSpanChange: (span?: SourceSpan) => void;
  onRetry?: () => void;
}

function ownerLabel(record: SourceRecord): string | undefined {
  if (record.provenance.owningModule === 'media') return 'Media Lab (P04)';
  if (record.provenance.owningModule === 'mock') return 'Academic Mock (P07)';
  return undefined;
}

function stateMessage(state: SourceReaderState): string {
  switch (state) {
    case 'stale': return 'This reader may be out of date. Refresh the source version when online.';
    case 'degraded': return 'Text-only reader mode is active. No media surface is loaded here.';
    case 'unavailable': return 'The source version is unavailable right now.';
    case 'rejected': return 'This source version was rejected and cannot be displayed as ready content.';
    default: return '';
  }
}

function spanBlockIds(span: SourceSpan | undefined, versionId: string, sourceId: string): Set<string> {
  if (!span || span.sourceVersionId !== versionId || span.sourceId !== sourceId) return new Set();
  return new Set(span.blockIds ?? []);
}

function blockSpan(record: SourceRecord, version: SourceVersion, blockIds: string[]): SourceSpan | undefined {
  if (blockIds.length === 0) return undefined;
  return {
    sourceId: record.id,
    sourceVersionId: version.id,
    blockIds,
  };
}

export function SourceReader({
  record,
  version,
  selectedSpan,
  state = 'ready',
  onSpanChange,
  onRetry,
}: SourceReaderProps) {
  const blocksRef = useRef<HTMLDivElement>(null);
  const isValidVersion = Boolean(version && version.sourceId === record.id && record.currentVersionId === version.id);
  const owner = ownerLabel(record);
  const selectedBlockIds = spanBlockIds(selectedSpan, version?.id ?? '', record.id);

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
        try {
          return range.intersectsNode(element);
        } catch {
          return false;
        }
      })
      .map((element) => element.dataset.sourceBlockId)
      .filter((id): id is string => Boolean(id));
    if (selectedBlockIds.length > 0) selectBlocks(selectedBlockIds);
  };

  const orderedBlocks = version ? [...version.blocks].sort((left, right) => left.order - right.order) : [];

  return (
    <section className="omni-source-reader" aria-labelledby="source-reader-title">
      <header className="omni-source-reader__header">
        <div>
          <p className="omni-source-reader__type">{record.type.toUpperCase()} · version {version?.versionNumber ?? '—'}</p>
          <h2 id="source-reader-title">{record.title}</h2>
        </div>
        <MousePointer2 aria-hidden="true" className="omni-source-reader__header-icon" />
      </header>

      {state !== 'ready' && state !== 'loading' ? (
        <div className={`omni-source-reader__notice omni-source-reader__notice--${state}`} role="status">
          <p>{stateMessage(state)}</p>
          {onRetry && (state === 'stale' || state === 'unavailable') ? (
            <button
              type="button"
              data-ux-control="sources.reader.retry"
              data-ux-flow="sources.manage"
              onClick={onRetry}
            >
              <RefreshCw aria-hidden="true" />
              Refresh version
            </button>
          ) : null}
        </div>
      ) : null}

      {owner || record.processingState === 'handoff_required' ? (
        <div className="omni-source-reader__handoff" role="status">
          <strong>{owner || 'Another module'} owns this source.</strong>
          <span>{record.provenance.handoffReasonVi || 'Sources does not mount playback, transcription, or chart rendering.'}</span>
        </div>
      ) : null}

      {state === 'loading' ? (
        <div className="omni-source-reader__blocks omni-source-reader__blocks--skeleton" aria-label="Loading source text">
          <span /><span /><span /><span />
        </div>
      ) : !isValidVersion || orderedBlocks.length === 0 ? (
        <div className="omni-source-reader__empty" role="status">
          <h3>No validated text blocks</h3>
          <p>Select a ready extracted version before asking grounded questions.</p>
        </div>
      ) : (
        <>
          <div className="omni-source-reader__selection-note">
            <span>{selectedBlockIds.size > 0 ? `${selectedBlockIds.size} block(s) selected` : 'Select a block or drag across text'}</span>
            {selectedBlockIds.size > 0 ? <Check aria-hidden="true" /> : null}
          </div>
          <div ref={blocksRef} className="omni-source-reader__blocks" onMouseUp={handleTextSelection}>
            {orderedBlocks.map((block) => {
              const blockSelected = selectedBlockIds.has(block.id);
              return (
                <article
                  key={block.id}
                  className={`omni-source-reader__block${blockSelected ? ' is-selected' : ''}`}
                  data-source-block-id={block.id}
                >
                  <div className="omni-source-reader__block-meta">
                    <span>Block {block.id}</span>
                    <button
                      type="button"
                      aria-pressed={blockSelected}
                      aria-label={`${blockSelected ? 'Deselect' : 'Select'} block ${block.id}`}
                      data-ux-control={sourceControlId('sources.reader.select-span', `${record.id}-${block.id}`)}
                      data-ux-flow="sources.selection.toggle"
                      onClick={() => {
                        const next = blockSelected
                          ? [...selectedBlockIds].filter((id) => id !== block.id)
                          : [...selectedBlockIds, block.id];
                        selectBlocks(next);
                      }}
                    >
                      {blockSelected ? 'Selected' : 'Select block'}
                    </button>
                  </div>
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
