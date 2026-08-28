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

const normalizeLineEndings = (value: string) =>
  value.replace(/\r\n?/g, '\n');

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

  it('counts only completed learning loops in METRIC-006', () => {
    const strategy = readFileSync(
      resolve(root, 'docs/product/PRODUCT_STRATEGY.md'),
      'utf8',
    );
    const start = strategy.indexOf('### METRIC-006');
    const end = strategy.indexOf('## Product Risks and Guardrails', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const metric = strategy.slice(start, end);
    expect(metric).toContain('declared completion and evidence boundary');
    expect(metric).toContain('excluded from the completed-loop denominator');
    expect(metric).not.toContain('or an explicit honest stop');
  });

  it('defines the shared learning and assessment contracts', () => {
    const framework = readFileSync(
      resolve(root, 'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md'),
      'utf8',
    );
    for (const phrase of [
      'Diagnose',
      'Controlled Practice',
      'Independent Assessment',
      'unseen → introduced → practising → stable → mastered → relapsed',
      'Assisted Performance',
      'Transfer',
      'Independent Assessment Evidence',
      'AI estimated band',
      'unavailable',
    ]) {
      expect(framework).toContain(phrase);
    }
  });

  it('preserves the canonical CompetencyState contract', () => {
    const framework = readFileSync(
      resolve(root, 'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md'),
      'utf8',
    );
    const startToken = 'interface CompetencyState {';
    const start = framework.indexOf(startToken);
    expect(start).toBeGreaterThan(-1);
    let depth = 0;
    let end = -1;
    for (let i = start + startToken.length - 1; i < framework.length; i += 1) {
      if (framework[i] === '{') depth += 1;
      if (framework[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    expect(end).toBeGreaterThan(start);
    const contract = normalizeLineEndings(
      framework.slice(start, end + 1),
    );
    expect(contract).toContain(`interface CompetencyState {
  competencyId: string;
  state:
    | 'unseen'
    | 'introduced'
    | 'practising'
    | 'stable'
    | 'mastered'
    | 'relapsed';
  estimatedMastery: number;
  uncertainty: number;
  evidenceCount: number;
  independentEvidenceCount: number;
  transferEvidenceCount: number;
  lastEvidenceAt?: string;
  nextReviewAt?: string;
  recurringMistakeIds: string[];
  prerequisiteGaps: string[];
}`);
    for (const field of [
      'competencyId',
      'state:',
      'estimatedMastery',
      'uncertainty',
      'evidenceCount',
      'independentEvidenceCount',
      'transferEvidenceCount',
      'lastEvidenceAt',
      'nextReviewAt',
      'recurringMistakeIds',
      'prerequisiteGaps',
    ]) {
      expect(contract).toContain(field);
    }
    for (const replacement of [
      'masteryState',
      'confidence',
      'evidenceSummary',
      'lastDemonstratedAt',
      'learnerId',
      'relapseCount',
      'updatedAt',
    ]) {
      expect(contract).not.toContain(replacement);
    }
  });

  it('defines solo-founder AI scoring calibration and periodic human review', () => {
    const framework = readFileSync(
      resolve(root, 'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md'),
      'utf8',
    );
    expect(framework).toMatch(/^## AI Scoring Calibration and Periodic Human Review$/m);
    expect(framework).not.toMatch(/^## Human Calibration$/m);
    for (const phrase of [
      'official_anchor',
      'community_weak_label',
      'founder_reviewed',
      'external_expert_reviewed',
      'AI estimated band — experimental',
      'not human-in-the-loop grading for every learner submission',
      'Public Beta does not require a permanent teacher, examiner, or reviewer',
    ]) {
      expect(framework).toContain(phrase);
    }
  });

  it('separates learning-history archive from privacy hard-delete', () => {
    const framework = readFileSync(
      resolve(root, 'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md'),
      'utf8',
    );
    expect(framework).not.toContain(
      'learner deletion request handling keeps minimum lineage',
    );
    for (const phrase of [
      'privacy hard-delete workflow',
      'overrides learning-history retention',
      'both mastered and removed from the active review queue',
    ]) {
      expect(framework).toContain(phrase);
    }
  });

  it('normalizes CRLF and lone CR before comparing documentation contracts', () => {
    expect(normalizeLineEndings('a\r\nb\rc')).toBe('a\nb\nc');
  });
});
