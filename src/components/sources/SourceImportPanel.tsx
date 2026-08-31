import { FileUp, LoaderCircle, Send, X } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { importSource, SourcesApiError, type SourceImportResponse } from '../../lib/sources/sourcesApi';
import type { SourceImportRequest } from '../../lib/sources/importTransport.server';

type ImportSourceType = 'text' | 'url' | 'pdf' | 'docx' | 'vtt_srt' | 'youtube';
type ImportPanelState = 'idle' | 'loading' | 'ready' | 'handoff_required' | 'retry_wait' | 'failed' | 'auth_required' | 'unavailable';

const TYPE_OPTIONS: Array<{ value: ImportSourceType; label: string }> = [
  { value: 'text', label: 'Text / Markdown' },
  { value: 'url', label: 'Article URL' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'vtt_srt', label: 'VTT / SRT' },
  { value: 'youtube', label: 'YouTube handoff' },
];

const CONTENT_CONTROLS: Record<ImportSourceType, string> = {
  text: 'sources.import.paste-text',
  url: 'sources.import.url',
  pdf: 'sources.import.pdf',
  docx: 'sources.import.docx',
  vtt_srt: 'sources.import.vtt',
  youtube: 'sources.import.youtube',
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

function stateForError(error: unknown): ImportPanelState {
  if (error instanceof SourcesApiError) {
    if (error.statusLabel === 'auth_required') return 'auth_required';
    if (error.statusLabel === 'unavailable') return 'unavailable';
    if (error.statusLabel === 'retry_wait' || error.statusLabel === 'quota_exceeded') return 'retry_wait';
  }
  return 'failed';
}

function stateMessage(state: ImportPanelState): string {
  switch (state) {
    case 'ready': return 'Source saved with one immutable version.';
    case 'handoff_required': return 'Reference saved. The owning module handles playback or chart rendering.';
    case 'auth_required': return 'Sign in before sending a source to cloud storage.';
    case 'unavailable': return 'The source service is unavailable. No ready source was created.';
    case 'retry_wait': return 'The request can be retried without choosing the file again.';
    case 'failed': return 'The source was not saved as ready content. Check the input and try again.';
    default: return '';
  }
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
  const [state, setState] = useState<ImportPanelState>('idle');
  const [lastRequest, setLastRequest] = useState<SourceImportRequest>();
  const [errorMessage, setErrorMessage] = useState<string>();

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

  const submitRequest = async (request: SourceImportRequest) => {
    setState('loading');
    setErrorMessage(undefined);
    setLastRequest(request);
    try {
      const response = await importSourceRequest(request);
      setState(response.status);
      onImported(response);
    } catch (error) {
      setState(stateForError(error));
      setErrorMessage(error instanceof SourcesApiError ? error.userMessageVi : undefined);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await submitRequest(await buildRequest());
    } catch (error) {
      setState('failed');
      setErrorMessage(error instanceof Error && error.message === 'file_required'
        ? 'Choose a PDF or DOCX file before sending.'
        : 'Enter a title and bounded source content before sending.');
    }
  };

  const retry = () => {
    if (lastRequest) void submitRequest(lastRequest);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0]);
  };

  const isBinary = type === 'pdf' || type === 'docx';

  return (
    <section className="omni-source-import" aria-labelledby="source-import-title">
      <header className="omni-source-import__header">
        <div>
          <p className="omni-source-import__label">Private source import</p>
          <h2 id="source-import-title">Add one source</h2>
          <p>Text is bounded here. PDF and DOCX are checked on the server before extraction.</p>
        </div>
        <button
          type="button"
          className="omni-source-import__close"
          aria-label="Close source import"
          data-ux-control="sources.import.close"
          data-ux-flow="sources.import.submit"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </header>

      <form className="omni-source-import__form" onSubmit={submit} data-ux-control="sources.import.form" data-ux-flow="sources.import.submit">
        <label>
          <span>Title</span>
          <input
            type="text"
            value={title}
            maxLength={240}
            required
            data-ux-control="sources.import.title"
            data-ux-flow="sources.import.submit"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          <span>Source type</span>
          <select
            value={type}
            data-ux-control="sources.import.type"
            data-ux-flow="sources.import.submit"
            onChange={(event) => { setType(event.target.value as ImportSourceType); setFile(undefined); setContent(''); }}
          >
            {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>

        {isBinary ? (
          <label className="omni-source-import__file">
            <span>{type === 'pdf' ? 'PDF file' : 'DOCX file'}</span>
            <input
              type="file"
              accept={type === 'pdf' ? 'application/pdf,.pdf' : '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
              data-ux-control={CONTENT_CONTROLS[type]}
              data-ux-flow="sources.import.submit"
              onChange={onFileChange}
            />
            <span className="omni-source-import__file-name">{file?.name || 'No file selected'}</span>
          </label>
        ) : (
          <label>
            <span>{type === 'youtube' ? 'YouTube URL' : type === 'url' ? 'Article URL' : 'Bounded content'}</span>
            <textarea
              value={content}
              maxLength={1_000_000}
              required
              placeholder={type === 'youtube' ? 'https://www.youtube.com/watch?v=…' : 'Paste the source content here…'}
              data-ux-control={CONTENT_CONTROLS[type]}
              data-ux-flow="sources.import.submit"
              onChange={(event) => setContent(event.target.value)}
            />
          </label>
        )}

        {state !== 'idle' && state !== 'loading' ? (
          <div className={`omni-source-import__state omni-source-import__state--${state}`} role={state === 'failed' || state === 'retry_wait' ? 'alert' : 'status'}>
            <p>{errorMessage || stateMessage(state)}</p>
            {(state === 'retry_wait' || state === 'unavailable') && lastRequest ? (
              <button type="button" data-ux-control="sources.import.retry" data-ux-flow="sources.import.submit" onClick={retry}>
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        {state === 'loading' ? <p className="omni-source-import__loading" role="status"><LoaderCircle aria-hidden="true" /> Sending source for validation…</p> : null}

        <button
          type="submit"
          className="omni-source-import__submit"
          disabled={state === 'loading'}
          data-ux-control="sources.import.submit"
          data-ux-flow="sources.import.submit"
        >
          {state === 'loading' ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
          Send source
        </button>
      </form>
      <p className="omni-source-import__footnote"><FileUp aria-hidden="true" /> Cloud import requires a verified learner session.</p>
    </section>
  );
}

