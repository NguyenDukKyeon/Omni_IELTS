# Omni IELTS Capability Registry

Status: Draft — awaiting Product Owner review

Approved Design Baseline:
[Omni IELTS Product Rebuild Design](../superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md)

Product Strategy:
[Omni IELTS Product Strategy](./PRODUCT_STRATEGY.md)

Learning and Assessment Framework:
[Omni IELTS Learning and Assessment Framework](./LEARNING_AND_ASSESSMENT_FRAMEWORK.md)

This document is the single source of truth for capability ownership, module boundaries, learner job, target segment and band, learning mechanism, prerequisites, consumed and produced contracts, provider and privacy classification, success metric, required evidence, UX and acceptance-test ownership, core/advanced/later/reject classification, release lifecycle status, and open-source dependency boundaries. It does not replace the approved design or Learning Framework and does not author production features.

A feature is not a product capability merely because a library or AI provider exists. Open-source tools and providers are dependencies of owned Omni capabilities.

## Registry Purpose and Rules

Normative rules:

1. Every user-facing learning or assessment behaviour that ships in Public Beta must map to one owned `CAP-*` row.
2. `CAP-*` identifiers are defined only as the first cell of a registry table row in this document. Cross-document mentions are references.
3. This registry does not define `PRD-*`, `NFR-*`, `METRIC-*`, or `GUARD-*` identifiers. Metric and guardrail IDs below are references to Product Strategy.
4. `approved` means the capability **decision and scope** are approved. It does not mean code is implemented.
5. `implemented`, `deterministic_verified`, `live_verified`, and `released` require actual evidence and must not be assigned speculatively. All rows here start at `approved`.
6. UX and acceptance IDs (`UX-*`, `AC-*`) are declared future traceability obligations. They must not be reported as passing until tests exist.
7. No core public capability may set `providerDependency` to `private_bridge`.
8. Dashboard and Daily Coach are recommendation/navigation surfaces, not independent learning-module owners.
9. Status values in this registry are product-lifecycle states, not engineering vanity labels.

Explanatory guidance: later Domain SPEC documents may add state-machine detail, but they cannot silently change owner, priority, provider class, or evidence class.

## ProductCapability Contract

This is a product contract, not a database schema or migration. Implementation may persist additional operational fields; it must not drop, rename, or replace the canonical fields.

```ts
interface ProductCapability {
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
}
```

Field rules:

- `none` is required when there is genuinely no provider or state machine.
- Comma-separated contract or ID references are allowed where multiple values apply.
- `priority` and `releasePhase` are independent: an advanced capability may be `research` or `post_beta`.
- Table cells are the definition site. Surrounding prose explains the row; it does not create a second ID.

## Module and Global Owners

Exactly seven module owners own learner-facing learning modules:

1. `sources` — Sources & Library. Owns import, workspaces, versions, provenance, citations, selection, processing jobs, and Live Hub **source records**. Raw source ownership stays in Sources even when Media, Practice, or Mock consume a version.
2. `vocabulary` — Vocabulary. Owns canonical cards, decks, contextual meaning, FSRS, vocabulary retrieval and vocabulary mastery emission.
3. `grammar_strategy` — Grammar & Strategy. Owns grammar/IELTS strategy curriculum, diagnosis, controlled practice, strategy lessons and transfer. Emits mistake evidence but does not own mistake scheduling.
4. `media` — Media Lab. Owns Media lessons, transcript versions, original player, Shadowing, Dictation, recording attempts and Media resume. Does not own source provenance.
5. `practice` — IELTS Practice. Owns Reading, Listening, Writing and Speaking activities, question engines, attempt and hint/reveal state, skill-specific grading, feedback, Speaking Examiner Room, and Live Hub **conversion into Practice**.
6. `mock` — IELTS Mock. Owns staged build, validation, exam state, CDI timing, autosave/resume, reports, history, and Live Hub **conversion into Mock**. Independent Mock evidence outranks assisted Practice.
7. `review_progress` — Review & Progress. Owns unified MistakeEvidence, due review, mastery, relapse, progress claims and explainable recommendation. Uses canonical Learning Framework contracts.

Global services (`owner: global`) are not a seventh learning module. They are shared platform capabilities:

- AI Router
- AI Tutor
- Voice Library
- Learning Evidence Engine
- Identity & Privacy
- Search Grounding
- AI Scoring Calibration
- Generated Content Quality Gate
- Profile/preferences
- App Shell
- Placement Diagnostic
- Notifications

Dashboard and Daily Coach are recommendation/navigation surfaces, not independent learning-module owners. Daily Coach recommends actions and must not force a single learning path. `CAP-GLB-APP-SHELL` owns those surfaces and seven-module navigation; Dashboard is not an eighth learning module.

Live Hub source records belong to Sources. Live Hub conversion belongs to Practice or Mock depending on destination. Mistake scheduling and mastery belong to Review & Progress. Artifact Studio is source-side orchestration only: destination modules own final persistence.

## Core Capabilities

Public Beta core capabilities. Every row uses status `approved` for the product decision, not as an implementation claim. No core row uses `private_bridge`.

### Sources & Library

The workspace is NotebookLM-like in that one private workspace holds multiple heterogeneous sources, but it is IELTS-first. Artifact Studio can request Practice, Mock, vocabulary, notes and Idea Bank drafts from selected sources; it does not own the final persisted destination artifact. Desktop three-area layout (Sources panel, Preview/Chat/Notes, IELTS Artifact Studio) and the mobile tab model (Sources, Learning Workspace, Create) are UX obligations, not implementation claims.

Supported Beta source families: pasted text/Markdown, PDF, DOCX, web URL, public YouTube URL, audio, VTT/SRT, and image/chart for Academic Writing Task 1. Batch import creates independent per-source jobs. Extraction failure must be explicit. Importing a source does not automatically generate every artifact.

Default chat answers only from selected SourceVersions. Retrieval over already imported sources is not Google/web Search Grounding. `CAP-GLB-SEARCH` is invoked only through an explicit learner action such as “Tra cứu dẫn chứng” or explicit deep research. Source-grounded chat must continue to work when external Search is unavailable, provided selected sources and a compatible AI model are available. When selected sources do not support a claim, respond unsupported/unavailable; do not silently search the public web. Do not merge web citations and selected-source citations without labelling their origin.

