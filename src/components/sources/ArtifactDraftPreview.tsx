import { ArrowUpRight, RotateCcw, ShieldCheck } from 'lucide-react';
import type { DestinationHandoffResult } from '../../lib/sources/destinationHandoff';
import type { SourceArtifactJob } from '../../types/sources';

const DESTINATION_LABELS: Record<SourceArtifactJob['destination'], string> = {
  practice: 'Practice activity',
  mock_section: 'Mock section',
  vocabulary_deck: 'Vocabulary deck',
  note: 'Note',
  idea_bank: 'Idea bank',
};

export interface ArtifactDraftPreviewProps {
  job?: SourceArtifactJob;
  handoff?: DestinationHandoffResult;
  onOpen?: () => void;
  onCreateAnother?: () => void;
}

function draftTitle(job: SourceArtifactJob): string {
  const payload = job.artifactDraft?.payload;
  if (!payload || typeof payload !== 'object') return 'Validated draft';
  if ('activityTitle' in payload && typeof payload.activityTitle === 'string') return payload.activityTitle;
  if ('deckTitle' in payload && typeof payload.deckTitle === 'string') return payload.deckTitle;
  if ('title' in payload && typeof payload.title === 'string') return payload.title;
  if ('topic' in payload && typeof payload.topic === 'string') return payload.topic;
  return 'Validated draft';
}

export function ArtifactDraftPreview({
  job,
  handoff,
  onOpen,
  onCreateAnother,
}: ArtifactDraftPreviewProps) {
  const isNavigable = Boolean(handoff?.navigable);
  const destination = job?.destination || (handoff?.navigable ? handoff.draftRef.destination : undefined);

  if (!isNavigable || !handoff?.navigable) {
    return (
      <div className="omni-artifact-preview omni-artifact-preview--not-ready" role="status">
        <strong>Draft needs review</strong>
        <p>{job?.artifactDraft?.validationErrors?.join(', ') || 'The server has not returned a navigable validated draft.'}</p>
      </div>
    );
  }

  return (
    <div className="omni-artifact-preview" data-artifact-job-id={job?.id}>
      <div className="omni-artifact-preview__status">
        <ShieldCheck aria-hidden="true" />
        <span>Validated draft ready</span>
      </div>
      <p className="omni-artifact-preview__destination">{destination ? DESTINATION_LABELS[destination] : 'Destination draft'}</p>
      <h3>{job ? draftTitle(job) : 'Validated draft'}</h3>
      <p className="omni-artifact-preview__note">The destination owner will persist this draft after you open it.</p>
      <div className="omni-artifact-preview__actions">
        {onOpen ? (
          <button
            type="button"
            className="omni-artifact-preview__open"
            data-ux-control="sources.artifact.open"
            data-ux-flow="sources.artifact.open"
            onClick={onOpen}
          >
            <ArrowUpRight aria-hidden="true" />
            Open artifact
          </button>
        ) : null}
        {onCreateAnother ? (
          <button
            type="button"
            className="omni-artifact-preview__another"
            data-ux-control="sources.artifact.create-another"
            data-ux-flow="sources.artifact.create-another"
            onClick={onCreateAnother}
          >
            <RotateCcw aria-hidden="true" />
            Create another output
          </button>
        ) : null}
      </div>
    </div>
  );
}

