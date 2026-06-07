# DD3 Unit 2 BRIEF (archived per pa.md S136) — agent af03e6c8883760f0a

Dispatched S172, 2026-06-07. isolation:worktree, general-purpose, opus, background.
Change-id: `dd3-state-self-evidence-2026-06-07` (2nd dispatch). Builds on landed Unit 1 (`6f42f149`).
Scope: Fork 3B (in-place rewriter mode `bun scripts/state.ts --write`) + Fork 4 (`--check` gate mode)
+ Fork 2B (delete §0 narrative cells, wrap §0 count table in `<!-- @generated:gap-counts -->` anchors
so the Open numbers regenerate from the @gap tokens). Touches ONLY scripts/state.ts + docs/known-gaps.md.
Fork 1 (changelog banner + master-list §0.6 deletions) is a SEPARATE later unit (needs reconcile-first).
Anchor convention: `<!-- @generated:<NAME> START (...) -->`/`END`. Validation: print still reproduces
HIGH 0·MED 9·LOW 18·Nominal 9; --write idempotent; --check exits 0 fresh / nonzero on tampered section;
tests 0-fail. Full F4/S88/S99/S126 + S83. (Full prompt in dispatch transcript.)
