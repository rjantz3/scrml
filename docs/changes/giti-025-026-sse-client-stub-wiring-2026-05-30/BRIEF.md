# BRIEF — giti-025-026-sse-client-stub-wiring-2026-05-30

> Archived verbatim per pa.md S136. Dispatched S145 (2026-05-30) via `scrml-dev-pipeline`, `isolation: "worktree"`, `model: opus`, background. Agent ID `abc4d5eacc97fad6b`. From main HEAD `3b825808`. Verified GENUINE by workflow `wf_272f8c8d-68e` (R26-reverse). Fixes GITI-025 + GITI-026 (one §37 SSE cluster).

---

scrml COMPILER codegen fix (TypeScript). Change-id: `giti-025-026-sse-client-stub-wiring-2026-05-30`. Fixes TWO coupled §37 SSE bugs (one cluster) verified GENUINE on HEAD by a PA workflow.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow Task-Shape Routing for codegen. Maps reflect HEAD `9ab7aa38` (~32 commits behind HEAD); treat map file-claims as hypotheses, verify against current source. The PA verification produced exact file:line leads (below) — trust + verify.
Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

# STARTUP + PATH DISCIPLINE (do BEFORE any other tool call)
S99 = 20 path leaks; don't make #21.
1. `pwd` MUST start with `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP+report, S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. `bun run pretest`. Use `bun run test` not `bun test` for baselines. ANY fail → STOP+report.
PATH (S126, IN FORCE): apply ALL edits via Bash (`perl -i`/`python`/heredoc) on worktree-absolute paths incl. the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write (they leaked to MAIN, #12/#13). Echo path before each write; re-verify via `git diff`/`grep`. NEVER `cd` outside WORKTREE_ROOT — use `git -C "$WORKTREE_ROOT"`, run bun from WORKTREE_ROOT.

# THE BUGS (both §37 SSE; must fix together — both touch the SSE branch of emit-functions.ts:454-476)

Repro sidecars (committed): `handOffs/incoming/2026-05-30-1113-giti-to-scrmlTS-giti-025-sse-generator-params-unwired.scrml` (param) + `handOffs/incoming/2026-05-30-1118-giti-to-scrmlTS-giti-026-sse-client-reactive-binding-dead.scrml` (no-arg binding). Compile app mode (default): `bun run compiler/src/cli.js compile <sidecar> -o /tmp/<id>`.

**GITI-025 — parameterized `server function*` unwired (HIGH).** Two halves:
- SERVER: `compiler/src/codegen/emit-server.ts` SSE branch `if (route.isSSE)` (~742-829). The handler builds `route = { query: Object.fromEntries(_scrml_url.searchParams), ... }` (~751) and pushes param names into `_serverFnOptsSSE.declaredNames` (~774) — but declaredNames only SUPPRESSES redeclaration; NO value binding is emitted. So the generator body references the param (e.g. `from`) as a FREE variable → ReferenceError → swallowed by the stream `catch` → empty stream. FIX: emit a per-param `const <name> = route.query.<name>;` (iterate `fnParamNames` ~736-740, :Type-stripped) right after the `route` object is built (~753), before `async function* _scrml_gen()`. Mirror the non-SSE path which binds via `const X = _scrml_body[...]` at emit-server.ts:1065/1240.
- CLIENT: `compiler/src/codegen/emit-functions.ts` SSE branch `if (route.isSSE)` (~454-476). Stub signature is HARDWIRED to `(_scrml_onMessage, _scrml_onEvent)` and `new EventSource(${JSON.stringify(path)})` has NO query string; the branch never references fn params (it `continue`s before the non-SSE path computes fnParamNames ~484). So the call site passes the user arg into the `_scrml_onMessage` slot, dropped. FIX: encode the call args into the EventSource URL query string (`?from=...`); the query KEY NAMES must match the server `route.query.<name>` reads (use param name verbatim, :Type-stripped — same stripping as fnParamNames / paramName()). Adjust the stub + call site so args go to the URL, not the callback slots.

**GITI-026 — client reactive binding `@cell = gen()` dead (HIGH).** Two facets:
- BINDING: `compiler/src/codegen/emit-client.ts` GITI-001 "post-server-fn-iife-wrap" stage (~1440-1519). Its gate at ~1442 is `if (!/^_scrml_(fetch|cps)_/.test(mangledName)) continue;` — EXCLUDES `_scrml_sse_*` stubs. So `@latest = ticks()` is left as the naive `_scrml_reactive_set("latest", _scrml_sse_ticks_N())` (emit-bindings.ts ~699) which stores the EventSource object in the cell. FIX: add an SSE branch (do NOT use the fetch await-IIFE wrap — wrong for streams): rewrite `_scrml_reactive_set(NAME, _scrml_sse_X())` AND the `_scrml_init_set(NAME, () => _scrml_sse_X())` thunk into a per-event callback bind `_scrml_sse_X((d) => _scrml_reactive_set(NAME, d))`. Seed an initial absence (not the EventSource).
- NAMED EVENTS: the stub (emit-functions.ts ~459-473) wires only `_scrml_es.onmessage` (fires for UNNAMED events). A generator yielding the §37.4.2 `{ event, data }` named form emits `event: <name>` frames a browser delivers ONLY to `addEventListener("<name>", …)`. FIX: register `addEventListener` for named-event generators routing parsed `data` to the cell-update callback; keep `onmessage` for bare yields. If the yielded event name(s) aren't statically determinable, a runtime `addEventListener` for any non-default `event:` is the safe default — but if this facet is materially harder than the primary binding fix, land the primary binding fix solidly and report the named-event facet status (don't block the whole cluster on it).

# COORDINATION
The server-side GITI-025 fix touches `emit-server.ts` — that file is now FREE (a prior agent's library-mode work already LANDED on main, HEAD `3b825808`). The two GITI-025 halves are coupled (URL query keys must match server reads) — fix together with one key naming. GITI-025 + GITI-026 both touch emit-functions.ts SSE region — that's why they're one dispatch.

# ACCEPTANCE (R26 empirical)
- GITI-025: compile the sidecar; the emitted `.server.js` generator handler binds each param (`const from = route.query.from` or coercion-aware); the client EventSource URL carries `?from=5`; the arg no longer lands in the onMessage slot. If feasible, drain the route stream (giti did this — SSE flows through normal GET fetch) and confirm `countdown(5)` yields 5 frames; at minimum assert the emit shapes.
- GITI-026: the emitted client binding is a per-event callback (`_scrml_sse_ticks_N((d) => _scrml_reactive_set("latest", d))`), NOT a bare call storing the EventSource; named-event listener registered (or facet-status reported).
- No regressions: full `bun run test` green vs startup baseline (+N new tests). NB 3 known parallel-load flakes (`self-compilation` + `trucking-dispatch` two-compile-determinism) — re-run isolated to confirm if one fails; do NOT --no-verify over them.
- Write regression tests for both bugs.

# COMMIT DISCIPLINE (S83+S99): commit after every edit via `git -C "$WORKTREE_ROOT"`; FIRST commit msg includes verbatim startup `pwd`; NO `--no-verify` (STOP+report on env race); `git status` clean before DONE.

# FINAL REPORT: WORKTREE_PATH·BRANCH·FINAL_SHA·FILES_TOUCHED·fix summary per bug·R26 results·named-event facet status·test delta·maps line·deferred.
