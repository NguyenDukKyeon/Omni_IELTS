import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

describe('P04 Media Learning Room dependency policy', () => {
  it('does not install diff@7.0.0 during Batch A (deferred to Task 10)', () => {
    expect(pkg.dependencies.diff).toBeUndefined();
    expect(pkg.devDependencies?.diff).toBeUndefined();
  });

  it('retains approved existing media dependencies with expected versions', () => {
    expect(pkg.dependencies['wavesurfer.js']).toBe('^7.12.11');
    expect(pkg.dependencies['@ricky0123/vad-web']).toBe('0.0.30');
    expect(pkg.dependencies['youtube-transcript']).toBe('^1.3.1');
    expect(pkg.dependencies.zod).toBe('^4.4.3');
    expect(pkg.dependencies.xstate).toBe('^5.32.5');
  });

  it('verifies baseline wordDiff utility exists as fallback for dictation', () => {
    expect(existsSync('src/lib/wordDiff.ts')).toBe(true);
  });
});
