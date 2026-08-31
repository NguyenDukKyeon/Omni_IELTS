import type { ModuleId } from '../../types';
import type { DestinationType, PendingArtifactHandoff } from '../../types/sources';
import { isValidPendingArtifactHandoff } from './destinationHandoff';

export interface ArtifactNavigationState {
  activeModule: ModuleId;
  pendingArtifactHandoff: PendingArtifactHandoff | null;
}

export function routePendingArtifactHandoff(
  state: ArtifactNavigationState,
  handoff: PendingArtifactHandoff,
): ArtifactNavigationState {
  if (!isValidPendingArtifactHandoff(handoff)) return state;
  return {
    activeModule: handoff.targetModule,
    pendingArtifactHandoff: handoff,
  };
}

export function consumePendingArtifactHandoff(
  state: ArtifactNavigationState,
  destination: DestinationType,
): { state: ArtifactNavigationState; handoff: PendingArtifactHandoff | null } {
  if (!state.pendingArtifactHandoff || state.pendingArtifactHandoff.destination !== destination) {
    return { state, handoff: null };
  }
  return {
    state: { ...state, pendingArtifactHandoff: null },
    handoff: state.pendingArtifactHandoff,
  };
}
