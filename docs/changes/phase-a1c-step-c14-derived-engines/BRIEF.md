# Phase A1c — Step C14: derived engines (`derived=expr` emission, L20)

**Phase:** A1c. Wave 4 sequential — C12 SHIPPED (`5c910a3`), C13 SHIPPED (`888d0fd`); C15 next after C14.
**Estimate:** 4-6h focused (per SCOPE row 232).
**Dispatched:** 2026-05-09 (S74).
**Authority chain:** SPEC §51.0.J (derived engines, lines ~20528-20567) + L20 (lock). SCOPE-AND-DECOMPOSITION row C14 (`docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md:232` + `:300` A1b dependency = B16). C13 SURVEY HANDOFF (`docs/changes/phase-a1c-step-c13-advance-write-hook/SURVEY.md`).

## Goal (one paragraph)

Emit the runtime substrate for `<engine for=Type derived=expr>` declarations. After C14 lands, every derived-engine declaration in compiled output produces:
1. **One auto-declared READ-ONLY reactive variant cell** (`@<varName>: Type`) typed as the enum, owned by the derived computation (NOT a plain `_scrml_state` cell — uses `_scrml_derived_declare` from C2's substrate so the cell is read-only at the runtime layer too).
2. **One derived computation closure** wrapping `derived=expr`, subscribed to upstream cells the expression reads. On dirty propagation, the closure re-evaluates and updates the variant cell.
3. **Initial value** computed at engine-init time by evaluating `derived=expr` once. If the result is undefined (source in initial state with no matching arm), runtime throws E-DERIVED-ENGINE-INITIAL-UNDEFINED per §34.

C14 emits NO transition table (per §51.0.J: `rule=` rejected at A1b/B16). NO write-hook (per §51.0.J: direct writes rejected at A1b — E-ENGINE-017 / E-DERIVED-ENGINE-NO-WRITE compile-time). NO `.advance()` interception (per §51.0.G: derived engines have no .advance — E-DERIVED-ENGINE-NO-WRITE family covers it).

## Re-scope notice on `<onTransition>` / `effect=` for derived engines

§51.0.J line 20560 says `<onTransition>` and `effect=` on state-children of derived engines are LEGAL — they fire on derived state changes. **However, per C13's SURVEY q3 finding: `<onTransition>` + `effect=` are NOT YET PARSED into engineMeta** (`engine-statechild-parser.ts:43` defers to B17, B17 only shipped E-COMPONENT-ENGINE-SCOPE). The codegen for these is structurally blocked on a missing A1b parser-extension step.

C14's scope therefore EXCLUDES `<onTransition>` / `effect=` firing on derived engine state-children — same blocker as C13. When the parser-extension step lands and `<onTransition>` codegen ships (a future C-step or C13b), it will need to handle BOTH non-derived and derived engine transitions uniformly (the firing mechanism is the same; only the trigger differs — direct write or .advance for non-derived, derived recomputation for derived).

## What's already in place (depth-of-survey signal)

**C2 derived-cell substrate (already shipped, S73):**
- `_scrml_derived_declare(name, computeFn)` — runtime helper that registers a derived cell with a closure.
- `_scrml_derived_subscribe(name, depName)` — registers a dependency edge (derived cell `name` re-evaluates when `depName` is dirty).
- `_scrml_derived_get(name)` — read accessor (returns current value; lazy or eager per chunk semantics).
- These live in chunk `derived` per `runtime-chunks.ts` ordering. Already gated on plain-derived-state usage; `usage.engines && usage.derivedEngines` would also need to trigger this chunk if it doesn't already (verify in survey).

**C12's helpers (SHIPPED `5c910a3`):**
- `collectC12EngineDecls(fileAST)` — walker that EXCLUDES derived engines (filters via `derivedExpr == null`). C14 needs a SIBLING walker `collectDerivedEngineDecls` (or a parameterized version of `collectC12EngineDecls` with a "derived only" mode).
- `engineTransitionTableName(varName)` — N/A for C14 (no transition table).
- `resolveEngineInitialVariant(meta)` — N/A for C14 (initial value comes from `derived=expr` evaluation, NOT from `initial=`/state-child fallback).
- `isC12EngineDecl(node)` — gating predicate that REJECTS derived engines. C14 needs a sibling `isC14DerivedEngineDecl` (gate on `engineMeta.derivedExpr != null` AND `engineMeta` exists AND `kind === "engine-decl"`).

**C13's helpers (SHIPPED `888d0fd`):**
- Chunk #18 `engine` in runtime-chunks.ts. Currently triggered by `engine-decl` AST detection in `emit-client.ts:detectFromNode` — already conservatively triggers for derived engines too (per C13 HANDOFF). C14 may keep as-is OR narrow if derived engines don't need any of chunk #18's helpers (`_scrml_engine_check_transition`, `_scrml_engine_advance`, `_scrml_engine_direct_set`).
- `buildEngineBindingsMap(fileAST)` — explicitly EXCLUDES derived engines per C13's filter via `collectC12EngineDecls`. **C14 should leave this filter intact** — derived engine variables are READ-ONLY per §51.0.J + §51.9; writes/`.advance` are E-ENGINE-017 / E-DERIVED-ENGINE-NO-WRITE compile-time errors that A1b/B16 already fires.

**A1b B16 (derived engines validation, SHIPPED earlier):**
- Verify what B16 annotated on derived engine-decl AST nodes:
  - `engineMeta.derivedExpr` — the parsed expression AST node (or raw text — survey to confirm shape).
  - Validation already done at A1b: `rule=` on state-children → E-DERIVED-ENGINE-NO-RULES; `initial=` on engine → E-DERIVED-ENGINE-NO-INITIAL; chained-derivation cycle → E-DERIVED-ENGINE-CIRCULAR.
  - C14 can ASSUME B16 has fired all compile-time diagnostics; if `engineMeta.derivedExpr != null` and the engine reaches codegen, the expression is structurally valid.
- Survey to confirm: does B16's typer ALSO record the dependency set (which cells `derived=expr` reads)? If yes, C14 consumes that set for `_scrml_derived_subscribe` calls. If no, C14 needs to walk the `derivedExpr` AST itself to extract dep names (existing `forEachIdentInExprNode` walker pattern from C2 / validator-arg-parser may help).

**Test count baseline:** 10,389 / 60 / 1 / 0 (S74 post-C13 close).

**Canonical worked example from §51.0.J line 20536-20549:**

```scrml
<engine for=Health derived=match @marioState {
  .Small | .Big => .Healthy
  .Fire | .Cape => .AtRisk
  _              => .Critical
}>
  <Healthy/>
  <AtRisk>
    <onTransition from=.Healthy>${ playSound("warning") }</>     <!-- DEFERRED in C14 (parser blocker) -->
  </>
  <Critical>
    <onTransition from=.AtRisk effect=showDangerOverlay()/>      <!-- DEFERRED in C14 (parser blocker) -->
  </>
</>
```

C14 emits the `Health` variant cell + the derived computation that re-evaluates the match expression on `@marioState` change. The state-children body (`<Healthy/>` etc.) and any markup body rendering follows the same pattern as non-derived engines — body rendering remains DEFERRED (C12's open follow-on).

## Scope (in / out)

**IN scope (C14):**

1. **Sibling discovery walker** — `collectDerivedEngineDecls(fileAST)` (or parameterize C12's `collectC12EngineDecls` with a `mode: "non-derived" | "derived" | "all"` arg — survey decides). Filters: `engineMeta.derivedExpr != null` AND `engineMeta` exists AND `kind === "engine-decl"`.

2. **Derived variant cell emission** — for each in-scope derived engine, emit:
   - `_scrml_derived_declare(<varName>, () => <derived-expr-body>)` — the variant cell as a derived cell (NOT a `_scrml_reactive_set` plain cell).
   - One `_scrml_derived_subscribe(<varName>, <depName>)` per upstream cell the `derived=expr` reads — consumed from B16 if recorded, else walked from `engineMeta.derivedExpr` AST.
   - The closure body returns the variant tag (string for unit variants; object for payload variants per §14.4 runtime shape).

3. **Initial-value handling** — per §51.0.J + §34 E-DERIVED-ENGINE-INITIAL-UNDEFINED row: if `derived=expr` returns no value when source is in initial state, runtime throws E-DERIVED-ENGINE-INITIAL-UNDEFINED. The natural shape is: the derived closure runs once at init time; if it returns `undefined` / `null` / no-match-arm-result, throw with E-DERIVED-ENGINE-INITIAL-UNDEFINED message. **Survey decision:** the throw can be inside the closure (clean, locality), OR in a wrapper helper `_scrml_engine_derived_init_check`. Lean: inside the closure — no new runtime helper needed unless wrapper buys diagnostic clarity.

4. **Mount-position marker** — per C12's pattern, emit `// §51.0.D engine mount position: <varName> (<forType>) — DERIVED — body rendering deferred to follow-on` at the engine's source position.

5. **Tests:** `compiler/tests/unit/c14-derived-engines.test.js`. Cover at minimum:
   - Simple derived engine, single source cell, match-shape derived-expr → variant cell value matches the projection.
   - Source cell change triggers re-projection → variant cell updates.
   - Multiple source cells in derived-expr → all dependencies subscribed.
   - Chained derivation (engine A's derived expr reads engine B's variant) → cascading updates work.
   - Derived engine in same file as non-derived engine — no name collisions, both work.
   - Initial value: derived expr returns valid variant → cell init OK.
   - Initial value undefined: derived expr returns no match arm → throws E-DERIVED-ENGINE-INITIAL-UNDEFINED at runtime init.
   - **Negative tests** (already enforced by A1b/B16; verify C14 doesn't regress): write to derived engine variable → compile error (E-ENGINE-017 / E-DERIVED-ENGINE-NO-WRITE); `rule=` on state-children → compile error (E-DERIVED-ENGINE-NO-RULES); `initial=` on derived engine → compile error (E-DERIVED-ENGINE-NO-INITIAL).
   - Legacy `<machine>` path NOT regressed (smoke).
   - Non-derived engines from C12 NOT regressed (smoke).

**OUT of scope (deferred):**

- **`<onTransition>` element firing on derived state-children** — STRUCTURALLY BLOCKED on parser (same blocker as C13). Future C-step or A1b parser-extension.
- **`effect=` attribute emission on derived state-children** — same blocker.
- **Body rendering** — C12's deferred follow-on; still deferred. C14's mount-position marker mirrors C12's.
- **Cross-file engine import + `<EngineName/>` mount** — C15.
- **Direct-write rejection codegen** — already enforced at A1b compile-time per §51.0.J. No runtime hook needed for derived engines (no `.advance` to intercept either; both are compile errors).
- **Cycle detection** — A1b's job per §34 E-DERIVED-ENGINE-CIRCULAR + §31 dep-graph machinery. C14 trusts.

## Spec verification (pa.md Rule 4)

Spec sections to read (verbatim) BEFORE writing emission:

- **§51.0.J** (lines ~20528-20567) — derived engines normative spec. Specifically the rules table at 20554-20563.
- **§34** rows for derived engines (lines ~14380-14384):
  - E-DERIVED-ENGINE-NO-RULES (A1b/B16; C14 confirms not regressed)
  - E-DERIVED-ENGINE-NO-INITIAL (A1b/B16; C14 confirms not regressed)
  - E-DERIVED-ENGINE-NO-WRITE (A1b; C14 confirms not regressed)
  - **E-DERIVED-ENGINE-INITIAL-UNDEFINED** — RUNTIME severity per spec; C14 EMITS this.
  - E-DERIVED-ENGINE-CIRCULAR (A1b cycle detection; C14 confirms not regressed)
- **§51.0.G** (line ~20429) — `.advance()` semantics; derived engines have no .advance per §51.0.J (read-only).
- **§51.0.E** (line ~20349) — initial= forbidden on derived; A1b enforces.

If derived planning docs contradict §51.0.J text, **SPEC WINS.** Quote in SURVEY before writing contradicting tests.

## Dispatch protocol

S67 worktree-as-scratch / file-delta landing.

## Authorized decisions

- **File locus:** EXTEND `compiler/src/codegen/emit-engine.ts` with derived-engine emission. Sibling functions to C12's: `collectDerivedEngineDecls`, `isC14DerivedEngineDecl`, `emitDerivedEngineSubstrate` (or a dispatch on `meta.derivedExpr != null` inside the existing `emitEngineSubstrate` orchestrator — survey decides).
- **Runtime locus:** REUSE C2's `_scrml_derived_declare` / `_scrml_derived_subscribe` / `_scrml_derived_get` helpers (chunk `derived`). Verify the `derived` chunk gets triggered when `usage.engines && usage.derivedEngines` is true — extend `usage-analyzer.ts` chunk-detection if needed.
- **Test file:** `compiler/tests/unit/c14-derived-engines.test.js`.
- **Initial-value undefined handling:** lean inline-throw inside the closure on first invocation; survey may decide otherwise.

## Sibling-dispatch awareness

**No siblings — Wave 4 strict sequential.** C14 owns the engine codegen surface entirely. C15 dispatches AFTER C14 lands. C23 (PIPELINE prose) still held until Wave 4 closes.

If you encounter an A1b annotation gap for `engineMeta.derivedExpr` (e.g., dependency-set not pre-recorded by B16), surface to PA — do NOT cross into A1b/B16 territory; document and either work around or BLOCK.

## Anti-patterns reading

`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — derived engines / projected state has heavy MobX / Vue computed / RxJS observable / Redux selectors training-data bias. The scrml shape is `<engine for=Type derived=expr>` (declarative; the engine IS the derived projection), NOT `computed(() => ...)` factory or `createSelector([...], (...) => ...)` lambda chain.

`docs/articles/llm-kickstarter-v1-2026-04-25.md` — kickstarter context; canonical Health-from-Mario derived engine example aligns with §51.0.J line 20536.

## File-modification inventory expected

| File | Reason |
|---|---|
| `compiler/src/codegen/emit-engine.ts` | Extend with `collectDerivedEngineDecls` + `isC14DerivedEngineDecl` + `emitDerivedEngineSubstrate` (or merge into existing orchestrator) |
| `compiler/src/codegen/emit-client.ts` (likely) | Verify engine-decl detection still triggers `derived` chunk for derived engines (may already work) |
| `compiler/src/codegen/usage-analyzer.ts` (possible) | If `derivedEngines` flag's chunk-trigger needs explicit wiring |
| `compiler/tests/unit/c14-derived-engines.test.js` (NEW) | Unit tests per §scope IN item 5 |
| `compiler/tests/runtime-tree-shaking.test.js` (possible) | If chunk-trigger logic changed |
| `docs/changes/phase-a1c-step-c14-derived-engines/{progress,SURVEY}.md` | Crash-recovery + survey output (REQUIRED) |

## Definition of Done

- All §scope IN items shipped (discovery walker + derived variant cell emission + initial-value handling + tests).
- 0 regressions vs baseline (10,389 / 60 / 1 / 0 at S74 post-C13 close).
- Spec re-verified against §51.0.J text directly.
- Legacy `<machine>` + non-derived engines (C12/C13) NOT regressed.
- A1b's compile-time rejection of write/.advance/rule=/initial= on derived engines NOT regressed.
- C15 unblocked — final report names what C15 needs from C14's output (helper names for cross-file derived-engine import, chunk membership signaling).
- SURVEY.md documents:
  - Walker decision (sibling fn vs parameterized C12 fn) with reasoning.
  - B16 annotation status — does engineMeta carry `derivedExpr` AST + dependency set, or just expression text?
  - Initial-value-undefined throw locus decision (inside closure vs wrapper helper).
  - Chunk-trigger decision (derived engines → `derived` chunk gating).
  - Verdict shape: SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: **<ABSOLUTE-WORKTREE-PATH-PROVIDED-BY-HARNESS>**

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save the output as your WORKTREE_ROOT.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules`.
5. Run `bun run pretest` via Bash.
6. Run `bun run test` (chained, NOT `bun test` directly) via Bash. Confirm 10,389 / 60 / 1 / 0 baseline.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (enforce on EVERY Read/Write/Edit call)

- For Read: paths under WORKTREE_ROOT are safe.
- For Write/Edit: **ALWAYS use ABSOLUTE paths under WORKTREE_ROOT.** Do NOT use relative paths or paths starting with the main repo root.

If you find yourself about to write to a path starting with the main repo root, STOP. Re-derive from WORKTREE_ROOT.

## Crash-recovery protocol

Commit after each meaningful change. Update `$WORKTREE_ROOT/docs/changes/phase-a1c-step-c14-derived-engines/progress.md` after each step with timestamped append-only lines.

## Final report format

- WORKTREE_PATH (absolute)
- FINAL_SHA (your branch tip)
- FILES_TOUCHED (list — for PA's `git diff main..<branch> -- <files>` review)
- VERDICT (SHIP / REFINEMENT / SCOPE-CHANGE / BLOCKER)
- TESTS at end: pass / skip / todo / fail counts
- DEFERRED-ITEMS: anything punted to C15 / future C-step / PA-decision
- SURVEY summary (one paragraph) — four decisions documented
- C15 HANDOFF: what C15 needs from C14's output (cross-file derived-engine import semantics, chunk membership for cross-file mount, derived-engine vs non-derived discrimination at import site)
