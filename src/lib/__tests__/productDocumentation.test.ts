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

const coreCapabilities = [
  'CAP-SRC-WORKSPACE',
  'CAP-SRC-IMPORT-BATCH',
  'CAP-SRC-EXTRACT',
  'CAP-SRC-VERSION',
  'CAP-SRC-PROVENANCE',
  'CAP-SRC-SELECTION',
  'CAP-SRC-GROUNDED-CHAT',
  'CAP-SRC-ARTIFACT-STUDIO',
  'CAP-SRC-LIVE-HUB',
  'CAP-VOC-CAPTURE',
  'CAP-VOC-DECK',
  'CAP-VOC-FSRS',
  'CAP-VOC-RETRIEVAL',
  'CAP-VOC-MASTERY',
  'CAP-GRM-CURRICULUM',
  'CAP-GRM-DIAGNOSIS',
  'CAP-GRM-PRACTICE',
  'CAP-STR-LESSONS',
  'CAP-STR-TRANSFER',
  'CAP-MED-IMPORT',
  'CAP-MED-TRANSCRIPT',
  'CAP-MED-PLAYER',
  'CAP-MED-SHADOWING',
  'CAP-MED-DICTATION',
  'CAP-MED-RESUME',
  'CAP-PRC-READING',
  'CAP-PRC-LISTENING',
  'CAP-PRC-WRITING',
  'CAP-PRC-SPEAKING',
  'CAP-PRC-LIVE-HUB-CONVERT',
  'CAP-MCK-BUILD',
  'CAP-MCK-VALIDATE',
  'CAP-MCK-EXAM',
  'CAP-MCK-RESUME',
  'CAP-MCK-REPORT',
  'CAP-MCK-LIVE-HUB-CONVERT',
  'CAP-REV-MISTAKE',
  'CAP-REV-DUE',
  'CAP-REV-MASTERY',
  'CAP-REV-RELAPSE',
  'CAP-REV-PROGRESS',
  'CAP-REV-RECOMMEND',
  'CAP-GLB-AI-ROUTER',
  'CAP-GLB-TUTOR',
  'CAP-GLB-VOICE',
  'CAP-GLB-EVIDENCE',
  'CAP-GLB-IDENTITY',
  'CAP-GLB-SEARCH',
  'CAP-GLB-SCORING-CALIBRATION',
  'CAP-GLB-CONTENT-QUALITY',
];

const advancedCapabilities = [
  'CAP-SRC-HOSTED-OCR',
  'CAP-PRC-SPEAKING-REALTIME',
  'CAP-MCK-CUSTOM',
  'CAP-GLB-DEEP-RESEARCH',
  'CAP-GLB-PRONUNCIATION-ADVANCED',
  'CAP-GLB-PRIVATE-WEB-BRIDGE',
];

const laterCapabilities = [
  'CAP-GLB-GENERAL-TRAINING',
  'CAP-GLB-TEACHER-CLASSROOM',
  'CAP-GLB-LOCALISATION',
  'CAP-SRC-COLLABORATION',
  'CAP-SRC-PUBLIC-MARKETPLACE',
  'CAP-GLB-NOTIFICATIONS',
];

const rejectedCapabilities = [
  'CAP-GLB-FAKE-SCORING',
  'CAP-SRC-UNCITED-REAL-EXAM',
  'CAP-GLB-TRANSCRIPT-ONLY-PRONUNCIATION',
  'CAP-REV-XP-FOR-REVEAL',
  'CAP-GLB-DECORATIVE-CONTROLS',
  'CAP-GLB-PUBLIC-SHARED-WEB-BRIDGE',
];

const moduleOwners = [
  'sources',
  'vocabulary',
  'grammar_strategy',
  'media',
  'practice',
  'mock',
  'review_progress',
];

function readRegistry() {
  return readFileSync(resolve(root, 'docs/product/CAPABILITY_REGISTRY.md'), 'utf8');
}

