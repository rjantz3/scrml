# BRIEF — #14 event-payload-transition, TYPER batch (batch 2 of 3)

change-id: `s155-14-typer-advance-exhaustiveness`

You are implementing the **typer / SYM** batch of the #14 event-payload-transition primitive
(Approach E), landed normative in SPEC.md at S154. This is **batch 2 of 3**:

- Batch 1 (DONE, on main `6667b664`) — PARSER: `accepts=MsgType` capture +
  `(state × message)` arm recognition → AST. **You consume its output.**
- **Batch 2 (THIS dispatch) — TYPER/SYM:** resolve `accepts=`, check message-arm
  exhaustiveness, resolve `.advance(arg)` two-plane (state vs message), wire the 4 new §34
  codes + the deprecated-arrow lint. **DIAGNOSTICS + RESOLUTION ONLY — no codegen.**
- Batch 3 (NOT you) — codegen + runtime: message dispatch (arm → effect + transition),
  arm-target `rule=` validation wiring.

## What batch 1 produced (your input — already on main)

- `EngineDeclNode.acceptsType: string | null` (compiler/src/types/ast.ts) — the raw enum-type
  identifier from `accepts=MsgType`, or null.
- `EngineStateChildEntry.messageArms: MessageArmEntry[]` (compiler/src/symbol-table.ts ~764) —
  the parsed `(state × message)` arms. `MessageArmEntry` (symbol-table.ts ~481): `{ variantName,
  isWildcard, payloadBindingsRaw, payloadBindings: PayloadBinding[], armArrow: ":>"|"=>"|"->",
  bodyRaw, isBlockBody, spanStart, spanEnd }`.
- Arms are captured UNCONDITIONALLY by the parser (even with no `accepts=`) — firing the
  no-`accepts=` error is YOUR job.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full first. §"Task-Shape Routing" — this is a hybrid
**new-feature** (the 4 codes are new fire-sites) + **parser/grammar-adjacent typer** task:
`domain.map.md` (pipeline stages — you are in SYM / type-system, PASS 10.A + PASS 11) →
`structure.map.md` → `error.map.md` (the E-ENGINE-* / E-VARIANT-AMBIGUOUS / E-MATCH-NOT-
EXHAUSTIVE code families + conventions) → `schema.map.md` → `test.map.md`.

Map currency: maps reflect HEAD `c665714c`; main is now `6667b664` (batch 1 + scandir +
api-test-fix landed after the map). The map content for symbol-table.ts / type-system.ts is
current (no other post-map source change touched them besides batch 1, which you build on).

Feedback line required in your report (load-bearing finding or "not load-bearing").

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99/S126 leak-history: 15+ path-discipline leaks where worktree edits landed in MAIN. This
would be incident #16.** (Batch 1 did NOT leak — keep the streak.)

## Startup (BEFORE any other tool call)

1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If under any other repo, STOP + report (S90 CWD-routing). Save as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` == `WORKTREE_ROOT`.
3. `git status --short` clean. `git log --oneline -1` — base MUST be at/after `6667b664`
   (batch 1). If your base predates it, STOP (you'd be missing `acceptsType` / `messageArms`).
4. `bun install`. 5. `bun run pretest`.

## Edit + path discipline

- Apply ALL edits via Bash (`perl -0pi` / `python3` / heredoc) on **worktree-absolute paths
  including the `.claude/worktrees/agent-<id>/` segment**. Echo the path before each write;
  `git -C "$WORKTREE_ROOT" diff` after. NEVER `cd` into main; use `git -C` / `bun --cwd` /
  absolute paths only.
- First commit message MUST embed verbatim `pwd` (`WIP(s155-typer): start at <pwd>`).
- Commit per sub-unit; `git status` clean before DONE. Update
  `docs/changes/s155-14-typer-advance-exhaustiveness/progress.md` per step.

---

# THE CONTRACT — read these SPEC sections IN FULL (normative, pa.md Rule 4)

`compiler/SPEC.md`:

1. **§51.0.G.1** (`##### 51.0.G.1 .advance argument resolution`, ~line 24662–24701) — THE core
   algorithm. The normative 3-rule resolution (literal bare-variant → resolve against state
   enum `S` AND message enum `M`; qualified → named plane; non-literal → static single-plane or
   FORBIDDEN). Read every clause.
