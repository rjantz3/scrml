# BRIEF — engine-name-dual-table-fix-2026-06-20 (S210 RE-DISPATCH, verbatim per S136)

**Agent:** scrml-js-codegen-engineer · opus · isolation:worktree · background · agentId a1ad1907298ac1473
**Bug:** g-engine-name-attr-swallows-var-duplicate (HIGH) · option (b) — honor P1, fix dual-table + var-derivation. RE-DISPATCH (prior `engine-name-attr-reject-2026-06-20` took the wrong reject-direction; discarded).

---

You are `scrml-js-codegen-engineer` fixing ONE HIGH compile-clean-but-runtime-broken bug in the scrml compiler. Change-id: `engine-name-dual-table-fix-2026-06-20`. **This is a RE-DISPATCH** — a PRIOR attempt took the WRONG direction (it REJECTED `name=`); that work is discarded. The correct direction is the OPPOSITE. Read carefully.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full first; follow its §"Task-Shape Routing" for a compiler-source bug fix.
Map currency: maps reflect HEAD 41422726 as of 2026-06-20; current HEAD is 8c938a58 (~4 commits behind). Treat map content as a hypothesis to verify via grep/Read, NOT ground truth.
Report: "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing."

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 has had multiple leaks; do not be the next)
Before ANY other tool call:
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If under any other repo, STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` clean.
4. `bun install`.
5. `bun run pretest`.
6. `git merge main` (pull current main 8c938a58 — your base may be stale; should be trivial). Resolve trivially or report.
If any check fails: STOP + report.

PATH DISCIPLINE — every write:
- Apply ALL edits via Bash (perl/python3/cp/heredoc) on WORKTREE-ABSOLUTE paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools (S126). Echo path before each write; re-verify via `git diff`/`grep` after.
- NEVER `cd` into main or anywhere; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only (S126 #14/#15).
- FIRST commit message embeds `$(pwd)` from step 1.

# THE BUG (HIGH — g-engine-name-attr-swallows-var-duplicate) — CORRECT DIRECTION (option b)
**`<engine name=N for=T>` is RATIFIED-CANONICAL** — DO NOT reject it. SPEC §51 P1 prose (~line 27176, DD1 2026-04-30 `state-as-primary-unification`): "Both `<engine name=N for=T>` and `<machine name=N for=T>` produce identical AST shapes… the user-named identifier in `name=` (e.g. `HOSMachine`, `MarioMachine`) is unchanged under either keyword." It appears in ~12 §51 worked examples, and `@x: N` (a cell typed by the machine name N) is the canonical machine-typed-cell form governed by machine N (§7495: "a machine-typed state cell `@state: M` where `<machine name=M>` governs it"; §51.3).

The REAL bug is a codegen DUAL-TABLE + var-derivation mismatch. Reproducer (VALID scrml per P1 — write to `$WORKTREE_ROOT/tmp-ae.scrml`):
```
<program>
${
type Mode:enum = { Nav, Edit }
@mode: ModeMachine = Mode.Nav
function toggle() { if (@mode == Mode.Nav) { @mode = .Edit } else { @mode = .Nav } }
}
<engine name=ModeMachine for=Mode initial=.Nav>
  <Nav  rule=.Edit />
  <Edit rule=.Nav />
  <onTransition from=.Nav to=.Edit>${ @mode = @mode }</onTransition>
  <onTransition from=.Edit to=.Nav>${ @mode = @mode }</onTransition>