Sources Artifact Studio owns the artifact request, selected-source context, provenance bundle, generation job, source-side preview, validated artifact draft, and destination handoff status. It must not own the final persisted destination artifact. Destination modules own final persistence: Practice owns the final Practice activity after accepting a `ValidatedPracticeDraft`; Mock owns the final Mock section/package after accepting a `ValidatedMockDraft`; Vocabulary owns the final card/deck after accepting a `ValidatedVocabularyDraft`; Tutor/Idea Bank owns the final cited note/fact after accepting a `ValidatedNoteDraft`.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-SRC-WORKSPACE | Multi-source Learning Workspace | sources | Learn from authentic material without losing the source | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-GLB-IDENTITY | SourceVersion, LearnerContext | Workspace, SourceSelection | WorkspaceMachine | sources | sources | none | private_learning | METRIC-001 | workspace membership, source versions, provenance | UX-SRC-WORKSPACE | AC-SRC-WORKSPACE | approved |
| CAP-SRC-IMPORT-BATCH | Batch source import | sources | Learn from authentic material without losing the source | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-SRC-WORKSPACE | raw files, URLs, YouTube URLs, audio, VTT/SRT, images/charts | per-source jobs, SourceVersion | ImportJobMachine | sources | sources | none | private_learning | METRIC-006 | independent job states, ready or failed | UX-SRC-IMPORT-BATCH | AC-SRC-IMPORT-BATCH | approved |
| CAP-SRC-EXTRACT | Extract, normalise and validate | sources | Learn from authentic material without losing the source | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-SRC-IMPORT-BATCH | raw SourceVersion | normalised SourceVersion, validation report | ExtractPipeline | sources | sources | none | private_learning | GUARD-001 | explicit extraction failure, no fabricated content | UX-SRC-EXTRACT | AC-SRC-EXTRACT | approved |
| CAP-SRC-VERSION | Immutable source versions | sources | Learn from authentic material without losing the source | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-SRC-EXTRACT | raw, normalised, edited bytes | immutable SourceVersion ids | none | sources | sources | none | private_learning | GUARD-001 | downstream artifacts point at exact versions | UX-SRC-VERSION | AC-SRC-VERSION | approved |
| CAP-SRC-PROVENANCE | Provenance, citation and rights | sources | Trust feedback and keep source lineage | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-SRC-VERSION | SourceVersion, block/page/timestamp spans | citation, content-rights status, lineage | none | sources | sources | none | private_learning | GUARD-003 | source/version/block/page/timestamp lineage | UX-SRC-PROVENANCE | AC-SRC-PROVENANCE | approved |
| CAP-SRC-SELECTION | Source include/exclude for AI context | sources | Learn from authentic material without losing the source | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-SRC-PROVENANCE | Workspace sources | selected context set, conflict flags | none | sources | sources | none | private_learning | GUARD-001 | conflicts surfaced, not silently reconciled | UX-SRC-SELECTION | AC-SRC-SELECTION | approved |
| CAP-SRC-GROUNDED-CHAT | Grounded chat over selected sources | sources | Learn from authentic material without losing the source | Plateaued Intermediate, Band 4.5–6.5 | core | beta | instruction | CAP-SRC-SELECTION, CAP-GLB-AI-ROUTER | selected SourceVersion, citations | cited answers, unsupported/unavailable claims | none | sources | sources | official_ai | private_learning | GUARD-003 | claim-level citations, missing support shown unavailable | UX-SRC-GROUNDED-CHAT | AC-SRC-GROUNDED-CHAT | approved |
| CAP-SRC-ARTIFACT-STUDIO | On-demand IELTS artifact studio | sources | Learn from authentic material without losing the source | Plateaued Intermediate, Band 4.5–6.5 | core | beta | production | CAP-SRC-SELECTION, CAP-GLB-CONTENT-QUALITY | ArtifactGenerationRequest, SourceContextBundle, ProvenanceBundle | ValidatedArtifactDraft, DestinationHandoff | ArtifactJobMachine | sources | sources | official_ai | private_learning | METRIC-006 | on-demand generation only, quality gate status, destination handoff | UX-SRC-ARTIFACT-STUDIO | AC-SRC-ARTIFACT-STUDIO | approved |
| CAP-SRC-LIVE-HUB | Live Hub source records | sources | Learn from authentic material without losing the source | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-SRC-PROVENANCE, CAP-GLB-SEARCH | search/provider snapshots | fresh/stale/unavailable records, verified/report/forecast/derived labels | LiveHubFreshness | sources | sources | search | private_learning | GUARD-003 | no verified or real-exam label without direct citation | UX-SRC-LIVE-HUB | AC-SRC-LIVE-HUB | approved |

### Vocabulary

Contextual capture creates canonical cards. Vocabulary accepts a `ValidatedVocabularyDraft` or source span from Artifact Studio, then owns the persisted card/deck. FSRS owns intervals, not mastery policy. Mastery/relapse still requires the Learning Framework evidence hierarchy.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-VOC-CAPTURE | Contextual vocabulary capture | vocabulary | Learn from authentic material without losing the source | Plateaued Intermediate, Band 4.5–6.5 | core | beta | instruction | CAP-SRC-PROVENANCE | source span, learner selection, ValidatedVocabularyDraft | canonical card draft, word family, collocation | none | vocabulary | vocabulary | official_ai | private_learning | METRIC-003 | contextual meaning, source lineage | UX-VOC-CAPTURE | AC-VOC-CAPTURE | approved |
| CAP-VOC-DECK | Canonical cards and decks | vocabulary | Convert feedback into a next action | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-VOC-CAPTURE | canonical cards | deck membership, deduplicated entries | none | vocabulary | vocabulary | none | private_learning | METRIC-002 | canonical card ownership, import/export | UX-VOC-DECK | AC-VOC-DECK | approved |
| CAP-VOC-FSRS | FSRS vocabulary scheduling | vocabulary | Prove improvement through delayed retrieval | Plateaued Intermediate, Band 4.5–6.5 | core | beta | spacing | CAP-VOC-DECK | review outcomes | nextReviewAt | FsrsScheduler | vocabulary | vocabulary | none | private_learning | METRIC-002 | schedule intervals, not mastery policy | UX-VOC-FSRS | AC-VOC-FSRS | approved |
| CAP-VOC-RETRIEVAL | Unassisted vocabulary retrieval | vocabulary | Prove improvement through delayed retrieval | Plateaued Intermediate, Band 4.5–6.5 | core | beta | retrieval | CAP-VOC-FSRS | due cards | Unassisted Retrieval evidence | none | vocabulary | vocabulary | none | private_learning | METRIC-003 | unassisted recall, no reveal-as-completion | UX-VOC-RETRIEVAL | AC-VOC-RETRIEVAL | approved |
| CAP-VOC-MASTERY | Vocabulary mastery and relapse | vocabulary | Prove improvement | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-VOC-RETRIEVAL, CAP-GLB-EVIDENCE | CompetencyState, MistakeEvidence | vocabulary mastery/relapse updates | none | vocabulary | review_progress | none | private_learning | METRIC-002 | repeated unassisted plus transfer, history retained | UX-VOC-MASTERY | AC-VOC-MASTERY | approved |

