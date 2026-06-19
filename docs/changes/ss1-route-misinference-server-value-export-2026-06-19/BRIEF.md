# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is the CWD that `pwd` reports at startup.

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with
   `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If the path is
   under any other repo (e.g. `scrml-support/.claude/worktrees/` or
   `scrml-spa-ss1/`), STOP and report — that is the S90 CWD-routing failure mode.
   Save the output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git rev-parse --abbrev-ref HEAD` and `git rev-parse --short HEAD`. Note them.
   Run `git status --short` — confirm clean.
4. Run `bun install` via Bash. Worktrees do NOT inherit `node_modules`; the
   pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise.
5. Run `bun run pretest` via Bash — populates `samples/compilation-tests/dist/`
   that the browser-test suite loads (gitignored; empty in a fresh worktree). For
   baseline checks use `bun run test` (chains pretest), NOT `bun test` directly.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

## Path discipline (enforce on EVERY edit)

- **Apply ALL file edits via Bash** (`perl -0pi`/`python3`/heredoc/`cp`) on
  ABSOLUTE paths under WORKTREE_ROOT that include the `.claude/worktrees/agent-<id>/`
  segment — NOT the Edit/Write tools (S126 Edit/Bash filesystem-divergence class).
  Echo the target path before each write; re-verify with `git diff`/`grep` after.
- NEVER use absolute paths starting with the main repo root
  (`/home/bryan-maclee/scrmlMaster/scrml/compiler/...` without the worktrees segment) —
  that leaks into main's working tree.