</engine>
<div><button onclick=toggle()>toggle</button><span>${@mode}</span></>
</>
```
PA-confirmed on the pre-fix baseline: compiles EXIT 0 but throws `E-ENGINE-001-RT: Illegal transition` on every legal transition at runtime. The emit shows the mismatch: the engine builds the transition table `__scrml_engine_modeMachine_transitions` (keyed by the auto-derived var `modeMachine`), but the write-guard for the user's `@mode` cell looks up a DIFFERENT table `__scrml_transitions_ModeMachine` (keyed by the engineName) → no rule found → throw. ALSO: the user's machine-typed cell is `@mode` (declared `@mode: ModeMachine`), but the engine auto-derives its variable as `modeMachine` (via `autoDeriveEngineVarName(engineName)` at symbol-table.ts:~5554) — so the engine governs `modeMachine` while the user writes `@mode`: a var-name divergence on top of the table-name mismatch.

**Likely loci (SURVEY to confirm — a prior dispatch mis-rooted this; verify empirically before fixing):**
- `compiler/src/codegen/emit-machines.ts` — the §51.3 write-guard emits `__scrml_transitions_<engineName>` (~lines 135, 185-188, 635); the §51.0 engine path builds `__scrml_engine_<varName>_transitions`. The two table-naming conventions disagree when `name=` is present.
- `compiler/src/symbol-table.ts` (~5549-5554) — `varName = autoDeriveEngineVarName(engineDecl.engineName)` derives the engine var from the engineName (`ModeMachine`→`modeMachine`) instead of binding to the machine-typed cell the user declared (`@mode: ModeMachine`).
- `compiler/src/type-system.ts` `buildMachineRegistry` — §51.3 machine-typed-cell governance (`@x: M` governed by machine M).

**FIX GOAL:** when `<engine name=N for=T>` governs a machine-typed cell `@x: N`, codegen must be CONSISTENT — the write-guard, the transition table, and the engine's governed variable must all key on the SAME cell (here `@mode`), so a legal transition (`@mode = .Edit`, allowed by `<Nav rule=.Edit>`) SUCCEEDS at runtime. Reconcile the §51.0-engine vs §51.3-machine table-naming + var-derivation for the `name=`/machine-typed-cell path. Wire `E-ENGINE-VAR-DUPLICATE` correctly: the machine-typed cell `@x: N` is the GOVERNED variable, NOT a collision — it must NOT false-fire on this canonical form; it must STILL fire on a genuine collision (`var=mode` + a SEPARATE `@mode` cell). Survey the exact mechanism first — do not assume; the prior dispatch's mis-rooting is why this is a re-dispatch.

**ACCEPTANCE (R26 — happy-dom):** the reproducer COMPILES (exit 0) AND the transition WORKS at runtime — clicking toggle flips `@mode` Nav↔Edit with NO `E-ENGINE-001-RT`. (Per P1 the repro is valid → it must WORK, not error.)

**SPEC currency (same change, Rule 4):** §51.0.B's engine attribute table omits `name=` — ADD a `name=` row (the engineName; §51.3 named-machine form; cross-ref §51 P1 ~line 27176). Doc-gap currency, NOT a behavior change. Apply SPEC.md edits via Bash on the worktree-absolute path.

# WHAT NOT TO DO (the prior dispatch's errors)
- Do NOT reject `name=` on `<engine>`.
- Do NOT amend/reverse the §51 P1 prose (~line 27176) or migrate the ~12 `<engine name=>` worked examples — they are correct as-is.
- Do NOT invert the P1 parse-equivalence tests (`compiler/tests/unit/engine-keyword.test.js`, `p1e-uniform-opener-equivalence.test.js`, `p1e-engine-keyword-regression.test.js`, `engine-binding-b14.test.js`) — they correctly assert `<engine name=>` validity. (A prior dispatch inverted them; those inversions were never landed. If you find them inverted, restore the validity assertions.)
- If you conclude the fix requires reversing any ratified P1 behavior, STOP and report — it should not (this is a codegen-consistency fix).

# COMMIT DISCIPLINE (S83 two-sided)
After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>`; `add`; commit IMMEDIATELY (code + coupled test in ONE commit). Don't batch. Before DONE: `git -C "$WORKTREE_ROOT" status` clean. Append to `$WORKTREE_ROOT/docs/changes/engine-name-dual-table-fix-2026-06-20/progress.md` after each step.

# VERIFICATION (R26 mandatory — S138)
1. R26 happy-dom: the reproducer transitions Nav↔Edit at runtime (no E-ENGINE-001-RT). Record before/after. Delete tmp-ae.scrml before final commit.
2. Regression tests: the `name=`/machine-typed-cell form transitions correctly; the canonical no-name + `var=` forms still compile + transition; `var=mode` + a SEPARATE `@mode` cell STILL fires `E-ENGINE-VAR-DUPLICATE`.
3. FULL suite: `bun --cwd "$WORKTREE_ROOT" run test` (NOT just the subset). Re-baseline within-node M6.5.b.0 allowlist in the same landing if any fixture shifts. 0 failures before DONE.
DO NOT mark DONE without R26 passing.

# .scrml reproducer-form note
Canonical V5-strict decl form per the PRIMER. Don't mix decl forms.

# REPORT (final message IS the PA's landing input — raw facts)
WORKTREE_ROOT · FINAL_SHA · branch · FILES_TOUCHED (worktree-absolute) · before/after R26 (transition works) · full-suite pass/skip/fail · within-node touched? · the §51.0.B name= row added? · Maps line · any deferred items. If the fix turned out bigger than a codegen-consistency change, say so explicitly.