function definitionRow(registry: string, id: string) {
  return registry.match(new RegExp(`^\\| ${id} \\|.*$`, 'm'))?.[0] ?? '';
}

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

  it('registers every approved core capability as an owned table row', () => {
    const registry = readRegistry();
    for (const id of coreCapabilities) {
      expect(registry.match(new RegExp(`^\\| ${id} \\|`, 'gm'))).toHaveLength(1);
    }
  });

  it('records module and global owners for the capability registry', () => {
    const registry = readRegistry();
    for (const owner of moduleOwners) {
      expect(registry).toContain(`\`${owner}\``);
    }
    for (const service of [
      'AI Router',
      'AI Tutor',
      'Voice Library',
      'Learning Evidence Engine',
      'Identity & Privacy',
      'Search Grounding',
      'AI Scoring Calibration',
      'Generated Content Quality Gate',
      'Profile/preferences',
      'Notifications',
    ]) {
      expect(registry).toContain(service);
    }
    expect(registry).toContain(
      'Dashboard and Daily Coach are recommendation/navigation surfaces',
    );
  });

  it('registers advanced, later and rejected capability families', () => {
    const registry = readRegistry();
    expect(registry).toMatch(/^## Advanced Capabilities$/m);
    expect(registry).toMatch(/^## Later Capabilities$/m);
    expect(registry).toMatch(/^## Rejected Capabilities$/m);
    for (const id of [
      ...advancedCapabilities,
      ...laterCapabilities,
      ...rejectedCapabilities,
    ]) {
      expect(registry.match(new RegExp(`^\\| ${id} \\|`, 'gm'))).toHaveLength(1);
    }
  });

  it('preserves the canonical ProductCapability contract', () => {
    const registry = normalizeLineEndings(readRegistry());
    const startToken = 'interface ProductCapability {';
    const start = registry.indexOf(startToken);
    expect(start).toBeGreaterThan(-1);
    let depth = 0;
    let end = -1;
    for (let i = start + startToken.length - 1; i < registry.length; i += 1) {
      if (registry[i] === '{') depth += 1;
      if (registry[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    expect(end).toBeGreaterThan(start);
    const contract = registry.slice(start, end + 1);
    expect(contract).toContain(`interface ProductCapability {
  id: string;
  name: string;
  owner:
    | 'sources'
    | 'vocabulary'
    | 'grammar_strategy'
    | 'media'
    | 'practice'
    | 'mock'
    | 'review_progress'
    | 'global';
  learnerJob: string;
  targetSegments: string[];
  targetBandRange: [number, number];
  priority: 'core' | 'advanced' | 'later' | 'reject';
  releasePhase: 'beta' | 'post_beta' | 'research';
  learningMechanism:
    | 'instruction'
    | 'retrieval'
    | 'production'
    | 'feedback'
    | 'spacing'
    | 'transfer'
    | 'assessment'
    | 'utility';
  prerequisites: string[];
  consumes: string[];
  produces: string[];
  stateMachine?: string;
  apiOwner?: string;
  dataOwner: string;
  providerDependency:
    | 'none'
    | 'browser'
    | 'official_ai'
    | 'search'
    | 'private_bridge';
  privacyClass:
    | 'public_metadata'
    | 'private_learning'
    | 'sensitive_audio'
    | 'credential';
  successMetric: string;
  evidenceRequired: string[];
  uxFlowContractId: string;
  acceptanceTestIds: string[];
  status:
    | 'discovered'
    | 'approved'
    | 'specified'
    | 'implemented'
    | 'deterministic_verified'
    | 'live_verified'
    | 'released';
}`);
  });

  it('keeps core public capabilities independent of private_bridge', () => {
    const registry = readRegistry();
    for (const id of coreCapabilities) {
      expect(definitionRow(registry, id)).not.toContain('private_bridge');
    }
  });

  it('classifies Private Web Bridge as advanced research only', () => {
    const registry = readRegistry();
    const row = definitionRow(registry, 'CAP-GLB-PRIVATE-WEB-BRIDGE');
    expect(row).toContain('CAP-GLB-PRIVATE-WEB-BRIDGE');
    expect(row).toContain('advanced');
    expect(row).toContain('research');
    expect(row).toContain('private_bridge');
    expect(row).toContain('credential');
    expect(registry).toContain('founder/invite-only');
    expect(registry).not.toContain(
      'public entitlement of Private Web Bridge',
    );
  });

  it('defines generated content quality and scoring calibration contracts', () => {
    const registry = readRegistry();
    expect(definitionRow(registry, 'CAP-GLB-SCORING-CALIBRATION')).toContain(
      'CAP-GLB-SCORING-CALIBRATION',
    );
    expect(definitionRow(registry, 'CAP-GLB-CONTENT-QUALITY')).toContain(
      'CAP-GLB-CONTENT-QUALITY',
    );
    for (const phrase of [
      'official_anchor',
      'community_weak_label',
      'AI estimated band — experimental',
      'answerability',
      'answer support',
      'ambiguity',
      'required item/part counts',
      'audio completeness',
      'provenance',
      'bounded repair',
      'rejected/unavailable',
    ]) {
      expect(registry).toContain(phrase);
    }
  });

  it('documents open-source dependencies without promoting them to capabilities', () => {
    const registry = readRegistry();
    expect(registry).toMatch(/^## Open-source Ownership Boundaries$/m);
    for (const dependency of [
      'firecrawl/anydoc',
      'yt-dlp',
      'Mozilla Readability',
      'DOMPurify',
      'Wavesurfer.js',
      'jsdiff',
      'ts-fsrs',
      'XState',
      '@ricky0123/vad-web',
      'Dexie.js',
      'pgvector',
    ]) {
      expect(registry).toContain(dependency);
      expect(registry.match(new RegExp(`^\\| CAP-[A-Z0-9-]*${dependency} \\|`, 'gm'))).toBeNull();
    }
  });

  it('does not define PRD, NFR, METRIC or GUARD identifiers', () => {
    const registry = readRegistry();
    expect(registry.match(/^### ((?:PRD|NFR|METRIC|GUARD)-[A-Z0-9-]+)\b/gm)).toBeNull();
    expect(registry.match(/^\| ((?:PRD|NFR|METRIC|GUARD)-[A-Z0-9-]+) \|/gm)).toBeNull();
  });
});
