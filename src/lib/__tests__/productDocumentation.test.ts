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

  it('locks the approved product strategy decisions', () => {
    const strategy = readFileSync(
      resolve(root, 'docs/product/PRODUCT_STRATEGY.md'),
      'utf8',
    );
    for (const phrase of [
      'IELTS-first comprehensive preparation platform',
      'Vietnam-first',
      'IELTS Academic-first',
      'Self-learner first',
      'Plateaued Intermediate',
      'Band 4.5–6.5',
      'Band 3.0–9.0',
      'Private Web Bridge',
    ]) {
      expect(strategy).toContain(phrase);
    }
  });

  it('defines the approved product metrics and guardrails once', () => {
    const strategy = readFileSync(
      resolve(root, 'docs/product/PRODUCT_STRATEGY.md'),
      'utf8',
    );
    const ids = [
      'METRIC-001',
      'METRIC-002',
      'METRIC-003',
      'METRIC-004',
      'METRIC-005',
      'METRIC-006',
      'GUARD-001',
      'GUARD-002',
      'GUARD-003',
      'GUARD-004',
    ];
    for (const id of ids) {
      expect(
        strategy.match(new RegExp(`^### ${id}\\b`, 'gm')),
      ).toHaveLength(1);
    }
  });
});
