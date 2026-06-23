# DISPATCH BRIEF — emit a minimal value-only .server.js for server-imported const-only modules

change-id: `const-only-module-server-emit-2026-06-23`
gap: `g-const-only-module-no-server-emit` (MED · tier med) — sPA ss1 item 2.
branch base: `spa/ss1` tip `b307c332` (item-1 landing). Confirm your worktree base includes it (git merge spa/ss1 if behind).

## THE BUG (sPA-verified by code-path; reproduce in Phase 0)
A module whose exports are **CONSTANTS / pure types only** (NO server content — no `?{}` SQL, no
route-inferring fn, no channel) emits **NO `.server.js`**. But a server-side consumer that imports a VALUE
const by-name still emits `import { CONST } from './mod.server.js'` → the file does not exist → `Cannot find
module` at runtime. WARNED (not silent) via `W-SERVER-IMPORT-UNEMITTED` **MISSING-FILE branch**
(`api.js:2145-2159`). The S208 ss1 landing (`795704c1`) closed only the **MISSING-EXPORT** branch (a
route-inferred helper that emits a route, not a value). This is the sibling residual.

**Code-path proof (HEAD has this):** `generateServerJs` (emit-server.ts) short-circuits `return ""` at
**emit-server.ts:761-768** when `serverFns.length === 0 && channelNodes.length === 0 && …` — i.e. a
const-only module returns "" (no `.server.js`). The module value-export collector
`emitModuleValueExportLines` is only invoked at **emit-server.ts:1997**, AFTER that short-circuit, so a
const-only module never reaches it. `emitModuleValueExportLines` (340-541, the S208 fix) ALREADY correctly
filters to VALUE bindings only — `export const NAME = <lowered>` + exported pure `function` — and SKIPS
type exports / markup-component consts / `?{}`-init consts / server-operation fns. So "emit only the value
lines" does NOT reintroduce the erased-TYPE-import link error that killed the naive Option-1 force-emit.

## PHASE 0 — REPRODUCE FIRST (R26 verify-before-claim; do not skip)
Build a minimal dir repro under `docs/changes/const-only-module-server-emit-2026-06-23/repro/`:
- `config.scrml` — const-only: a `${ … }` logic block with ONLY `export const MAX_ROWS = 100` +
  `export const DB_PATH = "./x.db"` (NO functions, NO `?{}`, NO channels).
- `app.scrml` — server-USES a const by-name: `import { MAX_ROWS } from './config.scrml'` then a
  route-inferring server fn whose body interpolates the const into a `?{}` SQL read (so the server bundle
  emits `import { MAX_ROWS } from './config.server.js'`). Model the import + SQL shapes on
  `examples/23-trucking-dispatch/app.scrml:167` + its `?{}` fns. Add a trivial `<main>` so it compiles.
Compile the dir: `bun run compiler/src/cli.js compile docs/changes/const-only-module-server-emit-2026-06-23/repro 2>&1`.
PASS-TO-PROCEED: you see `W-SERVER-IMPORT-UNEMITTED` with the MISSING-FILE message ("has no server content
and emits no .server.js"). If it does NOT fire, STOP and report (the symptom may need a different consumer
shape — do NOT fix a non-reproducing bug).

## FIX — on-import minimal value-only emission (the RIGHT scope, R3)
Emit the minimal value-only `.server.js` **ONLY for const-only modules that are ACTUALLY server-imported
by-name** — NOT for every const-only module in the corpus (that would emit dead `.server.js` files for
client-only modules + churn every baseline). The cross-file "who imports `./X.server.js`" knowledge already
exists in `api.js checkServerImportInvariant` (2098-2188) and in the orchestration layer (`index.ts`).

Recommended shape (confirm the cleanest layer in Phase 0 — emit-server vs index.ts second-pass):
1. After all server bundles are generated, collect every `import {…} from './X.server.js'` reference across
   all emitted `output.serverJs` (the same regex `checkServerImportInvariant` uses).
