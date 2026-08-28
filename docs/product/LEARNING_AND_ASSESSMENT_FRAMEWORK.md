# Omni IELTS Learning and Assessment Framework

Status: Draft — awaiting Product Owner review

Approved Design Baseline:
[Omni IELTS Product Rebuild Design](../superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md)

Product Strategy:
[Omni IELTS Product Strategy](./PRODUCT_STRATEGY.md)

This document owns competency, mastery, evidence, mistake, feedback, recommendation, assessment, and efficacy-pilot rules used by every capability and PRD requirement. It does not replace the approved design and does not author production features. Domain SPEC and Architecture documents may refine implementation; they cannot silently contradict the contracts below.

Metric and guardrail identifiers in this document are references to definitions owned by Product Strategy. This framework does not define `METRIC-*`, `GUARD-*`, `CAP-*`, or `PRD-*` identifiers.

## Purpose and Evidence Principles

Omni IELTS is an **IELTS-first comprehensive preparation platform** for Vietnamese self-learners preparing for IELTS Academic. A learning activity is useful only when it produces evidence that a learner can apply a competency without distorting help, or when the product honestly reports that evidence is `unavailable` or `degraded`.

Normative rules (“must” / “must not”) below are product contracts. Explanatory guidance describes why the rule exists or how a track should apply it; guidance cannot weaken a normative rule.

Normative evidence principles:

1. Every core activity must participate in the Shared Learning Loop or stop with an honest `unavailable` or `degraded` continuation state.
2. Evidence class, assisted/unassisted state, source artifact, and validity must be recorded before any mastery, progress, recommendation, or band-estimate claim.
3. Exposure, Assisted Performance, XP, streak, and time-on-task must not create mastery, progress, or band claims.
4. Reveal answer, copied model answers, AI-written responses, empty audio, missing timestamps, and unsupported grader output must not count as completion, Independent Production, or mastery.
5. Current band and target band may personalise track, task difficulty, and feedback density. They must not be treated as proof that the learner improved.
6. CEFR levels and IELTS bands must not be treated as an exact one-to-one conversion.
7. Missing evidence must be labelled `unavailable`. Partial but untrustworthy evidence must be labelled `degraded`. The product must not invent a default band, transcript, pronunciation score, or progress claim when evidence is missing.
8. English Foundation is adaptive support inside an IELTS product. It must not convert Omni into a general English application.

