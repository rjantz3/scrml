# s156-dA-batch4-enum-subset-enforcement-reach — progress

## Phase 0 — survey (against HEAD 0097d5b0)

### Deliverable (b) — constructor form `Type { ... }`  [REAL GAP — headline]
- `const bad = Post { title:"x", role: .Viewer }` does NOT fire E-CONTRACT-001 today.
- Root cause TWO-fold:
  1. `parseExprToNode("Post { ... }")` returns just `{kind:"ident", name:"Post"}` — acorn stops
     at `Post` and DROPS the brace body (codegen lowers the body via string-rewrite
     `rewrite.ts:rewriteStructConstruction`, so JS is correct, but the typer's ExprNode loses it).
  2. const-decl has NO `:Type` annotation → falls into the `else` branch
     (type-system.ts ~5701) → `inferBareVariantsInExpr(initExpr, null, ...)` with null context.
- The RAW `init` text DOES capture the full constructor: `"Post { title : \"x\" , role : . Viewer }"`.
- The annotated object-literal form `const bad: Post = { role: .Viewer }` DOES fire (struct-nav
  descent at type-system.ts:5700 with letAnnot="Post"). Mirror that path for the constructor form.
- FIX PLAN: in the no-annotation `else` branch, detect `^[A-Z]\w*\s*\{` in raw init; resolve the
  TypeName against typeRegistry; if struct, parse the brace-body as object-literal ExprNode; run
  `inferBareVariantsWithStructNav(objLit, structType, ...)`.

### Deliverable (a) — fn-return subset annotation  [NOT A GAP for canonical syntax — STOP]
- SPEC §7.3 line 5761 NORMATIVE: "`->` is the sole return-type annotation syntax for `function`
  and `fn` declarations." §7 grammar line 5735: `return-type ::= '->' type-expr`.
- The CANONICAL arrow form `fn assignRole() -> Role oneOf([.Admin, .Editor])` ALREADY WORKS:
  - return `.Admin` (in subset) → clean
  - return `.Viewer` (out-of-subset) → E-CONTRACT-001  ✓
  - plain-enum typo `.Bogus` (with `-> Role`) → E-TYPE-063  ✓
- The brief's example `fn assignRole() Role oneOf([.Admin,.Editor])` (BARE-SPACE, no arrow)
  does NOT parse a return type — and per §7.3 line 5761 it is NOT canonical scrml. ast-builder
  only recognizes `:` and `->` return-type forms (by design, matching §7.3).
- => Deliverable (a) is ALREADY SATISFIED by batch 1 for canonical syntax. The bare-space form
  in §53.15.1's example is an informal elision of the `->`. No (a) work needed unless PA wants
  the non-canonical bare-space form supported (which would CONTRADICT §7.3 line 5761).

### Deliverable (c) — member-access block-form `<match for=Role on=@p.role>`  [REAL GAP]
- `<match for=Role on=@post.role>` over `Post.role: Role oneOf([.Admin,.Editor])` covering only
  the subset variants fires E-MATCH-NOT-EXHAUSTIVE (reads full enum, not the field subset).
- dead-arm `.Viewer` does NOT fire E-MATCH-SUBSET-DEAD-ARM.
- batch-2 baseline (top-level CELL subset `@currentRole: Role oneOf(...)`) works correctly.
- FIX PLAN: in symbol-table.ts block-form pass, resolve `@p.role` member-access subject by
  finding p's declared struct type → the `role` field's subset refinement string.

## STOP DECISION
Surfacing to PA: (a) is a non-gap for canonical `->` syntax; the brief's bare-space example
contradicts §7.3 line 5761. Proceeding with (b) + (c) which are real gaps. Awaiting confirmation
that (a) needs no work (or that PA wants a SPEC §53.15.1 example correction surfaced).

## Phase 1 — implement (DONE)
- (b) `inferBareVariantsForStructConstructor` (type-system.ts) — recovers struct
  context from raw init text, re-parses brace body, runs struct-nav descent.
  Wired into const/let-decl no-annotation `else` branch. Commit c5c6c25c.
- (c) `splitStructFields` + `collectStructFieldSubsets` + `collectCellStructTypes`
  + `resolveMemberAccessSubset` (symbol-table.ts) — string-based SYM collectors;
  validateMatchBlock resolves `on=@cell.field` to the field subset. Commit 58ddd85f.
- (a) NO IMPLEMENTATION — canonical `->` syntax already enforces via batch 1
  (verified: fn/function, oneOf/notIn, out-of-subset→E-CONTRACT-001, typo→E-TYPE-063).
  Tests lock the behavior; the bare-space form in §53.15.1's example contradicts
  §7.3 line 5761 and is correctly NOT parsed as a return type.

## Phase 2 — tests (DONE)
- compiler/tests/unit/enum-subset-enforcement-reach-da-b4.test.js — 16 tests, all pass.

## Phase 3 — empirical compile-probes (DONE during survey + impl)
- (b) §53.15.2 canonical: `const bad = Post { role: .Viewer }` → E-CONTRACT-001
  naming .Viewer + subset; `const ok = ... .Admin` → clean. Verified.
- (a) `fn f() -> Role oneOf([.Admin,.Editor]) { return .Viewer }` → E-CONTRACT-001. Verified.
- (c) `<match for=Role on=@post.role>` subset field: exactly subset → clean;
  dead .Viewer arm → E-MATCH-SUBSET-DEAD-ARM; missing → narrowed E-MATCH-NOT-EXHAUSTIVE;
  plain-enum field → full-enum exhaustiveness (no regression). Verified.

## SURFACE TO PA
Deliverable (a)'s brief example `fn assignRole() Role oneOf([.Admin,.Editor])`
(bare-space, no `->`) is NOT canonical scrml per SPEC §7.3 line 5761 ("`->` is the
sole return-type annotation syntax"). §53.15.1's example elided the arrow. RECOMMEND:
SPEC §53.15.1 example correction (add `->` to the subset-return-type example) so the
deep-dive section agrees with §7.3's foundational grammar. No compiler change needed
for (a) — batch 1 already enforces the canonical form end-to-end.
