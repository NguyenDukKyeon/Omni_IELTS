import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));

describe('P03 dependency policy', () => {
  it('does not add Dexie, yt-dlp, or unpinned new Sources packages before Task 0 verification', () => {
    expect(pkg.dependencies.dexie).toBeUndefined();
    expect(pkg.dependencies['yt-dlp']).toBeUndefined();
  });

  it('keeps youtube-transcript and wavesurfer unused by P03 extractors', () => {
    expect(pkg.dependencies['youtube-transcript']).toBeDefined();
    expect(pkg.dependencies['wavesurfer.js']).toBeDefined();
  });

  it('requires package-lock entries for any newly adopted extraction package', () => {
    for (const name of ['@mozilla/readability', 'dompurify', 'pdf-parse', 'mammoth', 'jsdom', 'pg', '@types/pg']) {
      if (pkg.dependencies?.[name] || pkg.devDependencies?.[name]) {
        expect(pkg.dependencies?.[name] || pkg.devDependencies?.[name]).toMatch(/^\d/);
        expect(lock.packages[`node_modules/${name}`] || lock.dependencies?.[name]).toBeTruthy();
      }
    }
  });
});
