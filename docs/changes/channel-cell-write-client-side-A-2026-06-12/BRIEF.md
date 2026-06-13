# BRIEF — channel server-cell-read model fix, RULING A (keep client-held) — drop Trigger 7a + diagnose server-context channel-cell reads

change-id: `channel-cell-write-client-side-A-2026-06-12`
dispatched: S189 (2026-06-12) · agent: scrml-js-codegen-engineer · isolation: worktree
Closes: **`g-channel-publisher-server-cell-read` (HIGH)** + **`g-channel-onserver-cell-read` (MED)** — both, one arc (same root).

## THE RULING (user, S189): MODEL A — keep client-held; re-examine §12.2 Trigger 7a

The user ruled **A** on the channel server-side-cell-read model: channel state stays **client-held** (§38.4 — there is NO server-authoritative cell store), and a channel-cell WRITE must run **client-side** (the client has the cell → mutate locally → the existing `__sync` effect distributes to other subscribers). NOT a server-authoritative mirror (rejected option B). The ruling explicitly sanctions re-examining §12.2 **Trigger 7a** (the channel-cell-write escalation, S180).

## THE BUG BEING CLOSED (empirically confirmed at HEAD 0e234bae)

A channel publisher that read-modify-writes a channel cell — `function postMessage(a,b) { @messages = [...@messages, x] }` (PRIMER §9.1, the CANONICAL idiom; `15-channel-chat`; all 4 `23-trucking-dispatch/channels/*`) — escalates to a server fn (§12.2 **Trigger 7a**, channel-cell write) and lowers the `@messages` READ to `_scrml_body["messages"]`. But the client sends only the fn ARGS in the request body, never the channel cell (§38.4: no server store), so `_scrml_body["messages"]` is `undefined` server-side → `[...undefined, x]` throws `TypeError` at runtime on first publish. Compiles clean, `node --check` clean, NO diagnostic. (The onserver-handler variant — `g-channel-onserver-cell-read` — is the SAME root in the WS `message()` path, where `_scrml_body = {}`.)

## WHY A IS A NEAR-ZERO-MIGRATION FIX (the load-bearing precedent)

**The infrastructure already exists and is PROVEN.** Bug 2b (`channel-codegen-fixes-2026-06-12`) already keeps `onclient:*` handlers that write a channel cell **client-side** — see the comment at `compiler/src/codegen/emit-channel.ts:~525` and `route-inference.ts:~2595`: "§38.10 is explicit + normative and WINS over §12.2 Trigger 7: even when the handler body writes a channel cell, the write runs on the client and syncs via the normal `__sync` wire path." The client wiring is `syncShared` (`emit-channel.ts:~665`) fired by a reactive effect on every channel-cell write (`emit-channel.ts:~675`: `_scrml_effect(() => …syncShared(varN, _scrml_reactive_get(varN)))`). So a client-side channel-cell write ALREADY triggers `__sync`. **Under A, a regular publisher just does what onclient handlers already do.**

**Corpus impact = ZERO source migration.** Verified: ALL corpus channel publishers (`15-channel-chat` `postMessage`, `23-trucking-dispatch/channels/*` `publishX`) are PURE cell-write — NO actual `broadcast()`/`disconnect()` calls (the `broadcast(` greps are all COMMENTS describing the `__sync` lowering). So dropping Trigger 7a makes every corpus publisher client-side with no `.scrml` change.

## THE FIX — TWO PARTS (Rule 4: verify every spec claim against SPEC text)

### Part 1 — drop §12.2 Trigger 7a (channel-cell-write no longer escalates)

- **SPEC §12.2 Trigger 7** (line ~6979): amend — REMOVE sub-clause (a) "contains a source-level WRITE to a cell declared inside that channel's body." KEEP sub-clause (b) "calls `broadcast(...)` or `disconnect()`." Update the rationale: under the v0.3 client-held model (§38.4), a channel-cell write is a CLIENT-side sync-emitting operation (it fires `syncShared` → `__sync`), NOT a server-placement signal; only `broadcast()`/`disconnect()` (server hub ops, §38.6) are server-placement signals. Cross-ref §38.10 (the onclient precedent that already does this) + §38.4. Note this revises the S180 `server-keyword-eliminate` D2 Trigger-7a addition per the S189 ruling A.
- **`compiler/src/route-inference.ts` `detectChannelBroadcastReason`** (~line 1424): remove the channel-cell-WRITE reason; keep the `broadcast()`/`disconnect()` reason. After this, the Bug-2b onclient-skip-of-7a logic (~2595) is redundant for 7a (no 7a to skip) — reconcile/simplify it (onclient handlers are client-only per §38.10 regardless; keep that invariant). A pure-cell-write publisher now gets NO channel escalation reason → stays client → the client calls it locally + the `syncShared` effect distributes the write.
- **Verify** the publisher still emits client-side (a local `_scrml_reactive_set` + the `syncShared` effect on the cell), NOT a fetch stub / server fn. Mirror the onclient-handler emission shape.