- NEVER `cd` into the main repo (or anywhere outside WORKTREE_ROOT). Use
  `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute
  paths exclusively — for compile/run commands too, not just edits.
- If context references a main-rooted path, translate to `$WORKTREE_ROOT/...` first.

## Commit discipline

- Commit after each meaningful unit; WIP commits expected. Update
  `docs/changes/ss1-route-misinference-server-value-export-2026-06-19/progress.md`
  after each step (append-only, timestamped).
- Coupled code+test changes land in ONE commit (no transiently-red window).
- `git status` clean before you report DONE.
- NEVER `--no-verify`. The pre-commit hook (`bun test`, browser-excluded) gates each commit.

---

# TASK — ss1 item 1: emit pure-module VALUE exports into `.server.js`

## Gap (known-gaps.md:1494 — `g-route-mis-inference-server-called-pure-helper`, MED, open)

A cross-file pure-helper module's `.server.js` emits route handlers but NOT the
plain value `export`s a sibling SERVER bundle imports by-name → `SyntaxError:
Export named 'X' not found` at RUNTIME (green compile; ESM link error, not a syntax
error). Surfaced by the S208 Fix B warning `W-SERVER-IMPORT-UNEMITTED`
(MISSING-EXPORT branch).

## Empirical ground truth (sPA-verified — the gap text is slightly off; trust THIS)

Reproduced by compiling `examples/23-trucking-dispatch/` (`compileScrml({inputFiles,
write:false, emitPerRoute:true})`). The emitted `models/auth.server.js` exports ONLY:
`__ri_route_rolePath_7`, `routes`, `fetch`. It is MISSING, and consumers
(`app.server.js`, per-route bundles) import by-name and crash on:

1. **Route-classified pure fn** — `rolePath` (a PURE fn: `role=="dispatcher" →
   "/dispatch"`, no SQL/secret access). It escalates to server-boundary via
   `route-inference.ts` **Step 5c (Caller-context propagation, Insight 26 Batch 1,
   ~line 2888)** because it's called ONLY from server-classified callers
   (login/register). `.server.js` emits its body INLINED into the route handler
   `_scrml_handler_rolePath_46`, but NO plain `export function rolePath`.
2. **Constants that NEVER route-infer** — `SESSION_TTL_SECONDS`, `SESSION_DB_PATH`,
   `SESSION_COOKIE_NAME`, `DISPATCH_DB_PATH`. These are `export const` value decls;
   they do not go through route-inference at all. They are simply absent from
   `.server.js` because `.server.js` has NO value-export emission path in default
   (browser) mode (only `--mode library` emits plain bindings, via the suppression
   branch at emit-server.ts:431-460, which does not run here).
3. **Other pure exported fns** — `readCookieValue`, `readSessionCookie`,
   `buildSessionSetCookie`, `checkRole` — same: absent from `.server.js`.

The 6 distinct MISSING-EXPORT warnings on trucking (auth ×4 missing-name-set shapes
across app/login/register/customer-home + status-picker `validNextStates` +
driver-card `isValidHosTransition`) are ALL this one root cause.

## ROOT CAUSE + the fix (Option 1, broadened)

The bug is purely in **EMISSION** (`compiler/src/codegen/emit-server.ts`), NOT in
route-inference. **DO NOT modify route-inference.ts** — Step 5c's
caller-context escalation is LOAD-BEARING (it is the precondition that makes the
`server`-keyword deprecation / Position B safe; it is ss9's subject). Suppressing the
route-inference of a pure helper (the "Option 2" alternative in the gap text) is OUT
of scope and would need a PA ruling.

**Fix:** `.server.js` runs in a real ESM environment (Bun) — so emit the missing
bindings as native ESM exports. When a module emits a `.server.js`, ALSO emit, as
plain `export const`/`export function`, the module's exported VALUE bindings:
- exported constants (`export const SESSION_TTL_SECONDS = 7*24*60*60`, ...);
- exported pure functions as plain bindings (`export function rolePath(role){...}`,
  `checkRole`, `readCookieValue`, ...), INCLUDING route-classified ones like
  `rolePath` (the plain `export function rolePath` is ADDITIVE — the route handler
  `_scrml_handler_rolePath_46` + `export const __ri_route_rolePath_7` + `routes` +
  `fetch` all STAY; no name collision since the handler is `_scrml_handler_*`).

This is the SERVER analog of what the CLIENT already does: `emit-client.ts` collects
the module's exported bindings (the "publicName → emittedName" set, ~line 114) and
emits the registry footer `_scrml_modules["<key>"] = {...}` (~line 193, "cross-file
module registry footer (known-gaps-#6, §21.3)"), AFTER all fn/enum/const decls
(~line 1661). **Mirror that same source-of-truth collector** to drive the server-side
ESM `export` emission. The server uses native ESM (`import {x} from "./X.server.js"`),
so emit standard `export` decls — do NOT build a server-side `_scrml_modules` registry.

### Constraints / correctness notes
- Emit the value-export block AFTER the shared inlined helpers (e.g.
  `_scrml_structural_eq`, which `checkRole` references and which is already inlined in
  `.server.js`) and after the const dependencies (e.g. `readSessionCookie` references
  `SESSION_COOKIE_NAME`), so all references resolve — same ordering rule the client
  footer uses.
- Value/runtime exports ONLY. Do NOT emit TYPE exports (types have no runtime export —
  emitting them reintroduces the link error the sibling gap g-pure-module-server-emit
  Fix-A guarded against; type-only imports on the consumer side are already
  tree-shaken away by Fix A in emit-server.ts:584/2050).
- The emitted JS must still pass the Approach-A emitted-JS parse gate (api.js).
- Be careful not to DOUBLE-declare: if any exported binding is already emitted in
  `.server.js` today (verify), don't emit a second copy. (Empirically today none of
  auth's value exports are emitted, so this is net-new — but verify per module.)
- Keep it additive: existing `.server.js` route content must be byte-stable except for
  the new appended export block.

## VERIFICATION (R26 empirical — required before DONE)

Use this repro (write it under WORKTREE_ROOT, e.g. `$WORKTREE_ROOT/scratch-repro.mjs`,
do NOT commit it):

```js
import { readdirSync, statSync } from "fs";
import { join } from "path";
import { compileScrml } from "<WORKTREE_ROOT>/compiler/src/api.js";
const TD = "<WORKTREE_ROOT>/examples/23-trucking-dispatch";
function find(d){const o=[];for(const e of readdirSync(d)){const p=join(d,e);const s=statSync(p);if(s.isDirectory())o.push(...find(p));else if(p.endsWith(".scrml"))o.push(p);}return o.sort();}
const r = compileScrml({ inputFiles: find(TD), outputDir:"/tmp/ss1-verify", write:false, emitPerRoute:true, log:()=>{} });
const all=[...(r.errors??[]),...(r.warnings??[])];
console.log("warnings:", (r.warnings??[]).length, "errors:", (r.errors??[]).length);
console.log("W-SERVER-IMPORT-UNEMITTED:", all.filter(d=>d.code==="W-SERVER-IMPORT-UNEMITTED").length);
for(const [fp,o] of (r.outputs??new Map())) if(fp.endsWith("models/auth.scrml")){
  const m=[...(o.serverJs||"").matchAll(/\bexport\s+(?:async\s+)?(?:const|function\*?)\s+([A-Za-z_$][\w$]*)/g)].map(x=>x[1]);
  console.log("auth.server.js exports:", m.join(", "));
}
```

Gates:
1. **`W-SERVER-IMPORT-UNEMITTED` count: 6 → 0** on the trucking compile (the imports
   now resolve, so the warning correctly stops firing). Total trucking warnings
   80 → 74.
2. `auth.server.js exports` now INCLUDES `rolePath`, `SESSION_TTL_SECONDS`,
   `SESSION_DB_PATH`, `SESSION_COOKIE_NAME`, `DISPATCH_DB_PATH`, `readCookieValue`,
   `readSessionCookie`, `buildSessionSetCookie`, `checkRole` — alongside
   `__ri_route_rolePath_7`, `routes`, `fetch`.
3. **Update the trucking-smoke baseline** in
   `compiler/tests/integration/trucking-dispatch-smoke-integration.test.js` (the
   `warnings: 67` / aggregate-count assertions + the per-code histogram if it asserts
   `W-SERVER-IMPORT-UNEMITTED`). Re-read the test's current expected baseline FIRST
   (it documents counts in its header comment + assertions) and adjust ONLY the
   counts that change due to this fix. This is the coupled test — one commit with the
   code.
4. Add a focused regression test (extend the existing
   `compiler/tests/integration/g-pure-module-server-emit.test.js` or add a sibling):
   a pure-helper module with an exported constant + an exported pure fn that is
   server-called → its `.server.js` exports BOTH the value binding AND (for the
   server-called fn) the route handler; a consumer's by-name server import resolves.
5. **Full `bun run test`** (incl. browser) green — 0 regressions. If other fixtures
   asserting exact `.server.js` content shift because of the new export block,
   re-baseline them in the SAME logical commit and note each in progress.md (a
   within-node re-baseline; flag any count you change).

## DELIVERABLE

Report: the files changed (with line ranges), the before/after of the verification
gates above (verbatim repro output), the final `bun run test` summary
(pass/skip/fail), every test baseline you re-based with its old→new numbers, and your
HEAD SHA + branch name. Commit everything to your worktree branch; leave `git status`
clean. I (the sPA) will file-delta your changed files onto `spa/ss1`.

Do NOT push. Do NOT touch main. Do NOT modify `route-inference.ts`.
