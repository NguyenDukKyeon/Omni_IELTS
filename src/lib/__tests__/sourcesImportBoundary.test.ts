import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve('.');
const CLIENT_ENTRYPOINTS = [
  'src/types/sources.ts',
  'src/lib/sources/featureFlags.ts',
];
const FORBIDDEN = [
  'node:crypto',
  'jsdom',
  'pdf-parse',
  'mammoth',
  'src/lib/sources/extractors',
  'src/lib/sources/urlSafety',
  'src/lib/sources/contentHash',
];

function collectImports(entry: string): { file: string; specifiers: string[] }[] {
  const seen = new Set<string>();
  const out: { file: string; specifiers: string[] }[] = [];

  function walk(file: string) {
    const abs = resolve(ROOT, file);
    if (seen.has(abs) || !existsSync(abs)) return;
    seen.add(abs);
    const source = readFileSync(abs, 'utf8');
    const specifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
    out.push({ file, specifiers });
    for (const specifier of specifiers) {
      if (!specifier.startsWith('.')) continue;
      const resolved = specifier.endsWith('.ts') || specifier.endsWith('.tsx')
        ? resolve(dirname(abs), specifier)
        : [
          resolve(dirname(abs), `${specifier}.ts`),
          resolve(dirname(abs), `${specifier}.tsx`),
          resolve(dirname(abs), specifier, 'index.ts'),
        ].find((candidate) => existsSync(candidate));
      if (resolved) walk(resolved);
    }
  }

  walk(entry);
  return out;
}

describe('P03 browser/server import boundary', () => {
  it('keeps canonical Sources types free of Node-only imports', () => {
    const source = readFileSync(join(ROOT, 'src/types/sources.ts'), 'utf8');
    expect(source).not.toMatch(/node:crypto/);
    expect(source).not.toMatch(/from ['"]crypto['"]/);
    expect(source).not.toMatch(/\bcreateHash\b|\brandomUUID\b|\bcomputeContentHash\b/);
    expect(source).toMatch(/export (?:type|interface) SourceRecord/);
    expect(source).toMatch(/export (?:type|interface) SourceVersion/);
  });

  it('does not let browser-facing Sources modules import server extractors or Node hosts', () => {
    const graph = CLIENT_ENTRYPOINTS.flatMap(collectImports);
    const hits = graph.flatMap(({ file, specifiers }) => (
      specifiers
        .filter((specifier) => FORBIDDEN.some((forbidden) => specifier === forbidden || specifier.includes(forbidden) || specifier.startsWith(`${forbidden}/`)))
        .map((specifier) => `${file} -> ${specifier}`)
    ));
    expect(hits).toEqual([]);
  });
});