2. **§51.0.S.2.4** (~line 25770) — per-state message-arm exhaustiveness: a state declaring ANY
   message-arm MUST cover every `accepts=` variant OR carry `| _ :>`; a state with NO arms
   ignores messages (not a violation).
3. **§51.0.S.2.5 / .2.6 / .2.7** (~25787–25827) — `.advance` rides (no `.send`); quiet `@x=.V`
   is state-only; no-op when a no-arm state gets a message; `rule=` is still the transition
   contract (arm-target validation — **batch 3 wiring**, but read it for context).
4. **§51.0.S.4** (~line 25854) — the 4 new §34 codes + the 2 reuses. ALREADY in §34 (landed
   S154) — you wire their fire-sites, you do NOT add §34 rows.
5. **§14.10** (~line 7368+, the bare-variant inference section + its §51.0.G.1 cross-ref NOTE) —
   the existing single-position resolution you are NOT reusing for `.advance` (the NOTE says
   so explicitly); your two-candidate resolution is the §51.0.G.1 NEW rule.

---

# SCOPE — 4 new codes + `.advance` two-plane resolution + arrow lint. DIAGNOSTICS ONLY.

The 4 codes are ALREADY in §34/SPEC.md (S154). Wire their fire-sites:

## In `compiler/src/symbol-table.ts` (engine SYM)

- **`E-ENGINE-ACCEPTS-NOT-ENUM`** — resolve `EngineDeclNode.acceptsType` to a declared `:enum`
  type. Non-resolution (unknown type, or resolves to a non-enum) fires it. Home: `makeEngineRecord`
  (~line 5120) — where the engine record is built from the parser fields. Store the resolved
  message-enum's variant set on the engine record for the exhaustiveness check.
- **`E-ENGINE-MSG-WITHOUT-ACCEPTS`** — a state-child whose `messageArms` is non-empty while the
  engine's `acceptsType` is null/unresolved. Home: the PASS-11 state-child validator
  (`validateEngineStateChildrenAndRules` ~line 5854, the exhaustiveness step ~6086).
- **`E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE`** — a state that declares ANY message-arms but does not
  cover every message-enum variant AND has no `| _` wildcard arm (`isWildcard`). **Mirror the
  existing `E-MATCH-NOT-EXHAUSTIVE` / state-child exhaustiveness logic** in PASS 11 — same
  shape, different variant set (the `accepts=` enum's variants vs the arms' `variantName`s). A
  state with ZERO message-arms is NOT a violation (it ignores messages).
- **`W-MATCH-ARROW-LEGACY`** (info) — fire on any `MessageArmEntry.armArrow` that is `"=>"` or
  `"->"` (deprecated per S147). Mirror the existing match/`!{}`-handler arm-arrow lint. The
  `armArrow` field was recorded by batch 1 specifically for this.

## In `compiler/src/type-system.ts` (`.advance` resolution)

- **`.advance(arg)` two-plane resolution per §51.0.G.1** — when the receiver engine declares
  `accepts=M` (resolved enum), `.advance(arg)` resolves against BOTH the `for=` state enum `S`
  AND `M`:
  - literal bare-variant `.V`: in exactly one of {S, M} → that plane; in BOTH → `E-VARIANT-AMBIGUOUS`
    (reuse §14.10 code; require qualification); in NEITHER → **`E-ENGINE-MSG-UNKNOWN`**.
  - qualified `M.V` / `S.V` → that named plane directly.
  - non-literal expr (var/call): static type MUST be exactly one of S or M; a union `S|M` or
    statically-unresolvable type → **FORBIDDEN, `E-VARIANT-AMBIGUOUS`** (reuse). NO
    runtime-tag-dispatch.
  - engine with NO `accepts=` → resolve against `S` only — the pre-S154 §51.0.G behavior,
    UNCHANGED. Confirm your change is a no-op for accepts-less engines.
  - This extends the existing bare-variant inference (B20, §14.10, ~line 7323) + the existing
    `.advance` handling (~line 5752). Find both; the new two-candidate rule is §51.0.G.1, NOT a
    §14.10 generalization — keep §14.10's single-position mechanism intact.

