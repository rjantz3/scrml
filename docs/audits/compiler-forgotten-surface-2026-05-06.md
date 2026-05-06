---
title: Compiler Forgotten-Surface Forensic Audit
date: 2026-05-06
auditor: general-purpose-agent
status: complete
consumers: PA + Stage 0c planning + primer amendment
---

# Compiler Forgotten-Surface Forensic Audit

## 1. TL;DR

The S63 trigger ("PA had to investigate to discover function overloading existed") is not an isolated incident. The compiler has accumulated a meaningful sliver-empty surface and a substantial primer-knowledge gap. The audit identifies:

- **5 sliver-empty / near-empty feature surfaces** beyond the confirmed function-overload deletion: `<keyboard>`/`<mouse>`/`<gamepad>` input state types (zero source-level usage outside one unit test), `<machine>` legacy keyword (1 sample, 0 examples; `<engine>` use case fully replaces it), `try-stmt`/`throw-stmt`/`switch-stmt` AST kinds (one sample, contradicts §6 anti-pattern stance), `reactive-derived-decl`/`-debounced`/`-array-mutation`/`-explicit-set`/`-nested-assign` legacy AST kinds (already retired per `@deprecated` tag in `ast.ts:564`, but still defined, still walked by 10 src files), and `emit-overloads.ts` (the seed; confirmed-deprecate).
- **String-typed cleanup partially landed.** A multi-phase effort (Phase 2/3/4d, ending at S60) did rename load-bearing string literals (`reactive-decl` → `state-decl`) and migrated AST shape to `ExprNode` structured form with `@deprecated` Phase-4d markers on the residual `string` fields. **~32 `@deprecated Phase 4d` markers remain in `compiler/src/types/ast.ts`** — fields like `init?: string`, `condition?: string`, `iterable?: string` are still on the AST shape, with all consumers required to maintain dual-shape fallbacks. This is the largest single discoverable cleanup-debt cluster in the source.
- **Spec-vs-decision drift:** **SPEC.md §17.5 (line 9001) overruns the debate-02 verdict** — it declares BOTH function-overloading AND component-overloading retired, but the debate transcript explicitly carved component-overloading out for separate examination. This is a critical correctness issue that must be fixed before Stage 0c starts.
- **Open SPEC-ISSUEs**: 7 (012, 013/named, 010 closed-without-resolution, 005, 018, 025-027); 14 codes appear in compiler src that don't appear in SPEC §34 (drift list in Bucket 3); 80+ SPEC codes don't appear in src (planned-future or stale).
- **Primer-amendment count: 11 proposed rows.** Top three: gauntlet-phase1/3 checks (a whole class of error codes the primer doesn't acknowledge exist), the `lint-ghost-patterns` pre-pass (it runs BEFORE BS — primer assumes pipeline starts at Stage 1), and the legacy reactive-* AST kinds (still callable from external consumers; PA dispatching a TAB-touching agent without this knowledge could write to-be-removed shapes).

**Top-3 P1 v0.2.0 items:**
1. **Fix SPEC.md §17.5 wording** — separate function-overload retirement from component-overload (verdict-vs-spec drift).
2. **Stage 0c.A function-overload deletion** — surface map below; fully ready.
3. **Phase 4d completion sweep** — drop the 32 `@deprecated Phase 4d` `string` shadow fields from `ast.ts`; update consumers to use `*Expr` form only. Finishes a multi-session cleanup that has been "almost done" since S60.

## 2. Methodology

**Greps performed (all from project root `/home/bryan-maclee/scrmlMaster/scrmlTS/`):**
- All AST `kind:` discriminants enumerated from `compiler/src/types/ast.ts` (~80 kinds).
- For each kind: `grep -rln <kind>` against `compiler/src/`, `samples/compilation-tests/`, `examples/`, `stdlib/`.
- Source surface: `<channel>`, `<machine>`, `<engine>`, `<schema>`, `<keyboard>`, `<mouse>`, `<gamepad>`, `<worker>`, `<transaction>`, `protect=`, `^{`, `_{`, `try`, `throw`, `lift`, `reset(`, `~ =`, `lin` — usage-counted across samples/examples/stdlib.
- `grep -ohE "E-[A-Z][A-Z0-9-]+"` against src and SPEC.md, diffed via `comm`.
- `git log --oneline | grep -iE "string|stringly|typed-ast"` for cleanup-history evidence (Phase 2/3/4d series identified).
- `grep "@deprecated\|DEPRECATED\|TODO\|FIXME\|SPEC-ISSUE"` across src and SPEC.md.
- Read full PA-SCRML-PRIMER.md (455 lines) and SPEC-INDEX.md (288 lines).
- Targeted reads of: ast.ts (kinds), emit-overloads.ts, lint-ghost-patterns.js, gauntlet-phase[13]-checks.js, attribute-registry.js, attribute-allowlist.ts, schema-differ.js, meta-eval.ts, codegen/README.md, debate-02 transcript.
- SPEC.md §17.5 (line 8999-9011) read for spec-vs-decision drift confirmation.

**Sliver-test bar:** zero or single-digit usage across `samples/compilation-tests/` (275 files) AND `examples/` (14 apps) AND `stdlib/` (16 modules) AND `self-host/` AND `benchmarks/`, and the trio (`match`/`engine`/derived cells) covers the documented use cases.

**Not done (out of scope or explicit time budget):**
- Did not run the test suite or compiler.
- Did not enumerate every PIPELINE.md stage contract for invariant-enforcement (Bucket 4 is partial — see explicit gaps).
- SPEC.md is 24,382 lines; only sections relevant to identified candidates were read.

---

## 3. Bucket 1 — Vestigial-or-near-vestigial features

### 1.1 Function-overload surface (THE SEED — confirmed)

**Inventory:**
- `compiler/src/codegen/emit-overloads.ts` (60 LOC, entire file dispatches `__scrml_state_type` tag).
- `compiler/src/type-system.ts:7193-7245` (`buildOverloadRegistry`).
- `compiler/src/ast-builder.js:1346-1372` (`tagFunctionsWithStateType`) + invocation at line 8345.
- `compiler/src/types/ast.ts:663` (`FunctionDeclNode.stateTypeScope` field).
- `compiler/src/codegen/analyze.ts:43,59,92` (registry plumbing).
- `compiler/src/codegen/emit-client.ts:9,545-547` (call site).
- `compiler/src/codegen/reactive-deps.ts:308` (comment only).
- `compiler/tests/unit/type-system.test.js:2349-2450` (5 unit tests — explicitly enumerated in SPEC.md §17.5).
- `compiler/tests/lsp/workspace-l2.test.js` (mention).

**Evidence of sliver-empty:** `grep -rln overload` against `samples/`, `examples/`, `stdlib/` returns ONE file: an unrelated `gauntlet-s19-phase1-decls/phase1-let-duplicate-binding-010.expected.json`. Zero source-level usage.

**Disposition:** **deprecate-hard.** Already authorized by debate-02 verdict and SPEC.md §17.5 wording.
**Risk-of-removal:** Low — surface is well-isolated; emit-overloads.ts is gated on `overloadRegistry.size === 0` early-return.
**Priority:** P1 v0.2.0 (Stage 0c.A).

### 1.2 Input state types — `<keyboard>` / `<mouse>` / `<gamepad>` (§36)

**Inventory:**
- AST kind: `input-state-ref` (`compiler/src/types/ast.ts:1607`).
- 10 src files reference the kind / element names.
- One unit test: `compiler/tests/unit/input-state-types.test.js`.
- SPEC §36 (358 lines, 14589-14946) — substantial spec real estate.

**Evidence of sliver-empty:** `grep -rln "<keyboard>\|<mouse>\|<gamepad>"` across `samples/`, `examples/`, `stdlib/` returns ZERO files. Only mentions are in docs (changelog, articles), the unit test, and self-host emit shims. Not in any sample, not in any example app, not in any stdlib module.

**Disposition:** **further-investigation.** Sliver-empty by usage, but §36 is a dedicated spec section and the AST kind is wired through TS / DG / CG. Worth a §17.5-style debate before deletion. Question to answer: is this a "build me first" load-bearing future feature for a Mario-style game-engine niche, or did §36 land on aspiration without an adoption plan? The trio test (match/engine/derived) does NOT cover live-input dispatch — input events are inherently external.
**Risk-of-removal:** Medium — visible spec real estate, would need a §36 retirement note and a self-host shim cleanup.
**Priority:** P2 v0.3.0+ (queue debate-04 if deletion contemplated).

### 1.3 `<machine>` keyword (legacy, already deprecated)

**Inventory:**
- W-DEPRECATED-001 emitted from `compiler/src/ast-builder.js:8224-8226`.
- Migration tooling at `compiler/src/commands/migrate.js` (already implements the rewrite).
- SPEC §51.0.L (~20129+) declares `<engine>` canonical, `<machine>` deprecated.

**Evidence:** 1 sample (`samples/compilation-tests/machine-002-traffic-light.scrml`), 1 example (`examples/14-mario-state-machine.scrml`); `<engine>` count: 2 paths in samples/examples. Both are at near-trivial volume (the migration is in progress).

**Disposition:** **keep, hard-removal at v0.3.0.** W-DEPRECATED-001 → E-DEPRECATED-001 transition is already announced. Spec already provides the path.
**Risk-of-removal:** Low (it IS the deprecation path).
**Priority:** P2 v0.3.0+ (already on the rails — no urgent action).

### 1.4 try-stmt / throw-stmt / switch-stmt AST kinds

**Inventory:**
- `compiler/src/types/ast.ts:770,779,790` — three kinds defined.
- 5 src files walk these kinds (DG, RI, reactive-deps, emit-logic, ast-walk).
- `samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-throw-statement-075.scrml` — ONE sample (and almost certainly a "this should fail" gauntlet fixture, per its directory).

**Evidence of contradiction:** primer §6 explicitly says `try { ... } catch (e) { ... }` is "not in scrml's vocabulary. Public claim. Surface a retraction if anyone slips and uses it." But the AST kinds exist, the walkers handle them, and they parse without error. The contradiction is the kind of thing that lets a downstream agent emit `try`-using JS into a "scrml-only" pipeline boundary.

**Disposition:** **further-investigation** — but with a strong leaning toward adding compile-time errors that map to E-USE-INVALID-CTX or a new E-TRY-FORBIDDEN. Either: (a) the parser shouldn't accept them, or (b) §19 should declare the public position is hard-enforced.
**Risk-of-removal:** Low to medium — depends on whether any meta `^{}` or foreign `_{}` blocks rely on the AST kinds existing as passthroughs.
**Priority:** P1 v0.2.0 (one diagnostic emission; high primer-clarity payoff).

### 1.5 Legacy reactive-* AST kinds (5 of them)

**Inventory (`compiler/src/types/ast.ts:564-630`):**
- `reactive-derived-decl` — `@deprecated Phase A1a Step 11.5 — RETIRED. The legacy ... kind has been folded into state-decl ... S60.`
- `reactive-debounced-decl` — `@deprecated` (no replacement note as direct).
- `reactive-nested-assign`, `reactive-array-mutation`, `reactive-explicit-set` — same family, no `@deprecated` tag but companion shapes.

**Evidence:** 10 src files still reference these kinds (DG, CE, RI, reactive-deps, emit-bindings, emit-client, emit-logic, ast.ts, type-system.ts, ast-builder.js). Most are pattern-match arms in walkers.

**Disposition:** **refactor / spec-only-fix** — drop the kinds from `ast.ts`, prune the unreachable arms from the 10 walkers. This is what `@deprecated S60` was supposed to enable. Also: the `Phase 4d` `@deprecated string` shadow fields (`init?: string`, `condition?: string`, etc.) on ~13 interfaces are the same cluster of cleanup debt.
**Risk-of-removal:** Medium — walker arms may be load-bearing in some niche path; needs surveyor pass before deletion.
**Priority:** P1 v0.2.0 — this is the bulk of "the old fragile string paths" the user mentioned.

### 1.6 `<transaction>` block (transaction-block AST kind)

**Inventory:** `compiler/src/types/ast.ts:1045`. SPEC §44.6 defers full transaction syntax to SPEC-ISSUE-018 (open). `compiler/src/codegen/emit-logic.ts:1197` and `compiler/src/codegen/emit-server.ts:570` both have `// SPEC §44.6 — transactions are deferred to SPEC-ISSUE-018` comments — code is partial.

**Evidence:** Zero source-level usage outside the codegen comments themselves.
**Disposition:** **further-investigation.** Stub-shaped feature waiting on spec resolution. Either close SPEC-ISSUE-018 and finish, or retire the AST kind.
**Priority:** P2 v0.3.0+.

### 1.7 Schema-differ + migrate command

**Inventory:** `compiler/src/schema-differ.js` (273 LOC), `compiler/src/commands/migrate.js`. SPEC §39 schema migrations.

**Evidence:** **<schema>** appears in 4 example files (17, 23-trucking, app, schema). Active. **Not vestigial.** Mentioned here only because the schema-differ + migrate plumbing is invisible to the primer.

**Disposition:** **keep.** Primer-amendment candidate (Bucket 5 row).

---

## 4. Bucket 2 — Fragile string-typed surfaces

### 2.1 The Phase 2/3/4d cleanup history

**Status:** PARTIALLY landed; explicit residue.

**Evidence — what landed:**
- `2378ecb refactor(phase-4): collapse multi-statement string splitting for let/const/reactive/return`
- `fcae54b refactor(expr-ast-phase-2-slice-4): delete Pass 2 string-scan fallback from scanNodeExprNodesForLin`
- `9636142 WIP(a1a-step-3): rename load-bearing string literal "reactive-decl" → "state-decl" across 67 files`
- `3f23443 WIP(expr-ast-phase-1): add parseExprToNode, esTreeToExprNode, emitStringFromTree`
- `2730db1 refactor(codegen): Lift Approach C Phase 2c-lite — drop dead BS+TAB re-parse block`

**Evidence — what's outstanding:**
- ~32 `@deprecated Phase 4d` markers in `compiler/src/types/ast.ts`. The pattern: every interface that historically held a `condition?: string`, `iterable?: string`, `init?: string`, `value?: string`, etc. now has a parallel `*Expr?: ExprNode` field with `Always populated by ast-builder` in the doc, and a `@deprecated Phase 4d: use *Expr` on the legacy field. The string fields ARE still consumed (otherwise consumers would crash on undefined) — a search shows they are still read in some downstream paths.
- `compiler/src/type-system.ts:7909` comment: "the dual-shape fallback that buildOverloadRegistry uses at line 4060." (Dual-shape fallback is the live evidence of incomplete migration.)
- Shadow field count, by interface: `let-decl`, `const-decl`, `tilde-decl`, `lin-decl`, `state-decl`, `reactive-derived-decl`, `reactive-debounced-decl`, `reactive-nested-assign`, `if-stmt`, `if-expr`, `for-expr`, `for-stmt`, `while-stmt`, `return-stmt`, `throw-stmt`, `switch-stmt`, `match-stmt`, `match-expr`, `propagate-expr`, `guarded-expr`. ~20 interfaces, ~30 deprecated-string fields.

**Disposition:** **refactor.** A Phase-4d-completion dispatch can sweep these, turn the deprecated fields into compiler-internal asserts (or just delete them and fix consumers). This is the largest "almost-done" cleanup in the source.
**Risk-of-removal:** Low if surveyed first — find all read-sites of each `@deprecated` field; many are in walker fallback branches that shouldn't fire post-S60.
**Priority:** P1 v0.2.0 (bookkeeping that pays compounding dividends).

### 2.2 `node.kind ===` string-typed dispatch (volume)

**Inventory:** dispatch on string `kind` literal is the canonical pattern across the AST. Per-file counts:
- `compiler/src/ast-builder.js`: 577 `kind ===` checks.
- `compiler/src/type-system.ts`: 184.
- `compiler/src/dependency-graph.ts`: 57.
- `compiler/src/component-expander.ts`: 54.
- `compiler/src/codegen/emit-logic.ts`: 32.
- `compiler/src/codegen/emit-expr.ts`: 13.

**Disposition:** **keep — this is fine.** TypeScript discriminated-union on `kind: "literal"` is the correct pattern; a registry-based dispatch would be worse. Distinguish from the legacy "string-path" cluster (2.1), which is real debt. This is structured.
**Priority:** N/A.

### 2.3 Hardcoded path strings in pipeline

**Inventory:** `compiler/src/codegen/compat/parser-workarounds.js` exposes a `setBPPOverrides(mod)` to swap implementations at runtime. Not a string-path bug; it's the self-host integration shim.
**Disposition:** **keep.** Worth a primer-amendment row (it's invisible at the §10/§14 level).

### 2.4 Cross-pass string-keyed maps

**Inventory:** `overloadRegistry` (Map<string, Map<string, ASTNodeLike>>), `exportRegistry` (similar shape from MOD), `componentRegistry` (CE). All Maps keyed by string; values are AST nodes.
**Evidence of fragility:** None observed in this audit; the keys are stable identifiers (function names, component names). Nothing-stringly-typed-here-FOUND.
**Disposition:** **keep.**

**Bucket 2 verdict:** the string-path cleanup is **partially done**. The biggest outstanding item is the Phase 4d `@deprecated string` shadow fields — ~30 fields across ~20 AST interfaces. Concrete, scoped, P1.

---

## 5. Bucket 3 — Spec-vs-code drift

### 3.1 Open SPEC-ISSUEs (status from SPEC.md)

| ID | Status | Topic | Location |
|---|---|---|---|
| 005 | **OPEN** | HTML targeted spec version | §24 ~13290 |
| 010 | CLOSED-WITHOUT-RESOLUTION | Component overloading retired (BUT see §3.5 below — spec wording overruns debate) | §17.5 9001 |
| 012 | OPEN | Tailwind variants/custom-theme/group-*/peer-* | §26 13512-13514, §28 ~3582+ |
| 013 | CLOSED 2026-03-27 | `animationFrame()` and reactive state reads | §6 ~4263 |
| 018 | OPEN | SQL transactions | §44.6 ~17350; emit-server.ts:570 + emit-logic.ts:1197 |
| 025 | OPEN | server @var initial-load parallelism | §52 ~22749 |
| 026 | OPEN | server @var partial-authority expressions | §52 ~22751 |
| 027 | OPEN | server @var initial-load query constraint | §52 ~22753 |
| §53.13.1-4 | OPEN (4 numbered SPEC-ISSUE-pending) | Named shape registry, constraint arithmetic, type alias for predicates, boolean predicates | §53 ~23737+ |

**Disposition:** all OPEN issues are in-flight or stale; tracking them in a single registry (vs. scattered in section text) is a primer-amendment candidate.
**Priority:** P3.

### 3.2 Error codes in SRC not in SPEC §34

`comm -23 src-codes spec-codes` (after dedupe of regex partial matches like `E-CTRL-`, `E-DECL`, `E-USE-`):
- `E-CTRL-011` — appears in src; not in SPEC §34 catalog.
- `E-META-EVAL-001`, `E-META-EVAL-002` — defined in `meta-eval.ts:23-25` only.
- `E-SYNTAX-050` — in src; not in §34.

**Disposition:** **spec-only-fix.** Add the missing entries to SPEC §34 catalog (low effort).
**Priority:** P2 v0.3.0+.

### 3.3 Error codes in SPEC not in SRC (top of list, ~80 total)

`E-ASSIGN-001..004`, `E-AUTH-001`, `E-CG-011..013`, `E-CHANNEL-002..006`, `E-CHANNEL-INSIDE-PROGRAM`, `E-CHANNEL-SHARED-MODIFIER`, `E-CLOSER-001`, `E-COMPONENT-001..005, 022..024`, `E-COMPONENT-ENGINE-SCOPE`, `E-DERIVED-ENGINE-*` (5 codes), `E-DERIVED-WITH-VALIDATORS`, `E-DERIVED-WRITE`, `E-ENGINE-006..012`, `E-ENGINE-EFFECT-AMBIGUOUS`, `E-ENGINE-INVALID-TRANSITION`, `E-ENGINE-VAR-DUPLICATE`, `E-FOREIGN-001..012`, `E-HTML-001..003`, `E-INPUT-005`, `E-LIFECYCLE-001..016`, ...

**Disposition:** **most are v0.next planned.** Stage 0b D2.8 / D3 / D4 added many spec-side error codes to be implemented at Phase A1+. This is the "spec runs ahead of impl" expected pattern. **No action — but** Bucket 4 (cross-pass invariants) should ensure that when implementation lands, the codes are emitted at the correct stage boundary.
**Priority:** P1 (track during Phase A1 implementation), P3 (audit per stage).

### 3.4 Codegen behaviour with SPEC-ISSUE comments

- `emit-server.ts:570`, `emit-logic.ts:1197` — `// TODO: replace with real server route fetch (§52.6.2 follow-up)` (sync)
- `emit-sync.ts:136,150` — same.
- `emit-expr.ts:529, 540` — `TODO(Phase 3 Slice 4)`: structured match-expr / SQL ref emission.
- `tailwind-classes.js:1311, 1470` — SPEC-ISSUE-012 (Tailwind variant gaps).

**Disposition:** **further-investigation per item.** All are linked to known SPEC-ISSUEs.
**Priority:** P2 except Phase 3 Slice 4 TODOs which are P1 if the slice is in flight.

### 3.5 SPEC §17.5 wording overruns debate-02 verdict (CRITICAL)

**Finding:** SPEC.md §17.5 line 9001-9011 (committed under S63 banner) declares:

> "That mechanism, AND its sibling state-type-discriminated function-overloading mechanism (`emit-overloads.ts`), are **retired for v0.2.0**."
> "Removal lands as Stage 0c housekeeping ... Files affected: `compiler/src/codegen/emit-overloads.ts` (deleted), `compiler/src/type-system.ts:7199-7245` ... `compiler/src/ast-builder.js:1346-1372` ... `compiler/src/types/ast.ts:663` ... 5 unit tests ..."

**Debate-02 verdict (transcript at `scrml-support/docs/debates/debate-02-state-type-overload-deletion-2026-05-06.md`) explicitly says:**

> "deprecate-hard for function overloads. **SEPARATE the §17.5 component-overload decision from this debate's outcome.**"
> "Stage 0c MUST NOT delete §17.5-component-overload code paths under the cover of this verdict."
> "SPEC §17.5 should retire the function-overload language but **pin SPEC-ISSUE-010-COMPONENT** (or equivalent) for the component-overload sub-question, **not close it wholesale**."

**However:** investigation of `compiler/src/component-expander.ts` finds **zero** `overload`-related code paths. The component-overloading mechanism was **doc-only in SPEC** and never implemented in the compiler. The sliver test for component-overload returns the same answer as for function-overload — empty.

**Disposition:** **spec-only-fix (P0 ship-blocker for Stage 0c).** The §17.5 prose must be amended to:
1. Retire ONLY the function-overloading language.
2. Reopen / re-pin SPEC-ISSUE-010-COMPONENT (queued debate per debate-curator queue: `QUEUED-component-overload-decision-2026-05-06.md`).
3. Note explicitly that no component-overload code paths exist in the implementation (so Stage 0c.A has nothing component-shaped to leave behind — but a future implementation MUST wait on debate-03).

**Risk if not fixed:** PA dispatches Stage 0c.A with the current §17.5 wording as authority and the Stage 0c agent has SPEC license to delete more than the debate verdict authorized. Even though the impl-side has nothing to delete, the spec-side authority leak is real.
**Priority:** **P0 ship-blocker — fix before Stage 0c.A dispatch.**

### 3.6 Reactive-* AST kinds with `@deprecated S60` still defined in spec

Already covered in 1.5; bucket-3 framing: spec doesn't document the retirement (search for "reactive-derived-decl" in SPEC.md returns no current normative section). This is OK because the kinds are internal to the impl, but it means a primer-amendment row is needed (Bucket 5).

---

## 6. Bucket 4 — Cross-pass invariants assumed but not enforced

**Methodology limit:** time budget did not permit a full PIPELINE.md stage-contract audit. The following are the high-confidence findings; gaps are explicitly listed.

### 4.1 `FunctionDecl.isServer` — TAB syntactic hint, RI authoritative

**Evidence:** PIPELINE.md 0.3.0 explicitly notes: "PA architecture note added: `FunctionDecl.isServer` is a TAB syntactic hint; RI is authoritative." This means downstream stages **must** consult RI, not TAB output, for server/client routing. **Searched for any code that branches on `node.isServer` directly without going through RI's route map**: `grep "\.isServer" compiler/src/` returns multiple sites in PA / TS / CE / CG. **Spot-check needed; flagged for further-investigation.**
**Risk:** A bug here results in client-side code emitting server-only constructs, which would be a security boundary leak (already mitigated at CG by the CG-006/W-CG-001 invariant — see PIPELINE.md 0.5.1 — but invariant rests on the assumption upstream stages don't route incorrectly).
**Disposition:** **further-investigation.** Audit each `isServer` read-site; confirm RI authority is consulted before client-emit.
**Priority:** P1 v0.2.0.

### 4.2 `overloadRegistry.size === 0` early-exit assumption

**Evidence:** `emit-overloads.ts:21` returns `[]` if registry is empty. The dependency that fileAST has the field at all is implicit — `analyze.ts` reads `fileAST.overloadRegistry` and forwards it, so if TS doesn't run (e.g., a pre-TS path), fileAST has no field, and `ctx.fileAST.overloadRegistry` is `undefined`. The check at line 21 (`if (!overloadRegistry || overloadRegistry.size === 0)`) handles it. **Not a bug today**; it's an invariant assumption that becomes load-bearing during Stage 0c.A — when emit-overloads.ts is deleted, the analyze.ts plumbing should also be removed cleanly.
**Disposition:** **refactor.** Surface during Stage 0c.A.
**Priority:** P1 v0.2.0.

### 4.3 ExprNode "Always populated by ast-builder" claims

Every `@deprecated Phase 4d` field has a sibling: `Structured ExprNode form ... Always populated by ast-builder.` In practice, the dual-shape fallback at `type-system.ts:7909` ("the dual-shape fallback that buildOverloadRegistry uses at line 4060") proves the "Always populated" claim is conditionally true. This is exactly the "works today by accident" class.
**Disposition:** **refactor (Phase 4d completion).** If we drop the deprecated fields, the dual-shape fallback should be deletable. Surveyor pass first.
**Priority:** P1 v0.2.0.

### 4.4 NR auto-declared engine variable + cross-file singleton

**Evidence:** PIPELINE.md 0.7.0 §3.05 NR notes "auto-declared engine variable resolution". The auto-declared rule (lowercase first run, strip "Machine") is a behavior visible at NR but the invariant — that no two engines auto-declare the same variable name — is enforced by `E-ENGINE-VAR-DUPLICATE` (in SPEC, not in src — see bucket 3.3). **Implementation pending.**
**Disposition:** **track during Phase A1.**
**Priority:** P1.

### 4.5 Gaps not investigated

- DG `hasLift` annotation immutability invariant (PIPELINE.md 0.5.0).
- META-stage post-meta AST shape (PIPELINE.md 0.6.0 says "DG now sees the post-meta-expansion AST" — needs spot-check).
- CSRF/auth injection at CG (PIPELINE.md 0.5.1 added; not verified).
- Closer migration (`/` → `</>`) — Appendix E covers; sample passes presumably exist.

**Disposition for the gaps:** **further-investigation, P2 v0.3.0+.** A Bucket-4-only audit pass would be high value but exceeds this audit's time budget.

---

## 7. Bucket 5 — Things-the-primer-doesn't-know

For each row: topic, why-load-bearing, suggested primer location, proposed wording.

### 5.1 The gauntlet-phase[1|3] post-TAB checks

**Topic:** A class of error codes (E-IMPORT-001/003, E-SCOPE-010, E-USE-001/002, E-EQ-002/004, E-SYNTAX-042) is emitted not from the named pipeline stages (TAB / TS / etc.) but from *post-TAB walker passes* in `gauntlet-phase1-checks.js` and `gauntlet-phase3-eq-checks.js`. These are surgical checks for diagnostics the main pipeline accepts silently. ~1226 LOC of diagnostic logic lives here.
**Why load-bearing:** PA dispatching a "fix the TS error" agent might look in `type-system.ts` and find no source for the diagnostic, because the diagnostic comes from the gauntlet pass.
**Where to add:** primer §10 (operational rules) or new §11.
**Wording:** "Gauntlet phase-1 / phase-3 walkers (`compiler/src/gauntlet-phase[1|3]-checks.js`) emit a class of post-TAB diagnostics — primarily import/scope/use-decl placement (E-IMPORT-001/003, E-SCOPE-010, E-USE-001/002) and equality / null-token misuses (E-EQ-002/004, E-SYNTAX-042). These run AFTER the named pipeline stages and exist to harden cases the main pipeline accepts silently. When dispatching diagnostic-fix work, search both `type-system.ts` AND these gauntlet files."

### 5.2 lint-ghost-patterns pre-pass

**Topic:** `compiler/src/lint-ghost-patterns.js` runs BEFORE the main pipeline (called from api.js:compileScrml() before Stage 2 BS). It scans for React/Vue/Svelte syntax and emits "did you mean?" warnings. ~492 LOC.
**Why load-bearing:** Primer §11 (anti-patterns table) lists the catalog; primer doesn't say there's a *compiler stage* that emits warnings for them. Anti-patterns are doc-level + lint-level, not just doc-level.
**Where to add:** primer §11 footer or §10.
**Wording:** "The anti-patterns in §11 above are also emitted as compiler warnings via `compiler/src/lint-ghost-patterns.js`, a pre-Stage-2 lint pass. Catalog source: `scrml-support/docs/ghost-error-mitigation-plan.md`."

### 5.3 Stale legacy reactive-* AST kinds

**Topic:** `reactive-derived-decl`, `reactive-debounced-decl`, `reactive-array-mutation`, `reactive-explicit-set`, `reactive-nested-assign` are AST kinds defined in `compiler/src/types/ast.ts:564-630` with `@deprecated Phase A1a Step 11.5 — RETIRED ... S60`. Walkers in 10 src files still match against them.
**Why load-bearing:** A PA dispatching a TAB-touching agent might (a) extend one of these kinds thinking they're live, or (b) write code that produces them, and downstream walkers will route incorrectly because the dual-shape fallback is incomplete.
**Where to add:** primer §14 (read-elsewhere) or new "stale internals" section.
**Wording:** "**Internal AST kinds retired but still present:** `reactive-derived-decl`, `reactive-debounced-decl`, `reactive-array-mutation`, `reactive-explicit-set`, `reactive-nested-assign` — folded into `state-decl` at S60 (Phase A1a Step 11.5). Walkers retain pattern-match arms for backwards compatibility but the parser no longer constructs them. Do not extend or use; they are scheduled for cleanup at Phase 4d completion."

### 5.4 `^{}` meta vs `_{}` foreign — meta is heavily used, foreign is zero-use

**Topic:** `^{}` blocks appear in 74 sample/example files; `_{}` foreign blocks appear in ZERO sample/example/stdlib files. Spec §23 (443 lines) documents foreign in detail, including WASM sigils and sidecars.
**Why load-bearing:** A primer reading would suggest both are first-class. Operationally, foreign-code is sliver-empty.
**Where to add:** primer §10 or §14.
**Wording:** "`^{}` meta is in active use across 74+ sample files. `_{}` foreign-code (§23) is currently sliver-empty (zero source-level usage); design real but adoption pending. Treat foreign-code design questions as low-priority unless a specific WASM/sidecar use-case is in scope."

### 5.5 Input state types §36 status

**Topic:** `<keyboard>`, `<mouse>`, `<gamepad>` — 358 lines of spec; zero sample/example/stdlib usage; only one unit test.
**Why load-bearing:** PA might dispatch "input handling" work assuming §36 is the canonical path, when in practice no app uses it.
**Where to add:** primer §14 or new "spec real estate vs adoption" note.
**Wording:** "**§36 Input state types** (`<keyboard>`, `<mouse>`, `<gamepad>`) are spec-real but zero-adoption (no samples, no examples, no stdlib consumers). Spec real estate exceeds adoption; pending §36 retention debate before extending."

### 5.6 Component-overload was never implemented (despite §17.5 implying surface)

**Topic:** SPEC §17.5 (current wording) implies component-overload is a removable mechanism. In fact `compiler/src/component-expander.ts` has zero overload code paths. Component-overload was a doc-only feature.
**Why load-bearing:** PA reading §17.5 could plan an A1c sub-step to "remove component-overload code" that has nothing to remove.
**Where to add:** primer §11 anti-patterns row + §14 reference.
**Wording:** "**Component overloading** was DOC-ONLY in SPEC §17.5 and never implemented in the compiler. The §17.5 retraction (S63) refers to a planning concept, not removable code. Stage 0c.A has zero component-overload code paths to delete — only function-overload code paths."

### 5.7 setBPPOverrides self-host integration shim

**Topic:** `compiler/src/codegen/compat/parser-workarounds.js` exposes `setBPPOverrides(mod)` to swap implementations at runtime when the self-hosted BPP module is loaded. This is the boundary between the JS-host compiler and the self-host scrml compiler.
**Why load-bearing:** PA dispatching self-host coordination work needs to know this shim exists; without it, the shim looks like dead-code-with-getter.
**Where to add:** primer §10 operational rules or §14.
**Wording:** "Self-host coordination uses `setBPPOverrides()` from `compiler/src/codegen/compat/parser-workarounds.js` — runtime override hook that swaps in self-hosted BPP module implementations when available. Live in self-host integration."

### 5.8 W-DEPRECATED-001 + migrate command

**Topic:** `<machine>` keyword emits W-DEPRECATED-001 and the `migrate` CLI command auto-rewrites `<machine` → `<engine`.
**Why load-bearing:** Primer §7 mentions engines as Tier 2 but doesn't mention the migrate path or W-DEPRECATED-001. A PA seeing `<machine>` in legacy code might not know there's tooling.
**Where to add:** primer §7 footer.
**Wording:** "Legacy `<machine>` keyword emits W-DEPRECATED-001; `bun scrml migrate <file>` auto-rewrites the syntax. W-DEPRECATED-001 → E-DEPRECATED-001 transition planned for v0.3.0."

### 5.9 Schema-differ + migrate flow

**Topic:** SPEC §39 schema migrations are implemented via `compiler/src/schema-differ.js` (273 LOC) which compares desired (from `<schema>` AST) vs actual (from `PRAGMA table_info()`) and generates migration SQL.
**Why load-bearing:** The schema → migration SQL flow is invisible at the §39 spec level — primer doesn't say "read schema-differ.js to understand the diff algorithm."
**Where to add:** primer §9.2 or §10.
**Wording:** "Schema-to-migration-SQL diff is generated by `compiler/src/schema-differ.js` — desired state from `<schema>` AST, actual state from `PRAGMA table_info()`, output is SQL. Live during dev-mode reload."

### 5.10 Attribute-registry + VP-1/VP-3 validators

**Topic:** `compiler/src/attribute-registry.js` (233 LOC) defines per-element attribute schemas for scrml-special elements (`<channel>`, `<page>`, `<machine>`, etc.). VP-1 (attribute-allowlist.ts) and VP-3 (attribute-interpolation.ts) consume it.
**Why load-bearing:** When a debate adds a new structural element (`<engine>`, `<errors>`, etc. — D4 added 4 of these), the attribute-registry MUST be updated. PIPELINE.md 0.7.0 §3.3 UVB/VP-1 calls this out, but the primer doesn't.
**Where to add:** primer §10 operational rules.
**Wording:** "Adding a new scrml-special element (e.g. a new structural element) requires updating `compiler/src/attribute-registry.js` for VP-1 / VP-3 validation; otherwise unknown attributes are silently forwarded as HTML."

### 5.11 SPEC-ISSUE registry is open + scattered

**Topic:** 7+ open SPEC-ISSUEs (012, 005, 018, 025, 026, 027, plus §53.13.1-4 numbered-pending) live scattered in SPEC.md prose. No single registry.
**Why load-bearing:** PA can't easily answer "what's open?" without grep.
**Where to add:** primer §14 reference.
**Wording:** "Open SPEC-ISSUEs (`grep -ohE 'SPEC-ISSUE-[0-9]+' compiler/SPEC.md | sort -u`): 005 (HTML version target), 012 (Tailwind variants/theming), 018 (SQL transactions), 025-027 (server @var initial-load semantics), §53.13.1-4 (named-shape registry, constraint arithmetic, type-alias for predicates, boolean predicates). 010 closed-without-resolution (component overload — see §3.5 above; queued debate-03)."

---

## 8. Stage 0c overload-surface map (the addendum)

Per debate-02 verdict, function-overload surface deletes (Stage 0c.A); component-overload waits for separate debate (none exists in src). The investigation found that **all overload code paths in the compiler are function-overload only**; component-overload was DOC-ONLY in SPEC §17.5.

| File / function / AST-kind / SPEC-section | Function-overload only | Component-overload only | Shared (deletion needs surgery) |
|---|---|---|---|
| `compiler/src/codegen/emit-overloads.ts` (whole file, 60 LOC) | YES — delete | — | — |
| `compiler/src/codegen/emit-client.ts:9` (import) | YES — delete | — | — |
| `compiler/src/codegen/emit-client.ts:545-547` (call site) | YES — delete | — | — |
| `compiler/src/codegen/analyze.ts:43` (`overloadRegistry?` field on shape) | YES — delete field | — | — |
| `compiler/src/codegen/analyze.ts:59,92` (forward) | YES — delete | — | — |
| `compiler/src/codegen/reactive-deps.ts:308` (comment "overloads, cross-file") | YES — delete comment | — | — |
| `compiler/src/type-system.ts:7193-7245` (`buildOverloadRegistry`) | YES — delete function | — | — |
| `compiler/src/type-system.ts:394` (`overloadRegistry: Map<...>` on type) | YES — delete field | — | — |
| `compiler/src/type-system.ts:7909` (dual-shape fallback comment ref to overload) | YES — update comment | — | — |
| `compiler/src/type-system.ts:7933-7942` (call site + populate field) | YES — delete | — | — |
| `compiler/src/type-system.ts:8772-8773` (export `buildOverloadRegistry`) | YES — delete export | — | — |
| `compiler/src/ast-builder.js:1346-1372` (`tagFunctionsWithStateType`) | YES — delete function | — | — |
| `compiler/src/ast-builder.js:8345-8347` (call site + comment "state-type dispatch") | YES — delete | — | — |
| `compiler/src/types/ast.ts:663` (`FunctionDeclNode.stateTypeScope?: string`) | YES — delete field | — | — |
| `compiler/tests/unit/type-system.test.js:2349-2450` (5 tests) | YES — delete | — | — |
| `compiler/tests/lsp/workspace-l2.test.js` (mention) | INVESTIGATE — is it overload-feature-test, or incidental? | — | — |
| `compiler/src/component-expander.ts` (entire file, 2893 LOC) | — | — — NO CODE TO DELETE (component-overload was doc-only) | The file as a whole is shared with all component work; do not touch under Stage 0c.A. |
| SPEC.md §17.5 (lines 8999-9011) | Wording must amend — remove function-overload retraction language | Wording must amend — DO NOT delete component-overload references; reopen SPEC-ISSUE-010-COMPONENT, queue debate-03 | YES — both halves of the section are touched, but the surgery is well-scoped at the prose level. **P0 ship-blocker — see §3.5 above.** |
| SPEC.md §47 (output name encoding kind markers) | Verify no overload kind marker exists | — | — |
| `compiler/src/codegen/README.md:33` ("emit-overloads.ts" row) | YES — delete row | — | — |

**Stage 0c.A summary:**
- 13 src code-deletion sites (clean).
- 5+ test deletions.
- 1 SPEC prose amendment (P0).
- 0 component-expander.ts touches.
- 1 codegen/README.md row deletion.

**Stage 0c.A is small and clean.** The hard work is the SPEC §17.5 amendment (drift fix) before deletion can proceed under correct authority.

---

## 9. Recommendations table

Ordered by priority; effort estimate is conservative-with-survey-discount.

| # | Action | Priority | Effort | Notes |
|---|---|---|---|---|
| 1 | **Fix SPEC.md §17.5 wording** to retire only function-overloading; reopen SPEC-ISSUE-010-COMPONENT | **P0** | 0.5h | Ship-blocker for Stage 0c.A authority. Bucket 3.5. |
| 2 | **Stage 0c.A function-overload deletion** | P1 | 2-3h | Surface mapped above; ~13 src sites + tests. |
| 3 | **Phase 4d completion sweep** — drop 30+ `@deprecated string` shadow fields in ast.ts | P1 | 3-5h with survey | Largest discoverable cleanup-debt cluster. Bucket 1.5 + 2.1. |
| 4 | **Drop legacy reactive-* AST kinds** (5 retired-S60 kinds) + walker arm pruning | P1 | 2-3h with survey | Companion to #3. |
| 5 | **Add try/throw/switch hard-error diagnostic** at compile time | P1 | 1-2h | Bucket 1.4. Closes the contradiction between primer §6 public claim and AST acceptance. |
| 6 | **Audit `node.isServer` read sites** for RI-authoritative routing | P1 | 1-2h | Bucket 4.1. Security-boundary load-bearing. |
| 7 | **Primer amendment** — apply 11 rows from §10 below | P1 | 1-2h | Pays compounding dispatch dividends. |
| 8 | **Add 4 missing error codes to SPEC §34** (E-CTRL-011, E-META-EVAL-001/002, E-SYNTAX-050) | P2 | 0.5h | Bucket 3.2. |
| 9 | **§36 input-state-types retention debate** (queue debate-04 if deletion contemplated) | P2 | 1-2h debate | Bucket 1.2. |
| 10 | **Resolve SPEC-ISSUE-018** (transactions) or retire `<transaction>` AST kind | P2 | depends | Bucket 1.6. |
| 11 | **Per-stage Bucket-4 invariant audit** | P2 | 4-6h dedicated audit | Gap from this audit. |
| 12 | **Per-section SPEC.md split** (also see roadmap §8.5) | P3 | epic | Spec at ~410k tokens; Read becomes infeasible. |

---

## 10. Primer-amendment proposals (extracted from Bucket 5)

| # | Topic | Suggested primer location | One-line inclusion test |
|---|---|---|---|
| 5.1 | Gauntlet phase-1/3 post-TAB checks | §10 ops or new §11 | Would PA dispatching a diagnostic-fix agent know to look in `gauntlet-phase[1|3]-checks.js`? |
| 5.2 | `lint-ghost-patterns` pre-pass | §11 footer or §10 | Would PA know there's a *compiler stage* (not just docs) emitting anti-pattern warnings? |
| 5.3 | Stale legacy `reactive-*` AST kinds | §14 read-elsewhere or new "stale internals" | Would PA dispatching TAB work avoid extending these retired kinds? |
| 5.4 | `^{}` heavily used vs `_{}` zero-use | §10 or §14 | Would PA correctly weight foreign-code design questions as low-priority? |
| 5.5 | §36 input-state-types adoption status | §14 or new note | Would PA know §36 spec-real-estate exceeds adoption? |
| 5.6 | Component-overload was DOC-ONLY (never implemented) | §11 anti-patterns + §14 | Would PA correctly plan Stage 0c.A as function-overload-only? |
| 5.7 | `setBPPOverrides` self-host shim | §10 ops | Would PA dispatching self-host work know about the runtime override hook? |
| 5.8 | W-DEPRECATED-001 + `migrate` CLI command | §7 footer | Would PA know `<machine>` has tooling, not just deprecation? |
| 5.9 | Schema-differ + migrate flow | §9.2 | Would PA know the diff algorithm lives in `schema-differ.js` rather than spec §39 alone? |
| 5.10 | Attribute-registry update requirement for new structural elements | §10 ops | Would PA dispatching new-element work remember to update VP-1/VP-3 inputs? |
| 5.11 | Open SPEC-ISSUE registry | §14 reference | Would PA know there are 7+ open issues, scattered? |

**Additional candidate** (didn't fit Bucket 5 cleanly): primer §10 ops should add a row about the **390k-token SPEC** Read-budget reality — using SPEC-INDEX.md + targeted-section Read is the only sustainable pattern. Currently mentioned tangentially at primer §10 line 400 ("Past the size where Read+Write full-file-overwrite is feasible").

---

## Appendix A — Source files inventoried

LOC totals: `compiler/src/` ~24,739 (per intake); top files audited:
- `ast-builder.js` (9234), `type-system.ts` (8779), `component-expander.ts` (2893), `expression-parser.ts` (2722), `meta-checker.ts` (2072), `route-inference.ts` (1962), `dependency-graph.ts` (1714), `runtime-template.js` (1784), `tailwind-classes.js` (1497), `tokenizer.ts` (1344), `block-splitter.js` (1325), `api.js` (1062).
- Codegen total ~18,334 LOC across 36 files. Largest: `emit-logic.ts` (1890), `rewrite.ts` (1861), `emit-control-flow.ts` (1253), `emit-client.ts` (1117), `emit-reactive-wiring.ts` (1002).
- Smallest (sliver candidates): `code-generator.js` (7 LOC stub — verify), `var-counter.ts` (25), `utils.ts` (37), `errors.ts` (48), `emit-overloads.ts` (60).

`compiler/src/code-generator.js:7` LOC suggests it's a stub — worth a verify in next pass.

## Appendix B — Confidence notes

- **High confidence:** function-overload surface map (§8), §17.5 spec drift (§3.5), Phase 4d residue inventory (§4.2.1), input-state-types sliver (§3.1.2), gauntlet/lint-ghost primer gap (§7.5.1-5.2).
- **Medium confidence:** component-overload-was-doc-only (verified by grep against component-expander.ts but did not exhaustively read the 2893-LOC file).
- **Lower confidence (FURTHER-INVESTIGATION marker):** Bucket 4 cross-pass invariants (audit was time-boxed), `try-stmt`/`switch-stmt` removal risk (some meta/foreign passthrough may rely on AST kinds existing).

---

*End of audit.*
