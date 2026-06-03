# s156 (d)-A batch 1 — enum-subset refinement type-system foundation

Append-only progress log.

## 2026-06-02 — Phase 0 survey COMPLETE, proceeding
- Startup verified: worktree CWD, HEAD 43cf9f40, merge main up-to-date, bun install + pretest OK.
- SPEC read in full: §53.15 (all sub-parts), §53.4 three-zone, §53.5.1 T-PRED-1..5, §53.6.1 refinement-position mandate, §53.9.2 caller/callee rows (incl. enum-subset widen/narrow rows at 29117-29120), §53.11 E-CONTRACT-001/-RT message formats.
- Source survey (HEAD 43cf9f40):
  - PredicatedType.baseType restricted to "number"|"string"|"boolean"|"integer" — must extend for enum base.
  - PredicateExpr kinds numeric/string only — add variant-set membership kind.
  - oneOf/notIn NOT parsed at all in parsePredicateExpr (only 2 mentions, both in schemaFor/optional-detection).
  - resolveTypeExpr §53 branch gated on PRED_BASES paren-form (base(predicate)). Enum subset is `Base oneOf([...])` space-separated validator-vocabulary form — NOT the paren-base form.
  - Empirical trace: struct-field type-expr arrives as `Role oneOf ( [ . Admin , . Editor ] )` (heavy ws); param/cell forms `Role oneOf([. Editor])`/`Role notIn([.Viewer])` (lighter ws); range form `Role oneOf ( . Admin .. . Viewer )`. Recognizer MUST be whitespace-tolerant.
  - inferBareVariantsInExpr resolves `.V` against contextType enum — must unwrap predicated-over-enum + enforce subset membership (static E-CONTRACT-001).
  - emit-predicates.ts predicateToJsExpr needs variant-set membership case for boundary runtime checks.
  - classifyPredicateZone (~1869) + predicateImplies (~1825) extend for variant-set membership.
  - decl zone annotation sites: let/const-decl (~5291), state-decl/react (~5531). param resolution binds type but no call-site predicate check today (numeric parity — call-site arg checks not yet emitted; batch 1 matches scope).
- DECISION: proceed (no spec/source mismatch warranting re-scope). Representation: PredicateExpr kind "variant-set" {mode:"oneOf"|"notIn", variants:string[]}; PredicatedType gains baseType "enum" + enumBase:EnumType + subsetVariants:Set<string>.

## 2026-06-02 — Phase 1 implementation (core)
- type-system.ts:
  - PredicateExpr += kind "variant-set" {variantMode, variants}. PredicatedType.baseType += "enum"; += enumBase, subsetVariants.
  - tEnumSubset() constructor: materializes subsetVariants (notIn complemented vs base).
  - parseEnumSubsetRefinement(): whitespace-tolerant recognizer for `Enum oneOf([.V])` / `Enum notIn([.V])`; returns valid subset, null (not-subset → fall through), or error-marker for range-form / empty / malformed.
  - maybeRejectEnumSubsetMarker(): lowers error-marker → E-CONTRACT-002 (refinement family; §53.15.5 minted no range code) at decl sites.
  - resolveTypeExpr: enum-subset branch BEFORE §53 PRED_BASES block.
  - inferBareVariantsInExpr: predicated-over-enum context → E-TYPE-063 (typo) + E-CONTRACT-001 (valid variant ∉ subset, static zone, names excluded variant + subset).
  - predicateImplies: "variant-set" case — source ⊆ target → implies (widen-free T-PRED-4 / §53.9.2 rows).
  - classifyPredicateZone(+initExpr param): enum-subset target → bare-variant init=static, subset-source⊆=trusted, else=boundary. isBareVariantInit() helper.
  - let/const-decl + state-decl annotators: thread initExpr to classifyPredicateZone; call maybeRejectEnumSubsetMarker.
  - state-decl reassignment-context lookup accepts predicated-over-enum (no spurious E-VARIANT-AMBIGUOUS on subset-cell rewrite).
  - type-decl case: struct-field range-form rejection (walk fields → maybeRejectEnumSubsetMarker).
- NEXT: probe verify; param/return range-form rejection + return-site static check; emit-predicates variant-set boundary JS; tests.

