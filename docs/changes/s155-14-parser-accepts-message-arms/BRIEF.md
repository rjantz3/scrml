# BRIEF — #14 event-payload-transition, PARSER batch (batch 1 of 3)

change-id: `s155-14-parser-accepts-message-arms`

You are implementing the **parser-recognition** batch of the #14 event-payload-transition
primitive (Approach E), landed normative in SPEC.md at S154. This is **batch 1 of 3**:

- **Batch 1 (THIS dispatch) — PARSER:** recognize the `accepts=MsgType` engine-opener
  attribute + the `(state × message)` arms inside engine state-child bodies, and attach them
  to the AST. **RECOGNITION → AST ONLY.**
- Batch 2 (NOT you) — typer/SYM: `.advance` two-plane resolution, exhaustiveness, the 4 new
  §34 codes.
- Batch 3 (NOT you) — codegen + runtime: message dispatch.

Staying strictly inside batch 1's scope is the single most important thing about this
dispatch. See "OUT OF SCOPE" below — it is load-bearing, not boilerplate.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context (SPEC sections / source files), read
`.claude/maps/primary.map.md` in full (~127 lines). The §"Task-Shape Routing" → **"parser /
grammar fix"** row routes you: `domain.map.md` (BS/TAB stage + engine-arm-parsing row + the
native-parser M5-swap precondition) → `structure.map.md` (engine-statechild-parser.ts) →
`error.map.md` → `test.map.md` (parser-conformance within-node allowlist). Follow that order.

Map currency: maps reflect HEAD `c665714c` as of 2026-06-02. Since then, main advanced to
`096951c4`. The only post-map source change relevant to nothing-you-touch is `api.js` (scandir
fix). The post-map SPEC.md change at `ce78f9d8` IS your contract — read SPEC.md fresh (below).
No post-map commit touched `engine-statechild-parser.ts` / `match-statechild-parser.ts` /
`symbol-table.ts`, so the map content is current for your files.

Feedback: in your final report, include either "Maps consulted: [list]; load-bearing finding:
<one sentence>" or "Maps consulted but not load-bearing".

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99/S126 leak-history: this project has had 15+ path-discipline leaks where a worktree
dispatch's edits silently landed in MAIN. This would be incident #16. Do not be #16.**

Your worktree path is whatever `pwd` reports at startup. Derive it; do NOT assume.

## Startup verification (BEFORE any other tool call)

1. `pwd` via Bash. Output MUST start with
   `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any other
   repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90
   CWD-routing failure. Save the output as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git status --short` — confirm clean.
4. `git merge main` (or `git rebase main`) is NOT needed — the harness branches from current
   main. But run `git log --oneline -1` and confirm your base is at or after `096951c4`. If
   your base predates the S154 SPEC landing `ce78f9d8`, STOP and report (you'd be missing
   §51.0.S).
5. `bun install` (worktrees do NOT inherit node_modules; the pre-commit hook's `bun test` fails
   with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests).

If ANY check fails: DO NOT proceed. Report and exit.

## Path + edit discipline (EVERY edit)

- **Apply ALL file edits via Bash** (`perl -0pi`, `python3`, heredoc) on **worktree-absolute
  paths that include the `.claude/worktrees/agent-<id>/` segment**. Do NOT use any editor tool
  that could resolve against main. Echo the target path before each write; re-verify with
  `git -C "$WORKTREE_ROOT" diff` + `grep` after.
