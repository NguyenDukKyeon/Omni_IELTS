# Omni IELTS Product Traceability Matrix

Status: Draft — awaiting Product Owner review

Approved Design Baseline:
[Omni IELTS Product Rebuild Design](../superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md)

Product Strategy:
[Omni IELTS Product Strategy](./PRODUCT_STRATEGY.md)

Learning Framework:
[Omni IELTS Learning and Assessment Framework](./LEARNING_AND_ASSESSMENT_FRAMEWORK.md)

Capability Registry:
[Omni IELTS Capability Registry](./CAPABILITY_REGISTRY.md)

Public Beta PRD:
[Omni IELTS Public Beta PRD](./PRD.md)

This matrix defines no new stable IDs. Requirement, capability, metric and guardrail IDs are references to their owner documents.

## Purpose and Status Semantics

The matrix traces Product Strategy metrics/guards → PRD/NFR requirements → owned capabilities → future Domain SPEC owner → future Architecture owner → delivery status.

`product_approved` means product intent and ownership are approved. It does not mean Domain SPEC, Architecture, code, tests, canaries or release are complete. Domain SPEC Owner and Architecture Owner are future accountable contexts. Task 7 performs final foundation review. Domain SPEC, Architecture and Epic Delivery Specs are a separate phase after Product Owner approval.

A later Architecture plan may refine ownership through an explicit matrix change. This document does not invent new architecture contexts.

## Requirement Traceability

