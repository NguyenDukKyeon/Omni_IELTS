# Omni IELTS Product Strategy

Status: Draft — awaiting Product Owner review

Design baseline:
[Omni IELTS Product Rebuild Design](../superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md)

This document owns market, persona, positioning, non-goals, provider policy, product metrics, and Public Beta scope. It does not replace the approved design and does not author production features. Domain SPEC and Architecture documents may refine implementation later; they cannot silently contradict the locked decisions below.

## Product Thesis

Omni IELTS is an IELTS-first comprehensive preparation platform for Vietnamese people who self-study IELTS Academic. It combines adaptive English Foundation, four-skill practice, Media Learning, Mock Tests, and a personal error-correction loop.

The category is **IELTS comprehensive preparation**, not a complete General English school and not a teacher replacement. Omni does not issue official IELTS scores. Learners still sit a real exam with an official test provider. The product succeeds when a diagnosed subskill improves on an independent reassessment, not when the learner spends time, earns XP, or generates more AI output.

Public Beta validates Band 4.5–6.5. Separate adaptive tracks form the long-term Band 3.0–9.0 architecture. Paid sharing of a Private Web Bridge account is outside approved scope.

## Vision

Help Vietnamese IELTS self-learners turn authentic sources and their own recurring errors into structured, adaptive learning loops across Listening, Reading, Writing, and Speaking.

## Primary Market and Test Type

- **Vietnam-first.** Public Beta copy, research sample, and default curriculum examples are for learners in Vietnam.
- **Vietnamese-English bilingual UX.** Interface language is contextual `vi-en`. Bilingual support changes explanation density, not unsupported “learning style” claims.
- **IELTS Academic-first.** Academic is the shipped test type. General Training is an expansion track, not a Public Beta promise.
- **Self-learner first.** The paying and using customer is an individual preparing alone. Teachers, classes, assignments, and marketplaces are out of scope.
- **Device split.** Mobile is for short study, capture, and review. Desktop is for complex Practice and Mock work (CDI-style timing, long reading, writing production).

## Primary Persona

The primary Public Beta persona is the **Plateaued Intermediate**.

Typical profile:

- IELTS Academic self-learner in Vietnam.
- Overall level typically Band 5.0–5.5, inside the Band 4.5–6.5 Beta cohort.
- Knows the basic IELTS format.
- Score has stalled despite more practice.
- Repeats the same language or strategy errors.
- Receives Writing or Speaking feedback and cannot turn it into a next action.
- Wants evidence that targeted errors declined and that transfer happened on a new task.
- Uses mobile for micro-learning and desktop for exam-style work.

Default Beta UX, curriculum depth, feedback density, and research sample are optimised for this persona. Adjacent tracks exist; they do not redefine the primary cohort.

## Adjacent and Long-term Segments

| Track | Band range | Product response |
|---|---|---|
| Foundation Repairer | 4.5–5.0 | bilingual scaffolding, micro-lessons, controlled practice, few simultaneous feedback priorities |
| Plateaued Intermediate | 5.0–5.5 | mistake-driven targeted practice and transfer checks |
| Band Optimizer | 6.0–6.5 | timed tasks, criterion feedback, precision work, Mini/Full Mock |
| Foundation expansion | 3.0–4.5 | later general-English foundation curriculum and stronger scaffolding |
| Advanced expansion | 6.5–8.0 | nuance, register, complex reasoning, human-calibrated benchmarks |
| Expert refinement | 8.0–9.0 | rare-error analysis and multiple independent or human-calibrated assessments |

Long-term architecture supports Band 3.0–9.0 through **separate adaptive tracks**. Omni will not stretch one curriculum across that range by changing a `targetBand` field. Tracks differ in prerequisites, task types, feedback density, and assessment expectations.

## Jobs to be Done

Written as learner outcomes, not as a feature catalogue.

1. **Diagnose the plateau.** When my score does not move, identify the subskill and recurring error holding me back so I stop practising at random.
2. **Convert feedback into action.** When I receive Writing or Speaking feedback, turn it into a short corrective drill and later review so the issue does not vanish with the report.
3. **Learn from authentic sources.** When I find a useful article, document, chart, audio file, or video, convert it into contextual IELTS learning artifacts without losing the source.
4. **Practise under exam conditions.** When the exam approaches, give me computer-delivered Practice and Mock conditions so study transfers to test performance.
5. **Prove improvement.** After several weeks, show which errors declined and which unseen-task results improved, instead of showing only XP and completion.
6. **Trust AI feedback.** Tell me which outputs are deterministic, AI-estimated, human-calibrated, or unavailable, so I do not treat a model guess as an official band.
7. **Continue through provider failure.** Keep deterministic and saved learning journeys usable when an AI or search provider is down.