### Grammar & Strategy

Grammar curriculum, diagnosis and practice are separate from strategy lessons and transfer. Grammar emits MistakeEvidence but does not own the review schedule.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-GRM-CURRICULUM | Grammar curriculum and prerequisites | grammar_strategy | Diagnose the plateau | Plateaued Intermediate, Band 4.5–6.5 | core | beta | instruction | CAP-GLB-EVIDENCE | competency graph foundation/grammar nodes | curriculum sequence, bilingual explanation | none | grammar_strategy | grammar_strategy | none | private_learning | METRIC-001 | prerequisite gaps, foundation vs IELTS grammar | UX-GRM-CURRICULUM | AC-GRM-CURRICULUM | approved |
| CAP-GRM-DIAGNOSIS | Grammar error diagnosis | grammar_strategy | Diagnose the plateau | Plateaued Intermediate, Band 4.5–6.5 | core | beta | feedback | CAP-GRM-CURRICULUM, CAP-GLB-AI-ROUTER | learner production | taxonomy-linked MistakeEvidence | none | grammar_strategy | grammar_strategy | official_ai | private_learning | METRIC-002 | emits mistakes, does not own review schedule | UX-GRM-DIAGNOSIS | AC-GRM-DIAGNOSIS | approved |
| CAP-GRM-PRACTICE | Controlled grammar practice | grammar_strategy | Convert feedback into a next action | Plateaued Intermediate, Band 4.5–6.5 | core | beta | production | CAP-GRM-DIAGNOSIS | curriculum items, scaffolds | Assisted Performance or Unassisted Retrieval | none | grammar_strategy | grammar_strategy | none | private_learning | METRIC-004 | controlled practice with recorded assistance | UX-GRM-PRACTICE | AC-GRM-PRACTICE | approved |

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-STR-LESSONS | IELTS strategy lessons | grammar_strategy | Diagnose the plateau | Plateaued Intermediate, Band 4.5–6.5 | core | beta | instruction | CAP-GRM-CURRICULUM | strategy nodes, question-type lessons | Exposure evidence | none | grammar_strategy | grammar_strategy | none | private_learning | METRIC-001 | strategy instruction, not mastery | UX-STR-LESSONS | AC-STR-LESSONS | approved |
| CAP-STR-TRANSFER | Strategy transfer tasks | grammar_strategy | Prove improvement on a new task | Plateaued Intermediate, Band 4.5–6.5 | core | beta | transfer | CAP-STR-LESSONS | new stems/passages | Transfer evidence | none | grammar_strategy | grammar_strategy | none | private_learning | METRIC-003 | new context required, no known-item relabel | UX-STR-TRANSFER | AC-STR-TRANSFER | approved |

### Media Lab

Original YouTube/audio is preferred. Transcript-only input cannot create pronunciation or prosody evidence. Missing audio or microphone produces `unavailable`. Media does not own source provenance.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-MED-IMPORT | Media lesson import | media | Learn from authentic audio and video | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-SRC-VERSION | SourceVersion audio/video | MediaLesson reference, not source ownership | MediaImportJob | media | media | none | private_learning | METRIC-006 | Media consumes sources, Sources keep provenance | UX-MED-IMPORT | AC-MED-IMPORT | approved |
| CAP-MED-TRANSCRIPT | Complete transcript versions | media | Learn from authentic audio and video | Plateaued Intermediate, Band 4.5–6.5 | core | beta | instruction | CAP-MED-IMPORT | original audio/video | full transcript versions/segments | TranscriptJob | media | media | official_ai | private_learning | GUARD-001 | transcript unavailable if generation fails, no fabrication | UX-MED-TRANSCRIPT | AC-MED-TRANSCRIPT | approved |
| CAP-MED-PLAYER | Original media player | media | Learn from authentic audio and video | Plateaued Intermediate, Band 4.5–6.5 | core | beta | instruction | CAP-MED-IMPORT | original YouTube/audio | playback position, segment alignment | none | media | media | browser | private_learning | METRIC-005 | original media preferred over transcript-only | UX-MED-PLAYER | AC-MED-PLAYER | approved |
| CAP-MED-SHADOWING | Shadowing with acoustic input | media | Convert listening errors into practice | Plateaued Intermediate, Band 4.5–6.5 | core | beta | production | CAP-MED-PLAYER, CAP-GLB-VOICE | real microphone audio | fluency/pronunciation evidence or unavailable | ShadowingAttempt | media | media | browser | sensitive_audio | METRIC-003 | no pronunciation/prosody from transcript-only input | UX-MED-SHADOWING | AC-MED-SHADOWING | approved |
| CAP-MED-DICTATION | Dictation and word-level diff | media | Convert listening errors into practice | Plateaued Intermediate, Band 4.5–6.5 | core | beta | retrieval | CAP-MED-PLAYER, CAP-MED-TRANSCRIPT | heard audio, learner spelling | spelling/detail MistakeEvidence | none | media | media | none | private_learning | METRIC-002 | listening/spelling evidence, not source ownership | UX-MED-DICTATION | AC-MED-DICTATION | approved |
| CAP-MED-RESUME | Media attempt resume | media | Continue through interruption | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-MED-PLAYER | playback and attempt state | resumed position, same media version | MediaResume | media | media | none | private_learning | METRIC-006 | resume preserves version, missing mic is unavailable | UX-MED-RESUME | AC-MED-RESUME | approved |

### IELTS Practice

