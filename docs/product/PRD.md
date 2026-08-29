# Omni IELTS Public Beta Product Requirements Document

Status: Draft — awaiting Product Owner review

Approved Design Baseline:
[Omni IELTS Product Rebuild Design](../superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md)

Product Strategy:
[Omni IELTS Product Strategy](./PRODUCT_STRATEGY.md)

Learning and Assessment Framework:
[Omni IELTS Learning and Assessment Framework](./LEARNING_AND_ASSESSMENT_FRAMEWORK.md)

Capability Registry:
[Omni IELTS Capability Registry](./CAPABILITY_REGISTRY.md)

This PRD is the Public Beta product-level contract. It defines user outcomes, functional scope, non-functional constraints, learning and assessment requirements, AI/provider truthfulness, privacy and content-rights rules, success metrics and the efficacy pilot, release blockers, and traceability obligations for later Domain SPEC, Architecture, and Epic Delivery Specs. It is not a UI specification, system architecture, or implementation plan. It does not mint capability IDs; every `CAP-*` reference already exists in the Capability Registry.

## Executive Summary

Omni IELTS is an IELTS-first comprehensive preparation platform. Public Beta is Vietnam-first, IELTS Academic-first, and Self-learner first. English Foundation is adaptive support inside IELTS preparation, not a separate school. Long-term architecture supports Band 3.0–9.0 through distinct tracks. Public Beta validates Band 4.5–6.5, with Plateaued Intermediate Band 5.0–5.5 as the primary segment. The Public Beta is not proof that all Band 3.0–9.0 tracks are already implemented.

The product competes through a cross-module learning loop, evidence, provenance, mastery, relapse, transfer and independent reassessment—not by exposing the largest number of AI tools. Daily Coach recommends; it does not force one journey. Engagement does not equal learning improvement. AI output is not learner performance evidence by itself.

## Problem Statement

Vietnamese IELTS Academic self-learners around Band 5.0–5.5 often already know the exam format and have studied before, yet the score plateaus. Feedback is fragmented across apps, teachers, and model answers. Recurring errors return on the next Writing or Speaking task. Learners cannot rely on a permanent teacher and cannot see what to practise next or why. Activity, XP, and more AI output are easy to collect and easy to mistake for improvement.

## Product Thesis and Positioning

Authentic source plus learner error plus assessment evidence must become a targeted loop: diagnose, learn, controlled practice, feedback, retrieval, transfer, independent assessment, update the learner model, and recommend the next action. Omni does not issue official IELTS scores. Learners still sit a real exam with an official test provider. Public Beta succeeds when a diagnosed subskill can improve on an independent reassessment, not when the product looks busy.

## Primary Persona and Adjacent Segments

The approved primary persona is a Vietnamese IELTS Academic self-learner around Band 5.0–5.5 who:

- has studied before;
- feels plateaued;
- receives fragmented feedback;
- has recurring errors;
- needs an actionable self-study system;
- cannot rely on a permanent teacher;
- must understand what to practise next and why.

Adjacent Beta segments:

- Foundation Repairer: 4.5–5.0.
- Band Optimizer: 6.0–6.5.

Long-term segments (Foundation expansion 3.0–4.5, Advanced 6.5–8.0, Expert 8.0–9.0) are architecture commitments, not Beta promises.

## Jobs to be Done

1. Diagnose the plateau.
2. Convert feedback into action.
3. Learn from authentic sources.
4. Practise under exam conditions.
5. Prove improvement.
6. Trust AI feedback.
7. Continue through provider failure.

## Public Beta Scope

Public Beta ships the seven learning-module families plus the global services required to run them honestly: identity, app shell, learner profile, placement diagnostic, evidence, AI router, tutor, voice, search, scoring calibration, and generated-content quality. Scope is the core `CAP-*` rows classified `core` / `beta` in the Capability Registry. Advanced, later, and rejected capabilities remain classified there and are not Beta promises.

## Out of Scope and Rejected Capabilities

Public Beta explicitly excludes:

- General Training (`CAP-GLB-GENERAL-TRAINING`);
- teacher/classroom workflows (`CAP-GLB-TEACHER-CLASSROOM`);
- global localisation (`CAP-GLB-LOCALISATION`);
- collaboration (`CAP-SRC-COLLABORATION`);
- public source marketplace (`CAP-SRC-PUBLIC-MARKETPLACE`);
- default hosted OCR (`CAP-SRC-HOSTED-OCR`);
- custom Mock (`CAP-MCK-CUSTOM`);
- deep research automation (`CAP-GLB-DEEP-RESEARCH`);
- advanced pronunciation analytics (`CAP-GLB-PRONUNCIATION-ADVANCED`);
- public/shared paid Web Bridge (`CAP-GLB-PUBLIC-SHARED-WEB-BRIDGE`, `CAP-GLB-PRIVATE-WEB-BRIDGE` as a public entitlement);
- fake scoring (`CAP-GLB-FAKE-SCORING`);
- uncited real-exam labels (`CAP-SRC-UNCITED-REAL-EXAM`);
- transcript-only pronunciation (`CAP-GLB-TRANSCRIPT-ONLY-PRONUNCIATION`);
- XP/mastery from reveal (`CAP-REV-XP-FOR-REVEAL`);
- decorative controls (`CAP-GLB-DECORATIVE-CONTROLS`);
- Notifications as a learning-module owner (`CAP-GLB-NOTIFICATIONS`).

