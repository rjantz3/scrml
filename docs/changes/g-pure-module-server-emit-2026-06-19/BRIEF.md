# TASK: fix `g-pure-module-server-emit-missing` (HIGH) — SPA's server bundle imports a pure module's `.server.js` that is never emitted → green compile, dead server bundle

**Change-id:** `g-pure-module-server-emit-2026-06-19`. Create `docs/changes/g-pure-module-server-emit-2026-06-19/`; progress.md + commits reference it.

## The bug (flogence-PA-reported + independently flogence-verified by RUNNING a compiled SPA)
An SPA `<program db>` imports a PURE-helper module (`${ export type … ; export fn … -> … }` — types + pure fns, NO `?{}`/no server code) and uses its exports CLIENT-side only. Codegen emits the module's `.client.js` (runtime-registry IIFE) but NOT a `.server.js` — YET `app.server.js` emits `import { … } from "./models/<mod>.server.js"` UNCONDITIONALLY → the file doesn't exist → the server bundle throws on import (`Cannot find module './models/<mod>.server.js'`) → every `?{}` server fn is dead. **GREEN compile (exit 0); `node --check` passes** (the dangling import is a missing FILE, not a syntax error); only breaks on RUN. The page mounts (client) but has no data layer. This is the "compiled-green ≠ actually works" class.

**flogence's diagnosis (verify it):** the `.server.js` EMISSION is gated on server-side USAGE of the module's exports; the server-bundle IMPORT statement is emitted UNCONDITIONALLY → the two disagree for a client-only-used module. Trucking (`examples/23-trucking-dispatch`) WORKS because `models/auth.scrml`'s exports ARE used in server fns → `auth.server.js` IS emitted. Import POSITION is irrelevant (inside `<db>` vs program-body `${}`). Channels are FINE (CE-inlined, no server import).

## PHASE 0 — REPRODUCE FIRST (verify-before-claim; do this before any fix)
Construct a minimal SPA + pure-helper module and confirm the bug on the WORKTREE compiler:
- `models/log.scrml` (pure module): `${ export type Entry:struct = { id: int, msg: string } ; export fn entryLine(e: Entry) -> string { return e.msg } }`
- `app.scrml` (SPA): a `<program db="sqlite::memory:">` with a `<db>` holding a `<entries>: Entry[] = []` cell + a `server fn loadEntries() { @entries = ?{ select id, msg from entries } }`, then `${ import { entryLine, Entry } from "./models/log.scrml" }`, then client markup that uses `entryLine` CLIENT-side only (e.g. `<ul><each in=@entries as e><li : entryLine(e)></each></ul>`). Consult `docs/articles/llm-kickstarter-v2-2026-05-04.md` for the canonical SPA `<program db>` shape if the structure needs adjusting to compile green.
- Compile `app.scrml` (multi-file; `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <app.scrml> -o <out>`) → confirm: (a) exit 0 green; (b) `<out>/app.server.js` contains `import { … } from "./models/log.server.js"`; (c) `<out>/models/log.server.js` does NOT exist (only `log.client.js`); (d) `node --check app.server.js` passes but importing it at runtime would throw. If you CANNOT reproduce this divergence → STOP, classify NOT-REPRODUCED, report (don't invent a fix). Paste the before-state.

## The fix — pick ONE, justify against the codegen architecture
1. **Emit `.server.js` for ANY cross-file module imported by the server bundle** — a pure fn is environment-agnostic, so emit the ES-export form alongside the client-registry form. Simplest; may emit an unused-but-harmless `.server.js`.
2. **Tree-shake the server `import`** — don't emit the server `import` for a module when NONE of its imported symbols are used in server code. Cleaner; needs server-side usage analysis.
Investigate the module-split codegen to find which is the right shape (the existing gating logic will tell you). **Loci to investigate** (depth-of-survey — find the real surface): the `.server.js` emission gating + the server-bundle import emission — likely `compiler/src/codegen/` (a module-emit / route-splitter / per-program-emit path) + `compiler/src/api.js` (per-file emit loop). Grep `.server.js`, `server.js`, the import-emission for the server bundle, and how `auth.server.js` gets emitted (the working case) vs the pure module (the broken case).

**PLUS — the compile-time warning (do this regardless of which fix):** add a diagnostic (Warning) that fires when the server bundle would import a `.server.js` that won't be emitted — so this class is never again a silent green-compile-broken-runtime. If your fix makes the import always resolve, the warning becomes a defense-in-depth regression guard; if you choose tree-shaking, it documents the decision. Name it sensibly (e.g. `W-SERVER-IMPORT-UNEMITTED` or similar) + add it to SPEC §34 if it's a new code (Rule-4 — new codes land with their §-entry; PA can finalize the §34 row at landing if you flag it).

---
# MAPS — REQUIRED FIRST READ: `.claude/maps/primary.map.md` in full + §Task-Shape Routing (compiler-source codegen). Maps lag HEAD — verify against live source. Report maps feedback.

# STARTUP VERIFICATION + PATH DISCIPLINE
Worktree under `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-<id>/`.
1. `pwd` MUST start with that prefix (else STOP — S90); save `WORKTREE_ROOT`. 2. `git rev-parse --show-toplevel` == it. 3. `git log -1` base descends from `36e022bc` (current main); if BEHIND `git merge main`. 4. `bun install`. 5. `bun run pretest`.
- ALL edits via Bash (perl/python3/heredoc) on worktree-absolute paths incl. `.claude/worktrees/agent-<id>/` — NOT Edit/Write; echo path before, `git diff` after. NEVER `cd` into main (use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths for compile/run).
- Commit after each edit; first commit msg embeds `pwd`. `git status` clean before DONE. Update progress.md each step. Never `--no-verify` (it will be blocked).
- DO NOT TOUCH: `docs/known-gaps.md` (PA flips the gap at landing); the block-analysis files / dock.ts / emit-each.ts / tokenizer.ts (recent landed work, unrelated).

# PHASE 3 — MANDATORY R26 (no DONE without):
1. **The repro now SERVES:** after the fix, compile the Phase-0 repro → `app.server.js`'s import RESOLVES (either `models/log.server.js` is now emitted, OR the server import is tree-shaken away) → importing `app.server.js` at runtime no longer throws. Demonstrate empirically: `node -e "import('<out>/app.server.js')"` (or equivalent) succeeds, OR at minimum `models/log.server.js` exists when imported. Paste before (throws/missing) / after (resolves).
2. **Trucking still works** (the server-side-used case): compile `examples/23-trucking-dispatch` → `models/auth.server.js` still emitted + imported, no regression.
3. **The warning fires** on the unfixed-shape (if you kept any unemitted-import path) OR is a clean regression guard.
4. **FULL suite green** (`bun --cwd "$WORKTREE_ROOT" run test`) — this is module-split codegen, a load-bearing path; the full suite (browser + integration) is the regression gate. Record pass/skip/fail.

End: DO NOT mark DONE without the repro-now-serves before/after + trucking-unregressed + full suite green.

# FINAL REPORT: WORKTREE_PATH / FINAL_SHA / BASE_SHA (+merged main?) / FILES_TOUCHED / Phase-0 repro confirmation (the before-state) / which fix (1 or 2) + why / the warning code + whether it needs a §34 entry / R26 before-after (repro serves) + trucking + suite counts / maps feedback / deferred items.

Commit after each change; WIP commits expected; progress.md each step. If you crash, commits + progress.md are how the next agent resumes.
