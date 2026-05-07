---
from: master
to: scrmlTS
date: 2026-05-07
subject: hierarchy in engines is "likely locked" per user; tree-shake clarification rehabilitates several Class B items
needs: action
status: unread
---

# Origin

Master PA spent a long-context conversation with the user on 2026-05-07 that started as a peer-language survey for state-as-first-class and pivoted into a capability-gap audit of three suspected scrml weaknesses: engine hierarchy/parallel/history/internal-vs-external transitions, state-level timeouts, and effects-as-data / effect mockability. Three scrml-deep-dive agents ran in parallel against `compiler/SPEC.md`, `stdlib/`, examples, and the prior debate corpus.

All three agents hit the repo-write-scope rule and could not write into `scrml-support/docs/deep-dives/`. Findings live in the master PA conversation only; if you want them persisted as design artifacts, the user can authorize per-task and master PA can write them out.

# User direction signals from this session

## 1. Hierarchy in engines is "likely locked"

User verbatim: *"send a message that this is 'likely locked' on adding hierarchy."*

Context: the audit confirmed REAL GAP on hierarchical (composite) states, history states, and internal-vs-external transitions. Parallel regions are PARTIALLY ADDRESSED by the §51.4 multi-engine pattern (`examples/14-mario-state-machine.scrml` is the precedent: `MarioMachine for=MarioState` + `HealthMachine for=HealthRisk derived=@marioState` coexisting in one file).

Strongest evidence the gap is real:
- SPEC.md:21482 (§51.9.7) explicitly defers parallel regions: *"Cross-machine projection. Projecting from two independent sources simultaneously is the classical 'parallel region' problem; out of scope for this revision."*
- `dd6-engine-state-children-2026-05-03.md:1086` names a future *DD-Harel* deep-dive (full Harel statecharts: hierarchy lifecycle, history states, parallel regions, transition routing). Never opened.
- Locks L1-L22 contain zero hierarchy-related lock.
- Test cases with no clean idiomatic answer today: `Loading.WithCache`/`Loading.NoCache` with parent-level common transition; tab UI with history (per-tab last-active sub-state on re-entry).

