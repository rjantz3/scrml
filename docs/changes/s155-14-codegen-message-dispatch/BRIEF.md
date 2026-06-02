# BRIEF — #14 event-payload-transition, CODEGEN + RUNTIME batch (batch 3 of 3)

change-id: `s155-14-codegen-message-dispatch`

You are implementing the **codegen + runtime** batch of the #14 event-payload-transition
primitive (Approach E), landed normative S154. This is **batch 3 of 3 — the one that makes the
feature actually do something at runtime.**

- Batch 1 (DONE, main) — PARSER: `accepts=` + `(state × message)` arm recognition → AST.
- Batch 2 (DONE, main `c6f323f0`) — TYPER: `accepts=` resolution, exhaustiveness, `.advance`
  two-plane resolution, the 4 §34 codes.
- **Batch 3 (THIS dispatch) — CODEGEN + RUNTIME:** lower `.advance(.MsgVariant)` to a message
  dispatch — find the current state's `(state × message)` arm, run its body (effects), resolve
  the target, transition with the §51.0.S.3 machinery. Plus arm-target `rule=` validation.

## What batches 1+2 produced (your input — all on main)

- `EngineStateChildEntry.messageArms: MessageArmEntry[]` (symbol-table.ts) — per-state arms.
  `MessageArmEntry`: `{ variantName, isWildcard, payloadBindingsRaw, payloadBindings, armArrow,
  bodyRaw, isBlockBody, spanStart, spanEnd }`. `bodyRaw` is the arm body verbatim — a block
  `{ effects; .Target }` (`isBlockBody:true`) OR a bare target expr (`.Idle`).
- `EngineMetadata.acceptsType` + `messageVariants` (symbol-table.ts) — the resolved message enum
  + its variant set.
- `MachineType.acceptsMessageType` (type-system.ts) — the message enum, TS side.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full. §"Task-Shape Routing" → **"codegen"** (the
highest-churn area): `domain.map.md` — the **"Codegen `<each>` / `<match>` Emit Map"** table
(names every emit module + role + the S153 runtime helpers) → `structure.map.md` (S153
emit-each/emit-match/emit-variant-guard/runtime-template line+function refs) → `error.map.md`
(E-CODEGEN-INVALID-JS fix notes + chunk-survival / dep-first-read invariants — the parse-gate
is default-ON) → `test.map.md` (happy-dom canary list; **emit-string-only tests mask runtime
miscompiles** — a behavior change WITHOUT a happy-dom canary is the S140/S152 blind-spot trap).

Map currency: maps reflect `c665714c`; main is now `c6f323f0` (batches 1+2 + scandir landed
after). The codegen modules (emit-engine.ts, emit-expr.ts, runtime-template.js, emit-match.ts)
are NOT touched by those landings, so the map content for them is current. Feedback line
required.

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99/S126: 15+ leaks where worktree edits landed in MAIN. Batches 1+2 did NOT leak — keep the
streak. This would be incident #16.**

