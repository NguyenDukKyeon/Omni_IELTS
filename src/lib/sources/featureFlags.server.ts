/** Server-only parser. Pass the process env explicitly; do not import this from browser modules. */
export function parseSourcesLibraryV2Env(env: Record<string, string | undefined>): boolean {
  return env.OMNI_SOURCES_LIBRARY_V2 === 'true';
}

const RUNTIME_FLAG_MARKER = 'data-omni-runtime-flags';

/** Injects the server-parsed flag into the HTML shell without exposing env text. */
export function injectSourcesRuntimeFlag(html: string, enabled: boolean): string {
  if (html.includes(RUNTIME_FLAG_MARKER)) return html;
  const payload = JSON.stringify({ sourcesLibraryV2: enabled });
  const script = `<script ${RUNTIME_FLAG_MARKER}>window.__OMNI_FLAGS__=Object.freeze(${payload});</script>`;
  const headClose = html.search(/<\/head\s*>/i);
  if (headClose < 0) return `${script}${html}`;
  const closeTag = html.slice(headClose).match(/^<\/head\s*>/i)?.[0] ?? '</head>';
  return `${html.slice(0, headClose)}${script}${html.slice(headClose + closeTag.length)}`;
}
