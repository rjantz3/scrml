# Bug 70 — `@.` outside `<each>` → E-SYNTAX-064 (was confusing E-CODEGEN-INVALID-JS)

change-id: bug-70-each-sigil-outside-each-2026-06-03
worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a97b6c59e44cd08a9
base merge: fe4ca941 (S157 Bug 63/65/67/68/71 + maps) confirmed in ancestry.

## 2026-06-03T06:44:27Z — startup + survey
- Startup verification PASS: worktree root ok, toplevel ok, clean, merged main fe4ca941 (fast-forward), bun install ok, pretest ok.
- Reproduced bug A (handler-call-arg `ping(@.id)` in Tier-0 ${for...lift}) → E-CODEGEN-INVALID-JS (raw `@.id` in `_scrml_ping_3(@.id)`).
- Reproduced bug B (bare `@.done` attr-value outside each) → confusing E-SCOPE-001 on base `@`.

## Phase-0 scope map (`@.`-outside-each positions)
- (1) bare `@.field` attr-value (variable-ref name "@.done"/"@.name") — reaches visitAttr :7395; has inEachBodyScope gate, NO else-fire. CLEAN single-site.
- (2) handler-call-arg in lift-embedded markup (`lift <li onclick=ping(@.id)>`, call-ref args) — lift-expr embedded markup is NEVER walked by TS visitor (default recursion only descends ARRAY keys; lift-expr.expr is an OBJECT). Leaks to codegen.
- (3) interpolation in lift-embedded markup (`lift <li>${@.name}`) — SAME root as (2): lift-embedded markup unvisited.
- Tier-1 `<each>` body markup IS visited (each-block walks templateChildren as markup); inEachBodyScope() true there → correctly skipped.
- Key parse fact: any expr containing `@.` bails to escape-hatch (nativeKind ParseError) with raw text — forEachIdentInExprNode does NOT see it. Detection = scan node text for the `@.` token.

## Plan (bounded — 2 loci, shared root for 2+3)
- A. visitAttr :7395 — add else-fire E-SYNTAX-064 for `@.`-prefixed variable-ref attr-value outside each.
- B. lift-expr case :6597 — scan embedded markup subtree for `@.` tokens; fire E-SYNTAX-064 once when !inEachBodyScope (covers 2+3).
- C. §34 catalog — add E-SYNTAX-064 row (currently "queued", no row).
- D. unit test + full suite.

## 2026-06-03T06:54:43Z — fix implemented + new test green
- type-system.ts: (A) visitAttr else-fire E-SYNTAX-064 for `@.`-prefixed attr-value outside each; (B) lift-expr case scans embedded markup via new markupSubtreeAtDotTokens helper, fires E-SYNTAX-064 per distinct `@.` token when !inEachBodyScope; (C) atDotEachOnlyMessage canonical message helper.
- markupSubtreeAtDotTokens handles BOTH tight (`@.id`) and spaced (`@ . name`, tokenized interpolation) forms; STOPS at nested-each boundary (kind each-block OR markup tag=each) — nested-each `@.` is legal.
- api.js: emit gate (E-CODEGEN-INVALID-JS) suppressed when a prior FATAL error exists — codegen-of-invalid-source is not a compiler defect.
- SPEC: §34 catalog E-SYNTAX-064 row ADDED (was missing — code was "queued"); §17.7.3 prose flipped queued->wired (2 sites).
- Reproducers A/B/C/D all fire E-SYNTAX-064 cleanly; E-CODEGEN-INVALID-JS gone for A; E-SCOPE-001-on-base-@ gone for B/D.
- Inside-each (attr/handler/interp + lift-in-each + bare shorthand) all compile CLEAN.
- New unit test each-sigil-outside-each-bug70.test.js: 7 pass / 0 fail.

### DEFERRED (out of scope — pre-existing, confirmed on clean base via stash)
- Codegen of a nested `<each>` INSIDE a Tier-0 `${for...lift}` (e.g. `for (row of @rows) { lift <tr><each in=row.cells><td>${@.}</td></each></tr> }`) fails E-CODEGEN-INVALID-JS — the nested-each `@.` is not rewritten by codegen in this lift-embedded position. My fix correctly does NOT false-fire E-SYNTAX-064 on it (it's legal nested-each); the codegen gap is independent and pre-existed Bug 70.