**Reuses — do NOT mint new codes:** `E-VARIANT-AMBIGUOUS` (collision + union-arg);
`E-ENGINE-INVALID-TRANSITION` (illegal target — that's batch-3 wiring; do not add it here).

---

# OUT OF SCOPE — batch 3 (do NOT implement):

- Codegen / runtime message dispatch (`emit-engine.ts`, runtime-template, the arm → effect +
  transition lowering).
- Arm-target `rule=` validation (§51.0.S.2.7) — it needs the arm body's RESOLVED target, which
  is coupled with batch-3 codegen target resolution. Leave it to batch 3 (note in your report if
  you find a clean static-only subset, but do NOT wire it).
- Any new §34 row (all 4 codes already exist).
- `event`-in-bare-handler micro-amendment (§51.0.S.7 deferred).

If you find yourself touching `codegen/` or `runtime-template.js`, STOP — you've left batch 2.

---

# TESTS

- Typer-level tests per code: `E-ENGINE-ACCEPTS-NOT-ENUM` (fires on `accepts=NotAnEnum` /
  `accepts=SomeStruct`; does NOT fire on a valid `:enum`); `E-ENGINE-MSG-WITHOUT-ACCEPTS`
  (arms present, no `accepts=`); `E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE` (partial coverage, no
  wildcard; does NOT fire with `| _` or full coverage or zero arms); `E-ENGINE-MSG-UNKNOWN`
  (`.advance(.Bogus)`).
- `.advance` resolution tests: state-plane variant, message-plane variant, collision →
  E-VARIANT-AMBIGUOUS, qualified disambiguation, non-literal single-plane OK, union-typed arg →
  forbidden, accepts-less engine unchanged.
- `W-MATCH-ARROW-LEGACY` on a `| .V => body` message arm.
- Conformance tests for the §51.0.S.2.4 + §51.0.G.1 normative statements. Use the §51.0.S.6
  worked example (DragPhase/DragMsg) as a fixture; copy spec scrml verbatim (no invented
  syntax — you're editing TS).
- **Diagnostic-stream partition:** the 3 errors → `result.errors`; `W-MATCH-ARROW-LEGACY`
  (info) → `result.warnings`. Tests asserting on the W-code MUST use the cross-stream helper
  (see `test.map.md`) — `result.errors.filter(...)` silently passes for W-/I- codes.
- Run `bun run test` (chains pretest) for the full baseline. **Within-node allowlist:** typer
  diagnostics do NOT change the FileAST shape, so NO rebump should be needed — but VERIFY (if
  the within-node parity test newly fails, investigate; do not blindly rebump).

# GATES

- 0-regression: `bun run test` green (no expected allowlist change — confirm).
- `--no-verify` FORBIDDEN (commit + push).
- R26 empirical reproducer verify: **N/A for batch 2** (typer-only, no emitted JS). Batch 3
  (codegen) carries the mandatory R26 step (S138).

---

# FINAL REPORT (verbatim)

1. `WORKTREE_PATH` + `BRANCH`. 2. `FINAL_SHA` + `FILES_TOUCHED`.
3. Where each of the 4 codes fires (file:function) + how you mirrored the existing exhaustiveness
   / variant-inference logic.
4. The `.advance` two-plane resolution: where it hooks the existing `.advance` handling, and
   your confirmation that accepts-less engines are a no-op (unchanged §51.0.G).
5. `W-MATCH-ARROW-LEGACY` fire-site.
6. Within-node allowlist: changed? (expect NO — explain if yes).
7. Test counts (`bun run test`): pass / fail / skip.
8. Maps feedback line.
9. Batch-3 observations (what codegen will need from the resolved planes / arm targets; the
   arm-target `rule=` validation boundary).

PA lands via S67 file-delta — leave work committed on your branch, clean `git status`.
