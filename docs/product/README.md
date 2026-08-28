# Omni IELTS Product Documentation

The approved rebuild design is the decision baseline. Product Strategy defines market and outcomes; the Learning Framework defines pedagogy and evidence; the Capability Registry defines ownership; the PRD defines release requirements. Domain SPEC and Architecture documents may refine implementation but cannot silently contradict approved product decisions.

## Document hierarchy

1. Approved design: `docs/superpowers/specs/2026-08-29-omni-ielts-product-rebuild-design.md`
2. Product Strategy
3. Learning and Assessment Framework
4. Capability Registry
5. Public Beta PRD

`npm run check:product-docs` enforces required paths, unique definition sites for stable IDs, and absence of unresolved placeholder language. Cross-document mentions of an ID are references, not new definitions.

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
