# Omni IELTS Product Documentation Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the approved, traceable product-documentation foundation that turns the rebuild design into Product Strategy, Learning and Assessment Framework, Capability Registry, and PRD source-of-truth documents.

**Architecture:** The approved rebuild design remains the immutable decision baseline. Human-readable Markdown documents own product intent, while a lightweight TypeScript checker enforces required sections, stable IDs, uniqueness, cross-document references, and absence of unresolved placeholder language. Domain SPEC and system Architecture documents are deliberately excluded from this plan and receive separate plans only after the PRD is approved.

**Tech Stack:** Markdown, TypeScript 5.8, Node.js 22+, Vitest 3, existing npm/CI scripts.

**Spec:** `docs/superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md`

## Global Constraints

- Product identity is IELTS-first comprehensive preparation with adaptive English Foundation.
- Public Beta is Vietnam-first, Vietnamese-English bilingual, IELTS Academic-first, and self-learner-first.
- Primary Beta segment is Plateaued Intermediate, typically Band 5.0–5.5, within a 4.5–6.5 pilot cohort.
- Long-term architecture supports distinct Band 3.0–4.5, 4.5–6.5, 6.5–8.0, and 8.0–9.0 tracks; one curriculum cannot be stretched by changing `targetBand`.
- Navigation remains module-centric with seven modules: Sources & Library, Vocabulary, Grammar & Strategy, Media Lab, IELTS Practice, IELTS Mock, Review & Progress.
- Private Web Bridge and Sub2API remain founder/invite-only experiments and cannot be a public or paid-tier dependency.
- Product claims cannot fabricate or overstate band, transcript, pronunciation, pause, citation, provenance, real-exam status, mastery, or improvement.
- AI output cannot become product evidence without schema/quality validation and a declared evidence class.
- Learning success is measured through independent subskill reassessment, not XP, streak, time-on-app, or activity count.
- The current React/Vite/Express/Supabase architecture is migrated incrementally; this plan does not author production feature code.
- Every commit uses Conventional Commits, avoids force-push, and leaves `main` untouched until its review and verification gates pass.

---

### Task 1: Establish product-documentation conventions and automated validation

**Files:**
- Create: `docs/product/README.md`
- Create: `scripts/check-product-docs.ts`
- Create: `src/lib/__tests__/productDocumentation.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Approved decisions from `docs/superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md`.
- Produces: `npm run check:product-docs`, stable document paths, stable ID conventions, and reusable validation helpers for later tasks.

- [ ] **Step 1: Write the failing documentation-contract test**

Create `src/lib/__tests__/productDocumentation.test.ts` with these exact initial assertions:

```ts
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
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts
```

Expected: FAIL because `check:product-docs` and the four approved documents do not exist.

- [ ] **Step 3: Add the documentation script entry and explicit scaffold documents**

Add to `package.json`:

```json
"check:product-docs": "tsx scripts/check-product-docs.ts"
```

Create each required Markdown file with its exact H1 title, `Status: Scaffold — not approved for implementation`, a link to the approved design, a one-paragraph purpose statement, and the exact top-level section list assigned by Tasks 2–5. The scaffold status prevents incomplete documents from being mistaken for approved requirements.

- [ ] **Step 4: Implement the deterministic checker**

Create `scripts/check-product-docs.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const docs = [
  'docs/product/PRODUCT_STRATEGY.md',
  'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md',
  'docs/product/CAPABILITY_REGISTRY.md',
  'docs/product/PRD.md',
];
const forbidden = [
  /\bTBD\b/i,
  /\bTODO\b/i,
  /implement later/i,
  /fill in/i,
  /appropriate error handling/i,
];
const owner = new Map<string, string>();
const issues: string[] = [];

for (const path of docs) {
  const content = readFileSync(resolve(root, path), 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(content)) issues.push(`${path} contains forbidden placeholder language: ${pattern}`);
  }
}

