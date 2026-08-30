/** Server-only parser. Pass the process env explicitly; do not import this from browser modules. */
export function parseSourcesLibraryV2Env(env: Record<string, string | undefined>): boolean {
  return env.OMNI_SOURCES_LIBRARY_V2 === 'true';
}
