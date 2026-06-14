# SCOPE — bug-12-vkill read-side fire, POST-CE redux (the TS-stage relocation)

**Status:** scoping (S192, post-salvage `77c80fcf`). 3-thread workflow + PA dual-verify settled the architecture. Supersedes the "relocate post-CE / drop the Class-B scan?" open question in `g-readside-undeclared-postce`.

## The crux — RESOLVED (PA-verified)
The stage-2 prototype + S2 investigation believed cross-file channel cells "never materialize pre-codegen" (raw text), which is why the SYM-stage fire needed the bespoke Class-B channel-body scan. **That was a stale-scope artifact (S139 Bug 51), not a text problem.** PA probe on `pages/dispatch/board.scrml`: compiles **0 errors**; `boardEvents` wires as a **registered cell** — `_scrml_reactive_set("boardEvents")` ×5 + `_scrml_reactive_get("boardEvents")` ×9. The channel cell is a real structural `state-decl` that flows through CE inlining; `lookupStateCell` on CE's re-attached *pre-CE* `_scope` returns NULL (the artifact), but TS — which runs post-CE and rebuilds its own scope — resolves it. P2 + P3 independently confirmed via `runTS`/re-SYM over the post-CE AST; P1's contrary "extractSharedVars=[]/NULL" was the stale-scope read.

## The fire's home = TS (type-system.ts), NOT a new pass, NOT SYM, NOT codegen
Pipeline: MOD → NR → SYM → CE → post-CE validators → **TS** → CG. TS is the first stage after CE expansion AND already owns a complete `@name` resolution table. The fire is **one line lifted**: at `type-system.ts:6240`, replace the blanket `if (raw.startsWith("@")) return;` with a resolution attempt — strip `@`, `scopeChain.lookup(base)`; a `reactive` (or `variable` for markup-const) entry resolves it; a miss on BOTH sigil + bare-name lookup AND no import binding → fire `E-STATE-UNDECLARED`. (Mirror the existing bare-name E-SCOPE-001 base-strip at `type-system.ts:6271-6282`.)

**All 5 surfaces already resolve at TS (line-anchored, P2):**
| Surface | Resolved at TS by |
|---|---|
| (B) cross-file channel `@boardEvents` | `preBindReactiveStateCells` source-order hoist (10663-10683) + reactive double-bind (8928-8929) — descends into the inlined channel body |
| (5) `<each>`/`<tableFor>` `@row` | each-scope `as`-name bind (10180-10203) — TS runs post-CE so the loop local is in scope |
| (6) engine boot-`effect=` `@tasks`/`@ui` | machineRegistry pre-bind with §51.0.C canonicalization (10723-10733) — **solves the exact UI/ui mismatch that blocked the SYM prototype** |
| (7) `<state>`-block cell from sibling fn | `preBindReactiveStateCells` hoist into file scope (source-order-independent) |
| (8) markup-DERIVED cell `const <badge> = <markup>` (lowercase, `<>`-form) read via `${@badge}` | reactive double-bind (8928-8929) — the idiomatic markup-as-value read (Pillar 1) RESOLVES |

**Phase-0 correction (S192, agent a6ddcb97):** the original surface-8 line said "markup-const `@A`" and conflated TWO constructs. The idiomatic one — a **markup-derived cell** `const <badge> = <markup>` (lowercase, `<>` form, a reactive cell) — RESOLVES (`${@badge}` reads it). A **component-def** `const Name = <element props=>` (PascalCase, a parameterized component instantiated via `<Name/>`) is NOT a reactive cell — TS `case "component-def"` (9313) does not bind the name. Reading it via `${@ComponentName}` MISSES and CORRECTLY fires `E-STATE-UNDECLARED` — it is a misuse (0 corpus; PA-verified the bare `${ComponentName}` form ALREADY hard-errors `E-SCOPE-001` today; components instantiate via `<Name/>`). **User ruling S192: proceed — `${@ComponentName}` firing is correct + symmetric with the existing bare-path error.** A Phase-1 test should lock this (component-def `${@Name}` fires).

## SMALLER than the SYM prototype — what to drop vs port
- **DROP** (TS reaches the inlined channel decl directly): the Class-B `getCrossFileChannelCellNames` + `collectChannelCellNamesInFileAST` scan, the `fileASTMap` plumbing, the `ReadSideCtx` threading. The fire does NOT depend on `g-export-channel-body-text` (Option 2b) landing first.
- **PORT** from the stage-2 branch (`worktree-agent-af9b984e883af80a2` @ `22205aba`): the `E-STATE-UNDECLARED` message/code; the native-parser `.scrml` self-host exemption (if those mirrors traverse TS).
- **BUILD**: only the sigil→bare fallback lookup + the resolution wiring at 6240.
- **In-tree precedent:** the MC stage (api.js:1521-1529) already moved a check post-CE as a documented "SCOPE deviation; spec semantics unchanged" — same shape.

## Phase-0 VERIFY (the safeguard — de-risks the P1 dissent)
Before building the fire, the dispatch MUST empirically confirm TS's scopeChain resolves ALL 5 surfaces (sweep: the 4 trucking channels + `08-chat`/`15-channel-chat`; `<each>`/`<tableFor>` `@row`; engine boot-`effect=`; `<state>`-block sibling-fn read; component-def `@A`) — via `runTS` over post-CE ASTs. **STOP if any surface still false-fires** (that would mean P1 was right and the TS scope is incomplete for that surface — re-scope before proceeding). This is the lesson from stage 2: verify the resolution surface with the actual stage before wiring the fire.

## Dispatch shape (proposed)
1. Phase-0 verify (above) — STOP-gated.
2. Lift the `type-system.ts:6240` `@`-skip → resolve via scopeChain; fire `E-STATE-UNDECLARED` on a genuine miss; port the message + native-parser exemption.
3. R26: full-corpus TS-stage census → 0 false-positives (all 5 surfaces resolve); synthetic `${@typo}` fires (wired); trucking + the channel examples compile clean.
4. SPEC §34 read-side clause → "wired S192 at TS (post-CE)"; §6.1 read-side SHALL.
5. known-gaps: `bug-12-vkill` → resolved; `g-readside-undeclared-postce` → resolved (the relocation IS this fire). `g-export-channel-body-text` stays open (independent root-cleanliness; no longer a blocker).

## Open decision
**Dispatch the TS-stage read-side fire** (with the Phase-0 STOP-verify). It's smaller + cleaner than the failed SYM approach and closes `bug-12-vkill`. The P1 dissent is reconciled (stale-scope artifact) + de-risked (Phase-0 STOP).
