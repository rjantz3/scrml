# Dispatch BRIEF — ss19 A2: #5 g-stdlib-import-leaks-client (HIGH)

**Agent:** scrml-js-codegen-engineer · **isolation:** worktree · **opus** · **change-id:** ss19-a2-stdlib-client-leak-2026-06-25 · land-on `spa/ss19` · base `23601835`.

A page importing a server-only stdlib module (`scrml:auth`/`store`/`crypto`) and using it ONLY in a server fn still emits `const { x } = _scrml_stdlib.<mod>;` into the CLIENT bundle. Client runtime defines `const _scrml_stdlib = {}` → `_scrml_stdlib.<mod>` is undefined → destructure throws at module load → whole page dead.

[STARTUP-VERIFICATION + PATH-DISCIPLINE — standard block: pwd must start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`; `git rev-parse --show-toplevel`==WORKTREE_ROOT, remote scrml.git; `git status` clean; `bun install`; `bun run pretest`. Edits via Bash on worktree-absolute paths, NEVER `cd` into main, never Edit/Write tool, never `--no-verify`. One logical fix = one commit, coupled code+test.]

## Confirmed (sPA R26)
`/tmp/ryan-verify/01-stdlib-client-leak.scrml` → `01-stdlib-client-leak.client.js` contains `const { createSessionStore } = _scrml_stdlib.store;` (createSessionStore used only inside server fn `load()`).

## Locus + fix
`compiler/src/codegen/emit-client.ts` **L1312-1345** — `scrml:NAME` imports lowered UNCONDITIONALLY to `const { ... } = _scrml_stdlib.<name>;`. (Related: L526 chunk population; L753 already references server-only-import classification; L2101 comment about a `.client.js` pointing at a server-only module 500ing the load.)

Strip a `scrml:` stdlib import from the CLIENT bundle when its bound name(s) are referenced ONLY in server-classified fns (the route-inference/reachability classification that already exists — find the signal L753 alludes to). If a name is used in BOTH client and server code, keep the client import (don't break that case). If stripping is ambiguous, the alternative the issue allows is stubbing `_scrml_stdlib.<mod>` client-side so the destructure yields `undefined` without throwing — but PREFER the strip (don't ship dead server imports to the client).

## Verify (R26 + adversarial)
1. `01-stdlib-client-leak.scrml` → client.js no longer contains `_scrml_stdlib.store` / the `createSessionStore` import; client.js loads without throwing (happy-dom or node parse-check).
2. **Adversarial — don't over-strip:** a fixture where a stdlib binding IS used in client code → the client import is PRESERVED. A fixture using `scrml:time`-style client-legit stdlib → preserved.
3. Add a regression test (grep existing emit-client / stdlib tests in compiler/tests/). Full `bun run test` GREEN, 0 regressions (report baseline + after).

## Scope / report
ONLY #5 (emit-client stdlib strip). Do NOT touch server emission, auth, or render-codegen. **Flag in your report any shared corpus/snapshot baseline your change shifts** (the sPA reconciles parallel landings — S211). Report: commit SHA · red→green · client.js before/after import lines · over-strip adversarial result · git status clean + agent branch + tip SHA.
