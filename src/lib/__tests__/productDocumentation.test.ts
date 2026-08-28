import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const requiredDocs = [
  'docs/product/PRODUCT_STRATEGY.md',
  'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md',
  'docs/product/CAPABILITY_REGISTRY.md',
  'docs/product/PRD.md',
];

describe('product documentation contracts', () => {
  it('exposes a deterministic product documentation gate', () => {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    expect(pkg.scripts['check:product-docs']).toBe('tsx scripts/check-product-docs.ts');
  });

  it('reserves the approved product document paths', () => {
    for (const doc of requiredDocs) expect(existsSync(resolve(root, doc))).toBe(true);
  });
});
