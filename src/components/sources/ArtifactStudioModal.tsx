import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  createArtifactJob as createArtifactJobRequest,
  SourcesApiError,
  type ArtifactJobResponse,
} from '../../lib/sources/sourcesApi';
import {
  createPendingArtifactHandoff,
  prepareDestinationHandoff,
  type DestinationHandoffResult,
} from '../../lib/sources/destinationHandoff';
import {
  isValidSourceArtifactTargetBand,
  SOURCE_ARTIFACT_TARGET_BAND_MAX,
  SOURCE_ARTIFACT_TARGET_BAND_MIN,
  SOURCE_ARTIFACT_TARGET_BAND_STEP,
} from '../../lib/sources/targetBand';
import type {
  DestinationType,
  PendingArtifactHandoff,
  SourceArtifactJob,
  SourceRecord,
  SourceSpan,
  SourceVersion,
} from '../../types/sources';
import { DestinationPicker } from './DestinationPicker';
import { ArtifactDraftPreview } from './ArtifactDraftPreview';

export type ArtifactStudioPresentationState =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'stale'
  | 'degraded'
  | 'unavailable'
  | 'retryable_error'
  | 'rejected';

type ArtifactJobRequest = Parameters<typeof createArtifactJobRequest>[0];

export interface ArtifactStudioModalProps {
  isOpen: boolean;
  source?: SourceRecord;
  version?: SourceVersion;
  selectedSpan?: SourceSpan;
  onClose: () => void;
  onOpenArtifact?: (handoff: PendingArtifactHandoff) => boolean | void;
  onCreateAnother?: () => void;
  initialState?: ArtifactStudioPresentationState;
  createJob?: typeof createArtifactJobRequest;
}

function stateForError(error: unknown): ArtifactStudioPresentationState {
  if (error instanceof SourcesApiError) {
    if (error.statusLabel === 'quota_exceeded') return 'retryable_error';
    if (error.statusLabel === 'unavailable' || error.statusLabel === 'retry_wait') return 'retryable_error';
    if (error.statusLabel === 'source_unavailable') return 'unavailable';
    if (error.statusLabel === 'auth_required' || error.statusLabel === 'feature_disabled') return 'rejected';
  }
  return 'retryable_error';
}

function stateMessage(state: ArtifactStudioPresentationState): string {
  switch (state) {
    case 'loading': return 'Máy chủ đang xử lý một phiên bản nguồn cho một đích tiếp nhận.';
    case 'empty': return 'Chọn một đích và dùng phiên bản nguồn sẵn sàng để bắt đầu.';
    case 'stale': return 'Trạng thái yêu cầu có thể đã cũ. Làm mới trước khi mở bản nháp.';
    case 'degraded': return 'Đang dùng bước kiểm tra rút gọn; Sources không lưu dữ liệu module đích.';
    case 'unavailable': return 'Không thể tạo bản nháp hoặc nguồn này chưa thể trích xuất trong P03.';
    case 'retryable_error': return 'Yêu cầu tạo bản nháp chưa hoàn tất. Hãy thử lại trong phạm vi hiện tại.';
    case 'rejected': return 'Yêu cầu hoặc bản nháp bị từ chối. Không có dữ liệu đích nào được lưu.';
    default: return '';
  }
}

function isUsableSpan(source: SourceRecord | undefined, version: SourceVersion | undefined, span: SourceSpan | undefined): boolean {
  if (!source || !version || source.processingState !== 'ready' || source.currentVersionId !== version.id || version.sourceId !== source.id) return false;
  if (!span) return version.blocks.some((block) => block.text.trim().length > 0);
  if (span.sourceId !== source.id || span.sourceVersionId !== version.id) return false;
  const blockIds = new Set(version.blocks.map((block) => block.id));
  return Boolean(span.blockIds?.length) && span.blockIds.every((blockId) => blockIds.has(blockId));
}

function jobStateToPresentation(job: SourceArtifactJob): ArtifactStudioPresentationState {
  if (job.state === 'ready') return 'ready';
  if (job.state === 'needs_review' || job.state === 'rejected') return 'rejected';
  if (job.state === 'retry_wait' || (job.state === 'failed' && job.error?.retryable)) return 'retryable_error';
  if (job.state === 'failed' || job.state === 'cancelled') return 'rejected';
  return 'loading';
}