| Requirement | Capabilities | Metric/Guardrail | Domain SPEC Owner | Architecture Owner | Delivery Status |
| ----------- | ------------ | ---------------- | ----------------- | ------------------ | --------------- |
| PRD-001 | CAP-GLB-IDENTITY, CAP-GLB-APP-SHELL, CAP-GLB-LEARNER-PROFILE, CAP-GLB-PLACEMENT-DIAGNOSTIC, CAP-GLB-EVIDENCE | METRIC-001, GUARD-001, GUARD-002 | platform | Identity & Privacy | product_approved |
| PRD-002 | CAP-GLB-APP-SHELL | METRIC-005, GUARD-001 | platform | Learning Activity | product_approved |
| PRD-003 | CAP-GLB-EVIDENCE, CAP-REV-MISTAKE, CAP-REV-MASTERY, CAP-REV-RELAPSE, CAP-REV-PROGRESS | METRIC-001, METRIC-002, METRIC-003, GUARD-001 | review_progress | Progress & Analytics | product_approved |
| PRD-004 | CAP-REV-RECOMMEND, CAP-REV-DUE, CAP-GLB-LEARNER-PROFILE, CAP-GLB-EVIDENCE | METRIC-004, METRIC-002 | review_progress | Mastery & Scheduling | product_approved |
| PRD-005 | CAP-SRC-WORKSPACE, CAP-SRC-IMPORT-BATCH, CAP-SRC-EXTRACT, CAP-SRC-VERSION, CAP-SRC-PROVENANCE, CAP-SRC-SELECTION, CAP-SRC-GROUNDED-CHAT, CAP-SRC-ARTIFACT-STUDIO, CAP-SRC-LIVE-HUB, CAP-GLB-CONTENT-QUALITY, CAP-GLB-IDENTITY | METRIC-006, GUARD-001, GUARD-003 | sources | Content & Provenance | product_approved |
| PRD-006 | CAP-VOC-CAPTURE, CAP-VOC-DECK, CAP-VOC-FSRS, CAP-VOC-RETRIEVAL, CAP-VOC-MASTERY, CAP-GLB-VOICE, CAP-GLB-EVIDENCE | METRIC-002, METRIC-003 | vocabulary | Mastery & Scheduling | product_approved |
| PRD-007 | CAP-GRM-CURRICULUM, CAP-GRM-DIAGNOSIS, CAP-GRM-PRACTICE, CAP-STR-LESSONS, CAP-STR-TRANSFER, CAP-REV-MISTAKE | METRIC-001, METRIC-003, METRIC-004 | grammar_strategy | Curriculum | product_approved |
| PRD-008 | CAP-MED-IMPORT, CAP-MED-TRANSCRIPT, CAP-MED-PLAYER, CAP-MED-SHADOWING, CAP-MED-DICTATION, CAP-MED-RESUME, CAP-GLB-VOICE, CAP-GLB-EVIDENCE | METRIC-003, METRIC-006, GUARD-001 | media | Voice & Media | product_approved |
| PRD-009 | CAP-PRC-READING, CAP-PRC-LISTENING, CAP-PRC-WRITING, CAP-PRC-SPEAKING, CAP-PRC-LIVE-HUB-CONVERT, CAP-GLB-EVIDENCE, CAP-GLB-SCORING-CALIBRATION, CAP-GLB-CONTENT-QUALITY | METRIC-003, METRIC-004, GUARD-001 | practice | Learning Activity | product_approved |
| PRD-010 | CAP-MCK-BUILD, CAP-MCK-VALIDATE, CAP-MCK-EXAM, CAP-MCK-RESUME, CAP-MCK-REPORT, CAP-MCK-LIVE-HUB-CONVERT, CAP-GLB-CONTENT-QUALITY, CAP-GLB-SCORING-CALIBRATION, CAP-GLB-EVIDENCE | METRIC-001, GUARD-001 | mock | Mock Exam | product_approved |
| PRD-011 | CAP-REV-MISTAKE, CAP-REV-DUE, CAP-REV-MASTERY, CAP-REV-RELAPSE, CAP-REV-PROGRESS, CAP-REV-RECOMMEND, CAP-GLB-EVIDENCE, CAP-GLB-LEARNER-PROFILE | METRIC-001, METRIC-002, METRIC-005 | review_progress | Mistake Lifecycle | product_approved |
| PRD-012 | CAP-GLB-AI-ROUTER, CAP-GLB-TUTOR, CAP-GLB-VOICE, CAP-GLB-SEARCH, CAP-GLB-SCORING-CALIBRATION, CAP-GLB-CONTENT-QUALITY, CAP-GLB-IDENTITY | METRIC-006, GUARD-001, GUARD-002, GUARD-004 | platform | AI Orchestration | product_approved |
| PRD-013 | CAP-GLB-APP-SHELL, CAP-GLB-AI-ROUTER, CAP-MCK-RESUME, CAP-MED-RESUME, CAP-SRC-IMPORT-BATCH, CAP-REV-DUE | METRIC-006, GUARD-001 | platform | Learning Activity | product_approved |
| NFR-001 | CAP-GLB-APP-SHELL, CAP-SRC-IMPORT-BATCH, CAP-MCK-EXAM, CAP-MCK-RESUME, CAP-PRC-SPEAKING, CAP-GLB-AI-ROUTER | METRIC-006 | platform | Learning Activity | product_approved |
| NFR-002 | CAP-MCK-RESUME, CAP-MED-RESUME, CAP-SRC-IMPORT-BATCH, CAP-GLB-AI-ROUTER, CAP-GLB-CONTENT-QUALITY, CAP-REV-DUE | METRIC-006, GUARD-001 | platform | Learning Activity | product_approved |
| NFR-003 | CAP-GLB-APP-SHELL | METRIC-005 | platform | Learning Activity | product_approved |
| NFR-004 | CAP-GLB-IDENTITY, CAP-GLB-LEARNER-PROFILE, CAP-SRC-PROVENANCE, CAP-PRC-SPEAKING, CAP-MED-SHADOWING, CAP-GLB-PRIVATE-WEB-BRIDGE | GUARD-002, GUARD-003, GUARD-004 | platform | Identity & Privacy | product_approved |
| NFR-005 | CAP-GLB-AI-ROUTER, CAP-GLB-TUTOR, CAP-GLB-VOICE, CAP-GLB-SEARCH, CAP-GLB-SCORING-CALIBRATION, CAP-GLB-CONTENT-QUALITY, CAP-SRC-GROUNDED-CHAT, CAP-SRC-ARTIFACT-STUDIO | METRIC-006, GUARD-001, GUARD-004 | platform | AI Orchestration | product_approved |

## Coverage Rules

The matrix is invalid if any of the following is true:

- a PRD/NFR definition is absent from the PRD;
- a requirement has zero or multiple matrix rows;
- an unknown requirement is present;
- a referenced capability does not exist in the Capability Registry;
- a referenced metric or guardrail does not exist in Product Strategy;
- a core capability is orphaned (absent from every matrix row);
- a Domain SPEC Owner is outside `platform`, `sources`, `vocabulary`, `grammar_strategy`, `media`, `practice`, `mock`, `review_progress`;
- an Architecture Owner is outside the approved bounded-context allowlist;
- a field is empty;
- Delivery Status is not `product_approved`;
- a row claims implementation, verification or release.

Advanced, later and rejected capabilities may appear when defining exclusions or isolation requirements. They are not counted as core delivery coverage.

## Deferred Delivery Specifications

Domain UX/System SPEC, Architecture/ADRs and Epic Delivery Specs are not created by this matrix. Each later Epic must consume PRD and CAP IDs. No row may silently redefine capability ownership or claim that implementation already exists.