Practice owns question engines, attempt state, hint/reveal state, skill-specific grading, feedback and the Speaking Examiner Room. It emits evidence and mistakes but does not own cross-module mastery policy. Practice skill capabilities accept a `ValidatedPracticeDraft` from Artifact Studio; Practice owns final persistence of the Practice activity.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-PRC-READING | IELTS Reading practice | practice | Practise under exam-like conditions | Plateaued Intermediate, Band 4.5–6.5 | core | beta | production | CAP-GLB-EVIDENCE, CAP-GLB-CONTENT-QUALITY | reading items, hint/reveal state, ValidatedPracticeDraft | skill evidence, mistakes, assisted/unassisted flags | PracticeAttempt | practice | practice | none | private_learning | METRIC-003 | question engine, grading, feedback; no mastery policy | UX-PRC-READING | AC-PRC-READING | approved |
| CAP-PRC-LISTENING | IELTS Listening practice | practice | Practise under exam-like conditions | Plateaued Intermediate, Band 4.5–6.5 | core | beta | production | CAP-GLB-EVIDENCE, CAP-GLB-CONTENT-QUALITY | listening items, audio package, ValidatedPracticeDraft | skill evidence, spelling/detail mistakes | PracticeAttempt | practice | practice | none | private_learning | METRIC-003 | deterministic scoring when package valid; cut audio unavailable | UX-PRC-LISTENING | AC-PRC-LISTENING | approved |
| CAP-PRC-WRITING | IELTS Writing practice | practice | Convert feedback into a next action | Plateaued Intermediate, Band 4.5–6.5 | core | beta | production | CAP-GLB-SCORING-CALIBRATION, CAP-GLB-EVIDENCE | Task 1/2 prompts, learner writing, ValidatedPracticeDraft | AI estimated band — experimental, criterion feedback, MistakeEvidence | PracticeAttempt | practice | practice | official_ai | private_learning | METRIC-004 | Independent Production only from learner writing, not AI drafts | UX-PRC-WRITING | AC-PRC-WRITING | approved |
| CAP-PRC-SPEAKING | IELTS Speaking practice and Examiner Room | practice | Convert feedback into a next action | Plateaued Intermediate, Band 4.5–6.5 | core | beta | production | CAP-GLB-VOICE, CAP-GLB-SCORING-CALIBRATION | real audio, Part 1/2/3 prompts, ValidatedPracticeDraft | fluency/lexical/grammar evidence, pronunciation if audio valid | SpeakingAttempt | practice | practice | official_ai | sensitive_audio | METRIC-004 | missing audio makes pronunciation/prosody unavailable | UX-PRC-SPEAKING | AC-PRC-SPEAKING | approved |
| CAP-PRC-LIVE-HUB-CONVERT | Live Hub to Practice conversion | practice | Learn from authentic material under practice conditions | Plateaued Intermediate, Band 4.5–6.5 | core | beta | transfer | CAP-SRC-LIVE-HUB, CAP-GLB-CONTENT-QUALITY | Live Hub source records | Practice artifacts with provenance | none | practice | practice | official_ai | private_learning | METRIC-003 | conversion owned by Practice, source records stay in Sources | UX-PRC-LIVE-HUB-CONVERT | AC-PRC-LIVE-HUB-CONVERT | approved |

### IELTS Mock

A package must be valid before entering exam. Required shape: Listening 40, Reading 40, Writing 2, Speaking 3 parts. Missing or cut audio blocks `ready`. Reload/resume preserves package and attempt. Independent Mock evidence is stronger than assisted Practice. `CAP-MCK-BUILD` accepts a `ValidatedMockDraft` from Artifact Studio; Mock owns final persistence of the Mock section/package.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-MCK-BUILD | Staged Mock package build | mock | Practise under exam conditions | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-GLB-CONTENT-QUALITY | sections, items, audio, keys, ValidatedMockDraft | Mock package draft | MockBuildMachine | mock | mock | none | private_learning | GUARD-001 | Listening 40, Reading 40, Writing 2, Speaking 3 parts | UX-MCK-BUILD | AC-MCK-BUILD | approved |
| CAP-MCK-VALIDATE | Mock package validation | mock | Trust assessment evidence | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-MCK-BUILD, CAP-GLB-CONTENT-QUALITY | package draft | ready or rejected/unavailable package | MockValidate | mock | mock | none | private_learning | GUARD-001 | missing/cut audio blocks ready, no fabricated keys | UX-MCK-VALIDATE | AC-MCK-VALIDATE | approved |
| CAP-MCK-EXAM | Computer-delivered Mock exam | mock | Practise under exam conditions | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-MCK-VALIDATE | immutable ready package | unassisted Independent Assessment Evidence | ExamStateMachine | mock | mock | none | private_learning | METRIC-001 | valid package required before exam, CDI timing | UX-MCK-EXAM | AC-MCK-EXAM | approved |
| CAP-MCK-RESUME | Mock autosave and resume | mock | Continue through interruption | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-MCK-EXAM | exam snapshot | same package version and remaining time | ExamResume | mock | mock | none | private_learning | METRIC-006 | reload/resume preserves package and attempt | UX-MCK-RESUME | AC-MCK-RESUME | approved |
| CAP-MCK-REPORT | Mock report and history | mock | Prove improvement on independent evidence | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-MCK-EXAM, CAP-GLB-SCORING-CALIBRATION | raw scores, AI estimates | report with labelled estimates, unavailable gaps | none | mock | mock | official_ai | private_learning | METRIC-001 | independent Mock evidence stronger than assisted Practice | UX-MCK-REPORT | AC-MCK-REPORT | approved |
| CAP-MCK-LIVE-HUB-CONVERT | Live Hub to Mock conversion | mock | Practise authentic material under exam conditions | Plateaued Intermediate, Band 4.5–6.5 | core | beta | transfer | CAP-SRC-LIVE-HUB, CAP-MCK-VALIDATE | Live Hub records | Mock section/package with provenance | none | mock | mock | official_ai | private_learning | METRIC-001 | conversion owned by Mock, source records stay in Sources | UX-MCK-LIVE-HUB-CONVERT | AC-MCK-LIVE-HUB-CONVERT | approved |

### Review & Progress

