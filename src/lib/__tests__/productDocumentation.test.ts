import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const requiredDocs = [
  'docs/product/PRODUCT_STRATEGY.md',
  'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md',
  'docs/product/CAPABILITY_REGISTRY.md',
  'docs/product/PRD.md',
  'docs/product/TRACEABILITY_MATRIX.md',
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
  'CAP-GLB-APP-SHELL',
  'CAP-GLB-LEARNER-PROFILE',
  'CAP-GLB-PLACEMENT-DIAGNOSTIC',
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

const CAPABILITY_HEADER =
  '| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |';

type CapabilityRow = {
  id: string;
  cells: string[];
  name: string;
  owner: string;
  priority: string;
  releasePhase: string;
  provider: string;
  privacy: string;
  status: string;
  prerequisites: string;
  consumes: string;
  produces: string;
  evidence: string;
};

function parseCapabilityRows(registry: string): CapabilityRow[] {
  const rows: CapabilityRow[] = [];
  for (const line of normalizeLineEndings(registry).split('\n')) {
    if (!/^\| CAP-[A-Z0-9-]+ \|/.test(line)) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    rows.push({
      id: cells[0] ?? '',
      cells,
      name: cells[1] ?? '',
      owner: cells[2] ?? '',
      priority: cells[5] ?? '',
      releasePhase: cells[6] ?? '',
      provider: cells[14] ?? '',
      privacy: cells[15] ?? '',
      status: cells[20] ?? '',
      prerequisites: cells[8] ?? '',
      consumes: cells[9] ?? '',
      produces: cells[10] ?? '',
      evidence: cells[17] ?? '',
    });
  }
  return rows;
}

function capabilityById(rows: CapabilityRow[], id: string) {
  return rows.find((row) => row.id === id);
}

function readPrd() {
  return readFileSync(resolve(root, 'docs/product/PRD.md'), 'utf8');
}

function headingBlock(document: string, heading: string) {
  const normalized = normalizeLineEndings(document);
  const start = normalized.search(new RegExp(`^### ${heading}\\b`, 'm'));
  if (start < 0) return '';
  const rest = normalized.slice(start);
  const next = rest.search(/\n### /);
  return next === -1 ? rest : rest.slice(0, next);
}

function sectionBlock(document: string, heading: string) {
  const normalized = normalizeLineEndings(document);
  const start = normalized.search(new RegExp(`^## ${heading}$`, 'm'));
  if (start < 0) return '';
  const rest = normalized.slice(start);
  const next = rest.search(/\n## /);
  return next === -1 ? rest : rest.slice(0, next);
}

const prdRequirementIds = Array.from(
  { length: 13 },
  (_, index) => `PRD-${String(index + 1).padStart(3, '0')}`,
);
const nfrRequirementIds = Array.from(
  { length: 5 },
  (_, index) => `NFR-${String(index + 1).padStart(3, '0')}`,
);
const prdLabels = [
  '**User outcome**',
  '**In-scope behaviour**',
  '**Explicit exclusions**',
  '**Linked capabilities**',
  '**Emitted evidence**',
  '**Metrics and guardrails**',
  '**Release acceptance summary**',
];
const nfrLabels = ['**Constraint**', '**Affected capabilities**', '**Verification summary**'];
const definedCapabilityIds = [
  ...coreCapabilities,
  ...advancedCapabilities,
  ...laterCapabilities,
  ...rejectedCapabilities,
];

const domainSpecOwners = [
  'platform',
  'sources',
  'vocabulary',
  'grammar_strategy',
  'media',
  'practice',
  'mock',
  'review_progress',
];

const architectureOwners = [
  'Identity & Privacy',
  'Source Ingestion',
  'Content & Provenance',
  'Curriculum',
  'Learning Activity',
  'Assessment',
  'Mastery & Scheduling',
  'Mistake Lifecycle',
  'Mock Exam',
  'AI Orchestration',
  'Voice & Media',
  'Progress & Analytics',
];

type TraceabilityRow = {
  id: string;
  capabilities: string;
  metrics: string;
  domain: string;
  architecture: string;
  status: string;
  cells: string[];
};

function parseTraceabilityRows(matrix: string): TraceabilityRow[] {
  const rows: TraceabilityRow[] = [];
  for (const line of normalizeLineEndings(matrix).split('\n')) {
    if (!/^\| (?:PRD|NFR)-/.test(line)) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    rows.push({
      id: cells[0] ?? '',
      capabilities: cells[1] ?? '',
      metrics: cells[2] ?? '',
      domain: cells[3] ?? '',
      architecture: cells[4] ?? '',
      status: cells[5] ?? '',
      cells,
    });
  }
  return rows;
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

  it('parses capability rows with portable column and enum invariants', () => {
    const registry = readRegistry();
    expect(registry).toContain(CAPABILITY_HEADER);
    const parsed = parseCapabilityRows(registry);
    const expectedIds = [
      ...coreCapabilities,
      ...advancedCapabilities,
      ...laterCapabilities,
      ...rejectedCapabilities,
    ];
    expect(parsed.map((row) => row.id).sort()).toEqual([...expectedIds].sort());
    expect(new Set(parsed.map((row) => row.id)).size).toBe(parsed.length);
    for (const row of parsed) {
      expect(row.cells).toHaveLength(21);
      for (const cell of row.cells) expect(cell.length).toBeGreaterThan(0);
      expect(['core', 'advanced', 'later', 'reject']).toContain(row.priority);
      expect(['beta', 'post_beta', 'research']).toContain(row.releasePhase);
      expect(['none', 'browser', 'official_ai', 'search', 'private_bridge']).toContain(
        row.provider,
      );
      expect([
        'public_metadata',
        'private_learning',
        'sensitive_audio',
        'credential',
      ]).toContain(row.privacy);
      expect(row.status).toBe('approved');
      if (row.priority === 'core') expect(row.provider).not.toBe('private_bridge');
    }
    const byPriority = (priority: string) =>
      parsed.filter((row) => row.priority === priority).map((row) => row.id).sort();
    expect(byPriority('core')).toEqual([...coreCapabilities].sort());
    expect(byPriority('advanced')).toEqual([...advancedCapabilities].sort());
    expect(byPriority('later')).toEqual([...laterCapabilities].sort());
    expect(byPriority('reject')).toEqual([...rejectedCapabilities].sort());
  });

  it('registers app shell, learner profile and placement diagnostic as core capabilities', () => {
    const registry = readRegistry();
    const parsed = parseCapabilityRows(registry);
    for (const id of [
      'CAP-GLB-APP-SHELL',
      'CAP-GLB-LEARNER-PROFILE',
      'CAP-GLB-PLACEMENT-DIAGNOSTIC',
    ]) {
      const row = capabilityById(parsed, id);
      expect(row?.priority).toBe('core');
      expect(row?.releasePhase).toBe('beta');
      expect(row?.owner).toBe('global');
    }
    for (const phrase of [
      'seven-module navigation',
      'Dashboard is not an eighth learning module',
      'no visible control without a real state/route/data transition',
      'current/target band personalises the experience but is not proof of improvement',
      'never claim an official band',
      'never convert CEFR one-to-one into IELTS',
      'must not fill a missing skill score using averages from other skills',
      'diagnostic baseline must remain distinguishable from Week 4 unseen reassessment',
    ]) {
      expect(registry).toContain(phrase);
    }
  });

  it('keeps source-grounded chat independent of web Search Grounding', () => {
    const registry = readRegistry();
    const row = capabilityById(parseCapabilityRows(registry), 'CAP-SRC-GROUNDED-CHAT');
    expect(row?.prerequisites).toContain('CAP-SRC-SELECTION');
    expect(row?.prerequisites).toContain('CAP-GLB-AI-ROUTER');
    expect(row?.prerequisites).not.toContain('CAP-GLB-SEARCH');
    expect(definitionRow(registry, 'CAP-SRC-GROUNDED-CHAT')).not.toContain('CAP-GLB-SEARCH');
    for (const phrase of [
      'Tra cứu dẫn chứng',
      'Default chat answers only from selected SourceVersions',
      'do not silently search the public web',
    ]) {
      expect(registry).toContain(phrase);
    }
  });

  it('keeps Artifact Studio as source-side handoff rather than destination ownership', () => {
    const registry = readRegistry();
    const studio = capabilityById(parseCapabilityRows(registry), 'CAP-SRC-ARTIFACT-STUDIO');
    expect(studio?.produces).toContain('ValidatedArtifactDraft');
    expect(studio?.produces).toContain('DestinationHandoff');
    expect(studio?.produces).not.toMatch(/Practice, Mock section/);
    expect(studio?.produces).not.toMatch(/\bfinal Practice\b/);
    expect(studio?.produces).not.toMatch(/\bfinal Mock\b/);
    expect(registry).toContain('destination modules own final persistence');
    expect(definitionRow(registry, 'CAP-MCK-BUILD')).toContain('ValidatedMockDraft');
    expect(definitionRow(registry, 'CAP-VOC-CAPTURE')).toMatch(
      /ValidatedVocabularyDraft|validated vocabulary draft/,
    );
    expect(registry).toContain('ValidatedPracticeDraft');
  });

  it('prevents Tutor output from creating learner mastery or progress evidence', () => {
    const registry = readRegistry();
    const tutor = capabilityById(parseCapabilityRows(registry), 'CAP-GLB-TUTOR');
    expect(tutor?.produces).toContain(
      'cited notes, source-backed facts, Idea Bank entries with provenance',
    );
    expect(tutor?.evidence).toContain(
      'no learner mastery/progress evidence from Tutor-generated output',
    );
    expect(tutor?.produces).not.toContain('saved evidence');
    expect(registry).not.toContain('Evidence can be saved with citation');
    expect(registry).toContain('Tutor output must not increment CompetencyState evidence counters');
  });

  it('defines every approved product and non-functional requirement', () => {
    const prd = readFileSync(
      resolve(root, 'docs/product/PRD.md'),
      'utf8',
    );
    for (let id = 1; id <= 13; id += 1) {
      expect(
        prd.match(
          new RegExp(
            `^### PRD-${String(id).padStart(3, '0')}\\b`,
            'gm',
          ),
        ),
      ).toHaveLength(1);
    }
    for (let id = 1; id <= 5; id += 1) {
      expect(
        prd.match(
          new RegExp(
            `^### NFR-${String(id).padStart(3, '0')}\\b`,
            'gm',
          ),
        ),
      ).toHaveLength(1);
    }
    expect(prd).toContain('Definition of Public Beta Success');
    expect(prd).toContain('Release Blocking Conditions');
  });

  it('gives every product and non-functional requirement its required labels', () => {
    const prd = readPrd();
    for (const id of prdRequirementIds) {
      const block = headingBlock(prd, id);
      expect(block.startsWith(`### ${id}`)).toBe(true);
      for (const label of prdLabels) expect(block).toContain(label);
    }
    for (const id of nfrRequirementIds) {
      const block = headingBlock(prd, id);
      expect(block.startsWith(`### ${id}`)).toBe(true);
      for (const label of nfrLabels) expect(block).toContain(label);
    }
  });

  it('references only registry-defined capabilities and does not define new ones', () => {
    const prd = normalizeLineEndings(readPrd());
    const referenced = [...prd.matchAll(/\b(CAP-[A-Z0-9-]+)\b/g)].map((match) => match[1]);
    expect(referenced.length).toBeGreaterThan(0);
    for (const id of referenced) {
      expect(definedCapabilityIds).toContain(id);
      expect(readRegistry().match(new RegExp(`^\\| ${id} \\|`, 'gm'))).toHaveLength(1);
    }
    expect(prd.match(/^\| (CAP-[A-Z0-9-]+) \|/gm)).toBeNull();
    expect(prd.match(/^### ((?:METRIC|GUARD)-[A-Z0-9-]+)\b/gm)).toBeNull();
  });

  it('references every approved metric and guardrail without redefining them', () => {
    const prd = readPrd();
    for (const id of [
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
    ]) {
      expect(prd).toContain(id);
    }
  });

  it('locks Public Beta performance targets and complete UI states', () => {
    const nfr001 = headingBlock(readPrd(), 'NFR-001');
    for (const phrase of [
      'usable shell p75 ≤ 2.5 seconds on a representative mobile connection',
      'cached module navigation ≤ 500 ms',
      'local autosave acknowledgement ≤ 300 ms',
      'visible interaction feedback ≤ 100 ms',
      'long-running work represented as resumable jobs with progress',
      'advanced modules/provider SDKs lazy-loaded',
    ]) {
      expect(nfr001).toContain(phrase);
    }
    const prd002 = headingBlock(readPrd(), 'PRD-002');
    expect(prd002).toContain('CAP-GLB-APP-SHELL');
    for (const phrase of [
      'seven-module navigation',
      'loading',
      'success',
      'empty',
      'degraded',
      'unavailable',
      'permission denied',
      'no decorative controls',
    ]) {
      expect(prd002).toContain(phrase);
    }
  });

  it('requires onboarding profile, source ownership, truthful AI and degraded continuity', () => {
    const prd = readPrd();
    const prd001 = headingBlock(prd, 'PRD-001');
    for (const id of [
      'CAP-GLB-IDENTITY',
      'CAP-GLB-APP-SHELL',
      'CAP-GLB-LEARNER-PROFILE',
      'CAP-GLB-PLACEMENT-DIAGNOSTIC',
      'CAP-GLB-EVIDENCE',
    ]) {
      expect(prd001).toContain(id);
    }
    const prd005 = headingBlock(prd, 'PRD-005');
    expect(prd005).toContain('destination handoff');
    expect(prd005).toContain('final destination persistence remains with Practice/Mock/Vocabulary/Tutor');
    expect(prd005).toContain('external web Search only on explicit action');
    const prd012 = headingBlock(prd, 'PRD-012');
    expect(prd012).toContain('cannot be a Public Beta or paid entitlement dependency');
    const prd013 = headingBlock(prd, 'PRD-013');
    expect(prd013).toContain('no fake completion');
    expect(prd013).toContain('honest unavailable state');
    expect(prd).toContain('AI estimated band — experimental');
    expect(prd).toContain('unavailable');
  });

  it('blocks Public Beta release on honesty, evidence, privacy and canary failures', () => {
    const prd = normalizeLineEndings(readPrd());
    const start = prd.search(/^## Release Blocking Conditions$/m);
    expect(start).toBeGreaterThan(-1);
    const rest = prd.slice(start);
    const next = rest.search(/\n## /);
    const blockers = next === -1 ? rest : rest.slice(0, next);
    for (const phrase of [
      'open P0/P1',
      'missing core UX contract',
      'missing evidence emission',
      'decorative/non-transitioning Beta control',
      'fake score/transcript/audio/citation/real-exam/mastery/progress',
      'invalid provenance or rights status',
      'missing owner RLS',
      'missing export/delete/hard-delete',
      'deterministic gate failure',
      'required live canary older than 24 hours or never passed',
      'accessibility failure',
      'cost/limit policy missing',
      'rollback flag missing',
      'public dependency on Private Web Bridge',
      'unsupported official/examiner-equivalent claim',
    ]) {
      expect(blockers).toContain(phrase);
    }
  });

  it('restores the complete shared evidence contract set', () => {
    const evidence = capabilityById(parseCapabilityRows(readRegistry()), 'CAP-GLB-EVIDENCE');
    expect(evidence?.consumes).toContain('LearningEvent, Attempt, Evaluation');
    expect(evidence?.produces).toContain(
      'EvidenceClass, SkillEvidence, CompetencyState, MistakeEvidence, MasteryUpdate, ProgressUpdate',
    );
    expect(evidence?.owner).toBe('global');
    expect(evidence?.priority).toBe('core');
    const registry = readRegistry();
    expect(registry).toContain(
      'unavailable/degraded provider output cannot create a valid mastery/progress update',
    );
    const prd003 = headingBlock(readPrd(), 'PRD-003');
    for (const contract of [
      'LearningEvent',
      'Attempt',
      'Evaluation',
      'SkillEvidence',
      'MistakeEvidence',
      'MasteryUpdate',
      'ProgressUpdate',
      'EvidenceClass',
      'CompetencyState',
    ]) {
      expect(prd003).toContain(contract);
    }
  });

  it('separates owned-contract journeys from learner mastery evidence', () => {
    const prd003 = headingBlock(readPrd(), 'PRD-003');
    expect(prd003).not.toContain(
      'Each of the seven modules can complete at least one evidence-emitting journey that updates CompetencyState or MistakeEvidence',
    );
    expect(prd003).toContain(
      'Sources import/chat/artifact orchestration does not directly create learner mastery',
    );
    expect(prd003).toContain('App Shell emits UX transition evidence, not learning mastery');
    const success = sectionBlock(readPrd(), 'Definition of Public Beta Success');
    expect(success).toContain(
      'all seven modules have at least one complete owned-contract journey',
    );
    expect(success).toContain(
      'all learning/assessment journeys that claim progress emit valid learner evidence',
    );
    expect(success).toContain('Sources and utility surfaces never fabricate learner mastery');
    expect(success).not.toContain(
      'all seven modules have at least one complete evidence-emitting journey',
    );
  });

  it('keeps Dictation usable without a microphone while Shadowing requires audio', () => {
    const prd008 = headingBlock(readPrd(), 'PRD-008');
    expect(prd008).toContain('Shadowing records real learner microphone audio');
    expect(prd008).toContain('Dictation does not require microphone permission');
    expect(prd008).toContain('must not disable Dictation');
    expect(prd008).not.toContain('shadow or dictate with a real microphone');
  });

  it('excludes learner notifications from Public Beta rather than only as a module owner', () => {
    const outOfScope = sectionBlock(readPrd(), 'Out of Scope and Rejected Capabilities');
    expect(outOfScope).toContain('learner push/email/browser notifications are post-beta');
    expect(outOfScope).toContain('Public Beta does not depend on background notification delivery');
    expect(outOfScope).not.toContain('Notifications as a learning-module owner');
  });

  it('treats Speaking realtime canary pass as necessary but not sufficient', () => {
    const outOfScope = sectionBlock(readPrd(), 'Out of Scope and Rejected Capabilities');
    expect(outOfScope).toContain('necessary but not sufficient');
    expect(outOfScope).toContain('explicit Capability Registry and PRD scope change');
    expect(outOfScope).toContain('an open or merged engineering PR cannot reclassify product scope');
  });

  it('keeps core MockBuild distinct from advanced Custom Mock authoring', () => {
    const prd010 = headingBlock(readPrd(), 'PRD-010');
    expect(prd010).toContain('Live Hub → Full Mock');
    expect(prd010).toContain('source-derived Mock');
    expect(prd010).toContain('CAP-MCK-CUSTOM');
    expect(prd010).toContain('must not disable core MockBuild');
  });

  it('maps every product and non-functional requirement exactly once', () => {
    const matrix = readFileSync(
      resolve(root, 'docs/product/TRACEABILITY_MATRIX.md'),
      'utf8',
    );

    for (const id of [...prdRequirementIds, ...nfrRequirementIds]) {
      expect(
        matrix.match(new RegExp(`^\\| ${id} \\|`, 'gm')),
      ).toHaveLength(1);
    }
  });

  it('parses the traceability matrix with portable columns, owners and core coverage', () => {
    const matrix = normalizeLineEndings(
      readFileSync(resolve(root, 'docs/product/TRACEABILITY_MATRIX.md'), 'utf8'),
    );
    const crlf = matrix.replace(/\n/g, '\r\n');
    const rows = parseTraceabilityRows(matrix);
    expect(parseTraceabilityRows(crlf)).toEqual(rows);
    expect(rows).toHaveLength(18);
    expect(rows.map((row) => row.id)).toEqual([
      ...prdRequirementIds,
      ...nfrRequirementIds,
    ]);
    const strategy = readFileSync(
      resolve(root, 'docs/product/PRODUCT_STRATEGY.md'),
      'utf8',
    );
    const definedMetrics = [
      ...strategy.matchAll(/^### ((?:METRIC|GUARD)-[A-Z0-9-]+)\b/gm),
    ].map((match) => match[1]);
    const coveredCore = new Set<string>();
    for (const row of rows) {
      expect(row.cells).toHaveLength(6);
      for (const cell of row.cells) expect(cell.length).toBeGreaterThan(0);
      const caps = row.capabilities.match(/CAP-[A-Z0-9-]+/g) ?? [];
      expect(caps.length).toBeGreaterThan(0);
      for (const id of caps) expect(definedCapabilityIds).toContain(id);
      const metrics = row.metrics.match(/(?:METRIC|GUARD)-[A-Z0-9-]+/g) ?? [];
      expect(metrics.length).toBeGreaterThan(0);
      for (const id of metrics) expect(definedMetrics).toContain(id);
      expect(domainSpecOwners).toContain(row.domain);
      expect(architectureOwners).toContain(row.architecture);
      expect(row.status).toBe('product_approved');
      for (const id of caps) {
        if (coreCapabilities.includes(id)) coveredCore.add(id);
      }
    }
    expect([...coveredCore].sort()).toEqual([...coreCapabilities].sort());
    expect(coveredCore.size).toBe(coreCapabilities.length);
    for (const id of [...advancedCapabilities, ...laterCapabilities, ...rejectedCapabilities]) {
      expect(coreCapabilities).not.toContain(id);
    }
  });
});
