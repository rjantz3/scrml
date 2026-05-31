# BRIEF — Engine on-enter opener `effect=` (Insight 33 Fork C1) — compiler source (Phase 2)

Change-id: `engine-on-enter-c1-2026-05-31`
Base: scrmlTS local main HEAD `8056ff5d` (Phase 1 SPEC core already committed there).
Agent: scrml-js-codegen-engineer · isolation: worktree · model: opus.

You are implementing the COMPILER-SOURCE half of a fully-ratified language feature. The
SPEC normative core is ALREADY LANDED at base `8056ff5d` (commit `spec(s148): engine
on-enter effect= on opener`). Your job: make the compiler parse, validate, and emit it,
with tests. This is honest spec-ahead being closed — the SPEC is authoritative (pa.md
Rule 4); implement to the SPEC text, not to this brief's paraphrase where they differ.

================================================================================
# MAPS — REQUIRED FIRST READ
================================================================================
Before consuming any other context, read `.claude/maps/primary.map.md` in full (~80 lines).
Its §"File Routing" + Key Facts point you at structure/error/schema/domain maps. This task
shape is "compiler-source new feature (engine codegen)".

Map currency: maps reflect HEAD `09f74bee` as of 2026-05-31. The only commits since are
`189143a2` (maps) and `8056ff5d` (SPEC+docs) — ZERO compiler-source changes since the map
watermark, so the maps are CURRENT for your compiler-source work. Treat them as ground
truth for file locations.

In your final report include either:
- "Maps consulted: [list]; load-bearing finding: <one sentence>"
- "Maps consulted but not load-bearing — [which map you expected to help but didn't]"

================================================================================
# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99: 20 prior leaks; this would be #21)
================================================================================
Your worktree path is whatever the harness assigned. Run these BEFORE any other tool call:

1. `pwd` via Bash. Output MUST start with
   `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any
   other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing
   failure). Save it as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git log --oneline -3` — confirm your base includes `8056ff5d` (the SPEC core). Then
   `grep -c "E-ENGINE-EFFECT-ON-DERIVED" "$WORKTREE_ROOT/compiler/SPEC.md"` MUST be >= 4.
   If 0, your worktree base is STALE (pre-SPEC-core) — run `git merge main` from
   WORKTREE_ROOT; if that fails, STOP and report (S112 worktree-base-staleness).
4. `git status --short` — confirm clean.
5. `bun install` (worktrees don't inherit node_modules; the pre-commit `bun test` fails
   with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests).

