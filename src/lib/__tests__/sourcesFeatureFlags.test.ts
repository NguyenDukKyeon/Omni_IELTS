import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isSourcesLibraryV2Enabled, resolveSourcesViewName } from '../sources/featureFlags';
import { parseSourcesLibraryV2Env } from '../sources/featureFlags.server';

describe('sources_library_v2 kill switch', () => {
  it('defaults OFF and keeps the legacy facade', () => {
    expect(isSourcesLibraryV2Enabled()).toBe(false);
    expect(isSourcesLibraryV2Enabled(undefined)).toBe(false);
    expect(isSourcesLibraryV2Enabled({})).toBe(false);
    expect(resolveSourcesViewName()).toBe('SourceIngestionView');
  });

  it('routes to SourcesView only when the flag is ON', () => {
    expect(resolveSourcesViewName(true)).toBe('SourcesView');
    expect(resolveSourcesViewName({ sourcesLibraryV2: true })).toBe('SourcesView');
  });

  it('rolls back to SourceIngestionView when the kill switch is false', () => {
    expect(resolveSourcesViewName(false)).toBe('SourceIngestionView');
    expect(resolveSourcesViewName({ sourcesLibraryV2: false })).toBe('SourceIngestionView');
  });

  it('resolves without a global Node process', () => {
    const original = globalThis.process;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'process');
    Reflect.deleteProperty(globalThis, 'process');
    try {
      expect(isSourcesLibraryV2Enabled()).toBe(false);
      expect(isSourcesLibraryV2Enabled(false)).toBe(false);
      expect(resolveSourcesViewName(true)).toBe('SourcesView');
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'process', descriptor);
      else globalThis.process = original;
    }
  });

  it('parses the server env flag only from an explicit env record', () => {
    expect(parseSourcesLibraryV2Env({})).toBe(false);
    expect(parseSourcesLibraryV2Env({ OMNI_SOURCES_LIBRARY_V2: 'false' })).toBe(false);
    expect(parseSourcesLibraryV2Env({ OMNI_SOURCES_LIBRARY_V2: 'true' })).toBe(true);
  });

  it('keeps the client resolver free of process.env', () => {
    const source = readFileSync('src/lib/sources/featureFlags.ts', 'utf8');
    expect(source).not.toMatch(/process\.env/);
    expect(source).toMatch(/Task 11/);
  });
});
