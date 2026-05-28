# R25-Bug-49 progress

## 2026-05-27T19:00 — Phase 0 diagnosis COMPLETE; root cause identified

### Reproducer

```scrml
<program title="bug49">
    <state>
        <msg> = ""
    </state>
    <page>
        <button onclick=run()>Run</button>
    </page>
    type ErrType:enum = { NetworkError, Validation }
    server function risky() ! ErrType { fail ErrType::NetworkError }
    function run() {
        const r = risky() !{
            | ::NetworkError -> { @msg = "net" }
            | ::Validation   -> { @msg = "val" }
        }
    }
</program>
```

### Compilation produces

```
[scrml] warning: statement boundary not detected — trailing content would be silently dropped: "! {
| . NetworkError - > { @msg = "net" }
| . Validation - >..."
```

No errors. Emitted `_scrml_run_N()` has `const r = _scrml_fetch_risky_N();` with NO arm bodies emitted.

### Stack trace at warning fire

```
parseExprToNode → expression-parser.ts:2010
safeParseExprToNode → ast-builder.js:2430
parseOneStatement (CONST branch) → ast-builder.js:4945 (collectExpr returned expr including `!{...}`)
_parseRecursiveBodyInner → ast-builder.js:3650
parseLogicBody → ast-builder.js:8678
buildBlock (logic) → ast-builder.js:12063
```

### ROOT CAUSE

Under v0.3 default-logic-mode (`<program>` body), bare `function run() { ... }` decls auto-lift via `liftBareDeclarations` (ast-builder.js:1246):