Uses canonical `EvidenceClass`, `CompetencyState` and `MistakeEvidence` from the Learning Framework. Mastery status and review-queue status are orthogonal. Progress claims follow the Framework: no XP, streak, time-on-task, reveal, copied model answer or AI-written response as improvement.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-REV-MISTAKE | Unified MistakeEvidence | review_progress | Convert feedback into a next action | Plateaued Intermediate, Band 4.5–6.5 | core | beta | feedback | CAP-GLB-EVIDENCE | module-emitted mistakes | canonical MistakeEvidence | none | review_progress | review_progress | none | private_learning | METRIC-002 | taxonomy, orthogonal masteryStatus and reviewState | UX-REV-MISTAKE | AC-REV-MISTAKE | approved |
| CAP-REV-DUE | Due review queue | review_progress | Convert feedback into a next action | Plateaued Intermediate, Band 4.5–6.5 | core | beta | spacing | CAP-REV-MISTAKE, CAP-VOC-FSRS | nextReviewAt, due mistakes | due drills | DueQueue | review_progress | review_progress | none | private_learning | METRIC-004 | queue status unscheduled/scheduled/due/in_review/archived | UX-REV-DUE | AC-REV-DUE | approved |
| CAP-REV-MASTERY | Competency mastery updates | review_progress | Prove improvement | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-GLB-EVIDENCE | CompetencyState counters | state, estimatedMastery, uncertainty | none | review_progress | review_progress | none | private_learning | METRIC-001 | canonical CompetencyState, no XP mastery | UX-REV-MASTERY | AC-REV-MASTERY | approved |
| CAP-REV-RELAPSE | Relapse of mastered errors | review_progress | Prove improvement by tracking recurrence | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-REV-MASTERY, CAP-REV-MISTAKE | independent Practice/Mock mistakes | relapsed state, Daily Coach re-entry | none | review_progress | review_progress | none | private_learning | METRIC-002 | history retained during normal product use | UX-REV-RELAPSE | AC-REV-RELAPSE | approved |
| CAP-REV-PROGRESS | Progress claims and snapshots | review_progress | Prove improvement | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-REV-MASTERY | evidence classes, baselines | progress snapshot with evidence links | none | review_progress | review_progress | none | private_learning | METRIC-001 | no progress from XP, streak, time, reveal | UX-REV-PROGRESS | AC-REV-PROGRESS | approved |
| CAP-REV-RECOMMEND | Explainable next-action rules | review_progress | Diagnose the plateau and choose a next action | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-REV-DUE, CAP-REV-RELAPSE | CompetencyState, MistakeEvidence | recommendation with evidence reason | RecommendationRules | review_progress | review_progress | none | private_learning | METRIC-004 | rule engine, not opaque ML, Daily Coach recommend-only | UX-REV-RECOMMEND | AC-REV-RECOMMEND | approved |

### Global services

`CAP-GLB-AI-ROUTER` performs capability-aware routing, schema/quality validation, compatible fallback, cost/latency budgets and an honest unavailable state.

`CAP-GLB-TUTOR` is contextual tutoring. Search runs only when explicitly requested. Tutor can save a cited fact, note or Idea Bank entry with provenance. Tutor output is learning material/source evidence, not learner performance evidence. Reading an AI answer creates at most Exposure if the learner later opens it as learning material. Tutor output must not increment CompetencyState evidence counters. Tutor output must not create Independent Production, Transfer, Independent Assessment, mastery or improvement. Only a later learner attempt can emit those evidence classes. Tutor/Idea Bank accepts a `ValidatedNoteDraft` from Artifact Studio and owns the final cited note/fact.

`CAP-GLB-VOICE` covers browser and Gemini voice providers with selection, preview, fallback and cache.

`CAP-GLB-EVIDENCE` owns the shared evidence contracts. Modules emit `LearningEvent`, `Attempt` and `Evaluation` records as applicable. The Evidence Engine validates and derives canonical `SkillEvidence`, `MistakeEvidence`, `MasteryUpdate` and `ProgressUpdate`. unavailable/degraded provider output cannot create a valid mastery/progress update.

`CAP-GLB-IDENTITY` covers authentication, consent, ownership, RLS, export and privacy hard-delete.

`CAP-GLB-SEARCH` covers search grounding, citations, fresh/stale/unavailable and provider trace.

`CAP-GLB-SCORING-CALIBRATION` validates Writing/Speaking **AI scoring**, not AI content generation and not per-submission human grading. Operation is automated and self-service. It uses a versioned calibration collection with `official_anchor`, `founder_reviewed`, `community_weak_label`, and optional `external_expert_reviewed`. Community or AI-labelled sets are robustness tests, not ground truth. Until independent expert calibration exists, learner-facing results remain **AI estimated band — experimental**. Lack of external expert calibration does not block practice; it blocks official, examiner-equivalent or independently validated accuracy claims.

`CAP-GLB-CONTENT-QUALITY` is the Generated Content Quality Gate for AI-generated Practice, Mock and source-derived artifacts. It must validate schema, answerability, answer support from passage/audio/source, ambiguity, distractor quality, required item/part counts, source/provenance, citation validity where applicable, content rights, target learner difficulty, duplicate detection, and generated audio completeness, duration and fidelity. Repair is bounded. If validation still fails, artifact status is rejected/unavailable. Never fabricate an answer key, audio, citation, transcript or ready state.

`CAP-GLB-APP-SHELL` owns seven-module navigation, Dashboard and Daily Coach recommendation surfaces, the desktop/mobile responsive shell, and loading, success, empty, degraded, unavailable and error presentation contracts. It owns route/state continuity. There is no visible control without a real state/route/data transition. Manual module navigation remains available. Dashboard is not an eighth learning module. The canonical row privacy is `public_metadata` for shell chrome, routes and presentation contracts. Learner-specific Dashboard/Daily Coach payloads remain `private_learning` records owned by Learner Profile and Review & Progress; the shell only presents them.

`CAP-GLB-LEARNER-PROFILE` owns the onboarding profile, current-band hypothesis, target band, exam date/deadline, per-skill estimates, learner track, preferences, accessibility/accommodation preferences, voice preferences by use case, consent references, and evidence-confidence/missing-evidence state. current/target band personalises the experience but is not proof of improvement. Learner profile is not the same as authentication credentials. Profile data is private learning data. Identity owns auth, consent enforcement, RLS, export and hard-delete. Review & Progress owns competency/mastery evidence. This capability composes those records into the learner-facing profile.