Cost-lens classification (post-tree-shake clarification, see #2):
- Hierarchical states: Class A (codegen desugar to flat machine).
- Internal-vs-external transitions: Class A (grammar distinction at codegen).
- History states: Class A (one generated reactive cell per history-bearing parent).
- Parallel-regions ergonomic sugar: Class A (sugar over existing multi-engine).

Master PA recommendation: **open DD-Harel as the natural home for the design.** Suggested debate participants per the audit: `xstate-expert`, `scxml-expert`, `halogen-expert`, `erlang-genstatem-expert`, `simplicity-defender-expert`, plus `scrml-dev-react` + `scrml-dev-svelte` for friction-felt signal. `debate-curator` can pull descriptions from `~/.claude/agentStore/` (the experts are not in loaded `~/.claude/agents/`).

## 2. Tree-shakeable runtime cost is acceptable

User verbatim: *"I didn't mean throw them out, scrml's runtime will auto-tree-shake so if it is a shakeable runtime cost, it's probably ok."*

This re-rates several items master PA had previously flagged as "heavy evidence required" (Class B). The new rule:

- **If the runtime cost only ships when the user's app uses the feature → Class B-but-OK.**
- **If the runtime cost instruments globally / wraps every call site / cannot be shaken → still genuine Class B; heavy evidence remains required.**

Reclassified items from the timeout audit:

| Item | Old | New | Reason |
|---|---|---|---|
| Event-timeout (no-event-for-N-ms watchdog) | B (heavy evidence) | **B-shakeable, OK** | Per-machine last-event-timestamp tracker only loads when an engine declares an event-timeout |
| Named multi-timer-per-state (gen_statem `{timeout, T, Name, Content}`) | B (heavy evidence) | **B-shakeable, OK** | `Map<Name,Handle>` only loads when an engine declares named multi-timers |

Reclassified items from the effects-as-data audit:

| Item | Old | New | Reason |
|---|---|---|---|
| Effects-as-data general effect log (beyond `audit @log` for transitions) | B | **Still genuine B** | Instrumentation at every effect site is not naturally shakeable; the cost is global |
| Coeffect capture (wrapping `Date.now`/`Math.random`/`crypto.randomUUID`/`performance.now`) | B | **Still genuine B** | Global call-site replacement; not shakeable |
| Test-mockability via compile-time test-mode rebinding | A-ish | **A** | Zero production runtime cost; compile-time-only |

## 3. Effects-as-data middle path is open (distinct from rejected Koka shape)

The audit confirmed a REAL GAP on effects-as-data, BUT the corpus has already weighed and rejected the maximalist closure. Insight 21 (`design-insights.md:694`) scored Koka algebraic effects 60/130 (last of 5) at full-fidelity adversarial debate. Verdict line 718: *"Q1 (fate of `fn`): MINIMIZE. ... do not grow an effect row."* Flip condition #1 (line 808) is enterprise-workflow complexity; not yet triggered.

The audit identifies an **un-debated middle path**: re-frame-style records + registered interpreters scoped narrowly to test-mockability, distinct from the Koka shape. Test Case 1 ("test engine reaches `.Success` given synthetic HTTP, no real network") has no clean idiomatic answer today. OQ-8 from `inline-testing-perfection-2026-04-08.md:151` remains open.

Critical existing constraints:
- §34 E-TEST-004 forbids `~{}` test blocks from referencing outer-scope variables (line 14205). Blocks the natural mock-injection workaround.
- Server functions compile to direct fetch by encoded name (§47); no test-mode swap point. Reference: `examples/dist/07-admin-dashboard.client.js:35`.
- `scrml:test` (`stdlib/test/index.scrml`, 202 lines, fully read) ships zero mocking primitives. The aspirational `mock`/`spy`/`fixture` from `stdlib-design-2026-03-30.md:391` were dropped before ratification.

Master PA recommendation: **open a narrow effects-as-data middle-path deep-dive** scoped explicitly to "test-mockability for engine-bearing apps, distinct from the Koka effect-row shape rejected at Insight 21." Closes OQ-8.

## 4. State-timeout surface migration is engineering, not design

Original master PA critique (timeouts as a missing feature) was substantially overstated. §51.12 temporal transitions exist as a first-class primitive on the deprecated `<machine>` block-form, with full compiler awareness:

- SPEC §51.12 lines 21674-21805 (full normative spec)
- Codegen: `compiler/src/codegen/emit-machines.ts:478-714`
- Runtime: `compiler/src/runtime-template.js:66-146` (`_scrml_machine_arm_timer`, `_scrml_machine_arm_initial`, `_scrml_machine_clear_timer`)
- Type-system: `compiler/src/type-system.ts:1267,2510,2654` (E-ENGINE-021)
- Reset-on-reentry semantics match XState `after`; SPEC explicitly cites XState/SCXML/gen_statem as prior art at line 21678.

The actionable gap is **surface migration**: bring `.Loading after 30s => .TimedOut` style temporal rules forward from `<machine>` `=>` arrow grammar to `<engine>` per-state-child `rule=` attribute. PA primer §7 line 199 informally extends `rule=` to `"event -> Variant"`, but no SPEC text or sample documents `rule="after 30s -> TimedOut"`. The runtime infrastructure is already there; this is grammar + lowering work.

Plus: relax the literal-only constraint on `delay`/`interval`/`after Ns` to allow computed expressions. The runtime function `_scrml_machine_arm_timer(name, ms, ...)` already takes `ms` as a runtime argument; the constraint is at parse/lower time. Lifting it closes the WebSocket-backoff case and is pure type-checker / lowering work.

Master PA recommendation: **dispatch as direct compiler engineering work, no debate needed.** Class A throughout.

# Action items recommended

| # | Item | Class | Type |
|---|---|---|---|
| A | Open DD-Harel deep-dive (hierarchy + history + internal/external + parallel-regions sugar) | A throughout | Debate, then design, then engineering |
| B | Open effects-as-data middle-path deep-dive (test-mockability, narrow) | A (compile-time test-mode rebinding) | Debate, then design |
| C | Surface migration of §51.12 temporal rules from `<machine>` to `<engine>` `rule=` form, plus computed-delay relaxation | A | Direct engineering, no debate |
| D | (deferred) Event-timeout + named multi-timer-per-state | B-shakeable, OK if pursued | Could ride alongside C as a follow-on, or skip |
| E | (rejected on minimality) General effect log beyond `audit @log` | B-not-shakeable | Decline unless flip condition #1 triggers |
| F | (rejected on minimality) Coeffect capture by wrapping (`Date.now`, `Math.random`, etc.) | B-not-shakeable | Decline; existing strategy of `fn` denial via E-FN-004 stands |

# References (for re-running or re-reading audits)

The three audit findings live in the master PA conversation transcript dated 2026-05-07 only. They are NOT persisted to disk. Key citations from each:

**Hierarchy audit:**
- SPEC §51.0.A-B lines 20061-20097 (flat enum + flat state-children)
- SPEC §51.4 lines 21038-21086 (multi-engine pattern)
- SPEC §51.9.7 line 21482 (parallel-regions deferral)
- SPEC §54 lines 23965-24264 (substates are TYPE-domain, not engine-domain — hierarchy red herring)
- `examples/14-mario-state-machine.scrml` lines 104, 115 (multi-engine reference)
- `dd6-engine-state-children-2026-05-03.md:846-887, 1086` (DD-Harel naming)

**State-timeout audit:**
- SPEC §6.7.5/6.7.6/6.7.8 (`<timer>`, `<poll>`, `<timeout>` state-types)
- SPEC §51.12 lines 21674-21805 (temporal transitions, `<machine>` only)
- SPEC §51.0.F lines 20220-20269 (engine `rule=` accepts only variants — gap surface)
- E-ENGINE-021 lines 21772-21781 (wildcard from rejected; rules out event-timeout)
- `runtime-template.js:142-144` (first-match-wins arming; rules out named multi-timer without code change)
- `design-insights.md:540, 550` (temporal rules queued, not ratified for v0.next)

**Effects-as-data audit:**
- SPEC §4.15 line 995 (effects are "effect statements")
- SPEC §51.0.H lines 20298-20347 (`effect=` is logic-context expression, executes)
- SPEC §34 E-TEST-004 line 14205 (`~{}` cannot ref outer scope)
- SPEC §48.3 lines 18217-18324 (E-FN-004 coeffect denial list)
- SPEC §51.11 lines 21486-21585 (`audit @log` is transition-only)
- `stdlib/test/index.scrml` 1-202 (no mocking primitives)
- `inline-testing-perfection-2026-04-08.md:151` (OQ-8 explicit deferral)
- `design-insights.md:694-820` (Insight 21: Koka rejected, Q1 = MINIMIZE)
- `debate-fn-S32/koka-effects-argument.md` (the rejected argument)

# Tags
#design-direction #hierarchy #engines #statecharts #harel #timeouts #effects-as-data #tree-shake-rule #cost-lens #class-a #class-b-shakeable #DD-Harel #OQ-8 #insight-21 #master-PA-2026-05-07
