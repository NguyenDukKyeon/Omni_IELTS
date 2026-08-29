# OMNI Rebuild Program Map

**Approved specification:** `docs/superpowers/specs/2026-08-30-omni-brand-ux-rebuild-design.md`

**Purpose:** Decompose the approved rebuild into reviewable implementation plans. This file is a dependency map, not an executable mega-plan.

## Why the rebuild is split

The approved specification covers independent state machines, storage boundaries, privacy classes, AI providers, and learner journeys. Putting them into one branch or one worker handoff would make failures hard to isolate and would allow a partial success to hide broken journeys. Each plan below must produce independently testable software and pass its own deterministic gate before the next dependent plan begins.

## Dependency graph

```text
P01 Product deltas + production brand assets
                         ↓
P02 Design System + Focus Dock App Shell + UX Contract v2
          ├──────────────┼────────────────┐
          ↓              ↓                ↓
P03 Sources         P04 Media        P05 Review contracts
          └──────────────┼────────────────┘
                         ↓
P06 Practice shared shell and question engines
          ├───────────────────────────────┐
          ↓                               ↓
P07 Academic Mock blueprint       P08 Vocabulary + Grammar
    renderers + coverage              + Review integration
          └────────────────┬──────────────┘
                           ↓
P09 Tutor + Voice + BYOK + Privacy + Offline
                           ↓
P10 Whole-product UX Proof + live canaries + Beta release
```

## Plans and dispatch boundaries

| Plan | Outcome | Required predecessor | Recommended worker boundary |
|---|---|---|---|
| P01–P02 | Approved product deltas, final vector identity, semantic tokens, Focus Dock, Daily Coach, Evidence Dock, mobile grouping, themes, shell UX contracts | Approved Brand/UX SPEC | Coordinator owns visual asset gate; Grok may implement the large shell coding epic after assets are approved |
| P03 | Library-first Sources, collections, source detail, one-source/one-output jobs, provenance and destination handoff | P02 | One Grok epic; no Media/Practice/Mock implementation in the same PR |
| P04 | Unified Guided-first Media Learning Room and full transcript lifecycle | P02, source/media contracts from P03 | One Grok epic split into import/transcript and learning-room tasks |
| P05 | Canonical Evidence/Mistake contracts and Review & Progress data boundary | P02 | One backend/data epic; UI limited to contract-consuming Review surface |
| P06 | Four-skill Practice shell, Guided/Independent attempt contract, complete declared question-engine catalogue | P02, P05 | Separate Reading/Listening and Writing/Speaking task groups under one shared-engine plan |
| P07 | Dependency-aware bounded parallel Academic Mock generation, deterministic Task 1 renderer, coverage scheduler, exam/resume/report | P03, P05, P06 | Large Grok epic with separate build-engine and exam-room branches if the plan exceeds one review cycle |
| P08 | Due-first Mixed Adaptive Vocabulary, Grammar/Strategy curriculum tabs, FSRS and relapse integration | P02, P05 | Vocabulary and Grammar may be separate branches; Review integration lands after both |
| P09 | Global Tutor panel, contextual ask, Voice Library, encrypted BYOK vault, consent, privacy, theme sync and offline queue | P02 plus domain contracts | Split credentials/privacy from Tutor/Voice UI; security review required before merge |
| P10 | Every Beta control migrated to UX Contract v2, accessibility and visual regression, live-provider evidence and Beta release report | All prior plans | Coordinator-led integration and verification; workers never merge |

## Merge and review policy

1. Every plan starts from a freshly fetched `main` and an isolated feature branch/worktree.
2. Product docs, Domain SPEC, Architecture/ADR, acceptance matrix, fixtures, and feature flag exist before a coding epic is dispatched.
3. Workers implement and push only. They do not merge, force-push, expose secrets, or weaken gates.
4. The coordinator reviews the diff, reproduces targeted tests, runs `npm run check:beta`, and runs required live canaries separately.
5. A deterministic pass does not claim provider health. A live canary without valid credentials fails closed.
6. If any P0/P1, raw error, fake evidence, missing provenance, accessibility blocker, or unproven control remains, the branch stays unmerged.

## First executable plan

`docs/superpowers/plans/2026-08-30-omni-brand-design-system-focus-dock.md`

The first plan establishes the visual and interaction foundation every later module inherits. It deliberately stops before Sources, Media, Practice, Mock, Vocabulary, Grammar, Tutor, Voice, or provider-domain rewrites.