1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`
   (else STOP — S90). Save as `WORKTREE_ROOT`. 2. `git rev-parse --show-toplevel` ==
   `WORKTREE_ROOT`. 3. `git status` clean; `git log --oneline -1` base at/after `c6f323f0`
   (batches 1+2). 4. `bun install`. 5. `bun run pretest`.
- ALL edits via Bash on worktree-absolute paths (incl. `.claude/worktrees/agent-<id>/`); echo
  path before, `git -C "$WORKTREE_ROOT" diff` after. NEVER `cd` into main (use `git -C` /
  `bun --cwd` / absolute paths). First commit message embeds verbatim `pwd`. Commit per
  sub-unit; clean `git status` before DONE; update `docs/changes/s155-14-codegen-message-dispatch/progress.md`.
- `--no-verify` FORBIDDEN.

---

# THE CONTRACT — read IN FULL (normative, pa.md Rule 4)

`compiler/SPEC.md` §51.0.S (~line 25655–25932), the whole subsection. Load-bearing for you:
- **§51.0.S.2.3** — arm form `| .V(binding) :> body`; body is a bare target expr OR a block
  `{ effects; .Target }`; the final expression IS the target state (mirrors `match expr { .V :>
  value }` value-return). State-payload binding (`id` from `.Dragging(id)`, §51.0.B.1) AND
  message-payload binding (`col` from `.Drop(col)`, §18.7) are BOTH in arm-body scope.
- **§51.0.S.2.5** — dispatch rides `.advance` (NO `.send`). The three forms: `@x=.State`
  (quiet), `@x.advance(.State)` (loud direct), `@x.advance(.Msg)` (loud message dispatch).
- **§51.0.S.2.6** — a message dispatched to a state with NO arm for it is a runtime no-op.
- **§51.0.S.2.7** — `rule=` is still the contract: an arm's resolved target is validated against
  the from-state `rule=` exactly as a direct write (compile-time when from-state static, runtime
  otherwise) — reuse `E-ENGINE-INVALID-TRANSITION`. NO message-specific code.
- **§51.0.S.3** — THE machinery table (memorize it):
  - **the matched arm body ALWAYS runs** (effects are the message's purpose — runs even when
    resolved target == current state).
  - **state-change machinery fires iff resolved target ≠ current** (reuses §51.0.F.1):
    `<onTransition>` fire / history capture / `<onTimeout>` clear+rearm — all no-op on
    self-target.
  - **THE ONE DIVERGENCE:** `<onIdle>` watchdog **resets even on a same-state arm** (a handled
    message is activity, not silence) — where a self-WRITE does not. Specified at §51.0.R.
- **§51.0.G.1** — the `.advance` arg plane resolution (batch 2 wired the typer side; you wire the
  codegen/runtime dispatch for the resolved message plane).

---

# SCOPE — message dispatch codegen + runtime + arm-target rule=. ONE coupled unit.

## Runtime (`compiler/src/runtime-template.js`)

- The existing transition hook is `_scrml_engine_advance(varName, target, table, timersTable,
  idleEntry, internalTable, historyMap, isHistoryRestore)` (~line 3259) — it does
  check-transition + history + timer + idle for a STATE target. `_scrml_engine_direct_set` is
  the quiet form.
- Add the **message-dispatch path**: given a message variant + the current state, look up the
  current state's arm for that message in a per-state message-arm dispatch table, **run the arm
  body (effects), resolve the target, then transition** reusing the existing transition
  machinery — honoring §51.0.S.3 (arm body always runs; state-change machinery iff target ≠
  current; **onIdle resets even same-state**). A message with no arm in the current state = no-op
  (§51.0.S.2.6). Design decision (report it): extend `_scrml_engine_advance` with a message
  branch vs a sibling `_scrml_engine_dispatch_message` helper.

## Codegen (`compiler/src/codegen/emit-engine.ts` + `emit-expr.ts`)

- emit-engine.ts owns `emitEngineAdvanceCall` + the transition table const
  (`__scrml_engine_<var>_transitions`). **Emit a per-state message-arm dispatch table**
  (current-state → message-variant → an arm-body fn that runs effects and returns the resolved
  target). Mirror the existing transition-table emission shape + the timers/idle/internal-table
  siblings.
- **Add `messageArms` to the LOCAL `EngineStateChildEntry` interface at emit-engine.ts:123**
  (batch 1 deliberately left this mirror for you) + thread it from the SYM record.
- **Arm-body lowering:** mirror the **match block-form arm-body lowering in
  `compiler/src/codegen/emit-match.ts`** (`emitArmRenderFunction` + arm-body branches) — the
  arm body's effect statements lower as logic, the final expression is the target (the
  "value"). Both the state-payload binding (the `.Dragging(id)` → `id` in scope, §51.0.B.1) and
  the message-payload binding (the `.Drop(col)` → `col` in scope, §18.7) must be in the lowered
  arm body's scope.
- emit-expr.ts (~1087) already intercepts `@x.advance(.X)` → `emitEngineAdvanceCall`. Make it
  route a MESSAGE-plane variant to the message-dispatch path. **Design decision (report it):
  STAMP the plane at codegen** (msg variant ∈ `messageVariants` set → message plane; else state
  plane) **vs runtime-recompute from membership.** Recommend codegen-stamp (the plane is
  statically known post-batch-2; avoids runtime membership checks).

## Arm-target `rule=` validation (§51.0.S.2.7)

- Reuse `E-ENGINE-INVALID-TRANSITION`. Compile-time when the from-state + the arm's resolved
  target are both static (bare-target arm `| .V :> .Target`); runtime check otherwise
  (block-body arm whose final expr is computed). Batch 2 deliberately left this to you because it
  needs the arm body's RESOLVED target.

---

# OUT OF SCOPE — do NOT implement:

- **Markup-attribute `.advance` type-checking** (the `ondrop=@x.advance(.Drop(col))` bare-variant
  check) — a SEPARATE pre-existing follow-up (general markup-attr bare-variant gap, not
  #14-specific). The RUNTIME dispatch you wire WILL work from markup attributes; only the
  compile-time variant-typo check at that position is deferred. Do NOT chase it.
- Per-instance engines (`per=`), server-boundary transitions, the `event`-in-bare-handler
  micro-amendment (§51.0.S.7 deferred log).
- Native-walker message-arm recognition (M5-swap precondition — native walker still emits
  `messageArms: []`; your codegen runs on the LIVE pipeline).

---

# TESTS — codegen-string AND happy-dom runtime (the latter is non-negotiable)

- **happy-dom runtime canary** for the §51.0.S.6 worked example (DragPhase/DragMsg drag board):
  mount → fire a `.advance(.Start(id))` → assert the engine transitioned + the arm body's
  effect ran (`@tasks` mutated) → `.advance(.Drop(col))` from `.Dragging` → assert
  `taskMovedTo` ran + transitioned to `.Idle`. **emit-string-only tests mask runtime
  miscompiles** (S140/S152 trap) — the happy-dom canary is REQUIRED, not optional.
- Same-state arm: a `.Tick in .Playing { @score++; .Playing }` — assert the effect runs AND
  `<onIdle>` resets (the §51.0.S.3 divergence) AND `<onTransition>` does NOT fire.
- No-arm-for-message: dispatch a message to a state with no matching arm → no-op (no throw, no
  transition).
- Arm-target `rule=` violation → `E-ENGINE-INVALID-TRANSITION`.
- `node --check` the emitted JS (E-CODEGEN-INVALID-JS parse-gate is default-ON; confirm clean).
- Author the §51.0.S.6 worked example as a real `.scrml` fixture (copy spec verbatim — no
  invented syntax; you're editing TS/JS but the fixture is scrml).
- Run `bun run test` (chains pretest). within-node allowlist: codegen does not change FileAST →
  expect NO rebump; verify.

# R26 EMPIRICAL VERIFICATION — MANDATORY (S138; HIGH codegen)

No adopter `.scrml` uses `accepts=` yet, so the R26 reproducer is the §51.0.S.6 worked example
you author. Phase 3, AFTER the unit/happy-dom tests pass:

```
mkdir -p /tmp/r26-bug14-verify
bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile \
  "$WORKTREE_ROOT"/<path-to-your-§51.0.S.6-fixture>.scrml \
  --output-dir /tmp/r26-bug14-verify > /tmp/r26-bug14-verify/compile.log 2>&1
