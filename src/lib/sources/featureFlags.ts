export function isSourcesLibraryV2Enabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.OMNI_SOURCES_LIBRARY_V2 === 'true';
}

export function resolveSourcesViewName(env: Record<string, string | undefined> = process.env):
  | 'SourceIngestionView'
  | 'SourcesView' {
  return isSourcesLibraryV2Enabled(env) ? 'SourcesView' : 'SourceIngestionView';
}
