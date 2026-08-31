import { Quote, X } from 'lucide-react';
import type { GroundedChatResponsePayload } from '../../lib/sources/sourcesApi';

export type SourceCitation = GroundedChatResponsePayload['citations'][number];

export interface CitationDrawerProps {
  citations: readonly SourceCitation[];
  activeCitation?: SourceCitation;
  open?: boolean;
  onClose?: () => void;
}

export function CitationDrawer({
  citations,
  activeCitation,
  open = true,
  onClose = () => undefined,
}: CitationDrawerProps) {
  if (!open || citations.length === 0) return null;
  const citation = activeCitation || citations[0];
  if (!citation) return null;

  return (
    <aside className="omni-citation-drawer" role="dialog" aria-modal="false" aria-labelledby="citation-drawer-title">
      <div className="omni-citation-drawer__header">
        <div>
          <p className="omni-citation-drawer__label">Source citation</p>
          <h3 id="citation-drawer-title">{citation.sourceTitle}</h3>
        </div>
        <button
          type="button"
          className="omni-citation-drawer__close"
          aria-label="Close citation"
          data-ux-control="sources.chat.citation-close"
          data-ux-flow="sources.chat.citation-open"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <p className="omni-citation-drawer__block">Block {citation.blockId}</p>
      {citation.exactSnippet ? (
        <blockquote>
          <Quote aria-hidden="true" />
          <span>{citation.exactSnippet}</span>
        </blockquote>
      ) : (
        <p className="omni-citation-drawer__missing">The server cited this block without an excerpt.</p>
      )}
    </aside>
  );
}

