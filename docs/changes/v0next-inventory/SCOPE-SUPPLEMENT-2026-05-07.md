---
title: SCOPE-SUPPLEMENT — S67 ratified extensions
date: 2026-05-07
session: S67
relation: supplements `SCOPE-MAP-2026-05-05.md` without rewriting (the original is canonical for the 2026-05-05 audit snapshot)
status: ratified scope additions; pending implementation
---

# SCOPE-SUPPLEMENT — 2026-05-07 (S67)

## §0 Why a supplement, not a rewrite

`SCOPE-MAP-2026-05-05.md` (the original) was the full-corpus subsystem inventory + v0.2.0 scope map at the 2026-05-05 audit snapshot. It identified the migration shape, the file-disjointness invariants, and the hour estimates as of that date. Rewriting it would lose its audit-snapshot value.

This supplement records the S67 (2026-05-07) ratified scope additions WITHOUT mutating the 2026-05-05 source-of-truth. Future supplements follow the same dated-supplement pattern.

## §1 What changed at S67

### §1.1 Master-PA capability-gap audit (2026-05-07)

Three deep-dive agents in parallel against the existing scrml SPEC corpus identified three suspected weaknesses:

1. **Engine hierarchy** (composite states, history, internal-vs-external transitions, parallel regions) — REAL GAP confirmed. SPEC §51.9.7 line 21482 explicitly defers parallel regions; locks L1-L22 contain zero hierarchy lock; `dd6-engine-state-children-2026-05-03.md:1086` names a future DD-Harel deep-dive that had not been opened.
2. **State-level timeouts** — RECONSIDERED. `<machine>` form has full §51.12 temporal support (codegen + runtime + type-system); the actionable gap is surface migration to `<engine>` rule= form + computed-delay relaxation. Engineering, not design.
3. **Effects-as-data / effect mockability** — REAL GAP confirmed for engine-bearing apps. Test Case 1 ("test engine reaches `.Success` given synthetic HTTP, no real network") has no clean idiomatic answer in the existing corpus. OQ-8 from `inline-testing-perfection-2026-04-08.md:151` remains open.

### §1.2 Master-PA debate dispatches (2026-05-07)

Two debate-curator dispatches ran in parallel synthesis-mode against the audit findings:

- **DD-Harel** (engine hierarchy) — Approach C (Hybrid) won 49 vs B 46 vs A 43.
- **Effects-as-data middle path** — Position C surface (`test-bind` declaration in `~{}` blocks) via Position A mechanism (compile-time conditional at §47 server-fn call site).

Verdicts ratified at `scrml-support/design-insights.md` as **Insight 22** (test-bind, 2026-05-07) and **Insight 23** (DD-Harel Approach C, 2026-05-07).

### §1.3 User direction signals (S67)

Recorded in `scrml-support/user-voice-scrmlTS.md` S67 entries:

- **"Hierarchy in engines is likely locked"** — DD-Harel ratified for v0.2.0 scope.
- **Tree-shakeable runtime cost is acceptable** — cost-classification rule: per-feature-when-used = Class B-but-OK; global-wrapping = genuine B with heavy-evidence requirement. Reclassifies event-timeout + named multi-timer as B-OK.
- **Effects-as-data middle path is open** — distinct from Insight 21's rejected Koka shape.
- **State-timeout surface migration is engineering** — direct compiler work, no debate.
- **Flip conditions are not a feature-adoption gating mechanism** (verbatim: *"flip conditions are null, not considered here for feature addoption"*) — methodology rule; PA must restate flip-condition framing as "not adopted at this time; structurally extensible if needed later."
- **OQ-Harel-8 resolved: `<engine>` everywhere** (verbatim: *"pick engine, that feels right"*) — Machine Cohesion (2026-04-17) sharpened to articulate the actual singleton invariant.
- **Tooling-uniformity corollary to Pillar 5** (verbatim: *"adding a new word would have lost or complicated cli promotion for those"*) — when evaluating "should this thing get a new keyword vs reuse an existing one," ALWAYS check tooling-pipeline impact.
- **"We might be extending V 0.2.0 here" + "we shoud start planning out and adding these features"** — scope expansion authorized.

## §2 Scope additions to v0.2.0

The 2026-05-05 SCOPE-MAP estimate was ~280-440h (post-S58 spec freeze; pre-S66 self-host deferral). The S66 user decision (self-host post-v1.0.0) reduced that to ~240-360h. The S67 additions bring it back up to ~297-454h.

### §2.1 New phases (additive to A1-A6)

| Phase | Description | Est | Source |
|---|---|---|---|
| **A7** (master-list) / **A5** (IMPLEMENTATION-ROADMAP §2.5) | S67 ratified engine + temporal extensions: DD-Harel hierarchy + history + internal/external + parallel sugar (Insight 23) + Item C temporal surface migration (`<onTimeout>` element) + computed-delay relaxation + Item G B-shakeable timeouts | ~50-80h | Insight 23 + Item C audit (`scrml-support/archive/audits/item-c-temporal-engine-rule-migration-rule4-audit-2026-05-07.md`) + master-PA inbox 2026-05-07-1327 + 1347 |
| **A8** (master-list) / **A6** (IMPLEMENTATION-ROADMAP §2.6) | test-bind (effects-as-data middle path): `test-bind <serverFnName> = <handler>` declaration in `~{}` blocks; compile-time conditional + dead-code elimination | ~6-12h | Insight 22 |

