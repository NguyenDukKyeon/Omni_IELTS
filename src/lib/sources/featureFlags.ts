/**
 * Client-safe `sources_library_v2` resolver.
 *
 * Task 11 client-safe flag transport:
 * 1. Server reads `OMNI_SOURCES_LIBRARY_V2` through `parseSourcesLibraryV2Env`
 *    in `featureFlags.server.ts` (never from this module).
 * 2. The app shell injects the boolean as `window.__OMNI_FLAGS__.sourcesLibraryV2`
 *    or an equivalent Vite-bootstrapped `VITE_OMNI_SOURCES_LIBRARY_V2` payload.
 * 3. Browser code calls `isSourcesLibraryV2Enabled(explicitValue)` / `resolveSourcesViewName`.
 * 4. This file must never read the Node process environment. Default remains OFF.
 */
export type SourcesLibraryFlagInput =
  | boolean
  | { sourcesLibraryV2?: boolean }
  | undefined
  | null;

export function isSourcesLibraryV2Enabled(flag?: SourcesLibraryFlagInput): boolean {
  if (typeof flag === 'boolean') return flag;
  if (flag && typeof flag === 'object') return flag.sourcesLibraryV2 === true;
  return false;
}

export function getClientSourcesLibraryV2Flag(): boolean {
  if (typeof window !== 'undefined') {
    const injected = (window as Window & {
      __OMNI_FLAGS__?: { sourcesLibraryV2?: boolean };
    }).__OMNI_FLAGS__?.sourcesLibraryV2;
    if (typeof injected === 'boolean') return injected;
  }
  return import.meta.env.VITE_OMNI_SOURCES_LIBRARY_V2 === 'true';
}

export function resolveSourcesViewName(flag?: SourcesLibraryFlagInput):
  | 'SourceIngestionView'
  | 'SourcesView' {
  return isSourcesLibraryV2Enabled(flag) ? 'SourcesView' : 'SourceIngestionView';
}
