# Channel codegen fixes — Bug 1 (reconnect bare-int) + Bug 2 (handler wiring) — change-id `channel-codegen-fixes-2026-06-12`

> **S136 archival of the verbatim dispatch prompt** (agent `a06f1df4c51155e5e`, scrml-js-codegen-engineer, isolation:worktree, S186). The reproducer scrml is inlined in the brief because the staged `repro/` files were uncommitted in main's working tree at dispatch time (worktree branches from the session-start commit and would not see them).

---

You are fixing two compiler bugs in scrml's `<channel>` (§38) codegen, surfaced by an S186 dog-food pass. Read the SPEC sections directly (pa.md Rule 4 — SPEC is normative); do not trust paraphrase.

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). The §"Task-Shape Routing" section tells you which additional maps to consult for a compiler-source bug fix — follow that routing.

Map currency: maps reflect HEAD `a4726dd3` as of 2026-06-12. There are ZERO compiler-source commits after that point (the only later commit is a docs/maps wrap commit), so the maps are current for source work — but still verify any fire site via grep/Read against current source.

Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one sentence>" or "Maps consulted but not load-bearing — [which map you expected to help]".

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99/S126 leak history: this dispatch class has had 15+ path-discipline leaks. Do not be the next one.**

Your worktree path is assigned by the harness. Determine it FIRST and use it everywhere.

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing failure). Save it as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — confirm clean.
4. `git merge main` (your base may trail current main; merge it — there should be no conflicts since main HEAD only adds docs).
5. `bun install` (worktrees don't inherit node_modules; the pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
6. `bun run pretest` (populates `samples/compilation-tests/dist/` for the browser-test suite).

## Path discipline (EVERY edit)
- **Apply ALL file edits via Bash** (`perl -0pi`/`python3`/heredoc) on WORKTREE_ROOT-ABSOLUTE paths that include the `.claude/worktrees/agent-<id>/` segment — NOT the Edit/Write tools (S126 interim mitigation; Edit/Write have leaked to MAIN while git saw the worktree). Echo the target path before each write; `git diff`/`grep` to re-verify after.
- **NEVER `cd` into the main repo** (or anywhere) from the worktree. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively. A `cd` into main leaks `bun add`/compile/edits to MAIN (S126 incidents #14/#15).
- Your FIRST commit message MUST include the verbatim `pwd` output: `WIP(channel-codegen): start at $(pwd)`.

# COMMIT DISCIPLINE
After EVERY edit: `git diff <file>` to verify; `git add`; commit IMMEDIATELY (per sub-fix, don't batch). WIP commits expected. Update `docs/changes/channel-codegen-fixes-2026-06-12/progress.md` after each step (append-only, timestamped). Before reporting DONE: `git status` MUST be clean (commit everything). "work in worktree, no commits" is NOT an acceptable terminal report.

---

# THE TASK

## Phase 0 — survey (mandatory; report before building Part 2b)
Read, in the worktree source:
- SPEC §38 in full-enough: §38.1 (placement), §38.4 (reactive sync), §38.6 + §38.6.1 (broadcast + onserver:message binding), §38.10 (onclient:* client-only), §38.9 (error codes), §12.2 (server-escalation triggers, esp. Trigger 7 channel-cell-write).
- `compiler/src/codegen/emit-channel.ts` — `extractChannelHandlers` (~:290-308), `extractClientHandlers` (~:319-337), the `attrToCall` helper in each, and the server `message()` / client `ws.on*` emission (~:491-560, ~:640-690).
- `compiler/src/type-system.ts` `visitAttr` (~:10393-10460) — the E-SCOPE-001 fire site + the `if (attr.name === "ref") return;` skip at ~:10397.
- `compiler/src/route-inference.ts` — channel handling (imports `collectChannelFunctionMap`/`collectChannelCellMap` from emit-channel; Trigger-7 channel-cell-write escalation ~:1375-1450; how channel-body functions become server RPC routes).
- `compiler/tests/unit/channel.test.js` — `makeCallAttr` (~:103), the "attr is present" tests (~:273), the "emits onopen=" test (~:658), the §22 onclient tests.

Confirm the parsed value-kind: a `<channel onserver:message=h(m) onclient:open=oc()>` from real source produces attr values of `kind: "call-ref"` (with `name`, `args:[…]`, `argExprNodes`). You can verify with a throwaway Bash bun snippet using `splitBlocks` + `buildAST`.

**If Phase 0 surfaces a genuine SPEC ambiguity on the §38.10-vs-Trigger-7 precedence (Part 2b below), STOP and report — do NOT pick a side.**

## Bug 1 (LOW) — `<channel reconnect=N>` / `<program channel-reconnect=N>` reject bare integer
**Repro** (write to `/tmp/ch-repro/v-bare.scrml` in your worktree env):
```
<program>
  <channel name="chat" topic="lobby" reconnect=2000>
    <messages> = []
    function postMessage(body) { @messages = [...@messages, body] }
  </>
  <ul>${ for (let m of @messages) { lift <li>${m}</li> } }</ul>
</program>
```
Today this fails: `E-SCOPE-001: Unquoted identifier `2000` in attribute `reconnect`…`. `reconnect="2000"` (quoted) compiles. The bare form is the SPEC §38.2/§38.6.2 canonical worked-example shape (typed "integer (ms)" §38.3).

**Root:** `type-system.ts visitAttr` scope-checks a bare `2000` as an unresolvable `variable-ref`. `<each of=>`/`<onTimeout after=>` avoid it (dedicated walkers); `<channel>`/`<program>` route through `visitAttr`. **Verified:** a bare numeric on a generic HTML attr (`<input value=42>`) ALSO errors today — so do NOT do a blanket "skip pure-numeric" (it'd change HTML-attr behavior).

**Fix:** exempt `reconnect` + `channel-reconnect` from `visitAttr`'s scope-check, mirroring the `if (attr.name === "ref") return;` guard. Keep it targeted to these two spec-typed integer-ms attrs.

**Verify:** `v-bare.scrml` compiles clean; emitted client `onclose` carries `setTimeout(_connect, 2000)`; `reconnect="2000"` still clean; `<input value=42>` STILL errors (no over-relax).

## Bug 2 (MED) — channel event handlers (`onserver:*` / `onclient:*`) not wired from real source
**Repro** (`/tmp/ch-repro/m-handlers.scrml`):
```
<program>
  <channel name="chat" topic="lobby" onserver:message=handleMessage(msg) onclient:open=onOpen() onclient:close=onClose()>
    <log> = []
    ${
      function handleMessage(msg) { @log = [...@log, msg] }
      function onOpen() { @log = [...@log, "open"] }
      function onClose() { @log = [...@log, "close"] }
    }
  </>
  <ul>${ for (let l of @log) { lift <li>${l}</li> } }</ul>
</program>
```
Today: emitted `_ws.onopen = () => {}` (empty), `_ws.onclose = () => { setTimeout(...) }` (reconnect only), server `message(ws,raw)` handles only `__sync`. The handler functions get route-inferred as HTTP RPC endpoints + client fetch stubs; onclient ones leak server code (§38.10 violation).

**Root (pinned):** parser emits these attr values as `kind:"call-ref"`, but `emit-channel.ts attrToCall` (in BOTH `extractChannelHandlers` and `extractClientHandlers`) only handles `kind: "call"|"variable-ref"|"string-literal"` → returns null → empty emission. The unit tests miss it because they feed a synthetic `makeCallAttr → {kind:"call"}` (S138 R26 canary).

**Three parts:**
- **(2a)** `attrToCall` (both extractors) recognize `kind:"call-ref"` → `name(args.join(", "))`. This wires onserver:message → server `message()` (`JSON.parse(raw)` → `handler(msg)` per §38.6.1) and onclient:open/close/error → client `ws.on{open,close,error}`.
- **(2b)** route-inference: keep channel handlers off the RPC/client-fetch path. **Load-bearing, not cleanup:** an `onclient:*` handler that writes a channel cell (`onClose() { @log = … }`) gets server-escalated (Trigger 7), so after (2a) the client `ws.onclose = () => { onClose() }` would call a client FETCH-STUB (network round-trip) instead of running locally — violating §38.10 ("onclient:* run on the client only; SHALL NOT emit server-side code; no server round-trip"). §38.10 is explicit + normative and should WIN over Trigger-7 for onclient-referenced functions — they stay CLIENT functions (their channel-cell write happens client-side then syncs via the normal `__sync` path). For onserver:* handlers: they're server-side but invoked via the WS message/lifecycle path, so the duplicate HTTP RPC route is dead — suppress it. **If the §38.10-vs-Trigger-7 precedence is genuinely ambiguous in the SPEC, STOP and report.**
- **(2c)** close the test canary: update `makeCallAttr` to emit `call-ref` (or add a real-source `parseSource → emit` assertion) so future parser-shape drift is caught end-to-end.

**Verify Bug 2 (R26 MANDATORY — S138 doctrine; codegen fix relying on AST construction). DO NOT mark DONE without R26 passing.** Re-compile `m-handlers.scrml` + the larger board (below) on the post-fix baseline and confirm:
- server `message(ws,raw)`: a non-`__sync` message routes `JSON.parse(raw)` → `handleMessage(msg)`.
- client `ws.onopen`/`ws.onclose`: call the onclient handler body LOCALLY (no fetch-stub).
- onclient handler functions: NO server route, NO client fetch-stub.
- `node --check` exit 0 on both emitted JS files.

Larger board repro (`/tmp/ch-repro/board.scrml`) — exercises reconnect (Bug 1) + onserver:message + onclient:open/close (Bug 2) together:
```
<program title="Live Dispatch Board">
  <channel name="dispatch" topic="lobby" reconnect=3000 onserver:message=handleUpdate(msg) onclient:open=onConnected() onclient:close=onDisconnected()>
    <updates> = []
    <connStatus> = "connecting"
    function postUpdate(driver, status) { @updates = [...@updates, { driver, status }]; broadcast({ type: "update", driver }) }
    function handleUpdate(msg) { @updates = [...@updates, msg] }
    function onConnected() { @connStatus = "connected" }
    function onDisconnected() { @connStatus = "disconnected" }
  </>
  ${ <driverName> = "" }
  <p>Status: ${@connStatus}</p>
  <ul>${ for (let u of @updates) { lift <li>${u.driver}</li> } }</ul>
  <form onsubmit=postUpdate(@driverName, "x")><input bind:value=@driverName/><button type="submit">Post</button></form>
</program>
```

## Tests + full suite
- Add/adjust unit tests for both bugs (Bug 1: `reconnect`/`channel-reconnect` bare-int accepted; Bug 2: real-source `onserver:message`/`onclient:*` → wired emission, the (2c) canary).
- Pre-commit gate (`bun test` unit+integration+conformance) MUST pass. Run the full `bun run test` before final report (channel tests live in unit; browser/lsp also run).
- ZERO regressions. If a previously-passing test LOCKED the buggy behavior (e.g. asserted onclient handlers get a route), surface it explicitly — that's a coupled test fix, note it.

## Out of scope
- General bare-numeric-on-HTML-attr policy (`<input value=42>` stays an error).
- Cross-file channel export/import (A8 deferred).
- The SPEC §38.9 doc-table staleness (a separate doc gap; PA handles).
- The informational lints (`W-EACH-PROMOTABLE`, `W-PROGRAM-REDUNDANT-LOGIC`, SPA-inferred) on the repros — not channel bugs.

# FINAL REPORT (return as your final message — it IS the data, not a human note)
- WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED (list), test deltas (pass/fail/skip).
- Phase-0 survey result: confirmed call-ref kind? §38.10-vs-Trigger-7 precedence — resolved-as-X or STOPPED-ambiguous?
- Bug 1: fixed? exemption mechanism.
- Bug 2: parts 2a/2b/2c each done? R26 results (the 4 checks above, verbatim greps).
- Any coupled/locked-test fixes.
- Maps feedback line.
- Deferred items.
