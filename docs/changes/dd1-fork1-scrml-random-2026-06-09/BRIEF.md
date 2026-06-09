# DISPATCH BRIEF — `scrml:random` capability-scoped non-det primitive (DD1 Fork 1 follow-on)

change-id: `dd1-fork1-scrml-random-2026-06-09`
repo: /home/bryan-maclee/scrmlMaster/scrmlTS · baseline HEAD: 4a19a047 (S176)
agent: scrml-js-codegen-engineer · isolation: worktree

Close `g-random-primitive` (LOW) — the DD1 Fork 1 follow-on. `Math.random` (6 corpus sites) is class-C non-determinism, the SAME capability class as the wall clock `scrml:time.now()` (landed S176 `beb8a115`). This is a near-MIRROR of the `now()` build: a `scrml:random` module whose members are E-FN-004-gated exactly like `now()`. SPEC §41.18 already flagged the home: *"`scrml:math` deliberately EXCLUDES `random()` … its home is a separate design decision — `scrml:random`."* This decides + builds it.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full. Task-shape: **compiler-source feature (stdlib module + E-FN-004 capability-gate + SPEC)**. Map currency: watermark `049954e0` (HEAD `4a19a047` ahead by S176 landings; grep to confirm line numbers — the `now()` work shifted type-system.ts). Report maps load-bearing-or-not.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
S99/S126 leak history — and S176 had a Bash-write leak (a `python3` patch hit MAIN; self-caught + reverted). DO NOT repeat it.
1. `pwd` MUST start `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Else STOP (S90). Save WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT. 3. `git status --short` clean. 4. `bun install`. 5. `bun run pretest`. 6. baseline `bun run test` (contract 0 fail).
- ALL edits via Bash (perl/python3/heredoc) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT Edit/Write (S126). **The path-discipline hook does NOT catch Bash writes** (S176 finding `feedback_path_discipline_hook_bash_blindspot`) — so YOU must self-enforce: echo the absolute target path before EVERY Bash write, confirm it contains `.claude/worktrees/agent-`, and `git -C "$WORKTREE_ROOT" status`/grep after each. A write to a `/home/bryan-maclee/scrmlMaster/scrmlTS/<path>` (no worktree segment) is a MAIN leak.
- NEVER `cd` into main. `git -C "$WORKTREE_ROOT"`, run bun from WORKTREE_ROOT, worktree-absolute paths.
- First commit msg embeds startup `pwd`: `WIP(scrml-random): start at <pwd>`.

---

# DESIGN (mirror the `now()` build — `beb8a115`)

## Surface — `scrml:random` (capability-scoped, class-C non-det)
- NEW `stdlib/random/index.scrml` + NEW `compiler/runtime/stdlib/random.js` (shim = the ONE sanctioned `Math.random()` touch, mirroring how `time.js`'s `now()` is the sanctioned `Date.now()` touch).
- Members (v1):
  - `random()` → a float in `[0, 1)` (the primitive; exact `Math.random()` mirror).
  - `randomInt(min, max)` → an integer in `[min, max]` INCLUSIVE (the dominant corpus idiom — `Math.floor(Math.random()*N)` token-minting). Document the inclusivity convention clearly in the index.scrml doc-comment + SPEC.
- Both are NON-DETERMINISTIC (class-C IO) — the same classification as `now()`.

## Capability gate — GENERALIZE the now() mechanism
The `now()` build added `collectNowFromScrmlTime` (type-system.ts ~6582): a binding-aware set of local names bound to `now` from `import ... 'scrml:time'`, threaded into the fn-purity walker so E-FN-004 fires on the imported `now()` (and NOT on a user's own `function now()`). **Generalize this** to also gate `random`/`randomInt` imported from `scrml:random`. Prefer refactoring `collectNowFromScrmlTime` into a small **registry-driven collector** — e.g. `NONDET_STDLIB = { "scrml:time": ["now"], "scrml:random": ["random", "randomInt"] }` → one `collectNonDetStdlibBindings` that the next non-det primitive extends trivially. (If a parallel collector is genuinely cleaner, justify it; but the registry generalization is the intent — DRY + future-proof.) Requirements: `random()`/`randomInt()` forbidden in pure `fn`/`pure function` → **E-FN-004** (reuse; NO new code); allowed in `function`/`server function`; binding-aware (a user's own `random()` is NOT gated). E-FN-004 message names the non-det callee (`scrml:random.random`).

## Corpus migration (land WITH the feature) — 6 Math.random sites in 5 files
- `examples/23-trucking-dispatch/pages/dispatch/billing.scrml`, `.../pages/dispatch/load-detail.scrml`, `.../pages/driver/load-detail.scrml`: `Math.floor(Math.random() * 100000)` token-mint → `randomInt(0, 100000)` (import from `scrml:random`). These are inside `server function`/`function` (token minting) — verify they're NOT in a pure `fn` (they shouldn't be).
- `samples/gauntlet-r11/rust-state-machine.scrml`: `Math.random() < 0.5` → `random() < 0.5`.
- `samples/compilation-tests/meta-003-function.scrml`: `"meta-" + Math.random()` → `"meta-" + random()`.
- `stdlib/http/index.scrml`: the retry-jitter `Math.random() * 2 - 1` — this is the stdlib OUROBOROS leak. De-leak it through `scrml:random` (mirror the `time.js`→`scrml:math` de-leak). **BUT first check whether `http.js` (the shim) is one of the 4 statically CLIENT-INLINED shims (like `data.js`)** — if it is, the client-inliner strips the cross-shim import (`g-stdlib-clientinline-shim-import`, MED, S176) and you must DEFER the http de-leak (don't ship a client ReferenceError); if http is server-only-bundled (like time.js), de-leak it cleanly. Report which.
- After migration: `grep -rE 'Math\.random' examples samples stdlib --include='*.scrml'` = 0 (or only the deferred http case + a note). Confirm `scrml:random` itself is the only place `Math.random` is touched (in random.js).

## SPEC + docs
- **SPEC NEW §41.20 `scrml:random`** (after §41.19 `scrml:time.now()`, ~line 21246+): catalog entry (random()/randomInt surface + inclusivity convention) + the capability note (non-det, E-FN-004-gated, forbidden in pure fn, allowed in function/server function — mirror §41.19's wording). Cross-ref §48.3.4 / §48.6.2 / §33 / §34 / §41.18 / §41.19.
- **Update SPEC §41.18's `random()`-exclusion note** (~line 21242: "its home is a separate design decision — `scrml:random` vs an impure carve-out") → "decided: `scrml:random` (§41.20)".
- **§34**: NO new code (E-FN-004 reused). If the catalog needs a note that E-FN-004 now covers scrml:random bindings, add it to the existing row.
- **PRIMER §10** stdlib catalog: add `scrml:random` (17→18 modules); note it's capability-scoped (non-det).
- Do NOT touch adopter-marketing docs (kickstarter/scrml.dev) — pa.md Rule 1.

---

# PHASES (commit per phase; code + coupled test = ONE commit)

**PHASE 0 — survey-confirm (REQUIRED, report before building).** Confirm: the now() collector to generalize (type-system.ts ~6582 `collectNowFromScrmlTime`) + the registry-refactor shape; the math/time index.scrml + shim pattern; SPEC §41.18/§41.19 + §41.20 placement; the 6 corpus sites + **whether `http.js` is client-inlined** (de-leak vs defer). Report; STOP if anything contradicts.

**PHASE 1 — `scrml:random` module + tests.** index.scrml + random.js shim (random() + randomInt). Tests: adopter `import { random, randomInt } from 'scrml:random'` compiles + emits shim calls; `random()` in a `function`/`server function` → OK; in a pure `fn` → **E-FN-004**; a user's own `function random(){}` called in a `function` → NOT gated.

**PHASE 2 — generalize the E-FN-004 collector + tests.** Registry-driven non-det-stdlib-binding collector (scrml:time→now, scrml:random→random/randomInt); confirm now() STILL gates correctly (no regression) + random/randomInt now gate. Tests for the generalized path.

**PHASE 3 — corpus migration (land WITH the fix).** The 6 sites → scrml:random; http de-leak OR deferral (per Phase-0 client-inline check); verify `Math.random` in `.scrml` = 0 (modulo a documented http deferral). Report each file.

**PHASE 4 — SPEC §41.20 + §41.18 note update + PRIMER §10.**

**PHASE 5 — R26 EMPIRICAL (MANDATORY).** `random()`/`randomInt()` in a `server function` → OK; in a pure `fn` → E-FN-004; corpus `.scrml` 0 Math.random (modulo http defer); `now()` still gates (no regression); emitted JS calls the shim (`node --check` clean); full `bun run test` 0 fail. Report the R26 table. DO NOT mark DONE without it.

---

# COMMIT DISCIPLINE
Commit per phase; code + coupled test = ONE commit; WIP commits expected. `git status` clean before DONE. NEVER `--no-verify`. Update `docs/changes/dd1-fork1-scrml-random-2026-06-09/progress.md` per phase.

# COMPLETION REPORT
WORKTREE_PATH (startup pwd) · FINAL_SHA · FILES_TOUCHED · Phase-0 survey (collector-generalization shape + http client-inline verdict) · per-phase summary · Phase-3 corpus migration (each file + http disposition) · Phase-5 R26 table · baseline-vs-final `bun run test` · maps feedback.
