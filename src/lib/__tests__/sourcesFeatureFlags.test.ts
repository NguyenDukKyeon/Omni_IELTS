import { describe, expect, it } from 'vitest';
import { isSourcesLibraryV2Enabled, resolveSourcesViewName } from '../sources/featureFlags';

describe('sources_library_v2 kill switch', () => {
  it('defaults OFF and keeps the legacy facade', () => {
    expect(isSourcesLibraryV2Enabled({})).toBe(false);
    expect(resolveSourcesViewName({})).toBe('SourceIngestionView');
  });

  it('routes to SourcesView only when the flag is ON', () => {
    expect(resolveSourcesViewName({ OMNI_SOURCES_LIBRARY_V2: 'true' })).toBe('SourcesView');
  });

  it('rolls back to SourceIngestionView when the kill switch is false', () => {
    expect(resolveSourcesViewName({ OMNI_SOURCES_LIBRARY_V2: 'false' })).toBe('SourceIngestionView');
  });
});