### Part 2 — diagnose a channel-cell READ in SERVER context (generalizes the onserver (a) ruling)

After Part 1, a function still reaches the server only via Trigger 7b (`broadcast`/`disconnect`), SQL/Bun (other §12 triggers), or an `onserver:*` handler. In ANY such server-context channel function, READING a channel cell is invalid (no server store, §38.4) → emit a clean diagnostic instead of the silent `_scrml_body[cell]`-undefined crash.

- **New §34 code** (Rule 4 — pick the name + add the row; e.g. `E-CHANNEL-SERVER-CELL-READ`). Message: a server-side channel function (onserver handler / `broadcast`/`disconnect`/SQL-escalated) cannot READ a client-held channel cell (§38.4); operate on the message payload / fn args, or broadcast from them (§38.6.1). Fires for BOTH the onserver-handler case (`g-channel-onserver-cell-read`) and a server-escalated publisher that reads a channel cell.
- **Detection:** for a function that IS server-escalated (onserver set via `collectChannelAttrHandlerNames`, OR a Trigger-7b/SQL-escalated channel function), scan its body for a READ of a channel-declared cell (`collectChannelCellMap`). The route-inference channel section (~2519-2618) already has both the onserver set + the channel-cell map + the escalation reasons — the natural locus. Survey the cleanest placement (route-inference vs a type-system pass).
- **SPEC §38.4 / §38.6.1**: add the normative statement that a server-context channel function SHALL NOT read a channel cell (it has no server-side value); cross-ref the new code.
- **Do NOT fire** on a CLIENT-side function reading a channel cell (that's fine — the client has the cell), nor on the `__sync`/broadcast wire path itself.

## PHASE 3 — EMPIRICAL VERIFICATION (mandatory; HIGH-severity codegen — R26 required, S138)

1. Compile `examples/15-channel-chat.scrml` → `postMessage` emits CLIENT-side (local `_scrml_reactive_set("messages", …)` + `syncShared` effect), NO `_scrml_body["messages"]` server read, NO server fn / fetch stub for it. `node --check` clean. (Was: server `[..._scrml_body["messages"], …]` crash.)
2. Compile all 4 `examples/23-trucking-dispatch/channels/*.scrml` → each `publishX` client-side, no `_scrml_body[<cell>]` crash.
3. The onserver-read repro (`/tmp/df-channels/dispatch-board.scrml` `handleUpdate(msg){ @updates=[...@updates,msg] }`) → fires the new `E-CHANNEL-SERVER-CELL-READ` (was: silent `_scrml_body={}` + `[...undefined]`).
4. A broadcast-bearing publisher that ALSO reads a channel cell (construct one) → fires the new code (server-escalated by `broadcast()`, can't read the cell). A broadcast-bearing publisher that does NOT read a channel cell → still escalates (Trigger 7b), no false fire.
5. An onclient handler writing a channel cell → STILL client-side (Bug 2b invariant preserved).
6. Regression tests for all the above. Pre-commit subset green + the channel test suite green. **DO NOT mark DONE without R26 (steps 1-4) passing.**

## STARTUP + PATH DISCIPLINE (S99/S126 — IN FORCE)
`pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` (else STOP, S90). `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel` == it. `bun install` + `bun run pretest`. ALL edits via Bash (`perl`/`python3`/heredoc) on worktree-absolute paths with the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write. NEVER `cd` into main; use `git -C`/`bun --cwd`/absolute paths. First commit message includes verbatim `pwd`. Read `.claude/maps/primary.map.md` first (task shape = compiler-source bug fix + SPEC amendment; maps reflect 1ad740b4, current-truth for this code). NO `--no-verify` without explicit authorization (you do NOT have it).

## COMMIT DISCIPLINE (S83) + change-id
Commit per change (`git -C "$WORKTREE_ROOT"`); `git status` clean before DONE; code+coupled-test = one commit; SPEC amendment + its §34 row = one commit. Update `docs/changes/channel-cell-write-client-side-A-2026-06-12/progress.md` per step.

## REPORT BACK
WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, the SPEC §12.2 amendment text, the new §34 code + detection locus, the Phase-3 R26 results (per case: emission shape / diagnostic / node-check), test delta, any sub-fork you hit (e.g. broadcast-callable-from-client question — if it arises, STOP + report rather than deciding), the onclient Bug-2b invariant check, and the MAPS feedback line.