- **NEVER `cd` into the main repo** (or anywhere). Use `git -C "$WORKTREE_ROOT" …`,
  `bun --cwd "$WORKTREE_ROOT" …`, and worktree-absolute paths exclusively. A `cd` into main
  leaks `bun add` / compile / edits into main (S126 incidents #14/#15).
- If any context references `/home/bryan-maclee/scrmlMaster/scrmlTS/foo` (main), translate to
  `$WORKTREE_ROOT/foo` before writing.

## Commit discipline (S83/S99 — two-sided rule)

- Commit after EACH meaningful edit. Don't batch. WIP commits expected.
- Your **first commit message MUST include the verbatim `pwd` output** from startup, e.g.
  `WIP(s155-parser): start at /home/.../​.claude/worktrees/agent-XXXX`. (PA verifies the
  recorded pwd is a worktree path on landing — mismatch = leak.)
- Before reporting DONE: `git status` MUST be clean. "work in worktree, no commits" is NOT an
  acceptable terminal report.
- Update `docs/changes/s155-14-parser-accepts-message-arms/progress.md` (append-only,
  timestamped) after each step. If you crash, your commits + progress.md are how the next agent
  picks up.

---

# THE CONTRACT — read these SPEC sections IN FULL before writing code

`compiler/SPEC.md` is normative (pa.md Rule 4). Read these against the actual text, not this
brief's paraphrase:

1. **§51.0.S** (`#### 51.0.S Event-payload transitions / engine message dispatch`, ~line
   25655–25932). The whole subsection. Especially:
   - §51.0.S.2.2 — `accepts=MsgType` is an engine-OPENER attribute (joins `for=`/`initial=`/
     `var=`/`derived=`/`effect=`, §51.0.B). Value is an enum-type identifier.
   - §51.0.S.2.3 — the `(state × message)` arm form `| .Variant(binding) :> body` **reuses the
     §18.0.1 match block-form arm grammar verbatim**; payload binding per §18.7/§51.0.B.1;
     arm-body block shape `{ stmts; expr }` per §18.2. Arm body is either a bare target
     expression (`.Dragging(id)`) or a block (`{ effects; .Target }`).
   - §51.0.S.6 — the end-to-end worked example (your primary parser test fixture).
2. **§51.0.B** opener-attribute table (~line 24064–24090) — the `accepts=MsgType` row + the
   `<engine for=… accepts=MsgType>` opener grammar line (~24065).
3. **§51.0.I** (~line 24829) — the three existing state-child body forms (self-close / bare
   body / `:`-shorthand). Your new arm-recognition coexists with these; a state-child body may
   have BOTH `(state × message)` arms AND a render body (see "Design decision to make" below).
4. Skim **§18.0.1 / §18.2 / §18.7** — the match block-form arm grammar + arm-body shape +
   payload binding you are reusing. The implementation already lives in
   `compiler/src/match-statechild-parser.ts` → `parseMatchArms(armsRaw): MatchParseResult`
   (line 95). **Reuse / mirror this** — do not reinvent arm parsing.

The impl-contract drafts (background context, NOT a substitute for SPEC.md):
`scrml-support/archive/spec-drafts/event-payload-transition-primitive-S154-DRAFT.md` (rev2) +
its `-REVIEW.md`.

---

# SCOPE — exactly two surfaces, RECOGNITION → AST only

## Surface A — `accepts=MsgType` engine-opener attribute

- Locate where the **engine opener's** attributes (`for=`, `initial=`, `derived=`, `var=`,
  `effect=`) are read. Grep for the `initial=`/`derived=` opener-capture site (likely
  `symbol-table.ts` engine analysis and/or wherever the `<engine …>` opener is parsed — find
  it; don't assume). Capture `accepts=`'s value (the bare enum-type identifier, e.g. `DragMsg`)
  as a raw string onto the engine's AST/entry representation (suggest field `acceptsType:
  string | null`, default `null`).
- **Parser captures the identifier ONLY.** Whether it resolves to a declared `:enum`
  (E-ENGINE-ACCEPTS-NOT-ENUM) is BATCH 2 (typer). Do NOT add that check.

## Surface B — `(state × message)` arms in engine state-child bodies

- In `compiler/src/engine-statechild-parser.ts` (2148 lines; produces `EngineStateChildEntry`
  objects, interface at `symbol-table.ts:596`), teach the state-child body parser to recognize
  leading `| .Variant(binding) :> body` arms and collect them.
- **Mirror / reuse `match-statechild-parser.ts` `parseMatchArms`** for the arm grammar (pattern
  + payload binding + arm-body block/bare-expr + the `:>`/`=>`/`->` arm-arrow per S147). Call it
  on the arm region if cleanly reusable; otherwise mirror its logic.
- Add a field to `EngineStateChildEntry` (symbol-table.ts:596) to hold the parsed arms (suggest
  `messageArms: <parsed-arm-shape>[]`, default `[]`). Use the same arm shape `parseMatchArms`
  returns so batch 2/3 consume one representation. **Do NOT touch the local
  `EngineStateChildEntry` interface in `codegen/emit-engine.ts:123`** — that mirror is batch
  3's concern.
- The parser captures arms unconditionally (even if the engine has no `accepts=`); the
  arms-without-`accepts=` error (E-ENGINE-MSG-WITHOUT-ACCEPTS) is BATCH 2 (typer).

## Design decision you MUST make + report (don't silently pick)

A state-child body may need BOTH message-arms AND a render body (e.g. `<Playing rule=.Paused>`
that reacts to `.Tick` AND renders game UI — implied by §51.0.S.3's `.Tick in .Playing`
example). Decide how the body parser separates the `|`-arm region from the render body
(`bodyRaw` / `:`-shorthand / self-close). **Recommended:** leading contiguous `|`-arms form the
message-dispatch table; everything after the last arm is the existing render body. This mirrors
match-grammar and is simplest to parse unambiguously (a leading `| .V :>` at statement position
in a code-default body is unambiguously an arm). Implement that unless you find a SPEC reason
otherwise; **state the exact rule you implemented in your final report** for PA review.

---

# OUT OF SCOPE — do NOT implement (batches 2/3). Listing so you don't drift:

- The 4 new §34 codes — `E-ENGINE-ACCEPTS-NOT-ENUM`, `E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE`,
  `E-ENGINE-MSG-UNKNOWN`, `E-ENGINE-MSG-WITHOUT-ACCEPTS`. **Batch 2 (typer).** They are already
  in §34/SPEC.md; do NOT wire their fire-sites.
- `.advance(arg)` state-plane-vs-message-plane resolution (§51.0.G.1). **Batch 2.**
- Per-state message-arm exhaustiveness checking. **Batch 2.**
- Codegen / runtime message dispatch, `emit-engine.ts`, runtime-template. **Batch 3.**
- Type resolution of `accepts=`. **Batch 2.**

If you find yourself adding an error code or a type-check, STOP — you've left batch 1.

---

# TESTS

- Parser-level tests asserting the AST/`EngineStateChildEntry` shape: `acceptsType` captured
  from `<engine … accepts=DragMsg>`; `messageArms` collected with correct patterns + payload
  bindings + arm-body shapes; arms-with-render-body coexistence; arms-without-`accepts=` still
  PARSE (no error at parse layer). Use the §51.0.S.6 worked example as the primary fixture.
- Any `.scrml` test input you author MUST be canonical per §51.0.S (copy the spec worked
  examples; do not invent syntax — this project has a documented "ghost-pattern" reflex toward
  React/JSX shapes; you are editing TS, so just mirror the SPEC's scrml verbatim).
- A parser-shape change may require a **within-node parser-conformance allowlist rebump**
  (see `test.map.md`). The pre-commit hook EXCLUDES the within-node parity test; the full
  `bun run test` includes it. Run `bun run test` (chains pretest) for your baseline, not bare
  `bun test`. If the within-node parity test newly fails because the live pipeline now parses
  arms the native parser doesn't, that is EXPECTED (native parser is shadow / M5-incomplete) —
  rebump the allowlist per the existing convention and note it in your report; do NOT try to
  make the native parser recognize arms (that is the M5-swap precondition, a separate arc).

# GATES

- 0-regression invariant: `bun run test` full suite must be green except an explained
  within-node-allowlist rebump.
- `--no-verify` is FORBIDDEN (commit and push). The pre-commit hook is the gate.

---

# FINAL REPORT (return these verbatim)

1. `WORKTREE_PATH` (your `pwd`) and `BRANCH`.
2. `FINAL_SHA` and `FILES_TOUCHED` (list).
3. The exact arm/render body-separation rule you implemented (the design decision above).
4. The `EngineStateChildEntry` field name + shape you added, and the `acceptsType` field
   location/name.
5. Whether you reused `parseMatchArms` directly or mirrored it, and why.
6. Within-node allowlist: rebumped? (yes/no + why).
7. Test counts (`bun run test`): pass / fail / skip.
8. Maps feedback line (see MAPS block).
9. Any deferred-to-batch-2/3 observations (things you noticed the typer/codegen will need).

PA lands via S67 file-delta (reviews `git diff main..<branch>` for the FILES_TOUCHED, pulls
those paths, single PA-authored commit) — so leave your work committed on your branch with a
clean `git status`.