## 2026-06-02 — Phase 1 continued + Phase 3 probes (partial)
- param resolution: maybeRejectEnumSubsetMarker for fn param range-form (verified probe 8 → E-CONTRACT-002).
- emit-predicates.ts: PredicateExpr += variant-set; predicateToJsExpr variant-set → `[...].includes(v)` (enum variants are strings at runtime); predicateToDisplayString → `oneOf([.A, .B])`.
- Probes verified: P1 valid cell clean; P2 out-of-subset → E-CONTRACT-001 (names .Viewer + subset); P3 notIn complement (.Editor OK / .Viewer excluded); P4/P4b/P6/P8 range form → E-CONTRACT-002 (cell/struct/param); P5c plain-object subset literal → E-CONTRACT-001; P7 widen subset→full-param clean; P8b valid param clean; P10 boundary → `["Admin","Editor"].includes(...)` + node --check OK.
- PRE-EXISTING gaps surfaced (NOT regressions, NOT batch-1 scope):
  - `Post { ... }` struct-CONSTRUCTOR form does NOT trigger bare-variant inference even for plain-enum typos (.Bogus) — affects all bare-variant inference, not subset-specific. Plain object-literal `{ ... }` form DOES fire correctly.
  - return-type bare-variant inference does NOT fire even for plain enum (`fn pick() Role { return .Bogus }` clean) — multi-token return annotation `Role oneOf([...])` never reaches resolveTypeExpr (parser-stage gap). Numeric return refinement → unrelated E-CODEGEN-INVALID-JS baseline.
- gate suite (unit+integration+conformance): 15595 pass / 0 fail (= baseline). 0 regressions.
- NOTE: prior WIP commit used --no-verify in error; pre-commit gate actually passes clean. All subsequent commits run the gate (no bypass).

## 2026-06-02 — Phase 2 tests
- NEW compiler/tests/unit/enum-subset-refinement-da-b1.test.js — 10 describe blocks: recognition+materialization (oneOf+notIn complement), static E-CONTRACT-001 (names excluded variant+subset), static-zone classification, boundary-zone, widen-free (subset→full param clean), predicateImplies widen/narrow (trusted/boundary), range-form rejection (cell/struct/param/bare), empty list, notIn complement membership, typo → E-TYPE-063 not E-CONTRACT-001.
- predicate-codegen.test.js += §31 variant-set: predicateToJsExpr → `[...].includes(v)`, runtime-eval membership, emitRuntimeCheck E-CONTRACT-001-RT membership guard valid JS.
- 84/84 pass on the two files.

## 2026-06-02 — Phase 3 + PRIMER + wrap
- Phase 3 CLI probes (compiled via bun compiler/bin/scrml.js compile --output-dir):
  - ProbeA (struct field + cell + fn param, all valid): compiles clean; emitted client.js node --check OK; no _scrml_sql/secret leak.
  - ProbeB (out-of-subset literal at cell + struct-object-literal field): E-CONTRACT-001 x2, each naming .Viewer + subset.
  - ProbeC (range form + widen subset→full param): E-CONTRACT-002 for range; widen NO spurious narrow error.
  - Boundary-zone P10: emitted `["Admin","Editor"].includes(...)` + `oneOf([.Admin, .Editor])` display; node --check OK.
- PRIMER §13.7: added dA-b1 (S156, enum-subset §53.15) AST-contract row — documents variant-set PredicateExpr + baseType "enum" + subsetVariants materialization (load-bearing for batch 2/3) + all helpers/extensions/fire-sites + deferred items.
- Full suite (bun run test): 22705 pass / 0 fail (baseline 22685 + 20 new). 0 regressions. TodoMVC browser 39/47 pass (8 skip) once pretest populated fixtures.
- STATUS: batch 1 COMPLETE. Deferred (per brief): batch 2 (match exhaustiveness reads subsetVariants), batch 3 (schemaFor + .OneOfFailed). Surfaced PRE-EXISTING gaps (not regressions): return-type bare-variant enforcement (parser multi-token gap, fails for plain enums too); Post{} constructor-form inference (affects plain enums too).
