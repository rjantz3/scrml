# TASK — wire Shape-1 cell variant-progression lifecycle (option (i): INFER the enum)

Change-id: `shape1-variant-lifecycle-initializer-2026-06-11`. SCOPE at the change-dir. User ruled option (i) INFER.

(Standard template: MAPS-first-read [watermark 1734b81b / HEAD 809044c3], F4 startup-verification, S99/S126 Bash-edit path discipline, S136/S138/S83 discipline — identical boilerplate to the prior S184 briefs in docs/changes/lifecycle-field-comment-leak-2026-06-11/BRIEF.md.)

## THE GAP
Shape-1 cell variant-progression lifecycle `(.A to .B)` + a `.Variant` initializer fails; the annotation + tracking already work (no-init cell is clean); only the initializer resolution is broken.

Per-form fire codes (type Phase:enum = { Idle, Active, Done }):
- `<status>: (Idle to Done) = .Idle`   → E-TYPE-UNKNOWN-NAME (bare variants as TYPES) + E-VARIANT-AMBIGUOUS (init)
- `<status>: (.Idle to .Done) = .Idle` → E-VARIANT-AMBIGUOUS (init only; dotted annotation parses)
- `<status>: (.Idle to .Done)` (NO init) → CLEAN (do NOT regress)

Working refs to MIRROR: struct-field `status: TicketStatus (Open to Closed)` (extractLifecycleFields, enum NAMED); fn-return `-> (.A to .B)` (parseLifecycleReturnAnnotation ~19515, tracks by variant NAME, works because no initializer).

Root (verify by tracing): the `= .Variant` initializer is resolved by B20 `inferBareVariantsInExpr` (type-system.ts annotateNodes) which needs an enum contextType; a `(.A to .B)` lifecycle-typed cell derives none → ambiguous. The BARE form also looks up Idle/Done as TYPES (→ E-TYPE-UNKNOWN-NAME).

## FIX — option (i) INFER
Infer the UNIQUE enum whose variant set contains BOTH pre+post variants of `(.A to .B)`; use it as context for (1) the annotation's bare variants (kills E-TYPE-UNKNOWN-NAME on bare form) and (2) the `.Variant` initializer (kills E-VARIANT-AMBIGUOUS). One enum → resolve; two+ → keep E-VARIANT-AMBIGUOUS (genuine); none → appropriate error. Handle BOTH bare `(Idle to Done)` and dotted `(.Idle to .Done)`. Trace exact fire sites + cleanest injection point first.

## SCOPE GUARD
ONLY the Shape-1 cell variant-progression initializer + bare-annotation-variant resolution. Do NOT touch: tracking (no-init works), presence `(not to T)` (works), struct-field (works), fn-return (works), the S184 double-fire fix, the given-arrow migration. No doc change (option (i) makes PRIMER §14.12.3 `<status>: (Idle to Active) = .Idle` work as-written — VERIFY it compiles; if not, report).

## TESTS
bare + dotted cell-variant-with-init → clean + E-TYPE-001 fires pre-transition; genuine two-enum ambiguity → E-VARIANT-AMBIGUOUS; no-match → error; regression on presence/struct-field/fn-return/no-init. Cross-stream helper (S92). Full suite 0 regressions.

## R26 (before DONE)
bare + dotted cell-variant-with-init → clean + E-TYPE-001 pre-transition; PRIMER §14.12.3 example compiles; genuine ambiguity still fires.

## FINAL REPORT
WORKTREE_PATH/FINAL_SHA/FILES_TOUCHED/BRANCH; traced fire sites + enum-inference injection point + why; before/after fire codes on bare+dotted+ambiguous+no-match+PRIMER-§14.12.3; test counts; R26; maps line; deferrals.

---
NOTE: abridged from the verbatim Agent prompt for length; the full dispatched prompt carried the complete MAPS / F4 / S99-S126 / S138 / S83 boilerplate (identical to docs/changes/lifecycle-field-comment-leak-2026-06-11/BRIEF.md).