**Net add to v0.2.0: ~57-94h** (~24-30% of the post-S66 baseline).

### §2.2 Class-A throughout per master-PA cost-lens

Both A7 and A8 are Class A:

- A7: hierarchy desugar at compile time → ~0 bytes net runtime; history-cell tree-shake (only emitted when ≥1 engine declares `history`); onTimeout rides existing §51.12 runtime; Item G timer-extensions tree-shakeable per S67 cost rule.
- A8: 0 production runtime cost (test-mode dispatch is dead-code-eliminated from release builds).

User cost-acceptance confirmed S67 (verbatim, indirect via master PA): *"for the apps that would actually use all of that at that scale, I think that is all totally acceptable."*

### §2.3 What stays out of scope per S67 verdicts

- **SCXML invoked services** — out (DD-Harel scope ceiling).
- **Deferred events** — out (DD-Harel scope ceiling).
- **Activity-based transitions** — out (DD-Harel scope ceiling).
- **Deep history** — out (Insight 23 OQ-Harel-4 verdict; only shallow this revision).
- **Effect-record schemas + `expects` sequences (Position B)** — not adopted at this time; structurally extensible later (no flip-condition gating).
- **General effect log beyond `audit @log`** — REJECTED (B-not-shakeable; instrumentation-at-every-effect-site not naturally tree-shakeable).
- **Coeffect capture by wrapping `Date.now`/`Math.random`/etc.** — REJECTED (B-not-shakeable; global call-site replacement; existing `fn` denial via E-FN-004 stands).
- **`<region>` or other distinct opener for nested engines** — REJECTED per OQ-Harel-8 resolution; `<engine>` everywhere.

## §3 Resolved questions tracked here

| Question | Status | Resolution |
|---|---|---|
| OQ-Harel-8 — inner-engine opener inside composite state-child body | RESOLVED 2026-05-07 | `<engine>` everywhere; Machine Cohesion sharpened (singleton invariant articulated) |
| OQ-8 — test-mockability for engine-bearing apps | PARTIALLY CLOSED 2026-05-07 | `test-bind` closes server-function mockability; OQ-8b filed for `<onTransition>` body effects |
| Machine Cohesion 2026-04-17 ratification adequacy | SHARPENED 2026-05-07 | Wording tightened from "file-scope-only" to articulate singleton invariant; nested `<engine>` permitted inside outer state-child body; component bodies + function/snippet bodies remain forbidden |

## §4 Open questions added at S67

| Question | Status | Resolution path |
|---|---|---|
| OQ-Harel-1 — entry/exit action order across composite boundary | OPEN | A5-1 spec authoring |
| OQ-Harel-2 — inner engine reset vs history on outer exit | OPEN (verdict: history-cell-on-exit, restore-vs-reset on entry) | A5-1 spec authoring |
| OQ-Harel-3 — parallel engine activation coupling | OPEN (verdict: independent activation; `parallel` is naming sugar) | A5-1 spec authoring |
| OQ-Harel-4 — deep vs shallow history | RESOLVED-as-shallow this revision | Deep history deferred |
| OQ-Harel-5 — grammar disambiguation for nested opener | OPEN | A5-1 + A5-2 parser work |
| OQ-Harel-6 — error code for cascade miss | OPEN (recommendation: extend E-ENGINE-001 message form) | A5-1 spec authoring |
| OQ-Harel-7 — temporal transitions in hierarchy | RESOLVED (engine-specific; do not cascade) | A5-1 spec authoring |
| OQ-Harel-8 — inner-engine opener | RESOLVED `<engine>` | (above) |
| OQ-8b — `<onTransition>` body effects beyond server-fn calls | OPEN | Future debate or deep-dive |
| OQ-test-bind-concurrency — parallel test runner block-local table isolation | OPEN | A6 dispatch |
| OQ-test-bind-passthrough — unbound server fn in active test-bind context | OPEN (verdict: fail-fast; validate against test-runner ergonomics) | A6 dispatch |
| OQ-audit-log-compose — test-bind interaction with `audit @log` (§51.11) | OPEN | A6 dispatch |

## §5 Cross-references

- **Original SCOPE-MAP** (canonical for 2026-05-05): `docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md`
- **IMPLEMENTATION-ROADMAP** (extended at S67): `scrml-support/archive/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` §2.5 + §2.6
- **Master-list dashboard**: `master-list.md` §0 (live)
- **Item C audit**: `scrml-support/archive/audits/item-c-temporal-engine-rule-migration-rule4-audit-2026-05-07.md`
- **Insight 22 (test-bind)**: `scrml-support/design-insights.md` 2026-05-07 entry
- **Insight 23 (DD-Harel)**: `scrml-support/design-insights.md` 2026-05-07 entry
- **User-voice S67 entries**: `scrml-support/user-voice-scrmlTS.md` (multiple S67 entries)
- **Master-PA inbox messages** (processed): `handOffs/incoming/read/2026-05-07-1327-*.md` + `2026-05-07-1347-*.md`

## §6 Tags

#scope-supplement #s67 #v0.2.0-scope-extension #insight-22 #insight-23 #item-c #item-g #onTimeout #test-bind #DD-Harel #machine-cohesion-sharpened #flip-conditions-null #tooling-uniformity-corollary
