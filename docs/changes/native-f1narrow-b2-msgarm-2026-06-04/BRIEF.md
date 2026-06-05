# TASK — F1-narrow + B2: native parser §51.0.S engine message-arm end-to-end (native-parser-swap parity-closer)

scrml is driving `--parser=scrml-native` to become the default front-end (deleting the legacy BS+Acorn at M6). The native parser must reach BYTE-IDENTICAL output parity with the legacy (default) pipeline. You are closing ONE family end-to-end: the §51.0.S engine **message-arm** (`accepts=` + `(state × message)` arms). The feature already shipped on the LIVE pipeline (S154/S155, #14) — you are mirroring it into the native path. This is a parity-closer, not feature design.

change-id: `native-f1narrow-b2-msgarm-2026-06-04`

**This dispatch supersedes a prior B2-only survey dispatch that survey-STOPped.** That survey VERIFIED the two B2 halves are clean mirrors but found B2 cannot pass R26 alone — it's gated upstream by a native parse misclassification (F1-narrow). This brief carries those verified findings; you build on them. Don't re-survey what's marked VERIFIED — confirm-and-go.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full. Follow §"Task-Shape Routing" → "parser / grammar fix — NATIVE-PARSER swap-grind" (→ `domain.map.md` "Native-Parser Swap Orientation", `structure.map.md` "Native-Parser File Table" + "Key S163 Source Changes").
Map currency: HEAD `154a1799`, 2026-06-04 (fresh; your worktree branches from it). **Correction to the maps:** they say "F1 CLOSED (S163)" — that was the F1 *engine-substrate* sub-issue (machineDecls). The F1 *arm-body code-default classification* sub-issue (THIS task's F1-narrow blocker) is STILL OPEN. Trust this brief over the maps where they disagree; the brief's anchors are PA-verified against current source.
Report a maps feedback line (load-bearing finding, or "not load-bearing").

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
S99/S126 leak-history: 16+ path-discipline leaks where agent edits landed in MAIN. Do not be #17.
Worktree path is harness-assigned. BEFORE any other tool call:
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP+report (S90). Save as WORKTREE_ROOT.
2. `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git -C "$WORKTREE_ROOT" merge origin/main` (S112; should be no-op at base `154a1799`).
4. `git -C "$WORKTREE_ROOT" status --short` clean.
5. `cd "$WORKTREE_ROOT" && bun install` (worktrees don't inherit node_modules).
6. `bun run pretest` (populates samples/compilation-tests/dist/; gitignored, empty in fresh worktree).
If ANY check fails: STOP+report.

## Path discipline (EVERY edit)
- Apply ALL edits via **Bash** (`perl -i` / `python` / heredoc) on **worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment** — NOT Edit/Write tools (S126: those have leaked to MAIN). Echo the path before each write; `git -C "$WORKTREE_ROOT" diff` after.
- **NEVER `cd` into the main repo** or anywhere outside WORKTREE_ROOT. Use `bun --cwd "$WORKTREE_ROOT"`, `git -C "$WORKTREE_ROOT"`, worktree-absolute paths.
- Read source under WORKTREE_ROOT (main may be ahead). Maps (`.claude/maps/`) read from your worktree copy is fine (committed at base).

# COMMIT DISCIPLINE (S83 two-sided)
- After EVERY edit: `git -C "$WORKTREE_ROOT" diff <f>`; `add`; commit IMMEDIATELY. Per sub-step, not batched. WIP commits expected.
- FIRST commit message includes the verbatim startup `pwd`: `WIP(f1narrow-b2): start at <pwd>`.
- Before DONE: `git -C "$WORKTREE_ROOT" status` clean (all committed).
- **NEVER `--no-verify`** without authorization. Pre-commit hook (`bun test` unit+integration+conformance) is the gate; if it fails, FIX the cause. (Recurring agent reflex — forbidden.)
- Write `docs/changes/native-f1narrow-b2-msgarm-2026-06-04/progress.md`, append-only, timestamped, after each step.

# THE TASK

## The fixture this must close (the R26 gate)
`compiler/tests/fixtures/engine-message-dispatch-s6.scrml` — an `<engine for=DragPhase initial=.Idle accepts=DragMsg>` whose state-children carry `(state × message)` arms like `| .Start(id) :> .Dragging(id)` / `| .Drop(col) :> { @tasks = ...; .Idle }` / `| _ :> @dragPhase`. **Default compiles it CLEAN (exit 0) with the full `_scrml_engine_dispatch_message` + `_msg_arms` dispatch table (4 hits). Native (today) exits 1 with 2× spurious `E-UNQUOTED-DISPLAY-TEXT` on the arm lines AND silently miscompiles** (emits a byte-different `.client.js` lacking the dispatch table; 2231 B native vs 3470 B default). PA verified both.

## Part 1 — F1-narrow (the blocker; native parse misclassification) — parse-markup.js
**VERIFIED root cause (prior survey + PA reproduction):** native's code-default-body scanner (`parse-markup.js`, functions `emitCodeDefaultRun` / `scanCodeDefaultRunExtent`) scans the leading-`|` message-arm region of an engine state-child body as a generic code-default CODE run. The M2 expression parser rejects the leading-`|` arm syntax as prose → fatal `E-UNQUOTED-DISPLAY-TEXT` (§4.18.7), BEFORE the native→live walker (where Part 2 lives) ever runs. So the arm body never reaches the walker.

**The fix (narrow):** in the native engine-state-child code-default body, recognize the **leading-`|` message-arm region** and consume it as a known construct WITHOUT firing E-UNQUOTED — leaving that region as raw `bodyRaw` for the walker's `parseMessageArms` (Part 2) to parse. The recognition shape to mirror is LIVE `parseMessageArms` (`engine-statechild-parser.ts:1824`): *"the leading contiguous `|`-run; if the first non-trivia char is not `|`, there are no message arms and the whole body is render body"* (its `skipTrivia` + leading-`|` detection up to `renderBodyStart`). A render body AFTER the arm region (if any) keeps normal code-default treatment — bare display text THERE still correctly fires E-UNQUOTED per the S163 §4.18 ruling. The fixture's state-children are arm-ONLY (no render body), so recognizing the arm region fully unblocks it.

**Phase-0 (Part 1 only — confirm the injection point):**
- Read `emitCodeDefaultRun` / `scanCodeDefaultRunExtent` in `compiler/native-parser/parse-markup.js`. Determine: at the scan point, is the parser CONTEXT-AWARE that it's inside an engine state-child body (so the F1-narrow recognition is SCOPED to engine state-children — do NOT globally permit leading-`|` everywhere; message-arms are legal only in engine/match state-child bodies)? If the context is available, scope the recognition to it. If not, find the nearest enclosing signal (e.g. the state-child body-mode dispatch) and scope there.
- Confirm how the legacy (default) pipeline avoids this (it defers the whole state-child body to `parseEngineStateChildren`→`parseMessageArms` rather than running the display-text classifier on the arm region) — your native fix achieves the same deferral.
- **STOP+report only if** the context isn't available at the scan point AND threading it is a multi-stage native change (a genuine architecture fork). Otherwise (a localized scoped recognition) — proceed.

## Part 2 — B2 walker wiring (VERIFIED clean mirrors — confirm-and-implement, no re-survey)
The prior survey VERIFIED both halves against real source; implement them:
1. **messageArms** — `compiler/src/native-walker/engine-statechild-walker.ts:516`, inside `buildEngineStateChildEntry`, hard-codes `messageArms: []`. The walker's `readBodyRaw()` (engine-statechild-walker.ts:287) already returns the full arm text as `bodyRaw`. Replace the stub with `(isColonShorthand || isSelfClose) ? [] : parseMessageArms(<bodyRaw>).arms` — the exact mirror of live `engine-statechild-parser.ts:2332-2334`. Import `parseMessageArms` from `engine-statechild-parser.ts`. (Confirm the colon-shorthand/self-close guard matches the live call site.)
2. **accepts=** — the native engine-decl carries `acceptsType === undefined` (live: enum-ident or `null`). `synthEngineDecl` (`compiler/native-parser/collect-hoisted.js`, ~line 392) never sets it. Add `acceptsType: readAttrName(attrs, "accepts")` (the bare-ident-or-null capture, mirroring live `ast-builder.js:12622`). Confirm `readAttrName` returns null-when-absent (NOT undefined) to match live.
- Downstream typer (message-arm exhaustiveness, S155) + codegen (`emit-engine.ts` `_scrml_engine_dispatch_message`, S155) are PARSER-AGNOSTIC — they consume `messageArms` + `acceptsType` off the engine-decl. Do NOT touch them unless R26 proves a real gap there.

## Constraints
- Keep changes minimal + localized (parse-markup.js arm-region recognition + the two walker/collect-hoisted wirings). Preserve `EngineStateChildEntry` shape EXACTLY (within-node parity deep-equals against the legacy parser).
- `.scrml` self-host mirrors are FEATURE-stale (S162) — fix the `.js`/`.ts` only; do not edit/block on the `.scrml`.

## TESTS
- Add native-path coverage: a parser-conformance/unit test that native recognizes the message-arm region (no spurious E-UNQUOTED) + populates `messageArms` + `acceptsType` (mirror `compiler/tests/unit/engine-message-arms.test.js` / `engine-message-dispatch-*-s155.test.js` shapes for the native path).
- Pre-commit subset (`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`) MUST stay 0-fail.
- **Within-node parity** (`bun test` on the within-node/parser-conformance parity test — it's EXCLUDED from the pre-commit subset): native now populates `messageArms`/`acceptsType` where it emitted `[]`/undefined, so native↔live entries converge (improvement). Run it; if it shifts, rebump ONLY residual benign SPAN-COORD allowlist entries (S163 precedent) and FLAG any non-benign deep-equal mismatch in your report — do NOT mask a real divergence with an allowlist bump.

## PHASE 3 — R26 EMPIRICAL VERIFICATION (MANDATORY — byte-compare EMIT, not error-absence)
Per the S163 methodology bank: byte-compare native vs default EMITTED OUTPUT (error-absence is the S139 trap). On `engine-message-dispatch-s6.scrml`:
```
mkdir -p /tmp/r26-f1b2/{default,native}
bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/compiler/tests/fixtures/engine-message-dispatch-s6.scrml --output-dir /tmp/r26-f1b2/default              > /tmp/r26-f1b2/default.log 2>&1
bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile "$WORKTREE_ROOT"/compiler/tests/fixtures/engine-message-dispatch-s6.scrml --output-dir /tmp/r26-f1b2/native --parser=scrml-native > /tmp/r26-f1b2/native.log 2>&1
diff -r /tmp/r26-f1b2/default /tmp/r26-f1b2/native
grep -c '_scrml_engine_dispatch_message\|_msg_arms' /tmp/r26-f1b2/native/*.client.js
node --check /tmp/r26-f1b2/native/*.client.js && echo "native JS parses"
grep -c 'E-UNQUOTED' /tmp/r26-f1b2/native.log
```
PASS = byte-identical native==default (modulo the documented `I-PARSER-NATIVE-SHADOW` info line), native dispatch-table count == default's, `node --check` exit 0, zero E-UNQUOTED on native. Record verbatim in progress.md. **DO NOT mark DONE without R26 byte-identical passing.** If R26 still shows drift, the gap is structural — report it, do NOT claim closed.

# FINAL REPORT (data, not prose)
- WORKTREE_PATH, FINAL_SHA, BRANCH, FILES_TOUCHED
- Phase-0 (Part 1) finding + whether you proceeded or STOPped (and why)
- What changed: F1-narrow injection (file/fn/line) + the two B2 wirings (file/fn/line)
- Test delta (+N tests; pre-commit subset count; within-node parity result + any allowlist rebump w/ justification)
- R26 result verbatim (diff outcome, dispatch-table grep counts default vs native, node --check, E-UNQUOTED count)
- Deferred/residual (broader F1 prose-render-body recognition, each-in-arm .advance — out of scope here)
- Maps feedback line
