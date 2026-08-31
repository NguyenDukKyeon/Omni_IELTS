import { Globe2, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  executeGroundedChat,
  requestWebResearch,
  SourcesApiError,
  type GroundedChatResponsePayload,
  type WebResearchResponsePayload,
} from '../../lib/sources/sourcesApi';
import type { SourceSpan } from '../../types/sources';
import { sourceControlId } from './SourceCard';
import { CitationDrawer, type SourceCitation } from './CitationDrawer';

export type GroundedChatPresentationState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'auth_required'
  | 'feature_disabled'
  | 'quota_exceeded'
  | 'unavailable'
  | 'unsupported_by_sources'
  | 'select_smaller_source'
  | 'retryable_error';

export interface SourceGroundedChatProps {
  selectedVersionIds: readonly string[];
  selectedSpan?: SourceSpan;
  contextLabel?: string;
  executeChat?: typeof executeGroundedChat;
  executeResearch?: typeof requestWebResearch;
  onResponse?: (response: GroundedChatResponsePayload) => void;
  onResearchResponse?: (response: WebResearchResponsePayload) => void;
}

function stateForError(error: unknown): GroundedChatPresentationState {
  if (error instanceof SourcesApiError) {
    switch (error.statusLabel) {
      case 'auth_required': return 'auth_required';
      case 'feature_disabled': return 'feature_disabled';
      case 'quota_exceeded': return 'quota_exceeded';
      case 'select_smaller_source': return 'select_smaller_source';
      case 'unavailable': return 'unavailable';
      case 'selection_unavailable': return 'unsupported_by_sources';
      case 'retry_wait': return 'retryable_error';
      default: return 'retryable_error';
    }
  }
  return 'retryable_error';
}

function messageForState(state: GroundedChatPresentationState): string {
  switch (state) {
    case 'auth_required': return 'Sign in to ask about private cloud Sources.';
    case 'feature_disabled': return 'This Sources capability is not available right now.';
    case 'quota_exceeded': return 'The Sources request limit is temporarily reached. Try again later.';
    case 'unavailable': return 'Grounded chat is unavailable. Your selected source state is unchanged.';
    case 'unsupported_by_sources': return 'The selected source blocks do not support this answer.';
    case 'select_smaller_source': return 'Select fewer source blocks or ask a shorter question.';
    case 'retryable_error': return 'The request did not finish. You can retry without changing source selection.';
    default: return '';
  }
}

