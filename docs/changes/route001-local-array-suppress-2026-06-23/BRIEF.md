# DISPATCH BRIEF — scope E-ROUTE-001 off pure-fn-local array writes

change-id: `route001-local-array-suppress-2026-06-23`
gap: `g-route-001-local-computed-write` (LOW · tier med) — sPA ss1 item 1.
branch base: `spa/ss1` (== `main` @ `0d4ba428`; no prior sPA landings yet).

## THE BUG (sPA-verified R26, HEAD 0d4ba428)
`E-ROUTE-001` over-fires on a **pure-fn LOCAL computed-index array write**. `route-inference.ts:953`
fires the warning for ANY `bare-expr` matching `COMPUTED_MEMBER_REGEX = /\b[A-Za-z_$][A-Za-z0-9_$]*\s*\[/`
(outside worker bodies) — with **zero receiver-reachability check**. So a pure fn that does
`result[idx] = result[idx] + 1` on a freshly `slice()`'d LOCAL array warns, even though `result` is a
COW local that can NEVER reach a protected field.

**Reproduced live:** `examples/28-flux.scrml` `bumpLeftVision()` (line 200-213):
```
fn bumpLeftVision(nonce: int[], ...) -> int[] {
    let result = nonce.slice()          // COW: fresh local array, no protected provenance
    ...
        result[idx] = result[idx] + 1   // <-- E-ROUTE-001 over-fires HERE
    ...
}
```
`bun run compiler/src/cli.js compile examples/28-flux.scrml` → `warning [E-ROUTE-001]: ... expression
`result[idx] = result[idx] + 1` ...` (1 E-ROUTE-001, 2 warnings total). Benign (warning only) but erodes
the diagnostic surface — Flux dog-food (S193).

## FIX GOAL
Suppress E-ROUTE-001 when the computed-member receiver is a **function-body-LOCAL array binding that
cannot reach a protected field**. Preserve the warning for its real target: computed access on a
param/unknown receiver (`row[fieldKey]`) that COULD be a protected record.

## MECHANISM (precise — implement in `walkBodyForTriggers`, route-inference.ts)
The walker iterates `body` statements top-to-bottom (`for (const node of body) visitNode(node)`), and
`visitNode` recurses into nested for/if/block array-bodies. The `let result = …slice()` decl (a top-level
body statement) is visited BEFORE the nested `result[idx]=…` bare-expr. So:

1. Add a function-body-scoped `const localArrayBindings = new Set<string>()` alongside `triggers` /
   `callees` / `warnings` (~line 879).
2. In the `let-decl | const-decl | tilde-decl` branch (~969+), after `init` is computed: if `init` is an
   **array-COW initializer** AND references **no protected field**, add `node.name` to
   `localArrayBindings`. Array-COW init = matches at MINIMUM `.slice(`, a leading `[` (array literal /
   spread), and the common array-returning chains (`.map(`/`.filter(`/`.concat(`/`.flat(`/`.flatMap(`,
   `Array.from(`/`Array(`/`new Array(`, `Object.keys(`/`.values(`/`.entries(`). The flux case is `.slice()`.
   **Guard:** if `init` references any name in `protectedFields` (reuse `bareExprAccessesField` per field),
   do NOT add — a `let r = protectedField.slice()` must keep warning. Handle the simple `node.name` case;
   destructuring/no-name decls just don't get added (conservative — still warns).
3. At the E-ROUTE-001 check (~953): instead of the boolean `COMPUTED_MEMBER_REGEX.test(expr)`, extract ALL
   computed-member receiver names from `expr` (the identifier immediately before each `[`, via a global
   regex). **Fire only if at least one receiver is NOT in `localArrayBindings`** (i.e. could reach a
   protected field). If EVERY computed receiver is a known-safe local array → suppress. In flux both
   receivers are `result` (local) → all safe → suppressed.

Keep the existing `!isWorkerBody` guard. Do NOT touch the escalation/route logic — this is warning-scope
only (E-ROUTE-001 already does NOT escalate; route-inference.test.js §11 covers that — must stay green).

## R26 EMPIRICAL VERIFICATION (mandatory — do NOT mark DONE without it)
- `bun run compiler/src/cli.js compile examples/28-flux.scrml 2>&1 | grep -c "E-ROUTE-001"` → **0**
  (was 1). Total warnings 2 → 1.
- CONTROL — the warning's real target must STILL fire: a fn with `return row[fieldKey]` (param receiver,
  NOT a local-array decl) → E-ROUTE-001 ≥ 1. The existing unit test `getDynField`
  (route-inference.test.js:1024-1036) IS this control — must stay green.
- CONTROL — worker-body suppression unchanged; direct-access-only (`row.name`) still 0.

## TESTS (coupled — same commit as the code, S113)
Add unit tests to `compiler/tests/unit/route-inference.test.js` §11 block:
- pure-fn-local array write (`let r = src.slice()` then `r[i] = r[i] + 1`) → **0** E-ROUTE-001.
- array-literal local (`let r = []` then `r[i] = x`) → 0.
- `let r = protectedField.slice()` then `r[i]=…` → **still ≥1** (protected provenance — not suppressed).
- existing `row[fieldKey]` param case → still ≥1 (regression guard).
Mirror the existing `makeFunctionDecl` / `makeBareExpr` / `runRIClean` harness in that file. Full
`bun run test` green, 0 new fails.

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S90/S99/S126 — hold the line)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. Else STOP
   (S90 CWD-routing — this repo is `scrml`, NOT scrmlTS). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean.
4. Confirm base at/after `0d4ba428` (`git merge-base --is-ancestor 0d4ba428 HEAD`); `git merge main` only
   if behind. 5. node_modules resolves (symlinked from main — do NOT `bun install` into the worktree if a
   symlink already exists; verify `bun run compiler/src/cli.js compile examples/28-flux.scrml` runs).
6. Baseline: `bun run compiler/src/cli.js compile examples/28-flux.scrml` shows the E-ROUTE-001 BEFORE you
   change anything (confirm the repro).
- Edits ONLY to worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment. NEVER the
  bare main root `/home/bryan-maclee/scrmlMaster/scrml/compiler/...`. Prefer Bash edits (perl/python3/
  heredoc) on worktree-absolute paths; echo the path before + `git diff` after. NEVER `cd` into main; use
  `git -C "$WORKTREE_ROOT"`.
- First commit message embeds your startup `pwd`: `WIP(route001): start at $(pwd)`.

## CRASH RECOVERY (S87)
Commit per sub-part (code+test together; don't batch). Update
`docs/changes/route001-local-array-suppress-2026-06-23/progress.md` each step. `git status` clean before DONE.

## COMMIT DISCIPLINE — code + coupled test in ONE commit; `git status` clean before DONE; report
FINAL_SHA + FILES_TOUCHED (worktree-absolute) + WORKTREE_PATH.

## SCOPE GUARD
ONLY `compiler/src/route-inference.ts` + `compiler/tests/unit/route-inference.test.js` (+ this change-id's
progress.md). Do NOT touch emit-server.ts / index.ts / SPEC (warning-scope-only; no spec change — E-ROUTE-001
already catalogued). If you find the fix needs files beyond route-inference.ts, STOP and report (blast-radius
escalation) — do not widen silently.

## FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (worktree-absolute) · R26 table (flux 1→0 + 3 controls) · test
delta · the array-COW init set you recognized · any blast-radius surprise.
