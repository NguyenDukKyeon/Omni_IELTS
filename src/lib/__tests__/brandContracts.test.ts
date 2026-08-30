import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../colorContrast';
import { getOmniNodeCenters, OMNI_BRAND } from '../../brand/omniBrand';

describe('OMNI brand contracts', () => {
  it('uses exactly seven equal nodes around one centre', () => {
    const nodes = getOmniNodeCenters();
    expect(nodes).toHaveLength(7);
    const radii = nodes.map(({ x, y }) =>
      Math.hypot(x - OMNI_BRAND.markCenter, y - OMNI_BRAND.markCenter),
    );
    expect(new Set(radii.map((value) => value.toFixed(4))).size).toBe(1);
  });

  it('uses an AA-safe red for white-text primary actions', () => {
    expect(contrastRatio('#E31B23', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#EE1D23', '#FFFFFF')).toBeLessThan(4.5);
  });

  it('uses cool neutral application surfaces instead of a beige app ground', () => {
    const tokens = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
    const shell = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

    expect(tokens).toContain('--omni-ground: #f5f7fa;');
    expect(tokens).toContain('--omni-border: #dce3ea;');
    expect(tokens).not.toContain('--omni-ground: #faf7f2;');
    expect(shell).not.toContain('--omni-shell-border: #e6e1d9;');
  });

  it('ships a path-only wordmark and no embedded raster', () => {
    const svg = readFileSync(
      resolve(process.cwd(), 'src/assets/brand/omni-wordmark.svg'),
      'utf8',
    );
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<text');
    expect(svg).not.toMatch(/data:image\//);
  });

  it('locks the approved name and descriptor', () => {
    expect(OMNI_BRAND.name).toBe('OMNI');
    expect(OMNI_BRAND.descriptor).toBe('IELTS PREPARATION');
  });

  it('keeps both production vectors free of disallowed rendering features', () => {
    for (const asset of ['omni-mark.svg', 'omni-wordmark.svg']) {
      const svg = readFileSync(resolve(process.cwd(), 'src/assets/brand', asset), 'utf8');
      expect(svg).toContain('viewBox');
      expect(svg).not.toMatch(
        /<text|<image|data:image|linearGradient|radialGradient|filter|mask|animation/i,
      );
    }
  });

  it('uses seven equal node elements in the production mark', () => {
    const svg = readFileSync(
      resolve(process.cwd(), 'src/assets/brand/omni-mark.svg'),
      'utf8',
    );
    const nodes = [...svg.matchAll(/<circle\b[^>]*>/g)].map((match) => match[0]);
    expect(nodes).toHaveLength(7);
    expect(new Set(nodes.map((node) => node.match(/\br="([^"]+)"/)?.[1])).size).toBe(1);
  });
});