## Value Proposition

```text
Authentic source + learner error + assessment evidence
→ targeted learning/practice
→ actionable feedback
→ mistake and spaced review
→ transfer task
→ independent reassessment
```

A core activity may enter this loop at different stages. It must not end without a defined evidence or continuation state. XP, streaks, and time-on-app are optional engagement signals; they are not proof of learning.

## Product Differentiator

Omni will not compete by shipping the largest number of AI tools. The advantage is a **cross-module learning loop** with provenance, evidence, mastery, relapse, and transfer:

```text
Source
→ Practice or Mock
→ Mistake
→ Review
→ independent reassessment
```

Example: a BBC clip produces a dictation error on “economic growth”; that becomes listening/collocation mistake evidence; retrieval is scheduled; the collocation is demanded in a new Writing task; transfer either succeeds or the error relapses; the learner profile and next recommendation update.

## Public Beta Scope

Public Beta includes:

- Sources & Library
- Vocabulary
- Grammar & Strategy
- Media Lab
- Four-skill Practice (IELTS Practice)
- IELTS Mock
- Review & Progress
- Contextual AI Tutor
- Shared Voice Library
- Honest provider fallback (deterministic core stays usable)
- Vietnam-first bilingual UX
- Academic-first content

Navigation is **module-centric**. The seven modules above remain independently reachable. Daily Coach on the Dashboard may recommend a next action; it does not replace module choice or force a single daily path.

## Non-goals

Public Beta will not:

- teach the full General English A1–C2 curriculum;
- build teacher, classroom, assignment, or tutor-marketplace workflows;
- issue official IELTS scores;
- guarantee a band increase or Band 8 / Band 9 through AI-only feedback;
- republish full copyrighted sources without permission;
- sell access to a shared Private Web Bridge account;
- depend on a private browser session or private bridge for public core journeys;
- grade pronunciation from transcript-only input;
- auto-generate every possible artifact when a source is imported;
- build a social feed, public source marketplace, or global leaderboard;
- award mastery or XP for merely revealing an answer.

## AI and Provider Policy

The public provider lane is:

```text
Deterministic/offline core
→ official/free provider
→ BYOK
→ managed quota — deferred decision
```

Omni does not promise unlimited AI. Paid or managed quota ships only after dogfooding validates quality, reliability, cost, and provider terms.

Every public AI task must declare:

- a task profile;
- structured schema/quality validation;
- a capability-compatible fallback;
- a cost budget;
- an honest `unavailable` state when evidence cannot be produced.

AI output is not product evidence until it passes validation and a declared evidence class. Fabricated band, transcript, pronunciation, pause, citation, provenance, real-exam status, mastery, or improvement claims are forbidden.

## Private Web Bridge and Sub2API Boundary

Private Web Bridge and Sub2API are **founder dogfooding and invite-only experiments**. They are not a public product and not a paid-tier entitlement.

Operating rules:

- separate health checks, canaries, feature flags, and a kill switch;
- not a Public Beta or public-release dependency;
- keys never exposed to the public browser as an entitlement;
- public users cannot be required to attach a private browser session;
- commercialisation of shared-bridge access is considered only after Terms-of-Service / commercial-use confirmation and after operations are good enough to run without harming learners.

A future paid AI plan, if any, uses official API, BYOK, or a reseller with explicit commercial terms — not a shared private bridge.

## Open-source Adoption Principle

Open source handles generic infrastructure; Omni owns IELTS learning and assessment logic.

Examples of the split:

- AnyDoc may read Office/text PDF bytes behind a document-parser adapter.
- yt-dlp plus a PO-token provider may fetch captions.
- ts-fsrs may compute review intervals.
- XState may hold exam/session machines.

Omni still owns curriculum, provenance, assessment, mastery, and the learning loop. Hosted OCR stays off by default. Upstream self-reported benchmarks are not sufficient evidence to adopt a library in production. Adoption requires an adapter boundary, an exact pin, fixtures, a fallback, and a removal plan.

## North-star and Supporting Metrics

Alpha (about 10–20 Vietnamese IELTS Academic self-learners around Band 4.5–6.5) establishes usability and failure-mode baselines. A later four-week Public Beta efficacy pilot (about 30–60 learners when operations allow) tests whether the loop moves a diagnosed subskill. Provisional numeric hypotheses in the approved design are **product hypotheses for calibration after Alpha**, not marketing claims and not proof that efficacy already exists.

### METRIC-001 — Independent target-subskill improvement after four weeks