echo "exit: $?"
node --check /tmp/r26-bug14-verify/<emitted>.js && echo "node --check OK"
grep -c "_scrml_engine_advance\|_scrml_reactive_set" /tmp/r26-bug14-verify/<emitted>.js
```

Symptom checks: emitted JS contains the message-dispatch wiring (the per-state arm table + the
arm body's `_scrml_reactive_set` for `@tasks`); `.advance(.Drop(col))` emits a dispatch, not a
direct-set; `node --check` exit 0. **DO NOT mark DONE without empirical R26 verification
passing.** Record the R26 table in your report.

---

# FINAL REPORT (verbatim)

1. `WORKTREE_PATH` + `BRANCH`. 2. `FINAL_SHA` + `FILES_TOUCHED`.
3. Runtime: message-path design (extend `_scrml_engine_advance` vs sibling helper) + how
   §51.0.S.3 machinery is honored (esp. the onIdle-resets-even-same-state divergence).
4. Codegen: message-arm dispatch table shape; arm-body lowering approach (reused emit-match how);
   plane-stamping decision (codegen-stamp vs runtime-recompute).
5. Arm-target `rule=` validation: static vs runtime split.
6. Within-node allowlist: changed? (expect NO).
7. Test counts (`bun run test`): pass / fail / skip + the happy-dom canary names.
8. **R26 verification table** (compile exit, node --check, symptom greps) — REQUIRED.
9. Maps feedback line.
10. Remaining #14 follow-ups you observed (markup-attr type-check; anything else).

PA lands via S67 file-delta — leave work committed on your branch, clean `git status`. PA runs
its OWN independent R26 before flipping #14 to RESOLVED (S138 dual-verify).
