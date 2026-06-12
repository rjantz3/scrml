# SCOPE — channel codegen fixes (Bug 1 reconnect-bare-int + Bug 2 handler-wiring)

**Change-id:** `channel-codegen-fixes-2026-06-12`
**Session:** S186. **Source:** S186 channels §38 dog-food (dispatch-board probe).
**Gaps closed:** `g-channel-reconnect-bare-int` (LOW) + `g-channel-handler-wiring` (MED). (SPEC-doc gap `g-channel-spec-38-9-stale` is bundled as the SPEC-side cleanup — see §4.)

---

## Bug 1 — `<channel reconnect=N>` / `<program channel-reconnect=N>` reject bare integer (LOW)

**Symptom.** `<channel reconnect=2000>` (the exact SPEC §38.2 / §38.6.2 / §38.10.3 worked-example form, typed "integer (ms)" §38.3) fails with `E-SCOPE-001` ("Unquoted identifier `2000` in attribute `reconnect`…"). `<program channel-reconnect=5000>` fails identically. Quoted works; absent works.

**Root.** `type-system.ts visitAttr` (`:10393`) fires E-SCOPE-001 when a bare attr value parses as `variable-ref` and the base name doesn't resolve. A bare `2000` parses as variable-ref `2000` → unresolvable → fires. Sibling structural numeric attrs avoid this because `<each>`/`<onTimeout>` consume their attrs in dedicated walkers, not generic `visitAttr`; `<channel>`/`<program>` attrs route through `visitAttr`. **Verified blast radius:** a bare numeric on a generic HTML attr (`<input value=42>`, `<progress max=100>`) ALSO fires E-SCOPE-001 today — so a blanket "skip pure-numeric literals" is OUT of scope (it'd change HTML-attr behavior). The targeted fix is exempting the two spec-typed integer attrs.

**Fix.** In `visitAttr`, exempt `reconnect` + `channel-reconnect` from the scope-check — mirror the existing `if (attr.name === "ref") return;` guard at `type-system.ts:10397`. (Consider a small named set if other integer-ms structural attrs join later.) `extractChannelAttrs` (`emit-channel.ts:269-276`) already `parseInt`s either a string-literal OR a `.name`-stripped value, so codegen tolerates both shapes once the TS pass stops rejecting bare.

**Verify.** `repro/v-bare.scrml` compiles clean (was: E-SCOPE-001); `reconnect="2000"` still compiles; the emitted client `onclose` setTimeout carries the bare value (`setTimeout(_connect, 2000)`). Bare numeric on a plain HTML attr (`value=42`) STILL errors (no over-relax).

---

## Bug 2 — channel event handlers (`onserver:*` / `onclient:*`) not wired from real source (MED)

**Symptom.** All six handler attrs (`onserver:open/message/close`, `onclient:open/close/error`) parse but never wire into the emitted WS handlers: `_ws.onopen = () => {}` (empty), server `message(ws,raw)` handles only `__sync`. The handler functions get route-inferred as ordinary HTTP RPC endpoints + client fetch stubs; the `onclient:*` ones leak SERVER code (§38.10 violation).

**Root (pinned).** The parser emits these attr values as `kind: "call-ref"` (`{name, args:[…], argExprNodes}`). `emit-channel.ts`'s `attrToCall` — in BOTH `extractChannelHandlers` (`:294-308`) and `extractClientHandlers` (`:323-337`) — only recognizes `kind: "call" | "variable-ref" | "string-literal"`, NOT `"call-ref"` → returns `null` → empty emission. Unit tests miss it: `channel.test.js` "attr is present" tests (`:273`) assert only `a.name`; emit tests (`:658`) feed a synthetic `makeCallAttr → {kind:"call"}` (stale shape), bypassing the parser. (S138 R26 canary.)

**Three parts:**

- **(2a) emit-channel `attrToCall` recognize `call-ref`** (both extractors): `{kind:"call-ref", name, args:[…]}` → `name(args.join(", "))`. This alone wires onserver:message → server `message()` (`JSON.parse(raw)` → `handler(msg)`, §38.6.1) and onclient:open/close/error → client `ws.on{open,close,error}`.
- **(2b) route-inference: keep channel handlers off the RPC/client-fetch path.** After (2a), RI still server-escalates the handler functions (channel-scope + cell-write Trigger 7) → emits HTTP RPC routes + client fetch stubs. **The load-bearing problem:** an `onclient:*` handler that writes a channel cell (e.g. `onClose() { @connStatus = "disconnected" }`) gets server-escalated, so the client IIFE's `ws.onclose = () => { onClose() }` would call a client FETCH-STUB (network round-trip) instead of running locally — violating §38.10 ("onclient:* run on the client only … SHALL NOT emit server-side code"; no server round-trip). **Normative-precedence call (read SPEC, do not guess):** for a function referenced by an `onclient:*` attr, §38.10 client-only is explicit + normative and should WIN over the Trigger-7 escalation — the handler stays a CLIENT function (its channel-cell write happens client-side then syncs via the normal client→server `__sync` path). For `onserver:*` handlers: they ARE server-side, but they are invoked via the WS message/lifecycle path, not HTTP — so the duplicate HTTP RPC route is dead and should be suppressed. **If the §38.10-vs-Trigger-7 precedence is genuinely ambiguous in the SPEC, STOP and report (Phase-0 STOP) — do not pick.**
- **(2c) close the test canary.** Update the `makeCallAttr` helper to produce `call-ref` (or add a real-source `parseSource → emit` test) so a future parser-shape drift is caught end-to-end, not masked.

**Verify (R26 MANDATORY — S138; codegen fix relying on AST construction).** `repro/m-handlers.scrml` (minimal, §38.6.1-shaped) + `repro/dispatch-board.scrml`:
- server `message(ws,raw)`: a non-`__sync` message routes `JSON.parse(raw)` → `<onserver:message-handler>(msg)`.
- client `ws.onopen`/`ws.onclose`: call the onclient handler body LOCALLY (no fetch-stub round-trip).
- onclient handler functions: NO server route, NO client fetch-stub.
- `node --check` passes on both emitted JS files.

---

## §4 — SPEC-doc cleanup (g-channel-spec-38-9-stale, LOW) — OPTIONAL bundle

If convenient in the same landing (else leave to a separate doc pass): §38.9 error-code table — retire the `E-CHANNEL-INSIDE-PROGRAM` row, add `E-CHANNEL-OUTSIDE-PROGRAM` + `E-CHANNEL-INSIDE-PAGE` (cross-ref §38.1/§38.4.1, the v0.3 reversal); §38.3.1 reconnect-form consistency (bare vs quoted) once Bug 1 lands. NOT required for the compiler fix to be correct.

---

## Out of scope
- General bare-numeric-on-HTML-attr policy (`<input value=42>` stays an error).
- The `:`-shorthand / display-text / each-promote lints that fire on the repros (informational; not channel bugs).
- Cross-file channel export/import (A8 deferred per §38.2).