These principles operationalise [METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks) through [METRIC-004](./PRODUCT_STRATEGY.md#metric-004--feedback-to-follow-up-drill-conversion) and [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents) / [GUARD-003](./PRODUCT_STRATEGY.md#guard-003--unsupported-official-or-real-exam-claims). [METRIC-005](./PRODUCT_STRATEGY.md#metric-005--d7-learner-retention) remains an engagement indicator, not a learning outcome.

## Shared Learning Loop

Every core activity uses this canonical loop:

```text
Diagnose
→ Learn
→ Controlled Practice
→ Feedback
→ Retrieval
→ Transfer
→ Independent Assessment
→ Update learner model
→ Recommend next action
```

An activity may enter at a later stage. A Mini Mock or Full Mock may start at Independent Assessment. A due Mistake Drill may start at Retrieval. The loop must not end without emitting evidence or an honest `unavailable` / `degraded` state.

This framework loop is the source of truth for later capability and PRD work. It maps to the approved design as follows:

| Framework stage | Approved-design counterpart | Contract |
|---|---|---|
| Diagnose | Diagnose | Find competency gaps and missing evidence |
| Learn | Learn | Introduce or re-teach; Exposure only |
| Controlled Practice | Controlled Practice; Independent Production when unassisted | Scaffold is allowed; assistance must be recorded |
| Feedback | Feedback and remediation | Explain the error and attach a next action |
| Retrieval | Spaced review | Delayed unassisted recall; not a just-seen answer |
| Transfer | Transfer task | New context or new question; no scaffold that hides the skill |
| Independent Assessment | Independent Assessment | No assistance that would distort competence |
| Update learner model | Learner profile update | Write `CompetencyState` and `MistakeEvidence` |
| Recommend next action | Explainable recommendation | Evidence-based next step; never a forced path |

### Diagnose

Diagnose must identify:

- which competency nodes are `unseen`, weak, `relapsed`, or blocked by prerequisites;
- which evidence classes are missing, especially Unassisted Retrieval, Transfer, and Independent Assessment Evidence;
- which mistake taxonomy items are `active`, `due`, or `relapsed`.

Diagnose must not invent an official band. A placement result is an approximate starting point for personalisation.

### Learn

Learn introduces the competency with instruction, worked examples, and, for Foundation Repairer, bilingual explanation. Completing Learn creates **Exposure** only. It must not mark the competency `stable` or `mastered`.

### Controlled Practice

Controlled Practice may use scaffold, hint, word bank, transcript, or model annotation. Those attempts are **Assisted Performance**. Removing the scaffold in the same session may produce Unassisted Retrieval or Independent Production only if the learner did not just view the canonical answer.

Reveal answer must not be treated as completion of Controlled Practice.

### Feedback

Feedback must answer five questions: what happened, where it happened, why it happened, how to correct it, and what to practise next. For Plateaued Intermediate and Band Optimizer, feedback without a linked follow-up drill is incomplete.

### Retrieval

Retrieval must occur after a delay and without relying on an answer the learner has just seen. Items with reveal, on-screen transcript, or a word bank are not Retrieval. Retrieval evidence is Unassisted Retrieval when valid.

### Transfer

Transfer must use a new context, topic, genre, or question stem. Repeating a known item, even unassisted, is not Transfer. Transfer is the minimum evidence class that, together with repeated unassisted evidence, may move a competency toward `mastered`.

### Independent Assessment

Independent Assessment must have no assistance that would distort competence: no hint, no reveal, no word bank, no live tutor help, no model answer in view, and no undeclared extra time. Independent Assessment Evidence outranks Transfer when both are valid.

### Update learner model

The loop must write `CompetencyState` and, when an error is detected, `MistakeEvidence`. Provider failure, missing audio, invalid packages, or failed validation must write `unavailable` or `degraded` rather than a guessed mastery or band.

### Recommend next action

The product must propose a next action with an evidence-based reason. Daily Coach may recommend; it must not replace module choice or force a single daily path. The learner must be able to open **Vì sao tôi được đề xuất bài này?** and see the triggering evidence.

## Competency Graph

The competency graph is a **relational model**, not a content catalogue. Each node has prerequisites, allowed evidence classes, and a linked mistake taxonomy. A learner is not “at Band 5.5”; the learner has a vector of node states with confidence and missing-evidence flags.

```text
IELTS Academic
├── Foundation
│   ├── Core vocabulary
│   ├── Grammar control
│   ├── Sentence construction
│   ├── Phonological awareness
│   └── Basic comprehension
├── Listening
│   ├── Detail
│   ├── Spelling
│   ├── Connected speech
│   ├── Distractor recognition
│   ├── Attitude and purpose
│   └── IELTS listening question types
├── Reading
│   ├── Skimming
│   ├── Scanning
│   ├── Paraphrase recognition
│   ├── Inference
│   ├── Reference tracking
│   └── IELTS reading question types
├── Writing
│   ├── Task Achievement / Task Response
│   ├── Idea development
│   ├── Paragraph unity
│   ├── Cohesion
│   ├── Lexical precision
│   ├── Grammar accuracy
│   ├── Task 1 overview
│   └── Task 1 data selection
└── Speaking
    ├── Fluency
    ├── Coherence
    ├── Interaction
    ├── Lexical resource
    ├── Grammar
    ├── Pronunciation
    ├── Prosody
    └── Part 1, Part 2 and Part 3 skills
```

### Graph contracts

Each node must declare:

- `competencyId` in the form `{family}.{node}` (example: `listening.distractor_recognition`);
- skill family (`foundation` | `listening` | `reading` | `writing` | `speaking`);
- prerequisite node ids that must reach at least `stable` before the node is recommended as a primary target;
- evidence classes that can demonstrate the node;
- mistake taxonomy codes that attach to the node;
- whether the node is in Public Beta scope for the learner’s track.

Prerequisite examples (normative for recommendation, not a database schema):

- `writing.idea_development` requires `foundation.core_vocabulary` and `foundation.sentence_construction`.
- `listening.connected_speech` requires `foundation.phonological_awareness`.
- `reading.inference` requires `reading.paraphrase_recognition` and `foundation.basic_comprehension`.
- `speaking.prosody` requires `speaking.pronunciation` and valid audio evidence.
- Advanced IELTS question-type nodes require the underlying skill nodes. Example: map labelling requires `listening.detail` plus spatial lexical resource.

The product must not recommend an advanced node as the primary next action while a blocking prerequisite is `unseen`, `practising`, or `relapsed`.

### Foundation branch

Foundation nodes exist so the product can repair blocking English gaps without becoming a general English school.

| Node | What it owns | Typical mistake taxonomy |
|---|---|---|
| Core vocabulary | high-frequency Academic words, collocations, word family, meaning in context | wrong sense, missing collocation, form error |
| Grammar control | articles, agreement, tense/aspect needed for IELTS tasks | article, subject-verb, tense shift |
| Sentence construction | clause control, simple-to-complex sentences | fragment, run-on, unclear subject |
| Phonological awareness | sound-spelling, word stress, reduced forms as input to listening/speaking | phoneme confusion, stress error |
| Basic comprehension | gist of short Academic input before exam-type items | gist miss, keyword-only reading |

English Foundation must stay IELTS-oriented: example sentences, topics, and transfer tasks remain Academic exam-relevant. It must not ship an A1–C2 general English curriculum in Public Beta.

### Listening branch

| Node | Demonstration | Notes |
|---|---|---|
| Detail | exact fact, number, name, or condition from audio | spelling is a separate node when the error is orthographic |
| Spelling | written form of heard words/numbers | homophones and letter-level errors |
| Connected speech | reduced forms, linking, weak forms | requires original audio, not transcript-only |
| Distractor recognition | rejecting plausible but wrong options | common Plateaued Intermediate failure |
| Attitude and purpose | speaker stance, function, reason | not scored from a transcript substitute |
| IELTS listening question types | form/note/table/flow-chart/summary completion, multiple choice, matching, map/plan/diagram labelling, sentence completion, short answer | coverage target, not a claim of official item banks |

### Reading branch

| Node | Demonstration | Notes |
|---|---|---|
| Skimming | gist and text structure under time | not the same as scanning |
| Scanning | locating a specific name, number, or phrase | must still check meaning |
| Paraphrase recognition | matching a question to a rewritten sentence | primary plateau driver |
| Inference | a conclusion required by the text but not stated verbatim | must not be guessed from world knowledge alone |
| Reference tracking | resolving pronouns and cohesive links | linked to cohesion mistakes in writing |
| IELTS reading question types | multiple choice, T/F/NG, Y/N/NG, matching headings/information/features/endings, sentence/summary/note/table/flow-chart completion, diagram labels, short answer | Academic coverage target |

True/False/Not Given and Yes/No/Not Given must be taught as distinct decision rules. Treating them as interchangeable is a product error.

### Writing branch

Task Achievement applies to Academic Task 1. Task Response applies to Task 2. The shared node label is **Task Achievement / Task Response**; reports must still name the task type.

| Node | Demonstration |
|---|---|
| Task Achievement / Task Response | addresses the prompt with an overview (Task 1) or a position (Task 2) |
| Idea development | relevant support, not a list of undeveloped points |
| Paragraph unity | one controlling idea per paragraph |
| Cohesion | reference, substitution, and logical linking without mechanical overuse |
| Lexical precision | meaning-fit and collocation, not rare-word stuffing |
| Grammar accuracy | control of the structures attempted |
| Task 1 overview | a clear summary of main trends/differences, not a dump of numbers |
| Task 1 data selection | selects significant data and groups it |

A copied or AI-written response must not create Independent Production evidence for any Writing node.

### Speaking branch

| Node | Demonstration | Evidence constraint |
|---|---|---|
| Fluency | continuity and hesitation pattern on a valid recording | requires real audio |
| Coherence | staging of ideas across a turn | transcript may assist analysis; audio still required for the attempt |
| Interaction | examiner-style follow-up handling | Part 1 and Part 3 |
| Lexical resource | range and precision in speech | not inferred from a typed script the learner did not speak |
| Grammar | control of spoken structures | same as lexical resource |
| Pronunciation | segmental accuracy | **unavailable** without real audio |
| Prosody | stress, rhythm, intonation | **unavailable** without real audio |
| Part 1, Part 2 and Part 3 skills | short interview, long turn, discussion | Part 2 long turn is not evidence for Part 3 interaction |

WPM is a descriptive fluency signal only. It must not be converted into an IELTS band.

## Track-specific Progression from Band 3.0 to 9.0

Omni IELTS is an IELTS-first comprehensive preparation platform. Public Beta is **Vietnam-first**, **Academic-first**, and **self-learner-first**. Long-term architecture supports Band 3.0–9.0 through **separate adaptive tracks**. The product must not stretch one curriculum across that range by changing a `targetBand` field.

Current band and target band personalise which track, which prerequisite gates, and how dense feedback is. They must not themselves create progress evidence.

CEFR may be used only as a coarse Foundation placement hint. The product must display that CEFR and IELTS are not an exact one-to-one conversion. A CEFR label must not be shown as an IELTS band, and an IELTS estimate must not be shown as a CEFR level.

### Public Beta tracks

| Track | Band range | Role in Beta | Loop emphasis | Assessment default |
|---|---|---|---|---|
| Foundation Repairer | 4.5–5.0 | adjacent Beta track | Diagnose → Learn → scaffolded Controlled Practice → bilingual Feedback → delayed Retrieval | short Skill Checks; Mini Mock only when foundation gates allow |
| Plateaued Intermediate | 5.0–5.5 | **primary Public Beta segment** | Feedback → Retrieval → Transfer → Independent Assessment | Skill Checks plus Mini Mock; Full Mock when the learner is exam-close |
| Band Optimizer | 6.0–6.5 | adjacent Beta track | timed Controlled Practice → criterion Feedback → Transfer → Independent Assessment | Mini Mock and Full Mock as independent evidence |

### Foundation Repairer (Band 4.5–5.0)

The track repairs meaning-loss and foundation errors that block IELTS tasks.

Must:

- limit simultaneous feedback to about 1–3 priorities;
- allow Vietnamese–English explanation;
- keep Controlled Practice scaffolds available until Unassisted Retrieval succeeds on the same competency;
- treat English Foundation as adaptive support, not a separate general English product.

Must not:

- open Full Mock as the default next action while foundation prerequisites are `unseen` or `relapsed`;
- present a long criterion dump the learner cannot act on.

### Plateaued Intermediate (Band 5.0–5.5)

This is the default Beta UX, curriculum depth, feedback density, and research sample.

Must:

- attach taxonomy, root cause, corrective drill, and rewrite/retry to feedback;
- demand Transfer on a new item before claiming the plateau is moving;
- keep Daily Coach recommend-only.

Typical target nodes: paraphrase recognition, distractor recognition, cohesion, idea development, lexical precision, and the learner’s recurring grammar taxonomy.

### Band Optimizer (Band 6.0–6.5)

The track trains timed, criterion-level performance.

Must:

- give IELTS-criterion feedback (Task Achievement / Task Response, coherence and cohesion, lexical resource, grammatical range and accuracy; for Speaking also fluency, pronunciation, and prosody when audio is valid);
- focus on nuance, precision, flexibility, and Transfer;
- use Mini Mock and Full Mock as Independent Assessment Evidence.

Must not produce a long unactionable error list.

### Long-term architecture

These tracks are part of the Band 3.0–9.0 architecture. They are not Public Beta promises.

| Track | Band range | Distinct response |
|---|---|---|
| Foundation expansion | Band 3.0–4.5 | stronger scaffolding and a later foundation curriculum; still IELTS-oriented |
| Advanced expansion | Band 6.5–8.0 | register, complex reasoning, human-calibrated benchmarks |
| Expert refinement | Band 8.0–9.0 | rare-error analysis and multiple independent or human-calibrated assessments |

Public Beta must not claim that a 4.5–6.5 curriculum already serves Band 3.0 or Band 9.0.

## Mastery Lifecycle

Canonical states, in order:

```text
unseen → introduced → practising → stable → mastered → relapsed
```

| State | Meaning | Allowed by |
|---|---|---|
| `unseen` | no valid instructional or performance evidence | default |
| `introduced` | taught or shown; not remembered | Exposure or first Learn |
| `practising` | the learner is working the node with mixed assistance | Assisted Performance and early Unassisted Retrieval |
| `stable` | repeated unassisted controlled performance | Unassisted Retrieval or Independent Production, repeated, not immediately after reveal |
| `mastered` | retained and transferable | repeated unassisted evidence **plus** Transfer or Independent Assessment Evidence |
| `relapsed` | a previously `stable` or `mastered` error reappeared in independent work | independent Practice or Mock mistake; taxonomy recurrence |

Normative mastery rules:

1. Exposure must not create `mastered`. Completing a lesson, opening a card, or playing audio is `introduced` at most.
2. Assisted Performance must not create `stable` or `mastered`.
3. Only repeated unassisted evidence together with Transfer or Independent Assessment Evidence may create `mastered`.
4. `mastered` must not erase history. Previous attempts, mistakes, and evidence records remain archived.
5. When a mastered or stable taxonomy error reappears on independent evidence, the node must move to `relapsed`, confidence must fall, and the item must re-enter Daily Coach and Mistake Drill.
6. Reveal answer must not count as completion or mastery.
7. Copied model answers, AI-written responses, repeated known tests, empty audio, missing timestamps, and unsupported grader output must not move a node to `stable` or `mastered`.

`estimatedMastery` / `confidence` are internal strength signals. They must not be converted directly into an IELTS band.

## Evidence Hierarchy

Canonical type:

```ts
type EvidenceClass =
  | 'exposure'
  | 'assisted_performance'
  | 'unassisted_retrieval'
  | 'independent_production'
  | 'transfer'
  | 'independent_assessment';
```

Readable labels, weakest to strongest:

1. **Exposure** — viewed an explanation, answer, model, or audio. Cannot justify progress, mastery, or band.
2. **Assisted Performance** — used hint, transcript, word bank, scaffold, or tutor help. Useful for teaching; cannot create `stable` or `mastered`.
3. **Unassisted Retrieval** — answered or recalled without help and not immediately after reveal. Can support `practising` → `stable`.
4. **Independent Production** — the learner wrote or spoke without a model answer or AI draft. Required for Writing and Speaking production nodes.
5. **Transfer** — applied the competency in a new topic, genre, or question. Required (with repeated unassisted evidence) for `mastered`.
6. **Independent Assessment Evidence** — succeeded or failed on an unseen Skill Check, Mini Mock, or Full Mock without distorting help. Strongest class for [METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks).

```ts
type EvidenceValidity = 'valid' | 'degraded' | 'unavailable';

interface EvidenceRecord {
  evidenceClass: EvidenceClass;
  assisted: boolean;
  sourceArtifactId: string;
  attemptId: string;
  validity: EvidenceValidity;
  recordedAt: string;
  limitation?: string;
}
```

Validity rules:

- `valid` — package, prompt, attempt, and (where required) audio/timestamps are present and pass schema/quality validation.
- `degraded` — something usable exists but a declared constraint failed (partial audio, stale citation, schema warning). Degraded evidence must remain visible as degraded; it must not be promoted.
- `unavailable` — required input is missing or the provider/job failed. The product must show `unavailable` rather than a placeholder score.

The product must not assign band, progress, or mastery from Exposure, Assisted Performance, XP, streak, or time-on-task.

AI output is not product evidence until it passes schema/quality validation and carries a declared `EvidenceClass`.

## CompetencyState Contract

This is a product contract, not a database schema or migration. Implementation may store additional operational fields; it must not drop the fields below or convert `estimatedMastery` into a band.

```ts
type MasteryState =
  | 'unseen'
  | 'introduced'
  | 'practising'
  | 'stable'
  | 'mastered'
  | 'relapsed';

interface EvidenceSummary {
  byClass: Record<EvidenceClass, number>;
  lastValidUnassistedAt?: string;
  lastTransferAt?: string;
  lastIndependentAssessmentAt?: string;
  records: EvidenceRecord[];
}

interface CompetencyState {
  competencyId: string;
  learnerId: string;
  masteryState: MasteryState;
  confidence: number;
  estimatedMastery: number;
  evidenceSummary: EvidenceSummary;
  lastDemonstratedAt?: string;
  nextReviewAt?: string;
  relapseCount: number;
  updatedAt: string;
  recurringMistakeIds: string[];
  prerequisiteGaps: string[];
}
```

Field rules:

- `masteryState` is the canonical lifecycle state from the approved design (`state`).
- `confidence` is 0–1 and corresponds to the inverse of design `uncertainty`. Low evidence count must keep confidence low.
- `estimatedMastery` is 0–1 strength, not an IELTS band. It must not be shown as a band.
- `evidenceSummary` must distinguish evidence class, assisted/unassisted (`assisted` on each `EvidenceRecord`), source artifact (`sourceArtifactId`), and validity.
- `lastDemonstratedAt` is the last **valid** demonstration (design `lastEvidenceAt`). Reveal, empty audio, and unavailable grader output must not update it.
- `nextReviewAt` may be produced by a scheduler such as FSRS for retrieval nodes; the scheduler does not own mastery policy.
- `relapseCount` increments on each transition into `relapsed` and is never reset by a later `mastered`.
- `recurringMistakeIds` and `prerequisiteGaps` are references, not deleted history.

A CompetencyState write must not occur if the triggering attempt is `unavailable`.

## MistakeEvidence Contract

Mistake evidence is the durable record of a specific learner error. Archiving or mastering a mistake must not delete the record.

```ts
type MistakeLifecycleState =
  | 'active'
  | 'due'
  | 'mastered'
  | 'archived'
  | 'relapsed';

type MistakeReviewState =
  | 'unreviewed'
  | 'scheduled'
  | 'in_review'
  | 'cleared'
  | 'blocked_unavailable';

interface MistakeProvenance {
  module:
    | 'sources'
    | 'vocabulary'
    | 'grammar_strategy'
    | 'media'
    | 'practice'
    | 'mock'
    | 'review_progress';
  sourceVersionId?: string;
  packageId?: string;
  jobId?: string;
  provider?: string;
  citation?: string;
}

interface MistakeEvidence {
  mistakeId: string;
  learnerId: string;
  competencyId: string;
  taxonomy: string;
  sourceArtifactId: string;
  originalPrompt: string;
  learnerResponse: string;
  canonicalAnswer?: string;
  rubricReference?: string;
  detectedAt: string;
  evidenceClass: EvidenceClass;
  lifecycleState: MistakeLifecycleState;
  reviewState: MistakeReviewState;
  provenance: MistakeProvenance;
}
```

Lifecycle:

- `active` — detected and not yet scheduled or still in the current loop.
- `due` — retrieval or drill is scheduled (`nextReviewAt` reached).
- `mastered` — later unassisted Transfer or Independent Assessment Evidence shows the error no longer appears. History remains.
- `archived` — no longer in the live due queue (for example after learner deletion request handling keeps minimum lineage). History remains.
- `relapsed` — the same taxonomy reappeared on independent evidence after `mastered` or a stable period.

`taxonomy` uses `{family}.{class}.{code}` (example: `writing.grammar.article`, `listening.spelling.homophone`). AI may propose taxonomy, but the structured object must pass schema and quality validation before it becomes MistakeEvidence.

`canonicalAnswer` is used for closed items. `rubricReference` is used for Writing and Speaking. At least one of the two must be present for the record to be `valid`.

Review state `blocked_unavailable` is required when a due drill cannot run because audio, package, or provider evidence is `unavailable`. The mistake must not be auto-cleared.

## Feedback Prioritisation by Segment

Feedback answers five questions: what happened, where, why, how to correct it, and what to practise next. Density follows the learner track, not a global “show every error” setting.

### Foundation Repairer

- At most about **1–3** priority issues per turn.
- Bilingual Vietnamese–English explanation is allowed and often required.
- Prioritise errors that lose meaning and foundation errors (core vocabulary, grammar control, sentence construction, phonological awareness, basic comprehension).
- Each issue must include a short example and a single next Controlled Practice or Retrieval action.

### Plateaued Intermediate

- About **3–5** priority issues per turn.
- Each issue must attach taxonomy, root cause, corrective drill, and rewrite/retry.
- This is the **primary Public Beta segment**; default UX and research scoring use this density.
- Recurring taxonomy outranks one-off slips.

### Band Optimizer

- Feedback is organised by IELTS criterion, not by a flat error dump.
- Focus on nuance, precision, flexibility, and Transfer.
- The product must not emit a long list of issues with no next action.
- Pronunciation and prosody comments must be omitted or marked `unavailable` when real audio is missing.

AI may draft taxonomy and comments. Structured feedback must pass schema/quality validation. Invalid feedback is `unavailable`, not a silent drop to an empty “looks good” report.

Conversion of feedback into a completed drill is counted by [METRIC-004](./PRODUCT_STRATEGY.md#metric-004--feedback-to-follow-up-drill-conversion). Opening the report without starting the drill is not conversion.

## Explainable Recommendation Rules

Public Beta must use an explainable rule engine. Opaque machine learning must not decide the learner journey in Beta.

Each recommendation must state:

1. which evidence records triggered it;
2. which `competencyId` values are affected;
3. priority (blocking prerequisite, relapsed taxonomy, due retrieval, exam-close Independent Assessment);
4. the next action (module, artifact, and expected evidence class).

Normative rules:

- The product must not recommend only from XP or streak.
- Missing evidence must be described as missing evidence. The engine must not guess a competency state to keep the coach busy.
- Learners must be able to inspect **Vì sao tôi được đề xuất bài này?**
- Recommendations must not block manual module navigation.
- A blocking prerequisite outranks a higher-band exam task.
- A `relapsed` taxonomy item due for review outranks new Exposure content.
- Independent Assessment is recommended when Transfer has succeeded and an unseen check is missing; it is not recommended as a first action for Foundation Repairer with open foundation gaps.
- Provider failure must recommend a deterministic continuation or an honest stop, never a fabricated drill result.

Example shape:

```text
Recommended: Article Mistake Drill
Reason: Article errors appeared in two recent Writing attempts
and are due for review.
Evidence class required next: unassisted_retrieval, then transfer.
```

## Placement Diagnostic

Purpose: establish a starting track, current-band hypotheses, and prerequisite gaps.

Band policy: approximate placement, **not** an official IELTS band and **not** an “AI estimated band” presented as a result of a full exam.

Must:

- sample Foundation plus four-skill nodes rather than a single overall score;
- record which evidence classes were actually collected;
- write initial `CompetencyState` rows as `introduced` or `practising`, not `mastered`;
- allow the learner to continue if a skill channel is `unavailable` (for example no microphone), with that skill marked `unavailable` rather than scored.

Must not:

- convert CEFR screening items into an IELTS band;
- treat the diagnostic as Independent Assessment Evidence for [METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks) (it is the baseline, not the four-week unseen reassessment);
- fill missing skills with an average of the others.

## Formative Assessment

Purpose: feedback during Learn, Controlled Practice, and Feedback stages.

Band policy: no official-band claim and no dashboard band from formative items.

Formative items may be assisted. Their evidence class is Exposure or Assisted Performance unless the item is explicitly unassisted. Formative success must not be reported as improvement.

Reveal, hint use, and model-answer viewing must be stored on the attempt. A later identical item answered after reveal is not Unassisted Retrieval.

## Skill Checks

Purpose: unseen transfer after a learning unit.

Band policy: subskill evidence, not an overall band.

A Skill Check must:

- use an unseen item (new stem, passage, clip, or prompt);
- run without hint, reveal, or word bank;
- emit Transfer or Independent Assessment Evidence with validity;
- update the targeted `CompetencyState` and any matching `MistakeEvidence`.

A Skill Check on a repeated known item is a Retrieval item, not a Skill Check. The product must not relabel it.

## Mini and Full Mock Evidence

### Mini Mock

Purpose: timed readiness check on a subset of skills or sections.

Band policy: raw score and/or labelled estimate only after validation. Listening/Reading may show a versioned converted band. Writing/Speaking may show only **AI estimated band** under the Writing and Speaking policy.

Mini Mock evidence is Independent Assessment Evidence when the package is valid, the attempt is unassisted, and the item is unseen. A Mini Mock built from items the learner has already practised is degraded for north-star purposes and must not enter the [METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks) denominator as the unseen reassessment.

### Full Mock

Purpose: independent four-skill assessment under computer-delivered exam conditions.

Band policy: deterministic raw scores for Listening/Reading when the package, answer key, and attempt are valid, plus labelled Writing/Speaking estimates. Missing evidence yields `unavailable`, never a default band.

Independent Mock evidence outranks assisted Practice.

### Listening and Reading scoring

When package, answer key, and attempt are valid, Listening and Reading raw scores are deterministic.

Band conversion must use a **versioned conversion table**. The table must publish:

- version id;
- source of the conversion (product-owned mapping with stated limits, not “official IELTS”);
- the limitation that converted bands are exam-like scales, not official results.

If the package or key is invalid, the result is `unavailable`. The product must not interpolate a band.

### Shared Mock constraints

- Attempts point at immutable package versions.
- Extra time, pause-and-coach, hint, or reveal during a declared Mock must mark the attempt assisted and must not emit Independent Assessment Evidence.
- Autosave and resume must preserve the same package version and remaining time contract.
- Provider failure mid-Mock must not fabricate remaining answers or a total band.

## Writing and Speaking AI Estimate Policy

Writing and Speaking reports that include a numeric band-like value must display the label **AI estimated band**. They must not use “band score”, “official score”, “examiner score”, or “IELTS result”.

A valid estimate object must include:

```ts
interface AiEstimatedBandReport {
  displayLabel: 'AI estimated band';
  estimatedBand: number | null;
  confidence: number | null;
  evidenceUsed: string[];
  limitations: string[];
  rubricVersion: string;
  status: 'available' | 'degraded' | 'unavailable';
}
```

Normative rules:

1. The UI must show **AI estimated band**, confidence, evidence used, limitations, and rubric version.
2. The estimate must not be presented as an official IELTS score.
3. If there is no valid writing response, transcript, or audio, `status` must be `unavailable`, `estimatedBand` must be `null`, and no numeric band may be shown.
4. Pronunciation, prosody, and pause analysis must be `unavailable` when there is no real audio.
5. Pause analytics must be `unavailable` when timestamps or VAD output are missing or invalid.
6. WPM must not be converted into a band. WPM may appear as a descriptive fluency statistic with a limitation note.
7. An AI-written or heavily AI-rewritten response must not be scored as the learner’s Independent Production.
8. Unsupported grader output (schema fail, empty model response, provider error) must be `unavailable`, not a guessed mid-band.
9. Confidence below the rubric’s publishable threshold must display `degraded` or `unavailable`, never a silent number.

These rules implement [GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents) and [GUARD-003](./PRODUCT_STRATEGY.md#guard-003--unsupported-official-or-real-exam-claims).

## Human Calibration

Human calibration validates Writing and Speaking AI estimates. It is not a Public Beta teacher, classroom, or marketplace feature.

Must:

- maintain a Writing/Speaking sample set reviewed by humans against the same rubric version shown to learners;
- record disagreement between the AI estimate and the human rating (criterion-level where possible);
- rerun regression calibration when model, prompt, or rubric version changes;
- keep human ratings out of learner-facing “official band” language.

Must not:

- claim examiner-level or official-marker accuracy without calibration data;
- silently replace a human-calibrated rubric with an untested prompt and keep the previous confidence copy;
- use human calibration as a paid tutoring workflow in Public Beta.

Disagreement data informs trust reporting. It does not, by itself, authorise marketing claims.

## Progress Claims

The product must distinguish these claim classes:

| Claim class | Allowed when | Not allowed from |
|---|---|---|
| Engagement | session return, D7/D30, opened modules | any learning or band wording |
| Practice completion | a loop stage reached its declared completion and evidence boundary | reveal, copied answers, empty submits |
| Short-term performance | valid unassisted items on known or recent material | Independent Assessment wording |
| Retention | delayed Retrieval on the same competency | same-session retry after reveal |
| Transfer | new-context accuracy ([METRIC-003](./PRODUCT_STRATEGY.md#metric-003--unassisted-transfer-accuracy)) | repeated known tests |
| Independent assessment improvement | unseen reassessment vs baseline ([METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks)) | Mini Mock recycled from practice items |

The product may call a change **improvement** only when the matching metric and evidence boundary are satisfied. Recurrence of targeted mistakes is reported with [METRIC-002](./PRODUCT_STRATEGY.md#metric-002--target-mistake-recurrence-rate), not inverted from XP.

The product must not infer progress from:

- XP;
- streak;
- minutes of use;
- number of opened lessons;
- answer reveal;
- copied model answer;
- AI-written response;
- repeated known test;
- empty audio;
- missing timestamps;
- unsupported grader output.

Every learner-visible “improved” claim must expose supporting evidence. That is a product hypothesis in the approved design and a contract here: 100% of such claims must link to evidence records.

[METRIC-005](./PRODUCT_STRATEGY.md#metric-005--d7-learner-retention) must be labelled engagement-only.

## Four-week Efficacy Pilot

The four-week Public Beta efficacy pilot tests whether the loop moves a diagnosed subskill. Alpha (about 10–20 Vietnamese IELTS Academic self-learners around Band 4.5–6.5) establishes usability and failure-mode baselines. The efficacy pilot uses about 30–60 learners when operations allow. Numeric targets in Product Strategy remain **product hypotheses for calibration after Alpha**, not marketing claims and not proof that efficacy already exists.

### Pilot cadence

| Window | Purpose | Required evidence |
|---|---|---|
| Week 0 | baseline and Placement Diagnostic | track, target subskill, CompetencyState snapshot, mistake inventory |
| Weeks 1–3 | targeted learning loops on the diagnosed subskill | completed loops at the declared evidence boundary |
| Week 2 | retention probe | delayed Retrieval on Week 0/1 targets; not a same-day retry |
| Week 4 | unseen reassessment | new items; Independent Assessment Evidence |
| After Week 4 | optional delayed retention check | optional Retrieval/Transfer; not required to close the four-week window |

Eligibility for the north-star denominator follows [METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks): recorded baseline, sufficient completed learning loops on the target, and an unseen reassessment.

### What the pilot must measure

- target-subskill improvement on unseen evidence — [METRIC-001](./PRODUCT_STRATEGY.md#metric-001--independent-target-subskill-improvement-after-four-weeks);
- recurrence rate of targeted mistake taxonomy — [METRIC-002](./PRODUCT_STRATEGY.md#metric-002--target-mistake-recurrence-rate);
- Transfer accuracy — [METRIC-003](./PRODUCT_STRATEGY.md#metric-003--unassisted-transfer-accuracy);
- feedback-to-follow-up-drill conversion — [METRIC-004](./PRODUCT_STRATEGY.md#metric-004--feedback-to-follow-up-drill-conversion);
- completion and provider failure **separately** — completed loops in [METRIC-006](./PRODUCT_STRATEGY.md#metric-006--cost-per-completed-learning-loop); incomplete, cancelled, provider-failed, and honestly degraded sessions excluded from that denominator and tracked as operational failure/recovery.

The pilot must not use [METRIC-005](./PRODUCT_STRATEGY.md#metric-005--d7-learner-retention) as primary learning evidence. D7 may be reported alongside the pilot as engagement context only.

Pilot reporting must not treat recycled practice items as Week 4 unseen reassessment. Provider-failed sessions must not be scored as completed loops or as learner failure.

## Forbidden Learning Claims

The following claims are forbidden in UI, reports, research summaries, and marketing derived from this product:

1. **Official IELTS band** for any Omni activity that is not an official test sitting with an official provider.
2. **Guaranteed band increase**, including guaranteed Band 8 or Band 9 from AI-only feedback.
3. **Exact IELTS–CEFR conversion**.
4. **Progress or mastery from XP or streak**.
5. **Pronunciation or prosody score** when there is no real audio.
6. **Pause analytics** when timestamps or VAD output are missing or invalid.
7. **WPM-to-band conversion**.
8. **“Real exam” or “verified”** labels without provenance and citation that can support the claim ([GUARD-003](./PRODUCT_STRATEGY.md#guard-003--unsupported-official-or-real-exam-claims)).
9. **Fake scores, transcripts, or evidence** when a provider fails ([GUARD-001](./PRODUCT_STRATEGY.md#guard-001--fabricated-learning-or-assessment-data-incidents)).
10. Treating an **AI-generated response** as the learner’s Independent Production.
11. Mastery or completion from **answer reveal**.
12. Progress from **copied model answers**, **repeated known tests**, **empty audio**, **missing timestamps**, or **unsupported grader output**.
13. Presenting D7 retention as proof of learning.
14. Presenting English Foundation as a complete general English curriculum.

If a claim cannot be supported by a valid `EvidenceClass` and `EvidenceValidity`, the product must say `unavailable` or omit the claim.
