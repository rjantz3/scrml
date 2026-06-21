# sPA ss3 (codegen-expr-attr) → PA — re-integration request

**needs: action** · **2026-06-20** · from **sPA ss3** (S210-rebuild run)

## Summary
All 3 items on list `ss3-codegen-expr-attr` are **landed-on-branch** `spa/ss3`. List COMPLETE — no parked / dropped items. Requesting re-integration `spa/ss3` → main.

## Branch
- **Branch:** `spa/ss3` · **tip SHA:** `8676687b`
- **Base (merge-base with main):** `db906e40` (local main at sPA boot; the worktree was branched off local `main`, not the stale `origin/main` 135c8a78, because local main carried the S210 work incl. item1's verified-HEAD base 956460af).
- **Lineage** (6 commits = 3 fix + 3 bookkeeping):
  - `7f3bd4ca` fix item1 · `25ddde8f` bookkeeping
  - `7ed9ff86` fix item2 · `26c3aab5` bookkeeping
  - `544e5c42` fix item3 · `8676687b` bookkeeping
- main advanced (deputy ticks 125-126, → `a3a7e091`) during the run — disjoint from these changes (deputy = maps/digest; ss3 = compiler-source). Clean merge expected.

## Items landed (per-item SHA)
1. **`g-attr-bare-compound-is-op-silent-drop`** → `7f3bd4ca`. Bare-compound is-op in an unquoted CONDITION attr (`if=`/`show=`/`else-if=`) silently dropped the keyword run (for `is not` also INVERTED: `if=fn() is not` → `if((fn()))`). Fix = `tokenizer.ts` `attrConditionOperatorAhead` op-set + shared `pushConditionOpReject` helper across the ident AND call paths (call path was a wider latent gap dropping bare binary ops after a call too). S209 'b' REJECT-with-parens. +20 tests.
2. **`bug-18` / GITI-015** → `7ed9ff86`. is-op with a computed bracket-index LHS (`args[i + 1] is some`) not lowered in `--mode library` → E-CODEGEN-INVALID-JS. Fix = `codegen/rewrite.ts` `DOTTED_LHS` extended with a bracket-index tail. R26 + runtime value-assert. +6 tests.
3. **`g-each-body-sigil-root-expr-parser`** → `544e5c42`. `@.`/`@.field` escape-hatched in the acorn `parseExprToNode` (`scrmlAtPlugin`) — ExprNode layer couldn't structure the §17.7.3 sigil (root of the ss14 each-sigil classifier false-positive). Fix = `scrmlAtPlugin.readToken` recognises `@.` (inline-ws-tolerant). classifier each-sigil 2→0. +9 tests.

## Verification
- Each fix: R26 reproduce-before + verify-after; full `bun test compiler/tests/` GREEN at each landing (final: **24692 pass / 0 fail**, incl. browser after `bun run pretest` — the gitignored `samples/compilation-tests/dist/` was rebuilt; the initial 140 "failures" were the S209-ss9 fresh-worktree ENV-GAP, not regressions).
- Pre-commit gate passed on every commit (no `--no-verify`).
- Per-item NOTES + repros archived under `docs/changes/ss3-item{1,2,3}-*/`.

## Residuals to file (NEW — surfaced during the run, NOT fixed)
1. **is-op call-tail LHS silently MIScompiles** (`--mode library`): `re.exec(s) is some` emits `re.exec((s) != null)` — `_rewriteParenthesizedIsOp` grabs the call's own arg-parens instead of the whole call. Valid JS so NO E-CODEGEN (silent-WRONG → arguably higher severity than the LOUD bug-18 it sat beside). Separate root cause (the paren-rewrite has no grouping-paren-vs-call guard); touches the load-bearing `_rewriteParenthesizedIsOp`, out of bug-18's surgical scope. Repro: `export function f(re,s){ return re.exec(s) is some ? "h" : "n" }` `--mode library`. Suggest a dedicated item.
2. **Dead each-sigil band-aid** in `compiler/tests/integration/expr-node-corpus-invariant.test.js` (~lines 134-143/285/388-396): now always-0 after item3. Keeping it MASKS a future `@.`-parse regression (re-excludes from the >50% gate). Remove in a test-hygiene pass. Left in place (out of the surgical parse-fix scope; harmless at 0).
3. **Native-parser (M2.x) `@.` structuring NOT verified** — item3 fixed the acorn-based production `parseExprToNode`; the separate native pipeline was not checked. Worth a dual-pipeline-canary when that path is activated for this surface.

## Worktree
`../scrml-spa-ss3` (branch `spa/ss3`), node_modules symlinked from main. Left in place for PA re-integration; remove after merge per PA wrap.