Speaking realtime (`CAP-PRC-SPEAKING-REALTIME`) remains advanced until live Examiner → Learner → Examiner evidence and fallback canary pass; this PRD does not claim it is Beta-ready merely because an engineering PR exists.

## Functional Requirements

### PRD-001 — Onboarding and multidimensional learner profile

**User outcome**

A plateaued Vietnamese Academic self-learner can sign in or continue as guest within the approved boundary, record consent, complete a multidimensional profile, and receive an honest starting track without being told they already have an official band.

**In-scope behaviour**

- authentication/guest boundary;
- consent and privacy choices;
- current-band hypothesis;
- target band and exam deadline;
- per-skill estimates;
- learner track;
- preferences, accessibility and voice-by-use-case;
- Foundation plus four-skill placement;
- collected/missing evidence;
- starting track and prerequisite gaps.

`CAP-GLB-APP-SHELL` hosts the flow. `CAP-GLB-LEARNER-PROFILE` owns the composed learner-facing profile. `CAP-GLB-PLACEMENT-DIAGNOSTIC` samples Foundation plus four-skill competencies and records collected and missing evidence classes. `CAP-GLB-IDENTITY` owns auth, consent enforcement, RLS, export and hard-delete. `CAP-GLB-EVIDENCE` owns canonical CompetencyState.

**Explicit exclusions**

- no official-band claim;
- no exact IELTS–CEFR conversion;
- no filling missing skills by averaging others;
- no mastery from placement;
- target band is not progress evidence.

**Linked capabilities**

`CAP-GLB-IDENTITY`, `CAP-GLB-APP-SHELL`, `CAP-GLB-LEARNER-PROFILE`, `CAP-GLB-PLACEMENT-DIAGNOSTIC`, `CAP-GLB-EVIDENCE`

**Emitted evidence**

Placement baseline, collected and missing EvidenceClass records, prerequisite gaps, and a starting track. Initial CompetencyState cannot become mastered from placement. The diagnostic baseline must remain distinguishable from Week 4 unseen reassessment.

**Metrics and guardrails**

[METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks), [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents), [GUARD-002](./PRODUCT_STRATEGY.md#guard-002--secret-or-privacy-incidents)

**Release acceptance summary**

A learner can complete onboarding and placement with every missing skill or missing microphone marked unavailable, without an official-band or CEFR-conversion claim, and with a profile that personalises the experience without counting as improvement.

### PRD-002 — Seven-module navigation and complete UI states

**User outcome**

The learner can reach all seven learning modules, resume unfinished work, and always know whether the current screen is loading, successful, empty, degraded, unavailable, or in error—without being forced onto a single Daily Coach path.

**In-scope behaviour**

- seven-module navigation across Sources & Library, Vocabulary, Grammar & Strategy, Media Lab, IELTS Practice, IELTS Mock, and Review & Progress;
- Dashboard and Daily Coach as recommendation surfaces, not an eighth learning module;
- one primary CTA per module context;
- resume unfinished work;
- manual module navigation;
- desktop/mobile/tablet responsiveness;
- loading;
- success;
- empty;
- degraded;
- unavailable;
- expected error;
- permission denied;
- offline/reconnecting where relevant;
- real route/state/data transition for every Beta control;
- no decorative controls.

Visual implementation is deferred to the separate UX and Design System SPEC after product-document approval. This PRD does not define CSS tokens, clone a competitor, prescribe motion libraries, or claim that a visual prototype already exists.

**Explicit exclusions**

Dashboard is not a learning-module owner. Visible controls without a real transition are rejected (`CAP-GLB-DECORATIVE-CONTROLS`). This requirement does not ship visual skin, motion language, or a competitor clone.

**Linked capabilities**

`CAP-GLB-APP-SHELL`

**Emitted evidence**

UX contract coverage and real transition ownership. Shell chrome is `public_metadata`; learner-specific Dashboard/Daily Coach payloads remain private_learning records owned by Learner Profile and Review & Progress.

**Metrics and guardrails**

[METRIC-005](./PRODUCT_STRATEGY.md#metric-005--d7-learner-retention), [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents)

**Release acceptance summary**

Every Beta control has a real route, state, or data transition. All listed UI states exist for each of the seven modules. Daily Coach recommends and never blocks manual navigation.

### PRD-003 — Shared learning loop and evidence emission

**User outcome**

The learner’s work across modules updates one learner model using the same loop and the same evidence contracts, so progress claims can be inspected rather than inferred from activity.

**In-scope behaviour**

Canonical loop:

Diagnose → Learn → Controlled Practice → Feedback → Retrieval → Transfer → Independent Assessment → Update learner model → Recommend next action

Require canonical EvidenceClass, CompetencyState and MistakeEvidence contracts from the Learning Framework, owned by `CAP-GLB-EVIDENCE` and applied by Review & Progress.

**Explicit exclusions**

No progress/mastery from exposure, reveal, copied model answer, AI-written answer, empty audio, missing timestamps or unsupported grader output.

**Linked capabilities**

`CAP-GLB-EVIDENCE`, `CAP-REV-MISTAKE`, `CAP-REV-MASTERY`, `CAP-REV-RELAPSE`, `CAP-REV-PROGRESS`

**Emitted evidence**

LearningEvent, Attempt, Evaluation, EvidenceClass, CompetencyState counters, and MistakeEvidence. Tutor/AI material is at most Exposure if later opened as learning material.

**Metrics and guardrails**

[METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks), [METRIC-002](./PRODUCT_STRATEGY.md#metric-002--target-mistake-recurrence-rate), [METRIC-003](./PRODUCT_STRATEGY.md#metric-003--unassisted-transfer-accuracy), [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents)

**Release acceptance summary**

Each of the seven modules can complete at least one evidence-emitting journey that updates CompetencyState or MistakeEvidence without treating reveal, AI output, or empty audio as mastery.

### PRD-004 — Explainable adaptive recommendation

**User outcome**

The learner can see a next action and answer “Vì sao tôi được đề xuất bài này?” with an evidence-based reason, then ignore the recommendation and navigate manually.

**In-scope behaviour**

- explainable rules in Beta;
- evidence-based reason;
- competency;
- priority;
- next action;
- prerequisite awareness;
- relapse/due review priority;
- “Vì sao tôi được đề xuất bài này?”;
- manual navigation remains available.

**Explicit exclusions**

Exclude opaque journey-setting ML and recommendations based only on XP/streak.

**Linked capabilities**

`CAP-REV-RECOMMEND`, `CAP-REV-DUE`, `CAP-GLB-LEARNER-PROFILE`, `CAP-GLB-EVIDENCE`

**Emitted evidence**

Recommendation records that cite CompetencyState, MistakeEvidence, due status, and prerequisite gaps. Recommendations do not themselves create mastery.

**Metrics and guardrails**

[METRIC-004](./PRODUCT_STRATEGY.md#metric-004--feedback-to-follow-up-drill-conversion), [METRIC-002](./PRODUCT_STRATEGY.md#metric-002--target-mistake-recurrence-rate)

**Release acceptance summary**

Daily Coach and Review surfaces show a reason, competency, and next action for due and relapsed items, and the learner can still open any of the seven modules directly.

### PRD-005 — Multi-source Learning Workspace

**User outcome**

The learner can keep multiple heterogeneous sources in one private workspace, chat only over selected sources, and request IELTS artifacts without losing provenance or silently searching the public web.

**In-scope behaviour**

- multiple heterogeneous sources;
- independent jobs;
- raw/normalised/edited versions;
- include/exclude selection;
- selected-source chat;
- claim citations;
- conflicting-source visibility;
- provenance;
- rights status;
- deletion/export;
- source-side artifact draft and destination handoff;
- final destination persistence remains with Practice/Mock/Vocabulary/Tutor;
- external web Search only on explicit action;
- fresh/stale/unavailable Live Hub states.

Supported Beta families remain those in the registry: text/Markdown, PDF, DOCX, URL, YouTube URL, audio, VTT/SRT, and image/chart.

**Explicit exclusions**

- automatic generation of all possible artifacts after import;
- silent public-web search;
- public source marketplace in Beta;
- hosted OCR as a default dependency;
- unsupported “real exam” labels.

**Linked capabilities**

`CAP-SRC-WORKSPACE`, `CAP-SRC-IMPORT-BATCH`, `CAP-SRC-EXTRACT`, `CAP-SRC-VERSION`, `CAP-SRC-PROVENANCE`, `CAP-SRC-SELECTION`, `CAP-SRC-GROUNDED-CHAT`, `CAP-SRC-ARTIFACT-STUDIO`, `CAP-SRC-LIVE-HUB`, `CAP-GLB-CONTENT-QUALITY`, `CAP-GLB-IDENTITY`

**Emitted evidence**

SourceVersion lineage, citation and content-rights status, grounded-chat unsupported/unavailable claims, ValidatedArtifactDraft and DestinationHandoff. Sources do not emit learner mastery.

**Metrics and guardrails**

[METRIC-006](./PRODUCT_STRATEGY.md#metric-006--cost-per-completed-learning-loop), [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents), [GUARD-003](./PRODUCT_STRATEGY.md#guard-003--unsupported-official-or-real-exam-claims)

**Release acceptance summary**

Import, extract, select, grounded chat, and artifact handoff work without fabricating content, without default hosted OCR, and without treating Live Hub snapshots as verified real-exam papers.

### PRD-006 — Vocabulary retention loop

**User outcome**

The learner can capture a word in context, review it later without notes, and see mastery only after unassisted retrieval and transfer—not after creating a card.

**In-scope behaviour**

Contextual capture, deduplication, decks, word family, collocation, pronunciation, FSRS, delayed retrieval, transfer, mastery/relapse and export. FSRS schedules review but does not define mastery. Vocabulary accepts a ValidatedVocabularyDraft from Artifact Studio and owns the persisted card/deck.

**Explicit exclusions**

Reveal-as-completion, TTS replacing a required original audio source, and treating card creation as mastered.

**Linked capabilities**

`CAP-VOC-CAPTURE`, `CAP-VOC-DECK`, `CAP-VOC-FSRS`, `CAP-VOC-RETRIEVAL`, `CAP-VOC-MASTERY`, `CAP-GLB-VOICE`, `CAP-GLB-EVIDENCE`

**Emitted evidence**

Unassisted Retrieval, transfer attempts, vocabulary mastery/relapse updates, and source lineage on captured cards.

**Metrics and guardrails**

[METRIC-002](./PRODUCT_STRATEGY.md#metric-002--target-mistake-recurrence-rate), [METRIC-003](./PRODUCT_STRATEGY.md#metric-003--unassisted-transfer-accuracy)

**Release acceptance summary**

A captured item can be scheduled, retrieved unassisted, transferred, and relapsed without FSRS being reported as the mastery policy.

### PRD-007 — Grammar and Strategy curriculum and transfer

**User outcome**

The learner can repair a prerequisite grammar gap or an IELTS strategy error, practise it with recorded assistance, and later face an unseen transfer task.

**In-scope behaviour**

Prerequisite-based curriculum, bilingual Foundation support, diagnosis, controlled practice, learner production, taxonomy-linked mistakes and unseen transfer. Grammar emits mistakes; Review & Progress owns the review queue.

**Explicit exclusions**

Strategy lessons are not mastery. Known-item relabels are not Transfer. Grammar does not own due scheduling.

**Linked capabilities**

`CAP-GRM-CURRICULUM`, `CAP-GRM-DIAGNOSIS`, `CAP-GRM-PRACTICE`, `CAP-STR-LESSONS`, `CAP-STR-TRANSFER`, `CAP-REV-MISTAKE`

**Emitted evidence**

Exposure from lessons, Assisted Performance or Unassisted Retrieval from controlled practice, Transfer evidence from unseen tasks, and taxonomy-linked MistakeEvidence.

**Metrics and guardrails**

[METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks), [METRIC-003](./PRODUCT_STRATEGY.md#metric-003--unassisted-transfer-accuracy), [METRIC-004](./PRODUCT_STRATEGY.md#metric-004--feedback-to-follow-up-drill-conversion)

**Release acceptance summary**

A diagnosed grammar or strategy gap can move from lesson to controlled practice to unseen transfer, with mistakes landing in the Review queue rather than a module-private list.

### PRD-008 — Media learning loop

**User outcome**

The learner can practise from original audio or video, shadow or dictate with a real microphone, and resume without treating a missing transcript or missing mic as a completed score.

**In-scope behaviour**

- original media/audio;
- full transcript versions and timestamps;
- Shadowing and Dictation;
- sentence/segment progression;
- speed/repeat/wait/A–B loop;
- word-level diff;
- real microphone input;
- honest pronunciation/prosody availability;
- resume.

Media consumes Sources; Sources keep provenance.

**Explicit exclusions**

- band target inside Media Lab;
- transcript-only pronunciation scoring;
- replacement of YouTube original audio with TTS;
- truncated transcript presented as complete.

**Linked capabilities**

`CAP-MED-IMPORT`, `CAP-MED-TRANSCRIPT`, `CAP-MED-PLAYER`, `CAP-MED-SHADOWING`, `CAP-MED-DICTATION`, `CAP-MED-RESUME`, `CAP-GLB-VOICE`, `CAP-GLB-EVIDENCE`

**Emitted evidence**

Listening/spelling MistakeEvidence from Dictation, fluency/pronunciation evidence from Shadowing only when real audio and valid timestamps/VAD exist, otherwise unavailable.

**Metrics and guardrails**

[METRIC-003](./PRODUCT_STRATEGY.md#metric-003--unassisted-transfer-accuracy), [METRIC-006](./PRODUCT_STRATEGY.md#metric-006--cost-per-completed-learning-loop), [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents)

**Release acceptance summary**

Shadowing and Dictation run on original media, resume preserves version, and missing mic/audio/transcript is unavailable rather than a fabricated pronunciation score.

### PRD-009 — Four-skill IELTS Practice

**User outcome**

The learner can practise Reading, Listening, Writing and Speaking with valid engines, honest assistance flags, and Writing/Speaking estimates that stay labelled experimental until independent calibration exists.

**In-scope behaviour**

- Reading, Listening, Writing and Speaking;
- valid question engines;
- hint/reveal tracking;
- assisted/unassisted evidence;
- save/resume;
- feedback-to-action;
- mistake emission;
- source provenance;
- AI estimated band — experimental for Writing/Speaking until independent expert calibration;
- no pronunciation without audio.

Practice accepts ValidatedPracticeDraft from Artifact Studio and owns final Practice persistence. Live Hub conversion into Practice is Practice-owned.

**Explicit exclusions**

Practice does not own cross-module mastery policy. AI-written drafts are not Independent Production. Missing audio makes pronunciation/prosody unavailable.

**Linked capabilities**

`CAP-PRC-READING`, `CAP-PRC-LISTENING`, `CAP-PRC-WRITING`, `CAP-PRC-SPEAKING`, `CAP-PRC-LIVE-HUB-CONVERT`, `CAP-GLB-EVIDENCE`, `CAP-GLB-SCORING-CALIBRATION`, `CAP-GLB-CONTENT-QUALITY`

**Emitted evidence**

Skill evidence, assisted/unassisted flags, MistakeEvidence, and labelled AI estimated band — experimental. Independent Production only from learner writing or real speaking audio.

**Metrics and guardrails**

[METRIC-003](./PRODUCT_STRATEGY.md#metric-003--unassisted-transfer-accuracy), [METRIC-004](./PRODUCT_STRATEGY.md#metric-004--feedback-to-follow-up-drill-conversion), [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents)

**Release acceptance summary**

All four skills can complete an attempt with hint/reveal tracked, invalid packages or missing audio marked unavailable, and Writing/Speaking results labelled AI estimated band — experimental.

### PRD-010 — IELTS Mock

**User outcome**

The learner can sit a computer-delivered Mock only when the package is valid, resume after interruption, and receive a report that distinguishes deterministic raw scores from labelled estimates.

**In-scope behaviour**

- staged build;
- validated immutable package;
- 40 Listening;
- 40 Reading;
- 2 Writing tasks;
- 3 Speaking parts;
- valid complete audio;
- strict exam state;
- timers and CDI interactions;
- autosave/resume;
- submit/report/history;
- deterministic Listening/Reading raw scores;
- labelled Writing/Speaking AI estimates;
- independent assessment evidence;
- provenance.

“Vào phòng thi thử ngay” must only be available when the package is ready and persisted. Mock accepts ValidatedMockDraft; Mock owns final section/package persistence.

**Explicit exclusions**

Custom Mock authoring is advanced, not Beta. Invalid or cut audio cannot be ready. Independent Mock evidence is stronger than assisted Practice and must not be mixed without labelling.

**Linked capabilities**

`CAP-MCK-BUILD`, `CAP-MCK-VALIDATE`, `CAP-MCK-EXAM`, `CAP-MCK-RESUME`, `CAP-MCK-REPORT`, `CAP-MCK-LIVE-HUB-CONVERT`, `CAP-GLB-CONTENT-QUALITY`, `CAP-GLB-SCORING-CALIBRATION`, `CAP-GLB-EVIDENCE`

**Emitted evidence**

Unassisted Independent Assessment Evidence, deterministic Listening/Reading raw scores, labelled Writing/Speaking AI estimated band — experimental, unavailable gaps, and package provenance.

**Metrics and guardrails**

[METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks), [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents)

**Release acceptance summary**

A learner cannot enter exam on an unready package, reload preserves package and remaining time, and the report never presents an experimental estimate as an official band.

### PRD-011 — Review and Progress

**User outcome**

The learner can open one mistake drawer, complete due reviews, see mastery and relapse honestly, and inspect the evidence behind any progress claim.

**In-scope behaviour**

Unified mistake lifecycle, due reviews, canonical checking, mastery/archive, relapse, evidence drawer, competency trends, retention, transfer and next action. Progress claims must expose evidence and must not derive from XP/streak alone. Mastery status and review-queue status remain orthogonal.

**Explicit exclusions**

XP, streak, time-on-task, reveal, copied model answer, and AI-written response are not improvement. Privacy hard-delete is owned by Identity, not by mastery archive.

**Linked capabilities**

`CAP-REV-MISTAKE`, `CAP-REV-DUE`, `CAP-REV-MASTERY`, `CAP-REV-RELAPSE`, `CAP-REV-PROGRESS`, `CAP-REV-RECOMMEND`, `CAP-GLB-EVIDENCE`, `CAP-GLB-LEARNER-PROFILE`

**Emitted evidence**

Canonical MistakeEvidence, CompetencyState including relapsed, due-queue states, and progress snapshots with evidence links.

**Metrics and guardrails**

[METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks), [METRIC-002](./PRODUCT_STRATEGY.md#metric-002--target-mistake-recurrence-rate), [METRIC-005](./PRODUCT_STRATEGY.md#metric-005--d7-learner-retention)

**Release acceptance summary**

Review can show a mistake both mastered and removed from the active queue, a relapse can re-enter Daily Coach, and a progress claim always links to evidence classes rather than XP.

### PRD-012 — AI transparency and truthful provider behaviour

**User outcome**

The learner can tell which outputs are deterministic, AI-estimated, cited from selected sources, cited from the public web, stale, or unavailable, and can keep working when a provider fails.

**In-scope behaviour**

- capability-compatible routing;
- structured validation;
- declared provider/tool use;
- confidence and limitations;
- request ID safe for logs;
- retry only recoverable failures;
- fresh/stale/unavailable;
- bounded repair;
- no fabricated fallback output;
- explicit Research action;
- source fact/note versus learner-performance evidence distinction;
- browser fallback where appropriate;
- quota/cost awareness.

Tutor output is cited notes, source-backed facts, or Idea Bank entries with provenance. It must not increment CompetencyState evidence counters.

Private Web Bridge (`CAP-GLB-PRIVATE-WEB-BRIDGE`) may be referenced only as founder/invite-only advanced research; it cannot be a Public Beta or paid entitlement dependency; public/paid shared bridge remains rejected (`CAP-GLB-PUBLIC-SHARED-WEB-BRIDGE`).

**Explicit exclusions**

No silent public-web search, no per-submission human grading requirement, no fabricated answer key/audio/citation/transcript/ready state, and no official or examiner-equivalent scoring claim before independent calibration.

**Linked capabilities**

`CAP-GLB-AI-ROUTER`, `CAP-GLB-TUTOR`, `CAP-GLB-VOICE`, `CAP-GLB-SEARCH`, `CAP-GLB-SCORING-CALIBRATION`, `CAP-GLB-CONTENT-QUALITY`, `CAP-GLB-IDENTITY`

**Emitted evidence**

Provider traces, schema/quality gate status, official_anchor / founder_reviewed / community_weak_label / optional external_expert_reviewed calibration versions, and honest unavailable/degraded states. Not learner mastery.

**Metrics and guardrails**

[METRIC-006](./PRODUCT_STRATEGY.md#metric-006--cost-per-completed-learning-loop), [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents), [GUARD-002](./PRODUCT_STRATEGY.md#guard-002--secret-or-privacy-incidents), [GUARD-004](./PRODUCT_STRATEGY.md#guard-004--public-dependency-on-private-web-bridge)

**Release acceptance summary**

Every AI/Search/Voice path has a declared provider, a fallback or unavailable state, a quality or calibration label, and no Public Beta journey that requires Private Web Bridge.

### PRD-013 — Degraded and offline continuity

**User outcome**

When AI, Search, or the network fails, the learner can still use saved and deterministic work, see an honest unavailable state, and resume later without a fake completion.

**In-scope behaviour**

Deterministic/saved paths when AI/Search fails:

- cached/local content where valid;
- browser voice fallback;
- honest unavailable state;
- resumable jobs;
- attempt persistence;
- stale snapshot timestamp;
- retry/recovery action;
- no fake completion.

Offline/degraded mode must not claim fresh Search, generated scoring or completed provider jobs.

**Explicit exclusions**

Degraded sessions are not completed learning loops. They must not be counted in the [METRIC-006](./PRODUCT_STRATEGY.md#metric-006--cost-per-completed-learning-loop) completed-loop denominator.

**Linked capabilities**

`CAP-GLB-APP-SHELL`, `CAP-GLB-AI-ROUTER`, `CAP-MCK-RESUME`, `CAP-MED-RESUME`, `CAP-SRC-IMPORT-BATCH`, `CAP-REV-DUE`

**Emitted evidence**

Job/attempt snapshots, degraded and unavailable presentation states, and recovery actions. No fabricated scores or ready artifacts.

**Metrics and guardrails**

[METRIC-006](./PRODUCT_STRATEGY.md#metric-006--cost-per-completed-learning-loop), [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents)

**Release acceptance summary**

Reload during Mock or Media preserves the same package/version, import jobs remain independent and resumable, due reviews remain reachable from cache when valid, and provider failure never writes a completed loop.

## Non-functional Requirements

### NFR-001 — Performance and responsive feedback

**Constraint**

Copy the approved targets exactly:

- usable shell p75 ≤ 2.5 seconds on a representative mobile connection;
- cached module navigation ≤ 500 ms;
- local autosave acknowledgement ≤ 300 ms;
- visible interaction feedback ≤ 100 ms;
- long-running work represented as resumable jobs with progress;
- advanced modules/provider SDKs lazy-loaded.

Do not invent additional numeric targets in this PRD.

**Affected capabilities**

`CAP-GLB-APP-SHELL`, `CAP-SRC-IMPORT-BATCH`, `CAP-MCK-EXAM`, `CAP-MCK-RESUME`, `CAP-PRC-SPEAKING`, `CAP-GLB-AI-ROUTER`

**Verification summary**

Measure shell and cached navigation on a representative mobile connection, confirm autosave acknowledgement and interaction feedback on deterministic paths, and confirm advanced SDKs are not in the initial Public Beta bundle.

### NFR-002 — Reliability, persistence, idempotency and recovery

**Constraint**

- attempts survive reload;
- important artifacts survive server restart;
- jobs idempotent, retryable, cancellable and time-bounded;
- provider failure cannot create a fake artifact;
- stale snapshots show timestamps;
- external calls have scrubbed request IDs and capability-aware circuit breakers.

**Affected capabilities**

`CAP-MCK-RESUME`, `CAP-MED-RESUME`, `CAP-SRC-IMPORT-BATCH`, `CAP-GLB-AI-ROUTER`, `CAP-GLB-CONTENT-QUALITY`, `CAP-REV-DUE`

**Verification summary**

Reload and restart fixtures must restore the same attempt/package/job identity. Provider-error fixtures must yield unavailable or rejected, never a ready fake. Request IDs in logs must not contain secrets.

### NFR-003 — WCAG 2.2 AA accessibility and Public Beta compatibility

**Constraint**

- WCAG 2.2 AA target;
- keyboard-only operation;
- visible focus;
- screen-reader labels and semantic states;
- touch-safe controls;
- reduced motion;
- adequate contrast;
- no colour-only meaning;
- current Chrome/Edge;
- desktop ≥ 1280 px;
- mobile 360–430 px;
- responsive tablets;
- Safari/Firefox expansion after core validation.

**Affected capabilities**

`CAP-GLB-APP-SHELL` and every core module surface it hosts.

**Verification summary**

Keyboard-only journeys for onboarding, one Sources import, one Practice attempt, one Mock resume, and one Review due item. Contrast, focus, and semantic states are acceptance criteria of the later UX SPEC, not a claim that they already pass.

### NFR-004 — Security, privacy, ownership, retention and deletion

**Constraint**

- owner RLS;
- validated auth;
- encrypted credentials;
- no secret reflection;
- raw microphone audio not stored by default;
- explicit consent for transcript/telemetry storage and hosted OCR;
- export/delete;
- privacy hard-delete;
- file/MIME/decompression limits;
- HTML sanitisation;
- rate limits;
- secret-safe logs;
- Private Web Bridge/Sub2API isolated from public entitlements;
- content rights and provenance.

**Affected capabilities**

`CAP-GLB-IDENTITY`, `CAP-GLB-LEARNER-PROFILE`, `CAP-SRC-PROVENANCE`, `CAP-PRC-SPEAKING`, `CAP-MED-SHADOWING`, `CAP-GLB-PRIVATE-WEB-BRIDGE`

**Verification summary**

Owner RLS, export/delete/hard-delete, consent-gated audio/OCR, sanitised HTML, and zero public entitlement on Private Web Bridge are release blockers. Hosted OCR remains off by default (`CAP-SRC-HOSTED-OCR`).

### NFR-005 — AI/provider cost budgets, observability and kill switches

**Constraint**

For every AI/Search/Voice capability require:

- maximum call count;
- token/input/output limits;
- cache policy;
- fallback policy;
- quota class;
- cost attribution;
- p50/p95 latency;
- schema/provider success;
- circuit breaker;
- feature flag/kill switch.

Do not invent monetary budgets before dogfooding establishes baselines.

**Affected capabilities**

`CAP-GLB-AI-ROUTER`, `CAP-GLB-TUTOR`, `CAP-GLB-VOICE`, `CAP-GLB-SEARCH`, `CAP-GLB-SCORING-CALIBRATION`, `CAP-GLB-CONTENT-QUALITY`, `CAP-SRC-GROUNDED-CHAT`, `CAP-SRC-ARTIFACT-STUDIO`

**Verification summary**

Each listed capability has documented limits, fallback, kill switch, and cost attribution before Public Beta. Missing cost/limit policy or rollback flag blocks release.

## Learning and Assessment Requirements

This section references, and does not redefine, the [Learning and Assessment Framework](./LEARNING_AND_ASSESSMENT_FRAMEWORK.md).

Public Beta must implement:

- the shared loop in PRD-003;
- the evidence hierarchy (Exposure through Independent Assessment Evidence);
- the mastery lifecycle `unseen → introduced → practising → stable → mastered → relapsed`;
- independent evidence for progress claims;
- assessment layers including placement, practice, mock, and Week 4 unseen reassessment;
- Writing/Speaking estimate policy: AI estimated band — experimental until independent expert calibration, with honest unavailable;
- solo-founder scoring calibration (`CAP-GLB-SCORING-CALIBRATION`) using official_anchor, founder_reviewed, community_weak_label, and optional external_expert_reviewed;
- generated content quality gate (`CAP-GLB-CONTENT-QUALITY`);
- explainable recommendations (PRD-004);
- no fabricated learning claims.

## AI, Provider, and Cost Policy

Official AI/BYOK and browser providers are allowed. Search is explicit. Private Web Bridge is isolated research only and cannot be a Public Beta or paid entitlement dependency. Open-source tools remain replaceable dependencies of owned capabilities. Cost is measured by [METRIC-006](./PRODUCT_STRATEGY.md#metric-006--cost-per-completed-learning-loop). Public Beta operations are solo-founder constrained; no permanent teacher/reviewer operation is assumed.

## Privacy, Security, and Content Rights

Identity owns authentication, consent, RLS, export, and privacy hard-delete. Hard-delete overrides learning-history retention. Raw microphone audio is not stored by default. Content rights and provenance are mandatory for sources and generated artifacts. Unsupported official or real-exam claims are [GUARD-003](./PRODUCT_STRATEGY.md#guard-003--unsupported-official-or-real-exam-claims) incidents.

## Success Metrics and Guardrails

Reference, do not redefine:

- [METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks)
- [METRIC-002](./PRODUCT_STRATEGY.md#metric-002--target-mistake-recurrence-rate)
- [METRIC-003](./PRODUCT_STRATEGY.md#metric-003--unassisted-transfer-accuracy)
- [METRIC-004](./PRODUCT_STRATEGY.md#metric-004--feedback-to-follow-up-drill-conversion)
- [METRIC-005](./PRODUCT_STRATEGY.md#metric-005--d7-learner-retention)
- [METRIC-006](./PRODUCT_STRATEGY.md#metric-006--cost-per-completed-learning-loop)
- [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents)
- [GUARD-002](./PRODUCT_STRATEGY.md#guard-002--secret-or-privacy-incidents)
- [GUARD-003](./PRODUCT_STRATEGY.md#guard-003--unsupported-official-or-real-exam-claims)
- [GUARD-004](./PRODUCT_STRATEGY.md#guard-004--public-dependency-on-private-web-bridge)

Alpha establishes baselines. Provisional Beta hypotheses are not marketing claims. North-star eligibility requires:

- recorded baseline;
- sufficient completed learning loops;
- unseen reassessment;
- consented/pseudonymous measurement.

Incomplete, cancelled, provider-failed and honestly degraded sessions are excluded from the completed-loop denominator. D7 is engagement context, not learning proof.

## Pilot Design

- Alpha: approximately 10–20 Vietnamese IELTS Academic self-learners around Band 4.5–6.5.
- Four-week pilot: approximately 30–60 when operationally manageable.
- Week 0 baseline.
- Weeks 1–3 targeted loops.
- Week 2 retention probe.
- Week 4 unseen reassessment.
- Optional delayed retention after Week 4.

Numeric hypotheses from the approved design remain labelled provisional product hypotheses. They are not marketing claims and not proof that efficacy already exists.

## Release Blocking Conditions

Public Beta is blocked by any of:

- open P0/P1;
- missing core UX contract;
- missing evidence emission;
- decorative/non-transitioning Beta control;
- fake score/transcript/audio/citation/real-exam/mastery/progress;
- invalid provenance or rights status;
- missing owner RLS;
- missing export/delete/hard-delete;
- deterministic gate failure;
- required live canary older than 24 hours or never passed;
- accessibility failure;
- cost/limit policy missing;
- rollback flag missing;
- public dependency on Private Web Bridge;
- unsupported official/examiner-equivalent claim.

## Definition of Public Beta Success

Public Beta succeeds only when all of the following are true:

- primary Band 5.0–5.5 segment can complete the core learning loop;
- adjacent 4.5–5.0 and 6.0–6.5 flows are honest and usable within approved scope;
- all seven modules have at least one complete evidence-emitting journey;
- no open release blocker;
- metrics can be measured without fabricating missing data;
- provider failures degrade honestly;
- Product Owner has approved the PRD;
- Domain SPEC, Architecture and Epic Delivery Specs remain separate, required next artifacts.

## Dependencies and Assumptions

- React/Vite/Express modular monolith remains the current architecture baseline until a later Architecture decision changes it.
- Supabase remains current auth/data platform.
- Official AI/BYOK and browser providers are allowed.
- Private Web Bridge is isolated research only.
- Open-source tools remain replaceable dependencies.
- Public Beta operations are solo-founder constrained.
- No permanent teacher/reviewer operation is assumed.
- No broad migration to Next.js/Python/Open-WebUI/Chainlit.
- Long-term Band 3.0–9.0 support does not mean every track ships in Beta.

Visual-direction handoff:

- The PRD records only that Omni requires a distinctive, accessible, red-forward visual direction for the later UX/Design System phase.
- IZONE practice experience may be used as a visual reference, not copied.
- Exam and Practice surfaces remain task-first and restrained.
- Final tokens, typography, composition and motion require a separate Product Design brief, source screenshots and approved prototype.
- This document does not name or import a visual-tool skill as a product requirement.

## Traceability and Next Specifications

- Task 6 creates the requirement-to-capability matrix.
- Domain UX/System SPEC, Architecture/ADRs and Epic Delivery Specs are not implemented by this task.
- Each later Epic must consume PRD and CAP IDs.
- Every Epic requires UX flow, state/API/data contracts, acceptance criteria, fixtures, migration/rollback and verification evidence.
- No requirement may silently redefine capability ownership.
