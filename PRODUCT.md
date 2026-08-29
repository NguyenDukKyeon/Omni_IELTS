# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary Public Beta user is a Vietnamese IELTS Academic self-learner around Band 5.0–5.5 who has studied before, feels plateaued, repeats language or strategy errors, and needs an actionable system without relying on a permanent teacher.

Adjacent Public Beta tracks serve Foundation Repairers around Band 4.5–5.0 and Band Optimizers around Band 6.0–6.5. The long-term product architecture supports distinct Band 3.0–9.0 tracks; this is not a claim that every track ships in Public Beta.

## Product Purpose

Build a comprehensive IELTS preparation platform that connects English Foundation, authentic sources, vocabulary, grammar and strategy, media learning, four-skill practice, mock testing, and review into one coherent self-study system.

Success means a learner improves a diagnosed subskill on independent reassessment. Time in the app, XP, streaks, answer reveals, and the volume of generated AI output are not evidence of learning improvement.

## Positioning

The category is comprehensive IELTS preparation, not a generic English school, a standalone mock-test site, or an AI chatbot.

The main market promise is breadth: one serious platform for the learner's IELTS preparation journey. The defensible mechanism behind that promise is a cross-module loop in which authentic sources and learner errors become targeted instruction or practice, actionable feedback, scheduled review, transfer tasks, and independent reassessment with inspectable evidence.

## Operating Context

- Vietnam-first, IELTS Academic-first, and self-learner-first.
- Vietnamese-English bilingual guidance adapts explanation density without making unsupported learning-style claims.
- Mobile is primarily for short study, capture, review, and resume.
- Desktop is primarily for complex Practice, long-form Writing and Reading, source workspaces, and computer-delivered Mock conditions.
- Learners may bring articles, documents, charts, audio, video, captions, and their own attempts into the learning loop.
- Dashboard and Daily Coach recommend a next action, while all seven learning modules remain independently reachable.
- Provider-backed work must expose loading, degraded, unavailable, recovery, and stale states honestly.

## Capabilities and Constraints

- Seven module families remain canonical: Sources & Library, Vocabulary, Grammar & Strategy, Media Lab, IELTS Practice, IELTS Mock, and Review & Progress.
- English Foundation is adaptive support inside IELTS preparation rather than a complete General English curriculum.
- The product preserves source provenance and content-rights status through generated Practice, Mock, vocabulary, and saved-note artifacts.
- Learning claims follow the approved evidence hierarchy, mastery lifecycle, mistake lifecycle, and independent-assessment rules.
- Writing and Speaking scores are labelled AI estimates with confidence and limitations; the product does not issue official IELTS scores.
- Missing audio, transcript, timestamps, provider output, citation, or validation yields an honest unavailable or degraded state rather than fabricated output.
- Private Web Bridge and Sub2API remain founder/invite-only research and cannot become a Public Beta or paid entitlement dependency.
- Current architecture is a React/Vite web client with an Express modular API and Supabase-backed identity/data services. A future architecture decision may refine boundaries without silently changing approved product ownership.
- WCAG 2.2 AA is the accessibility target. Core journeys must support keyboard use, visible focus, semantic states, adequate contrast, reduced motion, touch-safe controls, and no colour-only meaning.

## Brand Commitments

- The approved brand name is **OMNI** with the subordinate descriptor **IELTS PREPARATION**. Product and SEO contexts may use **Omni IELTS Preparation**; the descriptor is never fused into the symbol.
- The primary promise is **a comprehensive IELTS preparation platform**.
- The differentiating proof is the evidence-based loop that turns recurring errors into targeted practice and measurable transfer.
- Brand voice is professional, trustworthy, and approachable. It should communicate expertise clearly without sounding institutional, distant, or intimidating.
- The identity must not feel childish, mascot-led, or dominated by game mechanics. XP, streak, and levels are supporting engagement signals rather than the brand's main language.
- The Product Owner has supplied the red-forward IZONE practice experience as a visual reference. It is a reference for energy, hierarchy, and memorability—not permission to copy its identity, layout, assets, or trade dress.
- Dashboard, onboarding, and brand moments may be expressive. Practice and Mock surfaces remain task-first, focused, and restrained.
- The approved symbol-led logo is a closed evidence ring with exactly seven equal nodes. No node is highlighted or treated as the protagonist.
- The approved primary colour direction is Vivid Vermilion with Deep Charcoal and Warm White. Red is reserved for identity, active state, primary action, and important evidence; it does not drench Operate surfaces.
- Product typography uses a Vietnamese-capable humanist workhorse direction similar to Onest. The OMNI wordmark is custom lettering rather than the UI font.
- The approved visual world is **Evidence Constellation**: seven modules form one inspectable learning system. It must not collapse into a generic atom, AI sparkle, chart, or network motif.
- The approved App Shell direction is **Focus Dock**: persistent module navigation, a task-first central canvas, and a context-sensitive evidence dock that collapses at narrower widths.

Implementation-stage brand decisions:

- production vector geometry, optical corrections, minimum sizes, and clear-space rules;
- exact accessible token values derived from Vivid Vermilion, Deep Charcoal, and Warm White;
- final licensed font files and Vietnamese diacritic QA;
- component-level materials, illustration/photography policy, and production motion tokens.

## Approved UX Direction

- Desktop App Shell uses Focus Dock. Wide desktop shows left navigation, central canvas, and context-sensitive evidence dock. Laptop widths collapse the evidence dock to an on-demand panel. Practice focus states and Mock Exam may hide both rails.
- Mobile navigation is `Home`, `Learn`, `Practice`, `Review`, and `More`. `Learn` contains Sources, Vocabulary, Grammar & Strategy, and Media. `Practice` contains IELTS Practice and IELTS Mock. Dashboard and Daily Coach are not learning modules.
- Daily Coach presents one primary evidence-based action plus two alternatives, always including manual module choice. It never forces a linear path or uses streak-loss pressure.
- Sources is Library-first. A Collection may group multiple sources and grounded chat may use explicitly selected sources, but artifact creation is one SourceVersion or selected span to one destination artifact per job.
- Vocabulary opens on due review, uses Mixed Adaptive Review and FSRS, and is curated-first from licence-audited lexical sources with Omni IELTS curation and AI personalisation.
- Grammar & Strategy opens on a self-selectable curriculum library with separate `Grammar` and `IELTS Strategy` tabs. Adaptive suggestions remain optional.
- Media uses one Guided-first Learning Room with Listen & Understand, Dictation, Shadowing, and Vocabulary modes over the same original media, transcript segments, and progress.
- Practice opens with the four IELTS skills and requires an explicit Guided or Independent choice per attempt. Live Hub is a source/filter, not a fifth skill.
- Mock generation uses a shared blueprint, dependency-aware bounded parallel jobs, per-skill progress, validation/repair, immutable packages, and strict `ready` gating. Academic Mock supports the full declared IELTS task-type catalogue through authentic per-test mixes plus cross-test coverage scheduling.
- Review & Progress opens on due mistake review. Overall estimated band appears only when all four skills have sufficiently recent valid evidence.
- AI Tutor is a global side panel with contextual `Ask about this` actions. Public-web research is explicit and cited; Tutor output never creates mastery evidence.
- Voice Library is managed centrally with compact contextual selectors. Original media audio remains primary; generated Mock audio must pass quality validation.
- Themes are `System`, `Light`, and `Dark`, plus High Contrast. Mock defaults to Light for exam fidelity while accessibility overrides remain available.
- Placement Diagnostic is recommended but optional, split by Foundation and four skills, autosaved, and resumable. Missing skills remain `insufficient evidence`.
- Optional BYOK is supported. The default is an encrypted account credential vault; session-only use remains available. Secret material never returns to the frontend after storage.
- Microphone transcript/telemetry persistence is explicit opt-in on the first Speaking or Shadowing session. Raw microphone audio is not stored by default.
- Live Hub separates `Exam Reports`, `Forecast`, and `Saved & Generated`. Original content is retained only when rights permit; otherwise Omni creates a source-derived IELTS-style artifact with provenance.
- Every Beta control is governed by the UX Proof Gate: stable control ID, real transition, complete states, recovery, automated activation evidence, and no decorative controls.

## Evidence on Hand

- Approved product strategy, learning framework, capability registry, PRD, and traceability matrix under `docs/product/`.
- Approved rebuild design at `docs/superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md`.
- Approved Brand and UX rebuild decisions are recorded at `docs/superpowers/specs/2026-08-30-omni-brand-ux-rebuild-design.md`.
- Approved direction boards are stored under `.impeccable/mocks/approved/` with embedded and sidecar generation provenance.
- A functioning React application with deterministic desktop/mobile E2E coverage for existing core journeys.
- Existing “Omni IELTS” wordmark treatment in the application header is implementation evidence, not protected brand authority for the redesign.
- No production vector logo, shipping design tokens, testimonials, customer logos, commercial claims, or independent efficacy results exist yet. Future design work must not invent them.

## Product Principles

1. **Comprehensive but coherent.** Modules form one learner system rather than a menu of disconnected AI tools.
2. **Action over feedback volume.** Every meaningful diagnosis or feedback item leads to a concrete next practice or honest stop.
3. **Evidence over engagement theatre.** Progress, mastery, and band-like claims require the evidence class that supports them.
4. **Provider failure is a product state.** Saved and deterministic journeys continue where valid; unavailable work is never disguised as success.
5. **Credible without distance.** The brand communicates rigour in an approachable way, while learning and exam surfaces protect concentration.

## Accessibility & Inclusion

- Vietnamese-English copy must remain understandable for Foundation Repairers without becoming patronising for higher-band learners.
- Colour, motion, sound, and animation cannot be the only carrier of meaning.
- Reduced-motion preferences must preserve comprehension and task completion.
- The design must support desktop widths of at least 1280 px, mobile widths from 360–430 px, responsive tablets, and current Chrome/Edge for Public Beta.