export function SourceGroundedChat({
  selectedVersionIds,
  selectedSpan,
  contextLabel = 'No source selected',
  executeChat = executeGroundedChat,
  executeResearch = requestWebResearch,
  onResponse,
  onResearchResponse,
}: SourceGroundedChatProps) {
  const [question, setQuestion] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [state, setState] = useState<GroundedChatPresentationState>('idle');
  const [researchState, setResearchState] = useState<GroundedChatPresentationState>('idle');
  const [response, setResponse] = useState<GroundedChatResponsePayload | null>(null);
  const [researchResponse, setResearchResponse] = useState<WebResearchResponsePayload | null>(null);
  const [activeCitation, setActiveCitation] = useState<SourceCitation | undefined>();

  const sendQuestion = async (nextQuestion: string) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed || selectedVersionIds.length === 0) {
      setState('unsupported_by_sources');
      return;
    }
    setLastQuestion(trimmed);
    setState('loading');
    setResponse(null);
    try {
      const result = await executeChat({
        selectedVersionIds: [...selectedVersionIds],
        question: trimmed,
        ...(selectedSpan ? { sourceSpan: selectedSpan } : {}),
      });
      setResponse(result);
      setState(result.groundingStatus === 'unsupported_by_sources' ? 'unsupported_by_sources' : 'ready');
      onResponse?.(result);
    } catch (error) {
      setState(stateForError(error));
    }
  };

  const sendResearch = async () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setLastQuestion(trimmed);
    setResearchState('loading');
    setResearchResponse(null);
    try {
      const result = await executeResearch(trimmed);
      setResearchResponse(result);
      setResearchState('ready');
      onResearchResponse?.(result);
    } catch (error) {
      setResearchState(stateForError(error));
    }
  };

  const retry = () => {
    if (state !== 'idle' && state !== 'ready' && lastQuestion) void sendQuestion(lastQuestion);
  };

  const retryResearch = () => {
    if (researchState !== 'idle' && researchState !== 'ready' && lastQuestion) void sendResearch();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendQuestion(question);
  };

  const hasCitations = Boolean(response?.citations.length);

  return (
    <section className="omni-source-chat" aria-labelledby="source-chat-title">
      <header className="omni-source-chat__header">
        <div>
          <p className="omni-source-chat__label">Grounded chat</p>
          <h2 id="source-chat-title">Ask the selected source</h2>
        </div>
        <MessageCircle aria-hidden="true" className="omni-source-chat__icon" />
      </header>

      <p className="omni-source-chat__context" role="status">{contextLabel}</p>

      <form className="omni-source-chat__composer" onSubmit={handleSubmit} data-ux-control="sources.chat.composer" data-ux-flow="sources.chat.send">
        <label htmlFor="sources-chat-question">Question for the selected source</label>
        <textarea
          id="sources-chat-question"
          value={question}
          maxLength={8_000}
          placeholder="Ask what the selected source says…"
          data-ux-control="sources.chat.question-input"
          data-ux-flow="sources.chat.send"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className="omni-source-chat__actions">
          <button
            type="submit"
            className="omni-source-chat__send"
            disabled={state === 'loading' || selectedVersionIds.length === 0 || !question.trim()}
            data-ux-control="sources.chat.send"
            data-ux-flow="sources.chat.send"
          >
            <Send aria-hidden="true" />
            Ask selected source
          </button>
          <button
            type="button"
            className="omni-source-chat__research"
            disabled={researchState === 'loading' || !question.trim()}
            data-ux-control="sources.chat.web-research"
            data-ux-flow="sources.chat.web-research"
            onClick={() => void sendResearch()}
          >
            <Globe2 aria-hidden="true" />
            Tra cứu dẫn chứng
          </button>
        </div>
      </form>

      {state === 'loading' ? <p className="omni-source-chat__state" role="status" aria-live="polite">Reading the selected source blocks…</p> : null}
      {state !== 'idle' && state !== 'loading' && state !== 'ready' ? (
        <div className={`omni-source-chat__state omni-source-chat__state--${state}`} role={state === 'unsupported_by_sources' ? 'status' : 'alert'}>
          <p>{state === 'unsupported_by_sources' && response?.answer ? response.answer : messageForState(state)}</p>
          {(state === 'quota_exceeded' || state === 'unavailable' || state === 'retryable_error') && lastQuestion ? (
            <button type="button" data-ux-control="sources.chat.retry" data-ux-flow="sources.chat.send" onClick={retry}>
              <RefreshCw aria-hidden="true" />
              Retry question
            </button>
          ) : null}
        </div>
      ) : null}

      {response && state === 'ready' ? (
        <div className="omni-source-chat__answer">
          <p className="omni-source-chat__answer-label">Answer grounded in the selected source</p>
          <p>{response.answer}</p>
          {hasCitations ? (
            <div className="omni-source-chat__citations" aria-label="Source citations">
              {response.citations.map((citation, index) => (
                <button
                  type="button"
                  key={`${citation.sourceVersionId}-${citation.blockId}-${index}`}
                  className="omni-source-chat__citation"
                  data-ux-control={sourceControlId('sources.chat.citation-open', `${citation.sourceVersionId}-${citation.blockId}-${index}`)}
                  data-ux-flow="sources.chat.citation-open"
                  onClick={() => { setActiveCitation(citation); }}
                >
                  {citation.sourceTitle} · {citation.blockId}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {researchState !== 'idle' ? (
        <div className="omni-source-chat__research-result">
          {researchState === 'loading' ? <p role="status">Looking for cited web evidence…</p> : null}
          {researchState !== 'loading' && researchState !== 'ready' ? (
            <div className="omni-source-chat__state omni-source-chat__state--research" role="alert">
              <p>{messageForState(researchState)}</p>
              {(researchState === 'quota_exceeded' || researchState === 'unavailable' || researchState === 'retryable_error') ? (
                <button type="button" data-ux-control="sources.chat.research-retry" data-ux-flow="sources.chat.web-research" onClick={retryResearch}>
                  <RefreshCw aria-hidden="true" />
                  Retry research
                </button>
              ) : null}
            </div>
          ) : null}
          {researchState === 'ready' && researchResponse?.webCitations.length ? (
            <div>
              <p className="omni-source-chat__answer-label">Web evidence — clearly separate from private-source chat</p>
              <ul>
                {researchResponse.webCitations.map((citation) => (
                  <li key={citation.url}>
                    <a href={citation.url} target="_blank" rel="noreferrer" data-ux-control={sourceControlId('sources.chat.web-result', citation.url)} data-ux-flow="sources.chat.web-research">[Web: {citation.title}]</a>
                    {citation.snippet ? <span>{citation.snippet}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : researchState === 'ready' ? <p role="status">No web citations were returned.</p> : null}
        </div>
      ) : null}

      {hasCitations ? (
        <CitationDrawer
          citations={response?.citations || []}
          activeCitation={activeCitation}
          open={Boolean(activeCitation)}
          onClose={() => setActiveCitation(undefined)}
        />
      ) : null}
    </section>
  );
}