1. **Block-splitter** (outer markup pass): orphan-brace mode active inside `function run() { ... }` body (block-splitter.js:1545's `orphanBraceDepth === 0` guard prevents sigil-recognition). The whole `function run() { const r = risky() !{...} }` becomes a `text` block with `children: []` — no `error-effect` BLOCK descended.
2. **liftBareDeclarations** wraps it: `block.type = "logic"`, `block.raw = "${" + textBlockRaw + "}"`, `block.children = []`.
3. **buildBlock case "logic"** (ast-builder.js:12063) calls **`tokenizeLogic`** with the inner content + `children: []`.
4. **`tokenizeLogic`** (tokenizer.ts:790-1172) ONLY emits `BLOCK_REF` tokens at positions in `childByStart`. Since `children: []`, NO BLOCK_REFs are synthesized. The `!{...}` is tokenized as individual `PUNCT` tokens: `!` then `{` then interior tokens then `}`.
5. **`collectExpr`** at ast-builder.js:2479 collects the const-decl RHS. The BLOCK_REF-break at L2512 never fires because no BLOCK_REF exists. The `!` is pushed as parts, then `{` increments `depth` to 1, all interior content (matching parens/braces tracked) is gobbled, the final `}` decrements depth to 0. `collectExpr` returns `expr = "risky() ! { | . NetworkError - > {...} ... }"`.
6. **`safeParseExprToNode`** passes this to acorn via `parseExpression`. Acorn parses `risky()` as a CallExpression, leaves the `! {...}` as trailing content. The warning at line 2010 fires; arm body content is silently dropped.

### Workaround that works (explicit `${...}` lift)

When source wraps the function declarations in explicit `${ function run() { const r = call() !{...} } }`, the `!{` is recognized by BS at the inner-logic-context level (block-splitter.js:1584 fires, error-effect block pushed, BLOCK_REF emitted). Then `collectExpr` correctly breaks at the BLOCK_REF and the outer `parseRecursiveBody`/`parseLogicBody` wraps the const-decl in a `guarded-expr`. Verified empirically by compiling repro-dollar.scrml.

### Why bare-call form fails too (against brief hypothesis)

Brief claimed bare-call `risky() !{...}` (no const) "works after Bug 38". Empirically my repro-bare.scrml STILL fails identically — same statement-boundary warning, same E-ERROR-002 unhandled-failable error. Bug 38's tests synthesize the AST directly (`makeGuardedExpr(makeBareExpr("loadThing()"), [...])`) bypassing the BS layer. The bare-call form's BS gap is identical to the const-binding form's BS gap.

This refines the brief: **Bug 49 is broader than just `const X =` binding** — the bug is "any `!{...}` inside an auto-lifted top-level function body at <program>/<page>/<channel> default-logic-mode". The const-binding shape was over-represented in R25 because that's the canon-shown shape; the bare-call shape also fails but R26 didn't sample it.

### Fix locus

**`tokenizeLogic`** at `compiler/src/tokenizer.ts:790-1172` must recognize sigil-prefixed brace openers (`!{`, `${`, `#{`, `^{`, `~{`, possibly `?{`) and synthesize BLOCK_REF tokens for them when no pre-split child exists at that position. Minimum-scope fix: recognize `!{` only (the surfaced case); broader fix (recognize all sigils) would prevent future similar surfaces.

Decision: ship the minimum-scope `!{` recognition + a comment marking the other sigils as deferred work / cross-reference if they surface similarly. Reasoning: scope discipline + the other sigils may have different correctness invariants under re-tokenization that need their own dispatch.

### Composition checks (verify after fix)

- Bare-call `risky() !{...}` (no const) inside lifted function body — must START WORKING (refining brief)
- `const X = risky() !{...}` inside lifted function body — must START WORKING (primary fix target)
- Bare-call `risky() !{...}` inside explicit `${...}` block — must STILL WORK (existing BS path; regression-guard)
- `const X = risky() !{...}` inside explicit `${...}` block — must STILL WORK
- Function-decl-head `function fn() ! ErrType { ... }` (Bug 36 fix) — must STILL WORK
- `<each :>` shorthand (Bug 40 fix) — must STILL WORK (separate sigil class, but verify)
- Bug 38 regression tests (codegen) — must STILL PASS


## 2026-05-27T19:45 — Fix landed `6d3bfb28`; R26 empirical verification PASS

### Files changed

- `compiler/src/tokenizer.ts` (+152L): `tryEmitSyntheticErrorEffectBlock` helper + call site in `tokenizeLogic` main loop after `childByStart` check.
- `compiler/tests/unit/error-handler-const-bind-r25-bug-49.test.js` (NEW, 12 tests): coverage matrix per Phase 2 brief.

### Test deltas

- Phase-0 baseline (just before fix): 14883 pass / 0 fail / 88 skip / 1 todo / 766 files.
- Post-fix + new test file: 14895 pass / 0 fail / 88 skip / 1 todo / 767 files.
- Delta: +12 pass (new test file), +1 file, zero pre-existing test regressions.

### R26 empirical verification (mandatory per Bug 49 methodology lesson)

| Dev | Pre-fix stmt-boundary warnings | Post-fix | Status |
|---|---|---|---|
| dev-1-react | 4 (3 source + 1 stdlib) | 1 (stdlib only) | source-side CLEAN |
| dev-2-elixir | 3 | 0 | CLEAN |
| dev-3-svelte | 0 | 0 | regression-guard PASS |
| dev-4-pascal | 0 | 0 | regression-guard PASS |

`node --check` clean on ALL 8 emitted artifacts (4 client.js + 4 server.js).

dev-1-react `_scrml_handleCreate_24` / `_scrml_moveForward_26` / `_scrml_archiveOne_28`: emit
arm-body reactive_set calls with variant guards (`.variant === "DbError"` / `"Validation"` /
`"NotAllowed"` / `"InvalidTransition"` / `"NotFound"`).

dev-2-elixir `_scrml_moveForward_17` / `_scrml_dropOnDone_19`: emit arm-body reactive_set
calls with variant guards (`.variant === "Forbidden"` / `"InvalidTransition"` / `"NotFound"` /
`"DbFailure"`).

### Brief-hypothesis-vs-grep methodology bank

Brief proposed: BS statement-boundary scanner OR expression-parser `!{` extension as fix locus. Grep
+ probe-stack-trace + flow analysis pinpointed `tokenizeLogic`'s reliance on pre-split children
(neither of the brief's two hypotheses, but downstream of one — the warning fire is in expression-
parser, but the input string to expression-parser is corrupted earlier in `tokenizeLogic`).

Brief refinement: brief claimed bare-call form `risky() !{...}` worked post-Bug-38. Empirically the
bare-call form FAILED identically in the bare-top-level shape — Bug 38's regression tests passed
because they synthesize AST directly (bypass BS). My §7 test confirms the bare-call form also START
WORKING with the fix. This means Bug 49's actual surface is broader than "const-binding only";
it's "any `!{...}` inside an auto-lifted top-level function body at default-logic-mode."

### Deferred items

- **Sister sigil recognition** — `${`, `#{`, `^{`, `~{`, `?{` inside re-tokenized lifted bodies
  may have similar surfaces. Each needs its own composition-checked dispatch before adding to
  `tokenizeLogic`. NOT a known bug; preemptive harden vs scope discipline trade-off — defer to
  next surface.
- **Stdlib `time/index.scrml` stmt-boundary warning** — pre-existing, surfaced in baseline +
  unchanged by this fix. Not Bug 49 surface. Tracked separately if it bites adopters.
- **`is`-lowering-not-in-arrow-body** (dev-2-elixir R25 line 337) — separate bug, brief
  explicitly out-of-scope.