`CAP-GLB-PLACEMENT-DIAGNOSTIC` implements the Learning Framework assessment layer. It samples Foundation plus four-skill competencies, outputs an approximate starting track and prerequisite gaps, and records collected and missing evidence classes. It must never claim an official band. It must never convert CEFR one-to-one into IELTS. Missing microphone/audio must mark Speaking evidence unavailable. It must not fill a missing skill score using averages from other skills. Initial CompetencyState cannot become mastered from placement. The diagnostic baseline must remain distinguishable from Week 4 unseen reassessment. The row provider is `none` because collection and missing-evidence marking are deterministic; optional AI interpretation of written/spoken samples is a labelled estimate, never an official band or a substitute for a missing skill.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-GLB-AI-ROUTER | Capability-aware AI router | global | Continue through provider failure | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-GLB-IDENTITY | task profile, schema | validated output, compatible fallback, unavailable | AiRouter | global | global | official_ai | private_learning | METRIC-006 | schema validation, cost/latency, no fabricated evidence | UX-GLB-AI-ROUTER | AC-GLB-AI-ROUTER | approved |
| CAP-GLB-TUTOR | Contextual AI Tutor | global | Convert feedback into a next action | Plateaued Intermediate, Band 4.5–6.5 | core | beta | instruction | CAP-GLB-AI-ROUTER, CAP-SRC-SELECTION | selected sources, learner questions, ValidatedNoteDraft | cited notes, source-backed facts, Idea Bank entries with provenance | none | global | global | official_ai | private_learning | GUARD-003 | no learner mastery/progress evidence from Tutor-generated output | UX-GLB-TUTOR | AC-GLB-TUTOR | approved |
| CAP-GLB-VOICE | Shared Voice Library | global | Practise speaking and listening with audible models | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | none | browser/Gemini voice providers | selection, preview, fallback, cache | none | global | global | browser | sensitive_audio | METRIC-006 | fallback when a voice provider is unavailable | UX-GLB-VOICE | AC-GLB-VOICE | approved |
| CAP-GLB-EVIDENCE | Learning Evidence Engine | global | Prove improvement with honest evidence | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | none | LearningEvent, Attempt, Evaluation | EvidenceClass, SkillEvidence, CompetencyState, MistakeEvidence, MasteryUpdate, ProgressUpdate | none | global | global | none | private_learning | METRIC-001 | canonical contracts owned here, modules emit | UX-GLB-EVIDENCE | AC-GLB-EVIDENCE | approved |
| CAP-GLB-IDENTITY | Identity, consent and hard-delete | global | Trust the product with private learning data | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | none | auth, consent, BYOK | ownership, RLS, export, privacy hard-delete | none | global | global | none | credential | GUARD-002 | hard-delete overrides learning-history retention | UX-GLB-IDENTITY | AC-GLB-IDENTITY | approved |
| CAP-GLB-SEARCH | Search grounding | global | Trust citations and freshness | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-GLB-AI-ROUTER | search providers | citations, fresh/stale/unavailable, provider trace | none | global | global | search | private_learning | GUARD-003 | stale snapshots labelled, no unverified real-exam claims | UX-GLB-SEARCH | AC-GLB-SEARCH | approved |
| CAP-GLB-SCORING-CALIBRATION | AI Scoring Calibration | global | Trust Writing and Speaking estimates | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-GLB-EVIDENCE | versioned calibration collection | criterion disagreement, experimental band policy | CalibrationSuite | global | global | official_ai | private_learning | GUARD-001 | official_anchor, founder_reviewed, community_weak_label, external_expert_reviewed | UX-GLB-SCORING-CALIBRATION | AC-GLB-SCORING-CALIBRATION | approved |
| CAP-GLB-CONTENT-QUALITY | Generated Content Quality Gate | global | Trust generated Practice and Mock artifacts | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-GLB-AI-ROUTER | generated Practice/Mock/source-derived artifacts | ready, rejected/unavailable, bounded repair | QualityGate | global | global | official_ai | private_learning | GUARD-001 | schema, answerability, answer support, item counts, audio completeness | UX-GLB-CONTENT-QUALITY | AC-GLB-CONTENT-QUALITY | approved |
| CAP-GLB-APP-SHELL | App shell and recommendation surfaces | global | Navigate seven modules without a forced path | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-GLB-IDENTITY | module routes, Daily Coach recommendations | AppShell, RouteContinuity, PresentationState | ShellMachine | global | global | none | public_metadata | METRIC-005 | UX contract coverage, real transition ownership | UX-GLB-APP-SHELL | AC-GLB-APP-SHELL | approved |
| CAP-GLB-LEARNER-PROFILE | Learner profile and preferences | global | Personalise the experience without treating profile as proof | Plateaued Intermediate, Band 4.5–6.5 | core | beta | utility | CAP-GLB-IDENTITY, CAP-GLB-EVIDENCE | auth subject, CompetencyState, consent, voice preferences | LearnerProfile, current-band hypothesis, track, missing-evidence state | none | global | global | none | private_learning | METRIC-001 | profile is not credentials and not mastery proof | UX-GLB-LEARNER-PROFILE | AC-GLB-LEARNER-PROFILE | approved |
| CAP-GLB-PLACEMENT-DIAGNOSTIC | Placement diagnostic | global | Diagnose the plateau with an honest starting baseline | Plateaued Intermediate, Band 4.5–6.5 | core | beta | assessment | CAP-GLB-LEARNER-PROFILE, CAP-GLB-EVIDENCE | Foundation plus four-skill samples, optional microphone | starting track, prerequisite gaps, collected and missing evidence, placement baseline | PlacementMachine | global | global | none | private_learning | METRIC-001 | no official band, no CEFR conversion, no missing-skill average, not mastered from placement | UX-GLB-PLACEMENT-DIAGNOSTIC | AC-GLB-PLACEMENT-DIAGNOSTIC | approved |

## Advanced Capabilities

Advanced capabilities are approved as product decisions for after the Public Beta core, or for isolated research. They are not core Beta promises.

`CAP-SRC-HOSTED-OCR` remains consent-gated and is not a default Beta dependency.

`CAP-PRC-SPEAKING-REALTIME` stays advanced until live Examiner → Learner → Examiner evidence and a fallback canary pass.