North-star metric: share of **eligible** learners who improve at least one diagnosed target subskill on an independent reassessment after four weeks.

Eligibility (denominator) requires all of:

- a recorded baseline for that subskill;
- sufficient completed learning loops on the target;
- an unseen reassessment (not a repeated known task).

The metric is not inferred from XP, streak, time-on-app, or activity count.

### METRIC-002 — Target mistake recurrence rate

Share of targeted mistakes that reappear in independent Practice or Mock after remediation. Recurrence on assisted or revealed items does not count as independent evidence.

### METRIC-003 — Unassisted transfer accuracy

Accuracy when the learner applies a competency to a new task or topic without hint, transcript, word bank, or answer reveal.

### METRIC-004 — Feedback-to-follow-up-drill conversion

Share of learners who receive actionable feedback and then start **and complete** the linked corrective drill.

### METRIC-005 — D7 learner retention

Share of learners who return on or after day 7. This is an **engagement indicator**, not a learning outcome. It must not be reported as proof of band improvement.

### METRIC-006 — Cost per completed learning loop

Fully loaded provider, model, search, transcription, and TTS cost attributable to a learning loop that reaches its declared completion and evidence boundary.

Incomplete, cancelled, provider-failed, or honestly degraded sessions are excluded from the completed-loop denominator. Their cost and frequency are tracked separately through operational job/provider failure and recovery metrics.

## Product Risks and Guardrails

| Risk | Mitigation |
|---|---|
| Feature-rich product that does not improve learners | Shared evidence loop; north-star is independent reassessment ([METRIC-001](#metric-001--independent-target-subskill-improvement-after-four-weeks)), not activity count |
| One curriculum stretched from Band 3 to 9 | Separate tracks, prerequisites, and assessment expectations; no `targetBand`-only stretch |
| AI grading drift | Golden and human-calibrated evals, confidence labels, and an honest unavailable state |
| Copyright leakage | Source ownership, provenance, citations, metadata-only public surfaces, no full-source republishing |
| Provider quota and cost spikes | Deterministic core, per-task budgets, caching, capability fallback, kill switches ([METRIC-006](#metric-006--cost-per-completed-learning-loop)) |
| Solo-founder operations overload | Modular monolith, one worker, limited sidecars, deferred marketplaces and classroom tools |
| Open-source supply-chain churn | Adapter boundary, exact pins, SBOM, fixtures, fallback and removal plan |
| Engagement mistaken for learning | [METRIC-005](#metric-005--d7-learner-retention) labelled engagement-only; counter-metrics [METRIC-002](#metric-002--target-mistake-recurrence-rate) and [METRIC-003](#metric-003--unassisted-transfer-accuracy) |
| Big-bang rewrite failure | Vertical strangler migration and per-epic release gates |

### GUARD-001 — Fabricated learning or assessment data incidents

Mandatory target: **0**. Covers fake band, transcript, pronunciation, pause, citation, real-exam status, and unsupported improvement claims.

### GUARD-002 — Secret or privacy incidents

Mandatory target: **0**. Includes leaked provider keys, unauthorised PII exposure, and storage of raw microphone audio without the approved consent path.

### GUARD-003 — Unsupported official or real-exam claims

Mandatory target: **0**. Omni must not label content as official IELTS material or as a real past paper without a verifiable rights and provenance basis.

### GUARD-004 — Public dependency on Private Web Bridge

Mandatory target: **0**. Public and paid journeys must complete without Private Web Bridge or Sub2API.

## Decision Log

| Decision | Locked direction | Status |
|---|---|---|
| Product category | IELTS-first comprehensive preparation platform | Approved |
| Market | Vietnam-first | Approved |
| Test type | IELTS Academic-first; General Training later | Approved |
| Primary customer | Self-learner first | Approved |
| Public Beta band | Band 4.5–6.5 | Approved |
| Primary persona | Plateaued Intermediate (typically Band 5.0–5.5) | Approved |
| Long-term range | Band 3.0–9.0 via separate adaptive tracks | Approved |
| Navigation | Module-centric; Daily Coach recommends, does not coerce | Approved |
| Product structure | Seven modules plus global utilities | Approved |
| Private Web Bridge / Sub2API | Founder and invite-only experiment; not a public or paid dependency | Approved |
| Architecture | Modular monolith plus async worker and focused sidecars | Approved |
| Migration | Vertical strangler, not a big-bang rewrite | Approved |
| Open source | Generic infrastructure behind adapters; Omni owns IELTS learning logic | Approved |
| Truthfulness | No fabricated band, transcript, pronunciation, citation, real-exam label, or unsupported improvement | Approved |

No additional product decisions are introduced in this document.