const definitionPatterns = [
  {
    path: 'docs/product/PRODUCT_STRATEGY.md',
    pattern: /^### ((?:METRIC|GUARD)-[A-Z0-9-]+)\b/gm,
  },
  {
    path: 'docs/product/CAPABILITY_REGISTRY.md',
    pattern: /^\| (CAP-[A-Z0-9-]+) \|/gm,
  },
  {
    path: 'docs/product/PRD.md',
    pattern: /^### ((?:PRD|NFR)-[A-Z0-9-]+)\b/gm,
  },
];

for (const definition of definitionPatterns) {
  const content = readFileSync(resolve(root, definition.path), 'utf8');
  for (const match of content.matchAll(definition.pattern)) {
    const id = match[1];
    const previous = owner.get(id);
    if (previous) issues.push(`${id} is defined more than once (${previous}, ${definition.path})`);
    else owner.set(id, definition.path);
  }
}

if (issues.length) {
  console.error(`Product documentation gate failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Product documentation gate passed: ${docs.length} documents, ${owner.size} stable IDs.`);
```

- [ ] **Step 5: Document source-of-truth and ID conventions**

Create `docs/product/README.md` with:

```markdown
# Omni IELTS Product Documentation

The approved rebuild design is the decision baseline. Product Strategy defines market and outcomes; the Learning Framework defines pedagogy and evidence; the Capability Registry defines ownership; the PRD defines release requirements. Domain SPEC and Architecture documents may refine implementation but cannot silently contradict approved product decisions.

## Stable IDs

- `PRD-001`: functional product requirement
- `NFR-001`: non-functional requirement
- `CAP-SRC-001`: owned product capability
- `METRIC-001`: success metric
- `GUARD-001`: safety or trust guardrail

An ID is defined in one document and referenced elsewhere with a Markdown link. Renaming an approved ID requires an explicit migration entry.
```

- [ ] **Step 6: Commit the documentation convention scaffolding**

Run:

```bash
git add docs/product package.json scripts/check-product-docs.ts src/lib/__tests__/productDocumentation.test.ts
git commit -m "docs: establish product documentation contracts"
```

---

### Task 2: Author `PRODUCT_STRATEGY.md`

**Files:**
- Create: `docs/product/PRODUCT_STRATEGY.md`
- Modify: `src/lib/__tests__/productDocumentation.test.ts`

**Interfaces:**
- Consumes: Sections 2–4, 10–12, 14, and 18 of the approved design.
- Produces: Locked market, persona, positioning, non-goals, provider policy, product metrics, and Beta scope consumed by the Learning Framework, Capability Registry, and PRD.

- [ ] **Step 1: Extend the failing test with required strategy decisions**

Add:

```ts
it('locks the approved product strategy decisions', () => {
  const strategy = readFileSync(resolve(root, 'docs/product/PRODUCT_STRATEGY.md'), 'utf8');
  for (const phrase of [
    'IELTS-first comprehensive preparation platform',
    'Vietnam-first',
    'IELTS Academic-first',
    'Self-learner first',
    'Plateaued Intermediate',
    'Band 4.5–6.5',
    'Band 3.0–9.0',
    'Private Web Bridge',
  ]) expect(strategy).toContain(phrase);
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts -t "locks the approved product strategy"
```

Expected: FAIL because the title-only document does not contain the locked decisions.

- [ ] **Step 3: Write the strategy document with exact sections**

`PRODUCT_STRATEGY.md` must include:

```markdown
# Omni IELTS Product Strategy

## Product Thesis
## Vision
## Primary Market and Test Type
## Primary Persona
## Adjacent and Long-term Segments
## Jobs to be Done
## Value Proposition
## Product Differentiator
## Public Beta Scope
## Non-goals
## AI and Provider Policy
## Private Web Bridge and Sub2API Boundary
## Open-source Adoption Principle
## North-star and Supporting Metrics
## Product Risks and Guardrails
## Decision Log
```

The prose must explicitly state that Beta validates Band 4.5–6.5 while separate adaptive tracks form the long-term Band 3.0–9.0 architecture. It must distinguish an IELTS preparation platform from a complete General English platform and state that paid Web Bridge sharing is outside approved scope.

- [ ] **Step 4: Add the initial metric IDs to the strategy**

Define each item as an H3 heading (`### METRIC-001 — ...` or `### GUARD-001 — ...`) so the checker distinguishes definitions from cross-document references. Define exactly:

```text
METRIC-001 Independent target-subskill improvement after four weeks
METRIC-002 Target mistake recurrence rate
METRIC-003 Unassisted transfer accuracy
METRIC-004 Feedback-to-follow-up-drill conversion
METRIC-005 D7 learner retention
METRIC-006 Cost per completed learning loop
GUARD-001 Fabricated learning/assessment data incidents
GUARD-002 Secret or privacy incidents
GUARD-003 Unsupported official/real-exam claims
GUARD-004 Public dependency on Private Web Bridge
```

- [ ] **Step 5: Run the strategy and documentation gates**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts
npm run check:product-docs
```

Expected: strategy assertions and the current documentation contract pass; later tasks add their own failing assertions before populating each remaining document.

- [ ] **Step 6: Commit the approved strategy document**

Run:

```bash
git add docs/product/PRODUCT_STRATEGY.md src/lib/__tests__/productDocumentation.test.ts
git commit -m "docs: define Omni IELTS product strategy"
```

---

### Task 3: Author `LEARNING_AND_ASSESSMENT_FRAMEWORK.md`

**Files:**
- Create: `docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md`
- Modify: `src/lib/__tests__/productDocumentation.test.ts`

**Interfaces:**
- Consumes: Product Strategy persona/JTBD and Sections 5, 10–12 of the approved design.
- Produces: Competency, mastery, evidence, mistake, feedback, recommendation, assessment, and efficacy-pilot rules consumed by every capability and PRD requirement.

- [ ] **Step 1: Write failing framework assertions**

Add:

```ts
it('defines the shared learning and assessment contracts', () => {
  const framework = readFileSync(resolve(root, 'docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md'), 'utf8');
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
  ]) expect(framework).toContain(phrase);
});
```

- [ ] **Step 2: Verify the expected test failure**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts -t "shared learning and assessment"
```

Expected: FAIL because the framework has not been authored.

- [ ] **Step 3: Write the framework sections**

Use this exact structure:

```markdown
# Omni IELTS Learning and Assessment Framework

## Purpose and Evidence Principles
## Shared Learning Loop
## Competency Graph
## Track-specific Progression from Band 3.0 to 9.0
## Mastery Lifecycle
## Evidence Hierarchy
## CompetencyState Contract
## MistakeEvidence Contract
## Feedback Prioritisation by Segment
## Explainable Recommendation Rules
## Placement Diagnostic
## Formative Assessment
## Skill Checks
## Mini and Full Mock Evidence
## Writing and Speaking AI Estimate Policy
## Human Calibration
## Progress Claims
## Four-week Efficacy Pilot
## Forbidden Learning Claims
```

Include the exact learner loop, competency tree, mastery states, evidence ordering, `CompetencyState`, `MistakeEvidence`, and assessment labels from the approved design. The framework must state that CEFR and IELTS are not treated as exact one-to-one conversions.

- [ ] **Step 4: Define assessment evidence classes**

Add this canonical set:

```ts
type EvidenceClass =
  | 'exposure'
  | 'assisted_performance'
  | 'unassisted_retrieval'
  | 'independent_production'
  | 'transfer'
  | 'independent_assessment';
```

Define that only repeated unassisted and transfer/independent evidence can move a competency to `mastered`.

- [ ] **Step 5: Add the truthfulness rules**

The framework must explicitly prohibit mastery or progress claims from answer reveal, copied model answers, AI-written responses, repeated known tests, empty audio, missing timestamps, or unsupported grader output.

- [ ] **Step 6: Run the targeted and documentation gates**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts
npm run check:product-docs
```

Expected: strategy and framework assertions pass; later tasks add the remaining contracts before populating their documents.

- [ ] **Step 7: Commit the learning and assessment framework**

Run:

```bash
git add docs/product/LEARNING_AND_ASSESSMENT_FRAMEWORK.md src/lib/__tests__/productDocumentation.test.ts
git commit -m "docs: define learning and assessment framework"
```

---

### Task 4: Author the owned `CAPABILITY_REGISTRY.md`

**Files:**
- Create: `docs/product/CAPABILITY_REGISTRY.md`
- Modify: `src/lib/__tests__/productDocumentation.test.ts`

**Interfaces:**
- Consumes: Product Strategy, Learning Framework, and Sections 6–9 and 15 of the approved design.
- Produces: Stable capability ownership and release classification consumed by PRD requirements and later domain SPEC plans.

- [ ] **Step 1: Add failing assertions for module owners and core capabilities**

Define the required initial IDs in the test:

```ts
const coreCapabilities = [
  'CAP-SRC-WORKSPACE', 'CAP-SRC-IMPORT-BATCH', 'CAP-SRC-VERSION',
  'CAP-SRC-PROVENANCE', 'CAP-SRC-SELECTION', 'CAP-SRC-LIVE-HUB',
  'CAP-VOC-CAPTURE', 'CAP-VOC-DECK', 'CAP-VOC-FSRS',
  'CAP-VOC-RETRIEVAL', 'CAP-VOC-MASTERY',
  'CAP-GRM-CURRICULUM', 'CAP-GRM-DIAGNOSIS', 'CAP-GRM-PRACTICE',
  'CAP-STR-LESSONS', 'CAP-STR-TRANSFER',
  'CAP-MED-IMPORT', 'CAP-MED-TRANSCRIPT', 'CAP-MED-PLAYER',
  'CAP-MED-SHADOWING', 'CAP-MED-DICTATION', 'CAP-MED-RESUME',
  'CAP-PRC-READING', 'CAP-PRC-LISTENING', 'CAP-PRC-WRITING',
  'CAP-PRC-SPEAKING', 'CAP-PRC-LIVE-HUB-CONVERT',
  'CAP-MCK-BUILD', 'CAP-MCK-VALIDATE', 'CAP-MCK-EXAM',
  'CAP-MCK-RESUME', 'CAP-MCK-REPORT', 'CAP-MCK-LIVE-HUB-CONVERT',
  'CAP-REV-MISTAKE', 'CAP-REV-DUE', 'CAP-REV-MASTERY',
  'CAP-REV-RELAPSE', 'CAP-REV-PROGRESS', 'CAP-REV-RECOMMEND',
  'CAP-GLB-AI-ROUTER', 'CAP-GLB-TUTOR', 'CAP-GLB-VOICE',
  'CAP-GLB-EVIDENCE', 'CAP-GLB-IDENTITY', 'CAP-GLB-SEARCH',
];

it('registers every approved core capability as an owned table row', () => {
  const registry = readFileSync(resolve(root, 'docs/product/CAPABILITY_REGISTRY.md'), 'utf8');
  for (const id of coreCapabilities) {
    expect(registry.match(new RegExp(`^\\| ${id} \\|`, 'gm'))).toHaveLength(1);
  }
});
```

- [ ] **Step 2: Verify the expected registry failure**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts -t "approved core capability"
```

Expected: FAIL because the capability table is absent.

- [ ] **Step 3: Write the registry contract and owner table**

The registry begins with the `ProductCapability` interface from the approved design and the seven module/global owner definitions. For every core ID above, add one Markdown table row with:

```text
ID | Name | Owner | Learner Job | Segment/Band | Priority | Mechanism |
Prerequisites | Consumes | Produces | Provider | Privacy | Metric |
Evidence | UX Contract | Acceptance Test | Release Status
```

Use `approved` as the initial status. Use `none`, `browser`, `official_ai`, `search`, or `private_bridge` for provider class. No core public capability may use `private_bridge`.

- [ ] **Step 4: Register advanced, later, and rejected capability families**

Add explicit entries for:

- advanced: hosted OCR, Speaking realtime, custom Mock, deep research, advanced pronunciation analytics;
- later: General Training, teacher/classroom, global localisation, collaboration, public source marketplace;
- reject: fake scoring, uncited real-exam labels, transcript-only pronunciation, XP-for-reveal, decorative controls, public paid shared Web Bridge.

- [ ] **Step 5: Document open-source ownership boundaries**

Register AnyDoc, yt-dlp/PO token, Readability/DOMPurify, Wavesurfer, jsdiff, ts-fsrs, XState, VAD, Dexie candidate, and pgvector-later as dependencies of owned Omni capabilities rather than product capabilities themselves.

- [ ] **Step 6: Run capability and documentation gates**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts
npm run check:product-docs
```

Expected: all strategy/framework/registry assertions and current documentation contracts pass; the PRD task adds its own failing contract next.

- [ ] **Step 7: Commit the owned capability registry**

Run:

```bash
git add docs/product/CAPABILITY_REGISTRY.md src/lib/__tests__/productDocumentation.test.ts
git commit -m "docs: define owned capability registry"
```

---

### Task 5: Author `PRD.md` with traceable requirements and metrics

**Files:**
- Create: `docs/product/PRD.md`
- Modify: `src/lib/__tests__/productDocumentation.test.ts`

**Interfaces:**
- Consumes: Product Strategy, Learning Framework, Capability Registry, and approved design Sections 10–12 and 17–18.
- Produces: Product-level functional requirements, NFRs, success metrics, scope, release gates, and references used by later domain SPEC and Architecture plans.

- [ ] **Step 1: Add failing PRD structure and ID assertions**

Add:

```ts
it('defines every approved product and non-functional requirement', () => {
  const prd = readFileSync(resolve(root, 'docs/product/PRD.md'), 'utf8');
  for (let id = 1; id <= 13; id += 1) {
    expect(prd).toContain(`PRD-${String(id).padStart(3, '0')}`);
  }
  for (let id = 1; id <= 5; id += 1) {
    expect(prd).toContain(`NFR-${String(id).padStart(3, '0')}`);
  }
  expect(prd).toContain('Definition of Public Beta Success');
  expect(prd).toContain('Release Blocking Conditions');
});
```

- [ ] **Step 2: Verify the expected PRD failure**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts -t "approved product and non-functional"
```

Expected: FAIL because the requirement catalogue is absent.

- [ ] **Step 3: Write the PRD framing sections**

Use:

```markdown
# Omni IELTS Public Beta Product Requirements Document

## Executive Summary
## Problem Statement
## Product Thesis and Positioning
## Primary Persona and Adjacent Segments
## Jobs to be Done
## Public Beta Scope
## Out of Scope and Rejected Capabilities
## Functional Requirements
## Non-functional Requirements
## Learning and Assessment Requirements
## AI, Provider, and Cost Policy
## Privacy, Security, and Content Rights
## Success Metrics and Guardrails
## Pilot Design
## Release Blocking Conditions
## Definition of Public Beta Success
## Dependencies and Assumptions
## Traceability and Next Specifications
```

- [ ] **Step 4: Define functional requirements `PRD-001` through `PRD-013`**

Use the approved meanings:

```text
PRD-001 Onboarding and multidimensional learner profile
PRD-002 Seven-module navigation and complete UI states
PRD-003 Shared learning loop and evidence emission
PRD-004 Explainable adaptive recommendation
PRD-005 Multi-source Learning Workspace
PRD-006 Vocabulary retention loop
PRD-007 Grammar and Strategy curriculum/transfer
PRD-008 Media learning loop
PRD-009 Four-skill Practice
PRD-010 IELTS Mock
PRD-011 Review and Progress
PRD-012 AI transparency and truthful provider behaviour
PRD-013 Degraded/offline continuity
```

Define each requirement as an H3 heading (`### PRD-001 — ...`). Each requirement includes user outcome, in-scope behaviour, exclusions, linked capability IDs, emitted evidence, metric IDs, and release acceptance summary.

- [ ] **Step 5: Define non-functional requirements `NFR-001` through `NFR-005`**

```text
NFR-001 Performance and responsive feedback
NFR-002 Reliability, persistence, idempotency, and recovery
NFR-003 WCAG 2.2 AA accessibility and Public Beta compatibility
NFR-004 Security, privacy, ownership, retention, and deletion
NFR-005 AI/provider cost budgets, observability, and kill switches
```

Define each non-functional requirement as an H3 heading (`### NFR-001 — ...`). Copy exact performance, reliability, accessibility, security, and cost constraints from the approved design rather than inventing new targets.

- [ ] **Step 6: Define the pilot and metric requirements**

Reference `METRIC-001` through `METRIC-006` and `GUARD-001` through `GUARD-004`. State that Alpha establishes baselines and that provisional Beta hypotheses are not marketing claims. Define eligibility for the north-star denominator: baseline, sufficient loops, unseen reassessment, and consented/pseudonymous measurement.

- [ ] **Step 7: Define release blocking conditions**

Include no open P0/P1, no missing core UX contract/evidence, no fake output, valid provenance, applied RLS/export/delete, deterministic gate, required live canary no older than 24 hours, accessibility, cost limits, rollback flags, and no public Web Bridge dependency.

- [ ] **Step 8: Run all product documentation tests**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts
npm run check:product-docs
```

Expected: PASS with all four documents populated and every stable ID uniquely defined.

- [ ] **Step 9: Commit the traceable PRD**

Run:

```bash
git add docs/product/PRD.md src/lib/__tests__/productDocumentation.test.ts
git commit -m "docs: define Public Beta product requirements"
```

---

### Task 6: Add traceability, CI enforcement, and product-document review evidence

**Files:**
- Create: `docs/product/TRACEABILITY_MATRIX.md`
- Modify: `scripts/check-product-docs.ts`
- Modify: `src/lib/__tests__/productDocumentation.test.ts`
- Modify: `scripts/public-beta-gate.mjs`
- Modify: `src/lib/__tests__/releaseGateContracts.test.ts`

**Interfaces:**
- Consumes: Approved PRD and capability IDs.
- Produces: Machine-checked PRD-to-capability traceability and deterministic CI enforcement; domain SPEC/ADR/Epic columns remain explicitly gated for the next documentation phase.

- [ ] **Step 1: Add a failing traceability test**

Add:

```ts
it('maps every PRD requirement to at least one capability', () => {
  const matrix = readFileSync(resolve(root, 'docs/product/TRACEABILITY_MATRIX.md'), 'utf8');
  for (let id = 1; id <= 13; id += 1) {
    const requirement = `PRD-${String(id).padStart(3, '0')}`;
    expect(matrix).toMatch(new RegExp(`\\| ${requirement} \\| CAP-[A-Z0-9-]+ \\|`));
  }
});
```

- [ ] **Step 2: Verify the traceability test fails**

Run:

```bash
npx vitest run src/lib/__tests__/productDocumentation.test.ts -t "maps every PRD"
```

Expected: FAIL because the traceability matrix does not exist.

- [ ] **Step 3: Create the initial traceability matrix**

Use columns:

```markdown
| Requirement | Capabilities | Metric/Guardrail | Domain SPEC Owner | Architecture Owner | Delivery Status |
```

Map every `PRD-001`–`PRD-013` and `NFR-001`–`NFR-005`. Set Domain SPEC Owner to one of `platform`, `sources`, `vocabulary`, `grammar_strategy`, `media`, `practice`, `mock`, or `review_progress`. Set Architecture Owner to an approved context from the design. Use `product_approved` as Delivery Status; do not claim implementation or verification.

- [ ] **Step 4: Extend the checker to validate requirement coverage**

Add logic to `scripts/check-product-docs.ts` that reads the matrix, extracts every defined `PRD-*` and `NFR-*` from the PRD, and fails when the matrix does not contain exactly one row beginning with that requirement ID.

- [ ] **Step 5: Add `check:product-docs` to the deterministic gate after tests**

Update:

```js
export const DETERMINISTIC_SCRIPTS = [
  'test',
  'check:product-docs',
  'check:ux-contracts',
  'lint',
  'build',
  'test:e2e',
];
```

Update release-gate tests to assert this exact order.

- [ ] **Step 6: Run targeted gates**

Run:

```bash
npm test
npm run check:product-docs
npm run check:ux-contracts
npm run lint
npm run build
```

Expected: all exit 0. No E2E behaviour changed, so full E2E executes only in Task 7 as the final branch gate.

- [ ] **Step 7: Commit the completed documentation foundation**

Run:

```bash
git add docs/product scripts/check-product-docs.ts package.json scripts/public-beta-gate.mjs src/lib/__tests__/productDocumentation.test.ts src/lib/__tests__/releaseGateContracts.test.ts
git commit -m "docs: establish Omni IELTS product requirements foundation"
```

---

### Task 7: Verify, review, and hand off the approved documentation foundation

**Files:**
- Review: `docs/product/*.md`
- Review: `docs/superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md`
- Review: documentation checker and release-gate diff

**Interfaces:**
- Consumes: All Task 1–6 deliverables.
- Produces: A reviewable documentation branch and exact inputs for separate Domain SPEC and Architecture planning.

- [ ] **Step 1: Run spec coverage self-review**

Create a temporary checklist outside the repository and verify every approved design section has an owning Product Strategy, Learning Framework, Capability Registry, PRD, or Traceability Matrix section. Fix omissions in the owning document rather than duplicating text across files.

- [ ] **Step 2: Run placeholder and ID scans**

Run:

```bash
npm run check:product-docs
rg -n -i "TBD|TODO|implement later|fill in|appropriate error handling" docs/product
```

Expected: checker exits 0 and `rg` returns no matches.

- [ ] **Step 3: Run the full deterministic release gate**

Run:

```bash
npm run check:beta
```

Expected: unit/API tests, product docs, UX contracts, typecheck, build, accessibility, and deterministic desktop/mobile E2E all pass.

- [ ] **Step 4: Inspect the final diff and secrets**

Run:

```bash
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
rg -n "AIza|gsk_|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY" docs/product scripts/check-product-docs.ts
```

Expected: clean diff check, only planned files, no credential-shaped values.

- [ ] **Step 5: Push the documentation branch without merging**

Run:

```bash
git push -u origin docs/product-documentation-foundation
```

Report the branch, commit SHA, document links, gate results, and any explicitly deferred Domain SPEC/Architecture work. The product owner reviews these documents before a Domain SPEC plan is authored.

## Plan self-review result

- The plan covers the approved documentation chain only through PRD and initial traceability.
- Domain UX/System SPEC, data schema implementation, Architecture/ADRs, and feature rebuilds are intentionally separate plans after PRD approval.
- Stable names and IDs are consistent across tasks.
- Every task has a red/green documentation test or a final verification gate.
- No unresolved placeholder language or undefined interface is required to execute this plan.
- Placeholder keywords occur only inside the checker implementation and its verification command, where they are the values being rejected.