`CAP-GLB-PRIVATE-WEB-BRIDGE` is founder/invite-only dogfooding. It is not a public entitlement, not a dependency of paid or Public Beta capabilities, and must have health checks, limits and a kill switch. Sub2API admin/user credentials must never be exposed to the browser. Do not claim commercial suitability without explicit terms.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-SRC-HOSTED-OCR | Consent-gated hosted OCR | sources | Import scanned documents when on-device extraction is insufficient | Band 4.5–6.5 | advanced | post_beta | utility | CAP-SRC-EXTRACT, CAP-GLB-IDENTITY | scanned PDF/image, explicit consent | OCR text version or unavailable | OcrJob | sources | sources | official_ai | private_learning | GUARD-002 | not a default Beta dependency | UX-SRC-HOSTED-OCR | AC-SRC-HOSTED-OCR | approved |
| CAP-PRC-SPEAKING-REALTIME | Realtime Speaking Examiner | practice | Practise Speaking with live turn-taking | Band 5.0–6.5 | advanced | post_beta | production | CAP-PRC-SPEAKING | live audio duplex | Examiner to Learner to Examiner evidence | RealtimeSpeaking | practice | practice | official_ai | sensitive_audio | METRIC-004 | advanced until live evidence and fallback canary pass | UX-PRC-SPEAKING-REALTIME | AC-PRC-SPEAKING-REALTIME | approved |
| CAP-MCK-CUSTOM | Custom Mock authoring | mock | Build personal exam packages beyond shipped sets | Band 6.0–6.5 | advanced | post_beta | utility | CAP-MCK-VALIDATE | author-selected items | custom ready package or rejected | MockBuildMachine | mock | mock | none | private_learning | METRIC-001 | still requires validation before exam | UX-MCK-CUSTOM | AC-MCK-CUSTOM | approved |
| CAP-GLB-DEEP-RESEARCH | Explicit deep research | global | Investigate a topic with cited sources when requested | Band 6.0–8.0 | advanced | post_beta | instruction | CAP-GLB-SEARCH, CAP-GLB-TUTOR | explicit research request | cited research notes | none | global | global | search | private_learning | GUARD-003 | never silent background research | UX-GLB-DEEP-RESEARCH | AC-GLB-DEEP-RESEARCH | approved |
| CAP-GLB-PRONUNCIATION-ADVANCED | Advanced pronunciation analytics | global | Inspect pronunciation and prosody with real audio | Band 6.0–8.0 | advanced | research | assessment | CAP-PRC-SPEAKING, CAP-MED-SHADOWING | real audio, valid VAD/timestamps | segmental/prosody analysis or unavailable | none | global | global | official_ai | sensitive_audio | METRIC-003 | never from transcript-only input | UX-GLB-PRONUNCIATION-ADVANCED | AC-GLB-PRONUNCIATION-ADVANCED | approved |
| CAP-GLB-PRIVATE-WEB-BRIDGE | Private Web Bridge and Sub2API | global | Founder/invite-only dogfooding of private providers | founder/invite-only | advanced | research | utility | none | private bridge credentials, Sub2API | isolated experimental completions | BridgeKillSwitch | global | global | private_bridge | credential | GUARD-004 | health checks, limits, kill switch, no browser-exposed Sub2API keys | UX-GLB-PRIVATE-WEB-BRIDGE | AC-GLB-PRIVATE-WEB-BRIDGE | approved |

## Later Capabilities

Later capabilities are classified `later`. The rows record the decision to defer them. They do not imply implementation.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-GLB-GENERAL-TRAINING | IELTS General Training track | global | Prepare for General Training after Academic Beta | General Training, Band 4.5–6.5 | later | post_beta | instruction | CAP-GLB-EVIDENCE | GT task types | GT curriculum track | none | global | global | none | private_learning | METRIC-001 | not a Public Beta promise | UX-GLB-GENERAL-TRAINING | AC-GLB-GENERAL-TRAINING | approved |
| CAP-GLB-TEACHER-CLASSROOM | Teacher and classroom workflows | global | Assign work to classes | teachers, not self-learners | later | post_beta | utility | CAP-GLB-IDENTITY | class roster | assignments | none | global | global | none | private_learning | METRIC-005 | out of Public Beta self-learner scope | UX-GLB-TEACHER-CLASSROOM | AC-GLB-TEACHER-CLASSROOM | approved |
| CAP-GLB-LOCALISATION | Global localisation beyond Vietnam-first | global | Use Omni in additional markets and UI languages | global expansion | later | post_beta | utility | CAP-GLB-IDENTITY | locale packs | non-vi-en interface | none | global | global | none | public_metadata | METRIC-005 | Vietnam-first remains Beta default | UX-GLB-LOCALISATION | AC-GLB-LOCALISATION | approved |
| CAP-SRC-COLLABORATION | Shared workspace collaboration | sources | Study with another person in one workspace | collaborative learners | later | post_beta | utility | CAP-SRC-WORKSPACE | shared membership | collaborative workspace | none | sources | sources | none | private_learning | METRIC-005 | not a Public Beta self-learner promise | UX-SRC-COLLABORATION | AC-SRC-COLLABORATION | approved |
| CAP-SRC-PUBLIC-MARKETPLACE | Public source marketplace | sources | Browse public sources from other learners | public catalogue | later | post_beta | utility | CAP-SRC-PROVENANCE | public listings | marketplace entries | none | sources | sources | none | public_metadata | GUARD-003 | rejected as a Beta social marketplace; later only with rights | UX-SRC-PUBLIC-MARKETPLACE | AC-SRC-PUBLIC-MARKETPLACE | approved |
| CAP-GLB-NOTIFICATIONS | Learner notifications | global | Return to due reviews without opening the app first | Band 4.5–6.5 | later | post_beta | utility | CAP-REV-DUE | due events | notification messages | none | global | global | none | private_learning | METRIC-005 | engagement surface, not a learning-module owner | UX-GLB-NOTIFICATIONS | AC-GLB-NOTIFICATIONS | approved |

## Rejected Capabilities

Rejected rows remain in the registry so they cannot silently re-enter later PRDs. Priority is `reject`. Status `approved` means the **rejection** is the approved product decision.

Reasons:

- `CAP-GLB-FAKE-SCORING` — fabricated score/evidence.
- `CAP-SRC-UNCITED-REAL-EXAM` — uncited “real exam” claims.
- `CAP-GLB-TRANSCRIPT-ONLY-PRONUNCIATION` — pronunciation without audio.
- `CAP-REV-XP-FOR-REVEAL` — progress/XP from answer reveal.
- `CAP-GLB-DECORATIVE-CONTROLS` — visible controls without a real transition.
- `CAP-GLB-PUBLIC-SHARED-WEB-BRIDGE` — shared Web Bridge sold or exposed as a public dependency.

