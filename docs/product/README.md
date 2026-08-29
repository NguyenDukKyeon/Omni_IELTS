# Omni IELTS Product Documentation

The approved rebuild design and approved Brand/UX Rebuild Design are the decision baselines. Product Strategy defines market and outcomes; the Learning Framework defines pedagogy and evidence; the Capability Registry defines ownership; the PRD defines release requirements; the Product Traceability Matrix maps those requirements to capabilities, metrics, future Domain SPEC owners and future Architecture owners. Domain SPEC and Architecture documents may refine implementation but cannot silently contradict approved product decisions.

## Document hierarchy

1. Approved design: `docs/superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md`
2. Approved Brand and UX Rebuild Design: `docs/superpowers/specs/2026-08-30-omni-brand-ux-rebuild-design.md`
3. Product Strategy
4. Learning and Assessment Framework
5. Capability Registry
6. Public Beta PRD
7. Product Traceability Matrix

`npm run check:product-docs` enforces:

- required document paths;
- unique stable-ID definitions;
- PRD/NFR matrix coverage;
- valid cross-document references;
- allowed owners/status;
- no orphaned core capability;
- exact PRD/NFR-to-matrix capability parity;
- exact metric/guardrail parity;
- malformed requirement-row rejection;
- duplicate reference rejection;
- forbidden placeholder language.

Cross-document mentions of an ID are references, not new definitions. The matrix defines no stable IDs.

## Stable IDs

- `PRD-001`: functional product requirement
- `NFR-001`: non-functional requirement
- `CAP-SRC-001`: owned product capability
- `METRIC-001`: success metric
- `GUARD-001`: safety or trust guardrail

An ID is defined in one document and referenced elsewhere with a Markdown link. Renaming an approved ID requires an explicit migration entry.

Definition sites:

- `METRIC-*` and `GUARD-*` are H3 headings in Product Strategy.
- `CAP-*` is the first cell of a registry table row.
- `PRD-*` and `NFR-*` are H3 headings in the PRD.
