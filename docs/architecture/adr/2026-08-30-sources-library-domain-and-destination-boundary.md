# ADR: Sources & Library Domain Boundary, Immutable Lineage, and Destination-Owned Persistence

**Date:** 2026-08-30  
**Status:** Accepted  
**Deciders:** Omni Architecture Council, Product Owner  
**Module:** Sources & Library (`CAP-SRC-*`)  
**Related Specs:** `docs/superpowers/specs/2026-08-30-omni-sources-library-design.md`  

---

## 1. Context & Problem Statement

The legacy implementation of learning source ingestion in Omni IELTS had architectural vulnerabilities and pedagogical misalignments:
1. **Monolithic Mass Generation**: Ingesting a single document automatically triggered generation of Reading, Listening, Speaking, Writing, Vocabulary, and Grammar items simultaneously. This caused high AI latency, poor item quality, high token costs, and cognitive overwhelm for the self-learner.
2. **Boundary Violation & Direct Persistence**: The ingestion module directly created vocabulary cards in SRS and awarded gamified XP upon creation, violating the Learning Framework rule that AI generation does not equal learner competency evidence.
3. **Lack of Immutable Versioning & Provenance**: Editing or re-extracting a document mutated the single `LearningSource` object, destroying lineage and breaking downstream citations in practice attempts.
4. **Ungrounded Hallucination Risk**: The global chat had access to arbitrary LLM knowledge or silently triggered public search, mixing external web facts with private learner sources without clear attribution.

We must lock the architectural boundaries, versioning rules, destination handoffs, and privacy constraints for P03 before implementation commences.

---

## 2. Decision Drivers

- **Pedagogical Quality**: Learners need focused, high-relevance IELTS tasks derived from specific source sections rather than noisy catch-all quiz bundles.
- **Evidence Integrity**: Downstream attempts must cite exact immutable source versions and block/timestamp spans. Generation of drafts must never fabricate learner progress.
- **Module Autonomy & Persistence Boundaries**: Destination modules (Practice, Mock, Vocabulary, Note/Tutor) must own schema validation, persistence, and attempt lifecycles for their respective domain entities.
- **Privacy & Grounding Isolation**: Private uploaded documents must remain isolated under Supabase RLS. Multi-source chat must answer strictly from selected sources and fail closed (`unsupported_by_sources`) rather than guessing or searching the public web without consent.

---

## 3. Considered Options

### Option A: Retain Ingestion-Side Multi-Artifact Generator with Shared Storage
- Ingestion generates all 4 skills and directly writes to `practice_activities`, `vocab_cards`, and `mock_packages`.
- *Rejected*: Violates single-responsibility principle; bypasses destination validation; creates orphan data if generation partially fails; conflates draft generation with persisted learner assets.

### Option B: Decoupled Single-Destination Pipeline with Validated Draft Handoff (Selected)
- Sources & Library acts as a NotebookLM-like asset hub:
  1. Manages immutable `SourceRecord` and `SourceVersion`s.
  2. Grounded Chat operates strictly over explicitly selected `SourceVersion`s with inline block citations.
  3. Artifact Studio enforces: **1 Source/Span → 1 Chosen Destination → 1 Validated Draft → Destination Owner Accepts & Persists**.
  4. Post-generation presents "Open artifact" and "Create another output" without auto-redirect.
  5. Emits zero learner mastery or progress evidence.

### Option C: Stateless Transformation Utility (No Stored Source Records)
- Treat Sources purely as an ephemeral text converter that streams drafts directly into destination modules without storing original sources or versions.
- *Rejected*: Breaks revision history, multi-source collections, span selection, and provenance tracking required for IELTS Academic verification.

---

## 4. Decision Outcome

We select **Option B**.

### Specific Architectural Invariants:
1. **Immutable Versioning**: `SourceVersion` rows are append-only and identified by SHA-256 content hashes. Updates create a new version (`v2`, `stage: 'edited'`).
2. **Single-Destination Job Machine**: `SourceArtifactJob` accepts exactly one `destination` (`practice`, `mock_section`, `vocabulary_deck`, `note`, `idea_bank`).
3. **Validated Draft Contract**: Artifact Studio produces a `ValidatedArtifactDraft` with a strict provenance bundle. The destination module owns the validation and persistence of the resulting entity.
4. **Grounded Isolation**: Grounded Chat searches only selected `SourceVersion`s. External search (`CAP-GLB-SEARCH`) is isolated behind an explicit learner trigger ("Tra cứu dẫn chứng") and tagged as `web_citation`.
5. **Zero Mastery Policy**: Sources module emits zero `SkillEvidence`, `MistakeEvidence`, or `MasteryUpdate`.

---

## 5. Consequences & Trade-offs

### Positive:
- Clean modular boundaries: Sources does not need to know internal database schemas of Practice or Mock.
- Predictable AI costs and high task quality through focused single-output generation.
- Full auditability: every question or vocab card can trace back to `sourceId`, `versionId`, and exact `blockId`/`timeRangeMs`.
- Strict learner data privacy via Supabase RLS policies.

### Negative / Mitigations:
- **Trade-off**: Learner must click through to destination module to save draft.
  - *Mitigation*: Smooth deep-linking via "Open artifact" CTA with auto-recovery of pending draft in destination module.
- **Trade-off**: Multi-step batch import requires robust client-side job polling/state machine.
  - *Mitigation*: Implemented via deterministic `ImportJobMachine` with clear UI progress for each item.