2. For each referenced target `X` that has **no `.server.js`** but HAS server-importable value exports
   (run `emitModuleValueExportLines(Xast, Xpath, "")` — non-empty result), generate a minimal `.server.js`
   for `X` consisting of: the value-export lines + ANY helper inlining those lines require (the
   `_scrml_structural_eq` / wire / etc. top-of-file scans — see the emit-server.ts:391-393 doc: value lines
   are appended BEFORE the helper-inline scans precisely so a helper introduced only by a value export is
   inlined). Attach it to `cgResult.outputs` so the parse-gate + write phase pick it up.
3. The dangling consumer import now resolves → `W-SERVER-IMPORT-UNEMITTED` MISSING-FILE drops to 0.

DO NOT pursue Option B (tree-shake / drop the consumer import) — the const is genuinely server-USED, so
dropping the import leaves it `undefined` at runtime (breaks the server code; violates full-fidelity R2).

Watch: the minimal `.server.js` must `node --check` clean AND parse the emit-gate (Acorn). If a value
export references a stdlib/runtime helper, the helper-inline + stdlib-import-rewrite path must run on it too
(don't emit a bare `export const X = _scrml_structural_eq(...)` with no inlined helper).

## R26 EMPIRICAL VERIFICATION (mandatory)
- repro dir compile: `W-SERVER-IMPORT-UNEMITTED` count → **0** (was ≥1 MISSING-FILE).
- `config.server.js` IS emitted, contains `export const MAX_ROWS = 100;` (+ DB_PATH), `node --check` clean,
  no type exports, no `?{}`.
- The MISSING-EXPORT branch (S208) still fires on its own shape (don't regress it) — confirm a
  route-inferred-helper-import case still warns.
- Full corpus: `bun run compiler/src/cli.js compile examples/23-trucking-dispatch` warning count unchanged
  or reduced (no NEW warnings); trucking W-SERVER-IMPORT-UNEMITTED stays 0.
- Full `bun run test` green; re-baseline any integration snapshot that legitimately gains a `config.server.js`
  ONLY if the gain is the intended fix (log each baseline you touch — S211 no-silent-baseline-churn).

## TESTS (coupled — same commit)
Add an integration/unit test asserting: a const-only server-imported module → its `.server.js` IS emitted
with the value export + the consumer import resolves + W-SERVER-IMPORT-UNEMITTED MISSING-FILE count 0.
Mirror the existing server-import-invariant test shape (find it: `grep -rln W-SERVER-IMPORT-UNEMITTED
compiler/tests`). Keep the MISSING-EXPORT regression test green.

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S90/S99/S126)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-` (this repo is
   `scrml`, NOT scrmlTS). Else STOP. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean.
4. Confirm base includes the item-1 landing (sPA will give you the SHA); `git merge spa/ss1` if behind.
5. node_modules resolves (symlinked from main — don't `bun install` over a symlink); verify a sample compile.
- Edits ONLY to worktree-absolute paths incl. the `.claude/worktrees/agent-<id>/` segment. NEVER the bare
  main root. Prefer Bash edits (perl/python3/heredoc); echo path before + `git diff` after. NEVER `cd` into
  main; use `git -C "$WORKTREE_ROOT"`.
- First commit message embeds startup `pwd`: `WIP(const-server-emit): start at $(pwd)`.

## CRASH RECOVERY — commit per sub-part; update this change-id's progress.md each step; status clean before DONE.
## COMMIT DISCIPLINE — code + coupled test ONE commit; NEVER `--no-verify` (hook runs full suite ~108-124s,
foreground with generous timeout); report FINAL_SHA + FILES_TOUCHED (worktree-absolute) + WORKTREE_PATH.

## SCOPE GUARD
Expected surface: `compiler/src/codegen/emit-server.ts` + `compiler/src/codegen/index.ts` (and/or
`compiler/src/api.js` if the cross-file pass lands there) + one test (+ repro/ + progress.md). Do NOT touch
route-inference.ts (item-1 territory; line-disjoint but avoid the file). If the fix needs SPEC changes or
files beyond this surface, STOP and report (blast-radius escalation).

## FINAL REPORT
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED (worktree-absolute) · Phase-0 repro outcome · which layer you put
the cross-file pass + why · R26 table (repro 1→0, config.server.js content, trucking unchanged) · test delta
· every integration baseline you re-touched + why · any blast-radius surprise. Raw report — your final
message IS the return value.
