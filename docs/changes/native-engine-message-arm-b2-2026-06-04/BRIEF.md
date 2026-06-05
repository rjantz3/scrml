# TASK — B2: native parser §51.0.S engine message-arm support (native-parser-swap parity-closer)

You are closing a native-parser flip-failure family. The strategic context: scrml is driving `--parser=scrml-native` to become the default front-end (then deleting the legacy block-splitter+Acorn at M6). The native parser must reach byte-identical output parity with the legacy (default) pipeline. Your job is ONE family: the §51.0.S engine **message-arm** + `accepts=` surface, which the native path currently does NOT handle. This is a parity-closer, NOT a feature design — the feature (event-payload-transition, #14) already shipped on the LIVE pipeline (S154/S155). You are mirroring it into the native path.

change-id: `native-engine-message-arm-b2-2026-06-04`

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~190 lines). The
§"Task-Shape Routing" → **"parser / grammar fix — NATIVE-PARSER swap-grind"** row tells you which
additional maps to consult; follow it (`domain.map.md` "Native-Parser Swap Orientation", `structure.map.md`
"Native-Parser File Table" + "Key S163 Source Changes"). The maps were refreshed THIS session and flag B2
as THE NEXT DISPATCH with the locus.

Map currency: maps reflect HEAD `154a1799` as of 2026-06-04. They are fresh — your worktree branches from
this commit. NOTE: one anchor was corrected after the maps were written — the native→live walker lives at
`compiler/src/native-walker/engine-statechild-walker.ts` (under `src/`, NOT `native-parser/`). The brief
below carries the VERIFIED anchors; trust the brief over any map path that disagrees.

Feedback: in your final report, include either "Maps consulted: [list]; load-bearing finding: <one sentence>"
or "Maps consulted but not load-bearing".

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

S99/S126 leak-history: this project has had 16+ path-discipline leaks where agent edits landed in MAIN
instead of the worktree. This would be the next incident — do not be it.

Your worktree path is assigned by the harness (isolation: "worktree"). Verify it.

## Startup verification (do this BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If it is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing
   failure). Save the output as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" merge origin/main` (S112 — inherit this session's landings; should be a no-op /
   already-current since your base is HEAD `154a1799`). Resolve any conflict or report.
