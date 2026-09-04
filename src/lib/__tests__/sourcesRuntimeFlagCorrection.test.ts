import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getClientSourcesLibraryV2Flag,
} from '../sources/featureFlags';
import { injectSourcesRuntimeFlag } from '../sources/featureFlags.server';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

describe('single deploy-level Sources runtime flag', () => {
  it('uses the server-injected browser boolean for both ON and OFF', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { __OMNI_FLAGS__: { sourcesLibraryV2: true } },
    });
    expect(getClientSourcesLibraryV2Flag()).toBe(true);

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { __OMNI_FLAGS__: { sourcesLibraryV2: false } },
    });
    expect(getClientSourcesLibraryV2Flag()).toBe(false);
  });

  it('fails closed when the runtime injection is absent', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    expect(getClientSourcesLibraryV2Flag()).toBe(false);
  });

  it('injects only the same JSON boolean that the server parsed', () => {
    const html = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
    const enabled = injectSourcesRuntimeFlag(html, true);
    const disabled = injectSourcesRuntimeFlag(html, false);

    expect(enabled).toContain('window.__OMNI_FLAGS__=Object.freeze({"sourcesLibraryV2":true})');
    expect(disabled).toContain('window.__OMNI_FLAGS__=Object.freeze({"sourcesLibraryV2":false})');
    expect(injectSourcesRuntimeFlag(enabled, false)).toBe(enabled);
  });

  it('does not leave a manually synced Vite flag in browser code or env documentation', () => {
    expect(readFileSync('src/lib/sources/featureFlags.ts', 'utf8')).not.toMatch(/VITE_OMNI_SOURCES_LIBRARY_V2/);
    expect(readFileSync('.env.example', 'utf8')).not.toMatch(/VITE_OMNI_SOURCES_LIBRARY_V2/);
  });
});
