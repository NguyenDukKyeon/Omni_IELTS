# OMNI Brand and UX Rebuild Design

**Status:** Approved by Product Owner

**Date:** 2026-08-30

**Scope:** Brand system, information architecture, responsive App Shell, module journeys, global utilities, UX proof, and design acceptance

**Product baseline:** `docs/product/` and `docs/superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md`

**Implementation:** Explicitly out of scope for this document

## 1. Decision and outcome

OMNI will be redesigned as a professional, trustworthy, and approachable IELTS preparation product for Vietnamese self-learners. The redesign replaces the existing generic blue dashboard language, crowded navigation, decorative AI affordances, and weak state communication. It preserves product truth, the seven owned learning modules, existing reliable learner data, and the approved Learning and Assessment Framework.

This is not a visual reskin and not a big-bang application rewrite. The intended delivery is a vertical strangler migration in which the new Design System and App Shell establish the visual and interaction contract, then each module migrates behind its existing route/facade with complete UX contracts and evidence.

Success is not aesthetic approval alone. A rebuilt journey succeeds only when the learner can complete the advertised state transition, recover from expected failure, retain work across reload, and produce the evidence class declared by the product documents.

## 2. Relationship to existing product documents

This specification refines the approved product baseline without redefining learning evidence, mastery, capability ownership, or Public Beta success metrics.

It introduces three approved deltas that require a follow-up amendment to product documentation before implementation epics are dispatched:

1. The final brand is **OMNI** with the descriptor **IELTS PREPARATION**.
2. Sources remains capable of multi-source collections and selected-source grounded chat, but artifact creation is constrained to **one SourceVersion or selected span → one destination artifact per job**.
3. Mock readiness includes declared task-type coverage: each individual mock uses an authentic subset, while a coverage scheduler ensures the complete supported catalogue appears across Practice and multiple mocks.

No engineering story may silently preserve superseded wording from the older design baseline where it conflicts with these Product Owner decisions.

## 3. Product and competitive frame

### 3.1 Positioning brief

| Dimension | Locked direction |
|---|---|
| Category | IELTS-first comprehensive preparation platform |
| Market | Vietnam-first |
| Test | IELTS Academic-first |
| Customer | Individual self-learner |
| Beta focus | Band 4.5–6.5, especially plateaued Band 5.0–5.5 learners |
| Long-term architecture | Separate adaptive support from Band 3.0–9.0 |
| Promise | One serious platform for comprehensive IELTS preparation |
| Mechanism | Source and learner-error inputs become targeted learning, review, transfer, and independent evidence |
| Strategic tension | Comprehensive breadth without a tool dump; guidance without removing learner autonomy |

### 3.2 Benchmark set

The design is informed by a tiered pattern benchmark rather than copied from one application.

| Tier | References | Pattern to learn | Pattern to reject or constrain |
|---|---|---|---|
| Direct IELTS | British Council IELTS Ready, IELTS by IDP, Magoosh, E2Language | authentic format, skill/question-type practice, mock familiarity, study guidance, explanation | unsupported official claims, opaque score prediction, content volume without a corrective loop |
| Speaking adjacent | ELSA Speak, Speech Analyzer | audio-first feedback, pronunciation/stress/intonation detail, retry | mapping coaching telemetry directly to IELTS band without calibration |
| Media adjacent | ShadowingEnglish, Language Reactor, LingQ | sentence playback, auto-pause, shortcuts, import, transcript interaction, vocabulary in context | XP/leaderboard dominance, unreliable generic scores, dependence on browser extensions |
| Source adjacent | NotebookLM | heterogeneous sources, selected-source grounding, inline citations, artifact actions | producing many unrelated artifacts automatically or obscuring destination ownership |
| Review adjacent | Anki/FSRS | active recall, due-first review, lapse-aware scheduling | card-only practice and self-rating as the sole learning evidence |
| Curriculum adjacent | Busuu, Duolingo | placement, coherent curriculum, personalised practice, mistake review | mascot-led identity, streak pressure, forced linear path, engagement presented as mastery |

The competitive white space is the combination of IELTS authenticity, adaptive English Foundation, source/media learning, full Practice/Mock coverage, mistake-to-mastery review, inspectable evidence, and truthful AI/provider states.

Primary benchmark evidence:

- [British Council IELTS Ready](https://takeielts.britishcouncil.org/prepare/ielts-ready) — skill/question-type practice, full mocks, study guidance, feedback, and progress support.
- [IELTS by IDP](https://ielts.idp.com/prepare/article-everything-you-need-ielts-by-idp-app) — self-assessment, personalised preparation resources, checklist, and exam-journey continuity.
- [Magoosh IELTS](https://ielts.magoosh.com/plans) — four-skill coverage, mock tests, explanation-led practice, and flexible schedules.
- [IELTS Academic format](https://ielts.org/take-a-test/test-types/ielts-academic-test) — authoritative structural and timing reference for Mock fidelity.
- [ELSA pronunciation feedback](https://elsaspeak.com/en/faqs/how-does-elsas-pronunciation-feedback-work) and [ELSA Speech Analyzer](https://speechanalyzer.elsaspeak.com/) — audio-first pronunciation, stress, intonation, and fluency feedback patterns.
- [ShadowingEnglish](https://shadowingenglish.com/) — real-video, sentence-by-sentence Shadowing/Dictation/Vocabulary mode relationships.
- [Language Reactor](https://www.languagereactor.com/help/basic) — subtitle navigation, replay, auto-pause, shortcuts, and contextual vocabulary capture.
- [LingQ](https://www.lingq.com/en/learn-english-online/) — imported content, audio/transcript coupling, contextual vocabulary, and SRS.
- [NotebookLM](https://support.google.com/notebooklm/answer/16164461) — heterogeneous sources, selected-source grounding, inline citations, and explicit artifact generation.
- [Anki](https://docs.ankiweb.net/background.html) and [FSRS options](https://docs.ankiweb.net/deck-options) — active recall, due-first review, and retention-target scheduling.
- [Busuu](https://help.busuu.com/hc/en-us/articles/15936615354641-What-is-Busuu) — placement, structured curriculum, and grammar/vocabulary review.
- [Duolingo Practice Hub](https://blog.duolingo.com/guide-to-duolingo-practice-hub/) — mistake, skill, and vocabulary review patterns; gamification remains an explicit anti-reference for OMNI.

## 4. Brand system

### 4.1 Name architecture

- Primary brand: **OMNI**.
- Descriptor: **IELTS PREPARATION**.
- Product/SEO phrase when context requires it: **Omni IELTS Preparation**.
- The descriptor remains subordinate and is never fused into the symbol.

### 4.2 Logo architecture

The approved architecture is symbol-led:

- a closed evidence ring;
- exactly seven equally sized and equally weighted nodes;
- restrained connecting arcs;
- no highlighted node;
- a custom OMNI wordmark;
- a separate descriptor lockup;
- a symbol-only favicon/app icon.

The seven nodes represent equal module ownership, not a linear achievement sequence. The mark must not be rendered as an atom, generic AI network, analytics chart, loading spinner, or progress score. Production vector work must correct optical spacing, small-size strokes, joins, clear space, monochrome variants, and accessibility contrast without changing the architecture.

### 4.3 Colour strategy

- Strategy: restrained Operate surfaces with one committed identity/action colour.
- Primary direction: **Vivid Vermilion**.
- Supporting neutrals: **Deep Charcoal** and **Warm White**.
- Red roles: brand identity, active navigation, primary CTA, urgent due evidence, focused selection, and explicit error/recovery states where semantics also use text/icon.
- Red does not cover whole Practice/Mock workspaces, serve as decoration on every card, or communicate meaning without another channel.

The comp suggests `#EE1D23`, `#121418`, and `#FAF7F2`; these are starting samples, not shipping tokens. Implementation must derive accessible light, dark, hover, pressed, focus, disabled, subtle-surface, border, and data-display values through contrast testing.

### 4.4 Typography

- Product typography: Vietnamese-capable humanist workhorse direction similar to Onest.
- Wordmark: custom lettering, independent of the UI font.
- Reading/answer surfaces prioritise legibility, stable metrics, and long-session comfort.
- Marketing/onboarding may use stronger scale, but the application avoids condensed exam-cram type, playful rounded type, editorial serifs in task UI, and tracked all-caps body copy.
- Font delivery must document licence, weights, subset strategy, Vietnamese glyph coverage, fallback metrics, and loading behaviour.

### 4.5 Voice and motion

- Verbal voice: professional, trustworthy, approachable, specific, and bilingual where scaffolding helps.
- No institutional distance, hype, shame, streak-loss pressure, or guaranteed-band language.
- Operate motion communicates state, continuity, focus, and spatial relationship.
- Marketing/onboarding may express Evidence Constellation more strongly.
- Practice and Mock avoid cinematic scroll effects and decorative motion.
- `prefers-reduced-motion` preserves content, state, and completion.

## 5. App Shell: Focus Dock

### 5.1 Desktop composition

Wide desktop has three zones:

```text
Persistent module navigation | Task-first central canvas | Context-sensitive Evidence Dock
```

The left side contains the OMNI lockup, Dashboard, the seven modules, collapse control, and global account utilities. Dashboard is separated from the modules and is not labelled as module eight.

The central canvas contains one page title, one dominant learner action, content required to complete the current task, and secondary actions with controlled salience. It does not repeat the whole module directory when persistent navigation is already visible.

The Evidence Dock always begins with system-wide due/blocked work, then changes to the current module, then offers session continuity. It is not a generic analytics sidebar.

### 5.2 Responsive behaviour

| Width/state | Behaviour |
|---|---|
| Wide desktop | Left navigation and Evidence Dock visible; central canvas retains minimum task width |
| Laptop/tablet landscape | Left navigation may collapse; Evidence Dock becomes an on-demand panel |
| Tablet portrait/mobile | Single canvas; evidence becomes ordered inline sections; bottom navigation appears |
| Practice focus | Optional distraction-free state; context navigation remains recoverable |
| Mock Exam | App Shell and Evidence Dock hidden; exam state owns the viewport |

Exact breakpoints are implementation tokens selected by content-fit tests rather than device names alone.

### 5.3 Mobile navigation

The mobile bar contains five destinations:

1. `Home` — Dashboard and Daily Coach.
2. `Learn` — Sources & Library, Vocabulary, Grammar & Strategy, Media Lab.
3. `Practice` — IELTS Practice and IELTS Mock.
4. `Review` — Review & Progress.
5. `More` — AI Tutor, Profile, Voice Library, Privacy, Providers, and Settings.

No horizontal-scrolling eight-item bottom bar is permitted. Each group opens a stable sheet/page with the canonical modules, last-used state, and due/unfinished indicators.

### 5.4 Daily Coach

Daily Coach presents:

- one primary evidence-based action;
- a reason linked to inspectable evidence;
- expected duration and destination;
- two alternatives, one of which is manual module choice;
- an honest low-confidence/missing-evidence state.

It never blocks navigation, forces a learning path, invents a band, or threatens streak loss. With insufficient evidence, the primary action may be a resumable diagnostic or short Independent Practice baseline.

### 5.5 Evidence Dock

| Surface | Context content |
|---|---|
| Dashboard | due review, recent evidence, unfinished session |
| Sources | processing jobs, provenance state, recent artifact handoffs |
| Vocabulary | due cards, lapse clusters, next scheduled review |
| Grammar & Strategy | relevant curriculum nodes, recent error taxonomies, optional lesson suggestion |
| Media | current lesson/segment, Dictation errors, latest Shadowing availability |
| Practice | attempt state, skill mistakes, related due work |
| Review & Progress | due queue summary, evidence freshness, missing evidence |
| Mock | hidden during exam; build/review context only outside exam mode |

The dock can be collapsed, remembers the preference, restores focus correctly, and never sends notes/highlights to a grader without explicit learner action.

## 6. Global journeys

### 6.1 Onboarding and Placement Diagnostic

Onboarding captures Academic intent, exam date when known, target, available study time, prior official results, preferences, accessibility, and voice. It does not require learners to invent current skill bands.

Placement is recommended but optional and split into resumable Foundation, Listening, Reading, Writing, and Speaking parts. Each part records evidence and missing evidence independently. No skill estimate appears without sufficient input; no missing skill is filled from an average; overall estimated band appears only when all four skills satisfy evidence freshness and validity rules.

### 6.2 AI Tutor

- Global side panel opened from the shell.
- Contextual `Ask about this` actions on passages, transcripts, source spans, mistakes, feedback, and charts.
- Context header shows exactly what the Tutor can see.
- Ordinary chat stays source/context grounded and avoids public Search.
- `Research evidence` is explicit, declares BYOK quota use, returns inline claim citations, a source drawer, and retrieval date.
- Facts saved to Idea Bank retain URL and claim-level provenance.
- Tutor output is instruction/reference material and cannot create learner mastery/progress evidence.
- No floating sparkle button is part of the approved shell.

### 6.3 Voice Library

The full catalogue lives in `More → Profile & Settings → Voice Library`. Context selectors show the default, recent/favourite presets, speed, preview, and a link to the full library.

Use-case defaults cover vocabulary pronunciation, slow pronunciation coach, Speaking examiner, academic narrator, and generated Listening dialogue. Original media audio remains primary. Mock Listening never silently accepts a random browser voice when validated generated audio is required.

### 6.4 Provider and BYOK settings

- Optional BYOK is supported for official providers.
- Default persistence is an encrypted account credential vault.
- A session-only option exists for untrusted devices.
- Secrets are submitted over TLS, never reflected after storage, excluded from logs/analytics/URLs/metadata/export, and removed by key deletion or account hard delete.
- UI shows provider, capability, connection state, quota/error category, last test, masked identifier, Rotate, Test, and Remove.
- Gemini Live uses one-time in-memory redemption.
- Private Web Bridge remains founder/invite-only and cannot appear as a public entitlement.

### 6.5 Consent and privacy

The first Speaking or Shadowing session requests explicit consent before persisting transcript, deterministic telemetry, or feedback. Declining persistence does not block the session. Raw microphone audio is ephemeral and not stored by default. Privacy Center owns consent review, export, hard delete, credentials, source data, and provider-retention disclosures.

### 6.6 Theme and offline

Themes are `System`, `Light`, `Dark`, and High Contrast. Light is the default. Mock defaults to Light for computer-test fidelity, but accessibility overrides remain available and do not change scoring.

Cached curated learning, due review, saved Practice, drafts, answers, annotations, and progress continue offline where valid. Search, generation, grading, TTS, and transcription become clearly unavailable. Sync is idempotent and does not duplicate attempts. YouTube is not advertised as offline-downloadable; owned uploaded media may be explicitly cached.

## 7. Module journeys

### 7.1 Sources & Library

The default is Library-first. The Library supports filtering, search, ownership/rights, processing state, source type, collection membership, and last use. Collections provide organisation and selected-source grounded chat, not mandatory notebook creation.

Source detail provides preview/reader, provenance and versions, grounded single-source chat, selection of page/block/timestamp spans, and `Create from this source`.

One generation job has one destination:

```text
one SourceVersion or selected span
→ choose Practice | Mock section | Vocabulary deck | Note | Idea Bank
→ generate and validate one draft
→ destination owner accepts/persists it
```

After success the learner sees `Open artifact` as primary and `Create another output` as secondary. The system does not navigate automatically. Multi-source chat answers may be saved only with claim-level citations and do not create learner evidence.

### 7.2 Vocabulary

Vocabulary opens on `Review today`, followed by topic discovery and learner decks. It uses FSRS and Mixed Adaptive Review rather than card-only recall.

Review modes include active meaning recall, typed completion, collocation choice, listening discrimination, word-family/paraphrase organisation, and optional spoken recall. Deterministic items auto-check canonical/accepted answers; open production is labelled with its evaluator confidence. Reveal does not count as independent completion.

Content is curated-first from licence-audited resources such as NGSL/NAWL, WordNet, CMUdict, and appropriately licensed Tatoeba data. Omni owns Vietnamese explanation, IELTS topic/tier mapping, contextual collocations, sense-specific paraphrase, example quality, error taxonomy, deduplication, and source/licence attribution. Proprietary Oxford/Cambridge lists or unlicensed GitHub copies are not bundled by default.

Topic coverage spans everyday life, relationships, education, work, cities, transport, health, psychology, environment, science, technology, data, media, culture, economics, law, policy, globalisation, arts, and academic argument language. Foundation, Bridge, and Advanced tiers guide selection but do not promise a band.

### 7.3 Grammar & Strategy

The default is a self-selectable Curriculum Library with separate `Grammar` and `IELTS Strategy` tabs. An evidence-based suggestion may appear but never replaces browsing.

Each lesson exposes prerequisites, tier, duration, evidence state, relevant historical mistakes, explanation, Controlled Practice, and a new-context Transfer task. Reading a lesson creates exposure only. Review & Progress owns mistake scheduling; Grammar & Strategy teaches and emits taxonomy-linked evidence.

### 7.4 Media Learning Room

Media has one Guided-first Learning Room with mode switching:

- Listen & Understand;
- Dictation;
- Shadowing;
- Vocabulary.

All modes share original media, transcript versions/segments, selection, current time, A–B loop, repeat, wait, speed, shortcuts, transcript editor, full-lesson mode, and resume. Mode changes do not reload or lose position.

Dictation supports Easy/Medium/Hard and Fill/Arrange/Sentence forms with word-level correct/wrong/missing/extra diff. Shadowing follows listen → record real audio → compare → feedback → retry. Missing microphone/audio/provider returns unavailable acoustic feedback. Media has no target-band goal.

### 7.5 IELTS Practice

Practice opens with Listening, Reading, Writing, and Speaking. Sources within each skill include curated content, Live Hub, learner Sources, Mistake Drill variants, and unfinished attempts. Live Hub is not a fifth skill.

Before every activity the learner explicitly chooses:

- `Guided` — hints/scaffolds/retry; evidence remains assisted as applicable.
- `Independent` — no answer reveal before submit; optional time constraint; eligible for independent evidence.

Mode is locked to the attempt. Submission opens Review, emits mistakes, offers targeted follow-up, and preserves source provenance.

### 7.6 IELTS Mock

Mock home prioritises an active resumable attempt, then validated ready packages, Live Hub/Source-derived builds, skill Mini Mocks, and history/reports.

Builds use:

```text
MockBlueprint
→ dependency-aware bounded parallel skill jobs
→ skill validation and bounded repair
→ cross-skill final validation
→ immutable package
→ persisted attempt
→ Enter exam
```

Listening, Reading, Writing, and Speaking appear as independent progress rows. Completed skills persist immediately. Retry affects only the failed skill/part. Quota exhaustion can place work into `waiting_for_provider`; it does not erase passed work or return one raw error.

The Enter Exam CTA exists only when package readiness proves 40 Listening questions with validated audio, 40 Reading questions, two Writing tasks, and Speaking Parts 1–3.

### 7.7 Review & Progress

Review opens on due mistakes. The queue selects due, relapsed, high-impact, and sufficiently evidenced items; it does not dump all history. Drill forms include correction, gap fill, MCQ, listening discrimination, and speaking retry. Every variant links to the source mistake.

Mastered mistakes are archived with history, not deleted. A repeated taxonomy in new Independent Practice/Mock relapses the mistake and can re-enter Daily Coach.

Progress separates assisted, independent, transfer, and independent-assessment evidence. Per-skill estimates show confidence, freshness, and supporting attempts. Overall estimated band is absent until all four skills have sufficiently recent valid evidence. Official result, Mock result, AI estimate, and coaching metric are distinct labels.

## 8. Authentic Academic Mock and task-type coverage

### 8.1 Authenticity rule

The product creates **AI-generated IELTS-style mocks**, never official IELTS papers. Authenticity requires structural, visual, and behavioural fidelity without copying copyrighted official tasks or implying endorsement.

### 8.2 Shared MockBlueprint

The blueprint locks test type, source-derived mandatory section, topic/diversity constraints, section structure, supported question-type mix, speaker/accent roles, visual requirements, provenance, and package version before parallel generation begins.

### 8.3 Dependency bundles

- Listening: plan → four section bundles → transcript/questions/keys/word limits → validated TTS/audio → ordered final playback.
- Reading: plan → three passage/question/evidence bundles → cross-passage count/type validator.
- Writing: Task 1 and Task 2 may generate in parallel from the shared blueprint.
- Speaking: Part 1 is separate; Part 2 and Part 3 are one thematic bundle because Part 3 generalises and deepens Part 2.

### 8.4 Declared task catalogue

Listening supports multiple choice, matching, plan/map/diagram labelling, form/note/table/flow-chart/summary completion, sentence completion, and short answer.

Academic Reading supports multiple choice, True/False/Not Given, Yes/No/Not Given, matching information, matching headings, matching features, matching sentence endings, sentence completion, summary/note/table/flow-chart completion, diagram labelling, and short answer.

Writing Task 1 supports line, bar, pie, table, mixed chart, process, map before/after, and object/device diagram. Task 2 coverage includes opinion/justification, discussion, problem/solution, advantages/disadvantages, comparison/evaluation, and multi-part prompts without claiming these pedagogical groupings are official labels.

Speaking supports timed Part 1 familiar topics, Part 2 task card with preparation/long turn/follow-up, and adaptive Part 3 abstract discussion linked to Part 2.

### 8.5 Coverage scheduling

One authentic mock does not contain every possible type. The system records:

```text
skill × questionType × attempted × independentAccuracy × lastSeen
```

New mocks prefer under-seen or weak supported types while retaining an authentic per-test mix. Practice can target one type directly. A type is not advertised as supported until its schema, renderer, generator, validator, repair, golden fixture, accessibility check, and desktop/mobile E2E are complete.

### 8.6 Writing Task 1 renderer

AI produces a validated semantic schema, not chart pixels. Numerical charts render through a deterministic declarative grammar such as Vega-Lite. Tables use a deterministic table renderer. Processes use node/edge templates. Maps use controlled geometry/landmarks. Object/device diagrams use approved templates.

The exam receives a static frozen artifact with exam-like typography, labels, axes, units, restrained colour, and no tooltip, animation, filter, or analytic dashboard chrome. Validators recompute key features from the source data, verify prompt/visual alignment, label fit, logical percentages/totals, answerable overview/comparison, accessibility alternative, and stable artifact hashing.

### 8.7 Exam behaviour

- Computer-test-like layout and navigation.
- Listening recording once in Exam mode.
- Reading 60-minute attempt with CDI highlight/note.
- Writing shared 60-minute timer, Task 1/2 navigation, autosave, word count, no AI tools, and Task 2 weighting reflected in reports.
- Speaking 11–14-minute protocol with correct part timing and honest realtime/turn-based state.
- Reload restores the same package, attempt, answers, annotations, timer state, and media.

## 9. Live Hub

Live Hub uses shared source records but presents three tabs:

1. `Exam Reports` — verified reports and clearly labelled third-party recalls.
2. `Forecast` — predictions, never labelled real exam.
3. `Saved & Generated` — saved items, generated artifacts, and stale snapshots.

Every item exposes evidence type, country, council when sourced, date, Academic/GT, skill, freshness, inline citations/source drawer, and two real actions: `Practice this skill` and `Create Full Mock from this source`.

When rights permit, approved original content may be retained. When a report/recall contains only topic or partial content, Omni creates a derived IELTS-style section and preserves provenance. Citation proves the reported source claim, not the AI-completed questions. Low-confidence/ambiguous items receive a small skill/topic confirmation, not a mandatory full editor.

## 10. State model and UX Proof Gate

### 10.1 Required presentation states

Every network/job/data surface supports:

- initial/loading;
- success;
- empty;
- stale;
- degraded;
- unavailable;
- recoverable error;
- terminal rejected/cancelled where applicable.

No raw `Failed to fetch`, command, filesystem path, provider stack, or secret-shaped value reaches the learner.

### 10.2 UX control contract

Every Beta control has a stable `data-ux-control` and a contract containing owner, preconditions, action, before/after state, route/API/storage side effect, error categories, recovery, and automated evidence IDs.

The gate fails when a visible Beta control lacks a contract, is not activated by a test, fails to produce its declared transition, or is merely decorative. Unsupported controls are fixed, disabled with a reason, or hidden.

### 10.3 Error communication

Typed failures include authentication, permission, rate limit, daily quota, provider overload, network, schema, no result, unsupported capability, and rights rejection. UI gives the appropriate recovery: retry, wait, sign in, configure provider, use saved stale data, continue offline, choose another source, or inspect diagnostics.

Diagnostics expose request ID and a copy action, with secrets and private learner/source content scrubbed.

### 10.4 Evidence bundle

Deterministic E2E records trace, before/after screenshot, network assertion, storage/state assertion, accessibility result, and unexpected console/page errors for desktop and mobile. Live canaries separately prove provider reality and fail closed when credentials/quota are absent.

## 11. Design System and component responsibilities

The initial component inventory includes:

- OMNI lockups and seven-node mark;
- Shell Header, Module Navigation, Mobile Navigation, Evidence Dock;
- Daily Coach Action and Alternative Action;
- Module Header and Resume State;
- Source Card, Source Reader, Provenance/Citation Drawer, Artifact Destination Picker;
- Due Review Queue and Mixed Review Item;
- Curriculum Browser, Lesson State, Transfer Task;
- Media Player, Segment Rail, Transcript Editor, Mode Switcher, Word Diff, Recorder State;
- Skill Picker, Practice Mode Gate, Question Engine families, Review;
- Mock Build Progress, Validation Failure, Exam Shell, Timer, CDI Annotation, Submit Confirmation, Report;
- Estimate/Evidence Label, Missing Evidence, Progress Claim Drawer;
- Tutor Panel, Context Chip, Research/Citation State;
- Voice Preset Selector and Voice Library;
- Provider Credential Card, Consent Dialog, Privacy Center;
- Empty, stale, degraded, unavailable, error, and recovery patterns.

Shared components own appearance and interaction mechanics. Domain modules own data semantics, evidence emission, validation, and persistence.

## 12. Accessibility, responsive, and performance constraints

- WCAG 2.2 AA target.
- Keyboard completion, visible focus, skip link, modal focus trap/restoration, touch-safe targets, and no hover-only action.
- Zoom to 200% without loss of content/control.
- Caption/transcript availability for audiovisual learning.
- Screen-reader alternatives for charts/tables without leaking analysis or answers in Exam mode.
- CDI annotation usable by keyboard, pointer, and touch.
- Error/freshness/evidence states use text and semantics, not colour alone.
- Theme-specific contrast and visual regression for Light, Dark, and High Contrast.
- Desktop, tablet, and mobile E2E for core journeys.
- Advanced provider/media/Mock SDKs lazy-loaded.
- Local autosave acknowledges promptly and precedes cloud sync.
- Motion cannot block interaction or hide content from deterministic capture.

## 13. Interface contracts introduced by this design

```ts
interface AppShellState {
  activeSurface: 'dashboard' | 'sources' | 'vocabulary' | 'grammar_strategy' |
    'media' | 'practice' | 'mock' | 'review_progress' | 'profile';
  navCollapsed: boolean;
  evidenceDock: 'open' | 'collapsed' | 'hidden';
  focusMode: boolean;
  theme: 'system' | 'light' | 'dark' | 'high_contrast';
  connectivity: 'online' | 'offline' | 'syncing' | 'needs_attention';
}

interface DailyCoachAction {
  id: string;
  title: string;
  reason: string;
  evidenceRefs: string[];
  destination: string;
  estimatedMinutes?: number;
  confidence: 'low' | 'medium' | 'high';
}

interface SourceArtifactJob {
  sourceVersionId: string;
  selection?: { blockIds?: string[]; startMs?: number; endMs?: number };
  destination: 'practice' | 'mock_section' | 'vocabulary_deck' | 'note' | 'idea_bank';
  state: 'queued' | 'processing' | 'validating' | 'ready' | 'needs_review' |
    'retry_wait' | 'rejected' | 'failed' | 'cancelled';
  artifactId?: string;
  provenanceId: string;
}

interface QuestionTypeCoverage {
  skill: 'listening' | 'reading' | 'writing' | 'speaking';
  questionType: string;
  attempted: number;
  independentAccuracy?: number;
  lastSeenAt?: string;
  implementationStatus: 'specified' | 'supported' | 'live_verified';
}

interface UxFlowContract {
  controlId: string;
  owner: string;
  preconditions: string[];
  action: string;
  beforeState: string;
  afterState: string;
  sideEffects: string[];
  failureCategories: string[];
  recoveryActions: string[];
  evidenceIds: string[];
}
```

Architecture specifications may refine representation but cannot change these behaviours without Product Owner approval and product-document traceability.

## 14. Acceptance matrix

### Brand and shell

- `AC-UX-BRAND-001`: every production lockup uses the approved name/descriptor and exactly seven equal nodes.
- `AC-UX-SHELL-001`: desktop Focus Dock, laptop collapsed dock, and mobile five-destination navigation preserve all seven modules.
- `AC-UX-COACH-001`: one primary and two alternative actions are visible, evidence-linked, and independently navigable.
- `AC-UX-DOCK-001`: Evidence Dock changes by module and is absent from active Mock Exam.

### Module journeys

- `AC-UX-SRC-001`: one source/selection creates exactly one validated destination artifact and offers Open/Create another.
- `AC-UX-VOC-001`: due-first Mixed Adaptive Review schedules only after a learner response; reveal does not create mastery.
- `AC-UX-GRM-001`: Grammar/Strategy curriculum remains manually browsable and reading alone emits exposure only.
- `AC-UX-MED-001`: one lesson switches modes without losing media time, segment, transcript version, or progress.
- `AC-UX-PRC-001`: Guided/Independent is explicit and locked per attempt; evidence class matches assistance.
- `AC-UX-MCK-001`: build progress is per skill, valid work survives failure, and Enter Exam is impossible before complete validation.
- `AC-UX-REV-001`: due review is primary; archive/relapse history is preserved; overall band is hidden with incomplete evidence.

### Authenticity and trust

- `AC-UX-MOCK-COVERAGE-001`: every advertised task type has renderer, validator, repair, fixture, accessibility, and E2E evidence.
- `AC-UX-WRT1-001`: Task 1 visual is static, data-consistent, exam-like, readable, and stable across reload.
- `AC-UX-LIVE-001`: reports, recalls, forecasts, generated, fresh, and stale states are not conflated.
- `AC-UX-AI-001`: Tutor/Search/Voice/provider states disclose source/capability and cannot fabricate output.
- `AC-UX-PRIVACY-001`: persistent BYOK is encrypted and non-reflective; transcript/telemetry persistence requires opt-in.
- `AC-UX-PROOF-001`: every visible Beta control has an activated contract and real transition evidence.

### Accessibility and resilience

- `AC-UX-A11Y-001`: core journeys pass keyboard, focus, semantic state, contrast, reduced motion, touch, zoom, and screen-reader checks.
- `AC-UX-THEME-001`: System/Light/Dark/High Contrast preserve meaning and interaction.
- `AC-UX-OFFLINE-001`: cached deterministic work continues; provider work becomes unavailable; reconnection syncs idempotently.

## 15. Delivery order

Design and implementation should proceed by dependencies:

1. Amend product documents for the three approved deltas and update traceability.
2. Produce final vector identity, licensed typography decision, semantic tokens, and Storybook/design-system primitives.
3. Implement Focus Dock App Shell, responsive navigation, Daily Coach contract, Evidence Dock, themes, and global state patterns.
4. Migrate Sources/Library and one-source/one-output handoff.
5. Migrate Media Learning Room.
6. Implement Practice shared shells and task-type engines.
7. Implement Mock blueprint, dependency jobs, renderers, validators, coverage, exam shell, and reports.
8. Migrate Vocabulary, Grammar & Strategy, and Review & Progress onto the shared evidence contracts.
9. Integrate Tutor, Voice Library, Provider/BYOK, Privacy, consent, offline/sync, and Profile.
10. Complete UX Proof coverage, accessibility, live canaries, visual regression, performance, and Public Beta release evidence.

Large coding epics are handed to Grok or another implementation worker only after the corresponding Domain SPEC, Architecture/ADR, Epic, stories/tasks, acceptance criteria, fixtures, and base SHA are complete. Workers push feature branches and never merge. The coordinator reviews, reproduces gates, and merges only after evidence passes.

## 16. Non-goals and deferred work

- No application implementation in this design branch.
- No Next.js/Python/Open-WebUI/Chainlit rewrite.
- No public or paid dependency on Private Web Bridge/Sub2API.
- No teacher/classroom marketplace or permanent human-review operation.
- No official IELTS score, official-paper label, examiner-equivalent claim, or guaranteed band increase.
- No webcam gesture scoring, social feed, global leaderboard, mascot-led system, or streak-pressure loop.
- No automatic multi-artifact generation from import.
- No proprietary vocabulary-list redistribution without permission.
- General Training expansion, advanced RAG ingestion formats, external pronunciation vendors, and public paid AI entitlements remain separately scoped future decisions.

## 17. Approved visual references

- Brand foundation: `.impeccable/mocks/approved/omni-brand-foundation.png`
- Brand generation provenance: `.impeccable/mocks/approved/omni-brand-foundation.prompt.md`
- Focus Dock App Shell: `.impeccable/mocks/approved/focus-dock-app-shell.png`
- App Shell generation provenance: `.impeccable/mocks/approved/focus-dock-app-shell.prompt.md`

The raster boards are design references, not production logo assets or proof of implementation. The final logo must be authored as a deterministic vector and the App Shell must be verified against the approved comp at desktop and mobile sizes.

## 18. Review conclusion

The specification contains no remaining Product Owner choice required before implementation planning. Implementation details explicitly delegated to Design System, Domain SPEC, Architecture, and ADR work are bounded and may not change the approved product behaviour. The next gate is Product Owner review of this committed specification, followed by a detailed implementation plan rather than direct coding.