function getJobFromResponse(response: ArtifactJobResponse): SourceArtifactJob | undefined {
  return response.job;
}

export function ArtifactStudioModal({
  isOpen,
  source,
  version,
  selectedSpan,
  onClose,
  onOpenArtifact,
  onCreateAnother,
  initialState,
  createJob = createArtifactJobRequest,
}: ArtifactStudioModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const destinationGroupRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const handoffNavigationRef = useRef(false);
  const [destination, setDestination] = useState<DestinationType>();
  const [targetBand, setTargetBand] = useState(7);
  const [customInstruction, setCustomInstruction] = useState('');
  const [state, setState] = useState<ArtifactStudioPresentationState>(initialState || 'empty');
  const [job, setJob] = useState<SourceArtifactJob>();
  const [handoff, setHandoff] = useState<DestinationHandoffResult>();
  const [lastRequest, setLastRequest] = useState<ArtifactJobRequest>();
  const usableSource = isUsableSpan(source, version, selectedSpan);

  useEffect(() => {
    if (!isOpen) return undefined;
     previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
     handoffNavigationRef.current = false;
    const focusFrame = window.requestAnimationFrame(() => destinationGroupRef.current?.focus());
    const restoreFocus = () => {
      window.cancelAnimationFrame(focusFrame);
       if (!handoffNavigationRef.current && previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
    return restoreFocus;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setDestination(undefined);
    setJob(undefined);
    setHandoff(undefined);
    setLastRequest(undefined);
    setState(initialState || 'empty');
  }, [initialState, isOpen]);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    )) as HTMLElement[];
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const finishResponse = (response: ArtifactJobResponse) => {
    const completedJob = getJobFromResponse(response);
    if (!completedJob) {
      if (response.status === 'source_unavailable') setState('unavailable');
      else setState('retryable_error');
      return;
    }
    setJob(completedJob);
    const nextState = jobStateToPresentation(completedJob);
    if (nextState === 'ready') {
      const nextHandoff = prepareDestinationHandoff(completedJob);
      const pendingHandoff = version ? createPendingArtifactHandoff(completedJob, version) : null;
      setHandoff(nextHandoff);
      setState(nextHandoff.navigable && pendingHandoff ? 'ready' : 'rejected');
      return;
    }
    setHandoff(undefined);
    setState(nextState);
  };

  const runJob = async (request: ArtifactJobRequest) => {
    setLastRequest(request);
    setState('loading');
    setJob(undefined);
    setHandoff(undefined);
    try {
      finishResponse(await createJob(request));
    } catch (error) {
      setState(stateForError(error));
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!destination || !source || !version || !usableSource) return;
    void runJob({
      sourceVersionId: version.id,
      ...(selectedSpan ? { sourceSpan: selectedSpan } : {}),
      destination,
      targetBand,
      ...(customInstruction.trim() ? { customInstruction: customInstruction.trim() } : {}),
    });
  };

  const retry = () => {
    if (lastRequest) void runJob(lastRequest);
  };

  const createAnother = () => {
    setDestination(undefined);
    setJob(undefined);
    setHandoff(undefined);
    setState(usableSource ? 'empty' : 'unavailable');
    onCreateAnother?.();
  };

  const openValidatedArtifact = () => {
    if (!onOpenArtifact || !job || !version || !handoff?.navigable) return;
    const pending = createPendingArtifactHandoff(job, version);
    if (!pending) return;
    handoffNavigationRef.current = true;
    const accepted = onOpenArtifact(pending);
    if (accepted === false) handoffNavigationRef.current = false;
  };

  if (!isOpen) return null;

  const showingPreview = state === 'ready' && Boolean(handoff?.navigable);
  const canGenerate = Boolean(
    destination
    && usableSource
     && isValidSourceArtifactTargetBand(targetBand)
    && state !== 'loading',
  );

  return (
    <div className="omni-artifact-studio-backdrop">
      <div
        ref={dialogRef}
        className="omni-artifact-studio"
        role="dialog"
        aria-modal="true"
        aria-labelledby="artifact-studio-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <header className="omni-artifact-studio__header">
          <div>
             <p className="omni-artifact-studio__label">Xưởng tạo bản nháp</p>
             <h2 id="artifact-studio-title">Tạo một bản nháp từ nguồn này</h2>
             <p>{source?.title || 'Chưa chọn nguồn'}</p>
          </div>
          <button
            type="button"
            className="omni-artifact-studio__close"
             aria-label="Đóng xưởng tạo bản nháp"
            data-ux-control="sources.artifact.close"
            data-ux-flow="sources.artifact.open-modal"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        {showingPreview && handoff ? (
          <ArtifactDraftPreview
            job={job}
            handoff={handoff}
            onOpen={onOpenArtifact ? openValidatedArtifact : undefined}
            onCreateAnother={createAnother}
          />
        ) : (
          <form className="omni-artifact-studio__form" onSubmit={submit} data-ux-control="sources.artifact.form" data-ux-flow="sources.artifact.generate">
            {state === 'loading' ? (
              <div className="omni-artifact-studio__progress" role="status" aria-live="polite">
                <LoaderCircle aria-hidden="true" />
                <div>
                   <strong>Đang xử lý yêu cầu nguồn</strong>
                   <p>Đang phân tích các khối đã chọn rồi kiểm tra đích tiếp nhận đã yêu cầu.</p>
                </div>
              </div>
            ) : null}

            {state !== 'loading' && state !== 'empty' ? (
              <div className={`omni-artifact-studio__state omni-artifact-studio__state--${state}`} role={state === 'retryable_error' ? 'alert' : 'status'}>
                {state === 'rejected' ? <AlertCircle aria-hidden="true" /> : state === 'stale' ? <Clock3 aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                <div>
                   <strong>{state === 'degraded' ? 'Kiểm tra rút gọn' : state === 'unavailable' ? 'Không thể tạo bản nháp' : state === 'retryable_error' ? 'Yêu cầu có thể thử lại' : state === 'stale' ? 'Trạng thái đã cũ' : 'Chưa có bản nháp sẵn sàng'}</strong>
                  <p>{job?.error?.messageVi || (job?.artifactDraft?.validationErrors?.join(', ') || stateMessage(state))}</p>
                </div>
                {state === 'retryable_error' && lastRequest ? (
                  <button type="button" data-ux-control="sources.artifact.retry" data-ux-flow="sources.artifact.generate" onClick={retry}>
                    <RefreshCw aria-hidden="true" />
                     Thử lại
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="omni-artifact-studio__source-state" role="status">
               {usableSource ? 'Đã chọn phiên bản nguồn sẵn sàng' : 'Cần phiên bản nguồn sẵn sàng và các khối có thể sử dụng'}
            </div>

            <div className="omni-artifact-studio__field">
               <h3>Chọn một đích tiếp nhận</h3>
              <DestinationPicker
                selected={destination}
                onSelect={setDestination}
                disabled={state === 'loading'}
                groupRef={destinationGroupRef}
              />
            </div>

            <div className="omni-artifact-studio__options">
              <label>
                 <span>Band mục tiêu</span>
                <input
                  type="number"
                   min={SOURCE_ARTIFACT_TARGET_BAND_MIN}
                   max={SOURCE_ARTIFACT_TARGET_BAND_MAX}
                   step={SOURCE_ARTIFACT_TARGET_BAND_STEP}
                  value={targetBand}
                  data-ux-control="sources.artifact.target-band"
                  data-ux-flow="sources.artifact.generate"
                  onChange={(event) => setTargetBand(Number(event.target.value))}
                />
              </label>
              <label>
                 <span>Hướng dẫn thêm (không bắt buộc)</span>
                <textarea
                  value={customInstruction}
                  maxLength={2_000}
                   placeholder="Ví dụ: giữ bản nháp ngắn gọn…"
                  data-ux-control="sources.artifact.custom-instruction"
                  data-ux-flow="sources.artifact.generate"
                  onChange={(event) => setCustomInstruction(event.target.value)}
                />
              </label>
            </div>

            <div className="omni-artifact-studio__footer">
               <p>{state === 'empty' ? stateMessage('empty') : 'Thao tác này chỉ tạo bản nháp. Module đích sẽ lưu sau khi bạn chủ động mở.'}</p>
              <button
                type="submit"
                className="omni-artifact-studio__generate"
                disabled={!canGenerate}
                data-ux-control="sources.artifact.generate"
                data-ux-flow="sources.artifact.generate"
              >
                 Tạo một bản nháp
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