| ID | Name | Owner | Learner Job | Segment/Band | Priority | Release Phase | Mechanism | Prerequisites | Consumes | Produces | State Machine | API Owner | Data Owner | Provider | Privacy | Metric | Evidence | UX Contract | Acceptance Tests | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CAP-GLB-FAKE-SCORING | Fabricated scores or evidence | global | none — rejected | none | reject | research | utility | none | missing provider output | fake band, transcript, or ready state | none | global | global | none | private_learning | GUARD-001 | rejected: fabricated score/evidence | UX-GLB-FAKE-SCORING | AC-GLB-FAKE-SCORING | approved |
| CAP-SRC-UNCITED-REAL-EXAM | Uncited real-exam labels | sources | none — rejected | none | reject | research | utility | none | unverified papers | real exam or verified labels without provenance | none | sources | sources | none | public_metadata | GUARD-003 | rejected: uncited real-exam claims | UX-SRC-UNCITED-REAL-EXAM | AC-SRC-UNCITED-REAL-EXAM | approved |
| CAP-GLB-TRANSCRIPT-ONLY-PRONUNCIATION | Pronunciation from transcript only | global | none — rejected | none | reject | research | assessment | none | transcript without audio | pronunciation/prosody score | none | global | global | none | private_learning | GUARD-001 | rejected: pronunciation without audio | UX-GLB-TRANSCRIPT-ONLY-PRONUNCIATION | AC-GLB-TRANSCRIPT-ONLY-PRONUNCIATION | approved |
| CAP-REV-XP-FOR-REVEAL | XP or mastery from answer reveal | review_progress | none — rejected | none | reject | research | utility | none | reveal action | XP, streak, or mastered from reveal | none | review_progress | review_progress | none | private_learning | METRIC-001 | rejected: progress/XP from answer reveal | UX-REV-XP-FOR-REVEAL | AC-REV-XP-FOR-REVEAL | approved |
| CAP-GLB-DECORATIVE-CONTROLS | Visible controls without a real transition | global | none — rejected | none | reject | research | utility | none | dead UI chrome | clicks that do not change state | none | global | global | none | public_metadata | GUARD-001 | rejected: visible controls without a real transition | UX-GLB-DECORATIVE-CONTROLS | AC-GLB-DECORATIVE-CONTROLS | approved |
| CAP-GLB-PUBLIC-SHARED-WEB-BRIDGE | Public or paid shared Web Bridge | global | none — rejected | none | reject | research | utility | none | shared private-bridge credentials | public entitlement or paid shared access | none | global | global | private_bridge | credential | GUARD-004 | rejected: shared Web Bridge sold or exposed as a public dependency | UX-GLB-PUBLIC-SHARED-WEB-BRIDGE | AC-GLB-PUBLIC-SHARED-WEB-BRIDGE | approved |

## Open-source Ownership Boundaries

Open source reads/processes generic data. Omni owns IELTS pedagogy, provenance, evidence, assessment, mastery and UX. A dependency is not a user-facing capability and must not be registered as a `CAP-*` row. Upstream self-reported benchmark results are not adoption evidence. Every production dependency requires exact pinning, license review, fixtures, fallback and a removal plan.

AnyDoc is a focused parsing spike, not permission to adopt an entire foreign product architecture. Do not migrate Omni to Next.js, Python, Open-WebUI or Chainlit.

| Dependency | Consumed by | Generic responsibility | Omni still owns | Adoption state | Adapter, pin, fixture, fallback, removal |
|---|---|---|---|---|---|
| firecrawl/anydoc | CAP-SRC-EXTRACT | Office/text-PDF byte conversion | canonical parsed document, page/block provenance, quality validation, IELTS conversion | focused spike | DocumentParser adapter, exact pin, malformed-file fixtures, non-AnyDoc fallback, removal plan |
| yt-dlp | CAP-MED-IMPORT, CAP-SRC-IMPORT-BATCH | YouTube media/caption fetch with PO-token provider | lesson model, provenance, transcript versions, IELTS tasks | retain | adapter, exact pin, PO-token provider boundary, caption-missing fallback, removal plan |
| Mozilla Readability | CAP-SRC-EXTRACT | web main-content extraction | source versioning, citations, rights, IELTS artifacts | adopt | sanitised HTML adapter, pin, fixture pages, plain-text fallback, removal plan |
| DOMPurify | CAP-SRC-EXTRACT | HTML sanitisation | what content is allowed into learning artifacts | adopt | sanitiser adapter, pin, XSS fixtures, reject-unsafe fallback, removal plan |
| Wavesurfer.js | CAP-MED-PLAYER, CAP-MED-SHADOWING | waveform rendering and playback UI | attempt evidence, alignment, unavailable audio policy | retain/adopt | player adapter, pin, no-audio fallback, removal plan |
| jsdiff | CAP-MED-DICTATION | text diff | which diffs count as spelling/listening MistakeEvidence | adopt | diff adapter; diff-match-patch allowed as replacement; pin; fixtures; removal plan |
| ts-fsrs | CAP-VOC-FSRS | spaced-interval math | mastery policy, evidence class, relapse | retain | scheduler adapter, pin, review-outcome fixtures, manual-interval fallback, removal plan |
| XState | CAP-MCK-EXAM, CAP-SRC-IMPORT-BATCH | generic state-machine runtime | exam/session policy, IELTS timing rules | retain/adopt | machine adapter, pin, transition fixtures, removal plan |
| @ricky0123/vad-web | CAP-PRC-SPEAKING, CAP-MED-SHADOWING | browser voice-activity detection | pause analytics policy, unavailable without valid timestamps/VAD | retain | VAD adapter, pin, no-mic fallback to unavailable, removal plan |
| Dexie.js | CAP-GLB-IDENTITY, CAP-MCK-RESUME | candidate IndexedDB wrapper | which learning records may cache offline | candidate | storage adapter, pin, in-memory fallback, removal plan |
| pgvector | CAP-GLB-SEARCH | later vector index | retrieval policy, citation, IELTS ranking | later Knowledge/RAG phase | not a Beta dependency; if adopted: adapter, pin, keyword-search fallback, removal plan |

## Registry Change and Traceability Rules

- Adding a `CAP-*` ID requires a new table row in this document, a unique first-cell ID, and an explicit owner/priority/provider/privacy/evidence set.
- Renaming an approved ID requires a migration note in this section.
- PRD requirements in a later task must reference these IDs; they must not mint parallel capability names.
- Domain SPEC and Architecture documents may refine `stateMachine`, API paths and tables after PRD approval; they cannot change owner or reclassify a rejected capability without a registry edit.
- UX and acceptance IDs listed here remain obligations until corresponding tests exist. They are not pass reports.
