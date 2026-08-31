import type { LearnerAuthResult } from './groundedChat';
import type { SourcesPersistenceRepository } from './sourcesRepository.server';
import {
  authRequiredResult,
  extractBearerToken,
  featureDisabledResult,
  selectionUnavailableResult,
  type SourcesTransportResult,
  unavailableResult,
  verifyOrReject,
} from './transportShared.server';

type LibraryHandlerInput = {
  featureEnabled?: boolean;
  authorizationHeader?: string | null;
  cloudConfigured: boolean;
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>;
  repositoryForToken: (accessToken: string) => SourcesPersistenceRepository;
};

export async function handleSourcesLibraryRequest(
  input: LibraryHandlerInput,
): Promise<SourcesTransportResult> {
  if (input.featureEnabled !== true) return featureDisabledResult();
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();
  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  try {
    const snapshot = await input.repositoryForToken(auth.learner.accessToken).listLibrary();
    return {
      status: 200,
      body: {
        status: 'ready',
        records: snapshot.records,
        collections: snapshot.collections,
      },
    };
  } catch {
    return unavailableResult();
  }
}

export async function handleSourceVersionRequest(
  input: LibraryHandlerInput & { versionId: string },
): Promise<SourcesTransportResult> {
  if (input.featureEnabled !== true) return featureDisabledResult();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.versionId)) return selectionUnavailableResult();
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();
  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  try {
    const version = await input.repositoryForToken(auth.learner.accessToken).getVersionById(input.versionId);
    if (!version) return selectionUnavailableResult();
    return { status: 200, body: { status: 'ready', sourceVersion: version } };
  } catch {
    return unavailableResult();
  }
}