PATH DISCIPLINE (S99 + S126 — enforce on EVERY edit):
- Apply ALL file edits via Bash (`perl -0pi`, `python`, `cp`, heredoc) on WORKTREE-ABSOLUTE
  paths that include the `.claude/worktrees/agent-<id>/` segment. Do NOT use the Edit/Write
  tools for source files (S126 Edit/Bash filesystem-divergence class — incidents #12/#13).
  Echo the target path before each write; re-verify with `git diff`/`grep` after.
- NEVER `cd` into the main repo or anywhere else. Use `git -C "$WORKTREE_ROOT"`,
  `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively (S126 #14/#15).
- First commit message MUST embed your `pwd`: `WIP(c1): start at $(pwd)` (S99 echo-pwd aid).

================================================================================
# THE RATIFIED DESIGN — read these SPEC sections IN YOUR WORKTREE first
================================================================================
Read in `$WORKTREE_ROOT/compiler/SPEC.md`:
- §51.0.H "Form 3 — `effect=` on the `<engine>` opener" (the feature; semantics + the 3
  edge rulings + worked example). Grep `Form 3 — \`effect=\` on the \`<engine>\` opener`.
- §51.0.B opener attribute table (the `effect=${...}` opener row — "non-derived only").
- §51.0.J derived-engine rules table (the `E-ENGINE-EFFECT-ON-DERIVED` row).
- §51.0.R `<onIdle>` Semantics rule 1 (the ordering note: variant inits → onIdle arms →
  opener effect fires; the effect's init→initial edge does NOT reset the watchdog).
- §51.0.F.1 (self-WRITE vs self-TARGET vs construction trichotomy — context).
- §34 catalog row `E-ENGINE-EFFECT-ON-DERIVED`.

PRIMER §7 (engines) "Boot-only opener `effect=`" bullet is the adopter-facing summary.

## What the feature is (one paragraph)
`effect=${ ... }` on the `<engine>` OPENER (NOT a state-child) runs the logic expression
ONCE at module-init, as the effect of the implicit init→`initial=` transition (Elm
`init`+`Cmd`). Boot-only — never re-fires on a later transition back into `initial=`. It is
a DISTINCT slot from the existing state-child `effect=` (same attribute name, different host
+ trigger). The canonical use is "load on boot" (see the README Stage-3 flagship at
`$WORKTREE_ROOT/README.md` ~line 239 — already fixed to the opener form in Phase 1).

================================================================================
# IMPLEMENTATION — survey first, then build (depth-of-survey discount applies)
================================================================================
The named touchpoints below are PA's pre-survey; VERIFY each against current source and
CORRECT the brief if the real surface differs (you are authorized to do so — do not stick
to a wrong file). Two existing constructs are your closest templates; study BOTH before
writing:
  (T1) the state-child `effect=` attribute — how it's parsed (engine state-child parser
       `compiler/src/engine-statechild-parser.ts`) and emitted (`compiler/src/codegen/
       emit-machines.ts` "§51.3.2 effect body" ~line 682).
  (T2) the `<onIdle>` watchdog — how it arms at module-init (`emit-machines.ts` timer-arm
       emission `_scrml_machine_arm_timer` / `_scrml_machine_arm_initial`; sibling handling
       in `compiler/src/codegen/emit-variant-guard.ts`). This is the module-init fire path
       your boot effect rides, and the ORDERING ruling (ii) is relative to it.

## Step 1 — Parser (ast-builder.js + engine-decl shape)
- The engine opener is parsed in `compiler/src/ast-builder.js` around line ~11984 (engineName
  / governedType / derivedMatch / `var=` / `initial=` capture from the opener slice). Add an
  `effect=${...}` capture (mirror the existing opener-attr regex/brace-aware extraction — the
  value is a `${...}` logic-context expression, brace-matched). Land it on the engine-decl AST
  node as a new field, e.g. `openerEffect: string | null` (raw logic body, mirroring how the
  engine body `rulesRaw` is raw text). Keep it `null` when absent. Back-compat: existing
  engines unaffected.
- NOTE the engine body is RAW TEXT today (`rulesRaw`) — that is why compile-time write-
  validation inside state-child bodies was deferred at B15. The opener `effect=` body is the
  same shape (raw `${...}`). See Step 2 for how far to take write-validation.

## Step 2 — SYM / typer (symbol-table.ts + type-system.ts)
- Add `openerEffect` to the `EngineMetadata` interface (`symbol-table.ts` ~line 326, alongside
  `initialVariant` / `derivedExpr` / `onTimeoutElements`) and populate it in the engine-register
  pass (PASS 10.A `walkRegisterEngines` / B14-B15 region).
- FIRE `E-ENGINE-EFFECT-ON-DERIVED` (NEW §34 code — already in SPEC §34) when an engine has a
  non-null `openerEffect` AND is a derived engine (`engineMeta.derivedExpr != null` / the
  derived form). This is edge-ruling (iii). Add it where the other derived-engine rejections
  fire (B16 `walkDerivedEngineDeclRejections` region / PASS 12).
- WRITE-VALIDATION (ruling: writes inside the opener effect checked against `.<initial>.rule`):
  the SPEC promises this. If the opener-effect body is walkable enough to scan `@<var> = .X`
  writes (reuse whatever the state-child-body direct-write scanner uses — search
  `scanDirectWritesInStateChildBody` / fire-site #10 in symbol-table.ts), implement the check
  against the INITIAL variant's `rule=` set (`E-ENGINE-INVALID-TRANSITION`, statically — the
  from-state is statically the `initial=` variant). If the body is raw-text-only and a faithful
  write-scan is out of reach without disproportionate new infra, DEFER the write-validation with
  an explicit documented note (mirror the B15 deferral pattern) AND a `.skip` test capturing the
  intended behavior — but get the PARSE + DERIVED-FORBID + CODEGEN working regardless. Surface
  the decision in your report.

## Step 3 — Codegen (emit-machines.ts / emit-engine.ts)
- Emit the opener `effect=` body to run ONCE at module-init for non-derived engines. Order
  per ruling (ii): the engine variant cell initializes into `initial=`, the `<onIdle>` arm (if
  any) fires at module-init, THEN the opener effect runs. The opener effect's own init→initial
  edge does NOT reset the onIdle watchdog; any cross-variant write it performs goes through the
  normal `_scrml_engine_direct_set` path and resets the watchdog per §51.0.R (that falls out for
  free if you emit the effect as ordinary logic that performs real writes — do NOT special-case
  a watchdog reset for the boot edge).
- Boot-only: emit it on the module-init path, NOT in any per-arm re-entry handler. Re-entering
  `initial=` later must NOT re-run it.
- Tree-shake: an engine with no `openerEffect` emits zero new code (parity with the onIdle /
  onTimeout tree-shake invariants).

## Step 4 — errorBoundary interaction (edge-ruling i) — VERIFY, likely no new code
- Ruling (i): a non-`!` throw escaping the boot effect routes to the §19.6.8 host-JS backstop
  (`compiler/src/codegen/emit-error-boundary.ts`), NOT to an enclosing `<errorBoundary>`
  fallback; `<errorBoundary>` is render-context only. The boot effect runs at module-init in
  logic context. VERIFY that emitting the boot effect on the module-init path means it is NOT
  inside any errorBoundary render-subtree try/catch (so a throw there logs loudly via the
  existing backstop / module-init error path, not a boundary fallback). If it already behaves
  this way (likely — module-init logic is outside render boundaries), NO new code; just a test
  asserting it. If it does NOT, surface the gap (do not silently wire boot effects into
  boundaries).

## Step 5 — Tests (the load-bearing deliverable)
Add a dedicated suite `compiler/tests/unit/engine-opener-effect-c1.test.js` (+ happy-dom
acceptance in `compiler/tests/browser/` if that's where engine runtime acceptance lives —
check the existing engine browser tests). Cover:
- PARSE: `effect=${...}` on the opener → engine-decl.openerEffect populated; absent → null;
  existing engines unchanged (regression).
- SYM: derived engine + opener effect → `E-ENGINE-EFFECT-ON-DERIVED` fires; non-derived +
  opener effect → no error; write-against-`.initial.rule` (active OR `.skip` per Step 2).
- CODEGEN: non-derived opener effect emits a module-init fire; emitted JS `node --check`-clean;
  boot-only (no per-arm re-run); tree-shake when absent.
- HAPPY-DOM ACCEPTANCE: the README-flagship shape (`<engine for=Phase initial=.Loading
  effect=${ @tasks = loadTasks()!{...}; @phase = @tasks.length==0 ? .Empty : .Editing }>`)
  boots, runs the effect once, and transitions out of `.Loading`. This is the load-bearing
  end-to-end test (emit-string tests alone are insufficient per S139 `node --check`≠correct).

================================================================================
# R26 EMPIRICAL VERIFICATION — MANDATORY (S138 doctrine; this fix touches CODEGEN)
================================================================================
Per pa.md S138: a HIGH/codegen fix is NOT closed by regression tests alone. Phase 3 of YOUR
work, before reporting DONE:
1. Author a real adopter-shaped `.scrml` reproducer (the README flagship engine, as a
   standalone compilable file) at `/tmp/r26-c1-verify/flagship.scrml`.
2. Compile it on YOUR post-fix baseline:
   `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/r26-c1-verify/flagship.scrml \
      --output-dir /tmp/r26-c1-verify/out > /tmp/r26-c1-verify/log 2>&1`
3. Symptom checks (state exact greps in your report):
   - emitted JS contains a module-init fire of the boot effect (the `loadTasks` call appears
     at module-init, NOT inside a per-arm handler);
   - `node --check` exit 0 on the emitted JS;
   - a derived-engine + opener-effect reproducer compiles to a FAIL with E-ENGINE-EFFECT-ON-
     DERIVED (not a silent accept).
4. DO NOT mark DONE without empirical R26 verification passing.

================================================================================
# COMMIT DISCIPLINE (S83 — crash recovery + clean terminal state)
================================================================================
- Commit after EACH meaningful unit (parser / SYM / codegen / each test file). WIP commits
  expected. After every edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify, then add+commit.
- Update `$WORKTREE_ROOT/docs/changes/engine-on-enter-c1-2026-05-31/progress.md` Phase-2
  checkboxes after each step (append-only notes; don't rewrite).
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status --short` MUST be clean. "Work in
  worktree, no commits" is NOT an acceptable terminal report.
- The pre-commit hook runs `bun test {unit,integration,conformance}`; it MUST pass at each
  commit (no `--no-verify`). Run the FULL `bun --cwd "$WORKTREE_ROOT" run test` (chains
  pretest) once before your final commit to confirm 0 regressions incl. browser.

================================================================================
# FINAL REPORT — must include
================================================================================
- WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED (list).
- Maps-consulted feedback (per the maps block).
- The Step-2 write-validation decision (implemented vs deferred + why).
- The Step-4 errorBoundary finding (no-new-code vs gap).
- R26 results (the exact greps + node --check + derived-forbid outcome).
- Test counts (suite delta; full-suite pass/fail/skip).
- Any deferrals with rationale.