4. `git -C "$WORKTREE_ROOT" status --short` — confirm clean.
5. `cd "$WORKTREE_ROOT" && bun install` (worktrees do NOT inherit node_modules; pre-commit `bun test` fails
   with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` for browser tests; gitignored, empty in a
   fresh worktree → ~130 ECONNREFUSED failures without it).

If ANY check fails: STOP and report. Do not proceed.

## Path discipline (enforce on EVERY edit)
- **Apply ALL file edits via Bash** (`perl -i` / `python` / heredoc) on **worktree-absolute paths that include
  the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools (S126 interim mitigation: the
  Edit/Write tools have leaked to MAIN while the agent's git view saw the worktree). Echo the target path
  before each write; re-verify via `git -C "$WORKTREE_ROOT" diff` after.
- **NEVER `cd` into the main repo** (or anywhere outside WORKTREE_ROOT). Use `bun --cwd "$WORKTREE_ROOT"`,
  `git -C "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd` into main leaks installs/edits
  (S126 incidents #14/#15).
- Reading from MAIN's absolute path gives you STALE source (main may be ahead). Read under WORKTREE_ROOT.
- Exception — the maps (`.claude/maps/`) are PA-maintained navigation, identical everywhere; reading them
  from your worktree copy is correct (they were committed at your base).

# COMMIT DISCIPLINE (S83 two-sided — load-bearing)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <file>` to verify; `git -C "$WORKTREE_ROOT" add <file>`;
  commit IMMEDIATELY. Don't batch — commit per sub-step. WIP commits expected (crash-recovery).
- Your FIRST commit message MUST include the verbatim `pwd` output from startup, e.g.
  `WIP(b2): start at <pwd-output>` (S99 echo-pwd discipline — PA verifies it starts with the worktree prefix).
- Before reporting DONE: `git -C "$WORKTREE_ROOT" status` MUST be clean (everything committed). "Work in
  worktree, no commits" is NOT an acceptable terminal report.
- **NEVER use `--no-verify`** on commit or push without explicit authorization. The pre-commit hook
  (`bun test` unit+integration+conformance subset) is the gate. If it fails, FIX the cause — do not bypass.
  (This is a recurring agent reflex; it is forbidden.)
- Write `docs/changes/native-engine-message-arm-b2-2026-06-04/progress.md` and append a timestamped line after
  each step (what was done / what's next / blockers). Append-only.

# THE TASK — verified anchors

## What's broken
The native parser does NOT recognize the §51.0.S engine message surface that the LIVE pipeline supports:
1. **`(state × message)` message arms** — `compiler/src/native-walker/engine-statechild-walker.ts:516`,
   inside `buildEngineStateChildEntry`, hard-codes `messageArms: []` (a self-documented shape-parity
   placeholder: *"When M5 wires native arm walking, this placeholder becomes the real recognition call."*).
2. **`accepts=MsgType` opener attr** — the native engine-decl does NOT capture `acceptsType` (it stays
   `undefined`; live sets it to the enum-type identifier or `null`).

Result: flip-failures `E-ENGINE-ACCEPTS-NOT-ENUM` (×4), `E-ENGINE-MSG-UNKNOWN` (×3), and the
engine-message-dispatch conformance + browser tests fail under `--parser=scrml-native`.

## The LIVE pattern to mirror (these already work; you are copying their behavior into the native path)
- **`compiler/src/engine-statechild-parser.ts`**: `parseMessageArms(bodyRaw): { arms: MessageArmEntry[];
  renderBodyStart: number }` (defined @1824). The live state-child parser calls it @2334
  (`parseMessageArms(bodyRaw).arms`). **It is PARSER-AGNOSTIC — it operates on the state-child `bodyRaw`
  string.** Your native walker should be able to call the SAME function.
- **`compiler/src/ast-builder.js:12622`** captures `acceptsType = acceptsMatch ? acceptsMatch[1] : null` from
  the engine opener and stamps it @12749 onto the engine-decl. Native must capture the same.
- **The native↔live fork** is `compiler/src/symbol-table.ts:6010-6015`: native engines (carrying
  `_nativeEngineBlock`) go through `walkEngineStateChildren` (which stubs messageArms); live engines go
  through `parseEngineStateChildren` (which populates them). Downstream — the typer message-arm exhaustiveness
  pass (S155) + codegen `emit-engine.ts` `_scrml_engine_dispatch_message` (S155) — consume `messageArms` +
  `acceptsType` PARSER-AGNOSTICALLY. So once native populates the same fields with the same shape, downstream
  runs unchanged (the M5-swap pipeline-agnostic contract).

## PHASE 0 — survey first (then decide)
Before editing, confirm:
1. Does `buildEngineStateChildEntry` (engine-statechild-walker.ts) have access to the state-child **body text**
   it would pass to `parseMessageArms`? (Find what `bodyRaw`/body field the entry carries; the live entry has
   `bodyRaw`.) Confirm calling `parseMessageArms(<that body>).arms` is the correct mirror of
   engine-statechild-parser.ts:2334.
2. Where does the native parser parse the `<engine>` **opener attributes**? Find where to capture
   `accepts=MsgType` → set `acceptsType` on the native engine-decl so it flows to the same field the live
   path sets (trace from ast-builder.js:12622/12749 + how symbol-table reads `acceptsType` off the engine-decl).
3. Does the typer's message-arm exhaustiveness check (S155, `E-ENGINE-MSG-ARM-NOT-EXHAUSTIVE` /
   `E-ENGINE-MSG-UNKNOWN`) read `acceptsType` + `messageArms` off fields you'll now populate, or does it need
   anything else native-specific? Confirm the native engine-decl will carry everything the check needs.

**Decision gate:** if Phase 0 confirms this is a clean mirror (call shared `parseMessageArms` from the walker
+ capture `accepts=` into `acceptsType`) with NO design fork and the native architecture matches this brief —
**proceed to implement + verify in this same dispatch.** If you hit a genuine design fork OR the native
architecture differs materially from this brief (e.g. the walker can't reach the body text, or `acceptsType`
needs a new field threaded through multiple native stages) — **STOP and report your findings + proposed plan;
do not implement.** (Survey-STOP gate, S158/S163.) Record the Phase-0 findings in progress.md either way.

## Implementation (if the gate says proceed)
- Replace the `messageArms: []` stub with the real `parseMessageArms(...).arms` call (import it from
  engine-statechild-parser.ts if not already available in the walker).
- Capture `accepts=MsgType` in the native engine-opener parse → `acceptsType` on the native engine-decl,
  mirroring ast-builder.js. Match live's null-when-absent (NOT undefined).
- Preserve the `EngineStateChildEntry` shape EXACTLY (the walker is shape-bound to the live entry — the
  within-node parity test deep-equals against the legacy parser).
- Keep changes minimal + localized. Do NOT touch the typer or codegen unless Phase 0 proves a real gap there
  (they're parser-agnostic — they should "just work" once native populates the fields).
- The `.scrml` self-host mirrors of native-parser files are FEATURE-stale (S162) — fix the `.js`/`.ts` only;
  do NOT block on or edit the `.scrml` mirrors.

## TESTS
- Add/extend unit coverage for native message-arm recognition (mirror the existing
  `compiler/tests/unit/engine-message-arms.test.js` / `engine-message-dispatch-*-s155.test.js` shape, but for
  the native path). A behavior fix WITHOUT a test is the blind-spot trap.
- Run the pre-commit subset (`bun test compiler/tests/unit compiler/tests/integration
  compiler/tests/conformance`) — MUST stay 0-fail (the hook enforces it).

## PHASE 3 — R26 EMPIRICAL VERIFICATION (MANDATORY — byte-compare EMIT, not error-absence)
This is a native-parser parity fix. Per the S163 methodology bank: a parity survey MUST byte-compare native
vs default EMITTED OUTPUT — checking "no fatal error" is the S139 trap (a file can compile clean and silently
miscompile). Run, on the fixture `compiler/tests/fixtures/engine-message-dispatch-s6.scrml`:

```
mkdir -p /tmp/r26-b2/{default,native}
bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/compiler/tests/fixtures/engine-message-dispatch-s6.scrml --output-dir /tmp/r26-b2/default              > /tmp/r26-b2/default.log 2>&1
bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/compiler/tests/fixtures/engine-message-dispatch-s6.scrml --output-dir /tmp/r26-b2/native --parser=scrml-native > /tmp/r26-b2/native.log 2>&1
# Byte-compare the emitted JS (ignore the I-PARSER-NATIVE-SHADOW routing-confirmation line in logs):
diff -r /tmp/r26-b2/default /tmp/r26-b2/native
node --check /tmp/r26-b2/native/*.client.js 2>&1 | head   # emitted JS must parse
```
PASS = the emitted artifacts are BYTE-IDENTICAL native==default (modulo the documented I-PARSER-NATIVE-SHADOW
info line), `node --check` exit 0, and `_scrml_engine_dispatch_message` + the per-state `_msg_arms` table are
PRESENT in the native emit (grep for them). Record the diff result + greps in progress.md. **DO NOT mark DONE
without R26 byte-identical passing.** If R26 still shows drift after your fix, the gap is structural — report
it (do not claim closed).

(Verify the `.scrml` fixture actually exercises `accepts=` + `(state × message)` arms; if it's too thin to
prove the fix, note that + point me at a richer fixture or add one.)

# FINAL REPORT — return (not a human message; this is data)
- WORKTREE_PATH, FINAL_SHA, BRANCH, FILES_TOUCHED (list)
- Phase-0 findings + the gate decision (proceeded / STOPped-and-why)
- What changed (the messageArms call + the accepts= capture; exact files/functions/lines)
- Test delta (+N tests; pre-commit subset pass/fail count)
- R26 result: byte-diff outcome + node --check + the dispatch-helper greps (verbatim)
- Any deferred items / residual drift
- Maps feedback line
