---
title: Runtime-perf SCOPING — close the TodoMVC 0/10 suffering gap
date: 2026-05-18
session: S102
authority: removed-from-README TodoMVC runtime benchmark table flagged scrml losing 0/10 ops vs React 19 / Svelte 5 / Vue 3 at v0.3.0 STABLE refresh (data was carried-forward; canonical numbers at `benchmarks/runtime-benchmark.js` against current HEAD pending re-measurement); S102 PGO work confirmed compile-time fixes have NO effect on runtime perf (emitted JS byte-identical)
status: SCOPE OPEN — Phase 1 (instrumentation + vanilla-JS baseline + re-measurement) dispatch-ready; Phase 2 + 3 sequenced after data lands
---

# Runtime-perf SCOPING — close the TodoMVC suffering gap

## What this doc is for

The TodoMVC runtime benchmarks measure how fast emitted scrml JS runs in the browser vs React / Svelte / Vue on 8 standardized operations (Create 1000 / Replace 1000 / Partial update / Select row / Swap rows / Remove row / Create 10000 / Append 1000). Per the removed README data captured at v0.3.0 STABLE (2026-05-14), scrml was winning **0 of 10** ops (was 6 of 10 at v0.2.4-era; the regression is mostly attributable to the runtime overhead added by Approach A closure-analysis between v0.2.x and v0.3.0).

S102 PGO Phase 3 confirmed: **the compiler is now fast (~52-62% pipeline reduction on trucking-dispatch), but the *emitted runtime* is byte-identical pre/post Phase 3.** The TodoMVC runtime gap is unaffected by PGO. Closing it requires runtime work — different track, different SCOPING, different dispatch shape.

This SCOPING structures that runtime-perf work into 3 phases mirroring the PGO methodology (measure first → attribute → optimize, data-driven).

**Bottom line:**

- **Phase 1 — Measure first.** Add a vanilla-JS baseline (zero-framework, hand-rolled DOM-mutation) as a fourth comparison baseline; instrument `dist/scrml-runtime.js` to capture per-op time breakdowns; re-run the benchmark harness at HEAD to get a current snapshot (v0.3.3 post-PGO Phase 3).
- **Phase 2 — Attribute.** Identify *where* in the scrml runtime time is being spent on the slow ops (Partial update / Select row / Swap rows particularly — those were the worst at v0.3.0).
- **Phase 3 — Optimizations.** Data-driven, per-hotspot dispatches. Anticipated candidates: signal-style direct subscription on hot paths; batched reconciliation; static-region elision; for-loop key-based diff.

Phase 1 IS the work this SCOPING authorizes. Phase 2 + 3 are anticipated; their concrete shapes emerge from Phase 1's data.

---

## §1. Authority + context

**Why this work matters now.** The PGO Phase 3 wave (S102) substantially improved compile time, but the public-facing scrml.dev story still has a "fast to compile, slow to run" weak point on the canonical TodoMVC comparison. The removed-from-README runtime table was correct at the moment of measurement; the gap is real.

**What's already established (not litigated here):**

- The byte-identity property of PGO Phase 3 commits (P3.A `diff -r` on 113 files; P3.B SHA256 on 8 corpora; P3.C SHA256 on 3 corpora; P3.B-followup `diff -r` on 3 corpora). Compile-time optimizations made emitted JS no slower; the runtime gap is not a regression from PGO.
- The 0/10 vs 6/10 narrative spans the Approach A whole-stack closure-analysis investment (S88-S92). That investment was correct on its own merits (per-route per-role chunk variance + content-addressed caching); the per-op runtime cost it introduced is the target.

**What's contested + needs Phase 1 data:**

- WHICH ops are the worst, in current HEAD (v0.3.3 post-PGO Phase 3). The removed README data is now 4 days old + 6 commits old; re-measurement may surface a different per-op profile.
- WHERE the time is spent inside scrml runtime per op. Hypotheses listed in §3 below but unconfirmed.
- WHETHER the vanilla-JS baseline is reachable by any framework, or if all four frameworks (incl. scrml) sit at a per-row-cost floor that's higher than vanilla.

---

## §2. Phase 1 — Measure first (PRIMARY)

### §2.1 P1.A — vanilla-JS TodoMVC baseline

**Why.** Per S102 user direction (terse: "include vanilla JS baseline in phase 1"). The vanilla-JS implementation is zero-framework — direct `document.createElement` / `appendChild` / `replaceChild` / `removeChild` calls. It represents the **per-row cost floor** of just the DOM mutation itself; the gap between vanilla and the fastest framework is the irreducible framework-runtime overhead; everything above that is per-framework cost.

**Surface.**

- NEW `benchmarks/todomvc-vanilla/` directory mirroring `benchmarks/todomvc-react/` (zero-dep; pure HTML + JS; same 8-operation benchmark contract as the other implementations).
- Implement using a TodoMVC-shape rendering: `<ul>` of `<li>` items each containing checkbox + label + delete-button; standard TodoMVC operations (add / toggle / delete / filter all|active|completed / clear-completed). Same fixture shape the existing scrml/react/svelte/vue benchmarks use.
- Extend `benchmarks/runtime-benchmark.js` (the unified runner) to invoke the vanilla harness as a fifth subprocess; same output JSON schema.
- The vanilla implementation SHOULD NOT use a virtual DOM, signals, observable wrappers, or reactive runtime of any kind. Pure imperative DOM mutation per op. Manual diff logic where required (e.g., for Partial update; iterate the visible list, mutate matching DOM nodes in place).

**Acceptance criteria.**

1. `bun benchmarks/runtime-benchmark.js` runs 5 subprocesses (scrml / react / svelte / vue / vanilla) and emits a 5-column comparison.
2. Vanilla performance on Create 1000 / Replace 1000 / Append 1000 is fastest-or-tied across all 4 frameworks (sanity check — vanilla SHOULD win bulk-insert by construction).
3. Per-op vanilla numbers logged to `benchmarks/runtime-results.json` (or a new sibling JSON file).

**Cost-class:** ~3-6h dispatch shape.

### §2.2 P1.B — scrml runtime per-op instrumentation

**Why.** Once we know the per-op timing across all 5 baselines, we need to know WHERE in the scrml runtime time is spent on the slow ops. Per-op total ms doesn't tell us if Partial update is slow because of subscription-set traversal, reactive-dispatch overhead, list-diff cost, or DOM write cost.

**Surface.**

- Extend `dist/scrml-runtime.js` (the shared reactive runtime) with optional instrumentation. Gated on a runtime flag (e.g., `globalThis.__SCRML_DEBUG_PERF = true` before runtime load) — zero overhead when unset.
- When set, the runtime emits per-operation breakdowns via `console.time`/`console.timeEnd` or a custom timing accumulator. Candidate breakpoints (per S94 + the runtime template at `compiler/src/runtime-template.js`):
  - `_scrml_reactive_get(key)` cumulative time (read overhead)
  - `_scrml_reactive_set(key, value)` cumulative time (write overhead)
  - `_scrml_reconcile_list(...)` cumulative time + per-op call count (for-loop reconciliation; specifically called out as the TodoMVC tree-shake bug victim S95-S96)
  - Subscriber-set traversal cumulative time (the `notifySubscribers` path)
  - DOM-write cumulative time (`textContent` / `setAttribute` / `appendChild` etc. — wraps that surface during instrumented runs)
  - Effect-scheduling cumulative time (microtask + batched effect runs)
- Output: `[SCRML-RUNTIME] <op-category>: <cumulative-ms> (<call-count> calls, <avg-ms-per-call>)` per benchmarked operation.

**Acceptance criteria.**

1. With `__SCRML_DEBUG_PERF` unset: zero output, zero overhead (verify warm-run delta < 1ms vs uninstrumented runtime).
2. With set: per-op breakdown emits via console; the per-op subtotals sum to within ±10% of the operation's wall-clock time.
3. Run the harness with instrumentation on against TodoMVC; capture the per-op breakdown for the 3 worst-performing ops (per v0.3.0 data: Select row / Partial update / Swap rows).
4. Identify the top-2 hottest sub-runtime paths PER op. (Different ops may have different bottlenecks.)

**Cost-class:** ~6-12h dispatch.

### §2.3 P1.C — re-measurement at v0.3.3 HEAD

**Why.** The removed README data was at v0.3.0 STABLE; current HEAD is v0.3.3 with PGO Phase 3 + formFor SPEC entry. The per-op numbers may have shifted (zero direct change but possible indirect through any runtime-template tweaks in v0.3.x patches). Need a clean current snapshot before Phase 2 attribution makes claims about where time is spent.

**Surface.**

- After P1.A + P1.B land, run `bun benchmarks/runtime-benchmark.js` against current HEAD with the vanilla baseline + scrml instrumentation enabled.
- Persist the snapshot to `benchmarks/RESULTS.md` (the existing canonical file) with a dated entry showing the 5-baseline comparison + the scrml per-op breakdown.
- Do NOT re-publish the comparison table in README — that was deliberately pulled per S102 user direction.

**Acceptance criteria.**

1. `benchmarks/RESULTS.md` has a new dated entry `## 2026-05-XX (S10X) — v0.3.3 runtime baseline with vanilla-JS comparison` with the 5-column table + per-op scrml-runtime breakdown.
2. The data identifies the top-3 scrml ops with the largest gap vs the fastest framework AND vs vanilla. These three are the Phase 2 attribution targets.

**Cost-class:** ~2-3h (PA-direct script run + write-up; not a dispatch).

### §2.4 Phase 1 sequencing

P1.A + P1.B in parallel (different files; no conflict — P1.A creates `benchmarks/todomvc-vanilla/` + runner extension; P1.B modifies `dist/scrml-runtime.js` + the runtime template generator).

After both land: P1.C runs as PA-direct.

**Aggregate Phase 1 cost: ~11-21h.**

---

## §3. Phase 2 — Attribute (DATA-DRIVEN; cannot scope until Phase 1 lands)

Once Phase 1.C has the data, Phase 2 walks each of the top-3 hotspot ops to identify the specific code in `dist/scrml-runtime.js` (or upstream in the runtime-template generator at `compiler/src/runtime-template.js`) that dominates the op's cost.

**Anticipated hypotheses (NOT verdicts):**

- **Partial update (10/1000 row updates):** subscription-set traversal cost — every `@todo.completed = !@todo.completed` write goes through the central reactive registry, fans out to subscribers per-cell. If the subscriber lookup is O(subscribers) per write, partial update on 100 rows compounds.
- **Select row:** classList toggle path — `@selectedId = id` triggers a re-render of (at most) the previously-selected row + the newly-selected row. If the reactive system can't narrow the dependency set, it may re-render more than necessary.
- **Swap rows:** list-reconciliation — `_scrml_reconcile_list` per S95-S96 bug context. If the list diff is O(n) where n is the full list length, swap (which should be O(1)) compounds.
- **Create 1000:** bulk-insert cost — initial reactive-cell registration per row + DOM construction per row + subscriber wiring. Vanilla baseline tells us the irreducible DOM cost; the gap is per-row reactive wiring.
- **Create 10000:** same as Create 1000 scaled 10× — looks for super-linear growth in any sub-path.

Each hypothesis is REFUTABLE by Phase 1.B's per-op breakdown. Phase 2 lands the actual finding per hotspot.

---

## §4. Phase 3 — Optimizations (DATA-DRIVEN per Phase 2 finding)

Each Phase 3 chip-away gets its own SCOPING + dispatch, gated on Phase 2 data confirming the hotspot.

**Anticipated candidates (NOT committed; just framing):**

- **Signal-style direct subscription on hot paths.** Skip the central registry on cells that have a single subscriber site (the common case). Solid.js precedent. Estimated saving: 30-60% on Partial update.
- **Batched reconciliation.** When multiple `@cell = ...` writes happen in the same synchronous event-handler turn, batch the reconciliation pass to happen once at microtask boundary instead of per-write. Vue 3 precedent (next-tick batching). Estimated saving: 20-40% on Select row.
- **For-loop key-based diff.** Use stable keys (e.g., `@todo.id`) to compute a minimal-edit list diff for `_scrml_reconcile_list`, avoiding full-list re-render on Swap. React/Svelte precedent. Estimated saving: 50-80% on Swap rows; possibly large on Create N.
- **Static-region elision.** Compile-time tag regions of markup as "no reactive refs" → runtime skips reconciliation for those regions entirely. Svelte 5 precedent (`{:static}` blocks). Estimated saving: variable; biggest on Create 1000 if much of each row is static.
- **Per-row reactive scope.** Replace the central registry for `for`-loop body cells with per-row scoped registries — eliminates the "all subscribers" lookup cost on per-row writes. Solid.js precedent. Estimated saving: large on Partial update + Select row.

**Phase 3 wave is the v0.4+ work track.** No specific items committed in this SCOPING.

---

## §5. Risks + mitigations

- **Risk:** Phase 1.B instrumentation overhead is non-trivial even when "off." Mitigation: wrap in `if (globalThis.__SCRML_DEBUG_PERF)` check; verify warm-run delta < 1ms on baseline TodoMVC; same gate as the PGO `--debug-perf` flag.
- **Risk:** Vanilla-JS implementation isn't a fair comparison (too-optimal handcrafted code; or too-naive code that loses to React). Mitigation: implement vanilla per a reference standard — the `js-framework-benchmark` project (https://github.com/krausest/js-framework-benchmark) maintains canonical vanilla implementations for these 8 ops. Use that style.
- **Risk:** Per-op breakdown reveals the bottleneck is in code we can't easily fix (e.g., happy-dom's DOM-mutation cost). Mitigation: if happy-dom DOM cost is dominant, re-run the harness in real headless Chrome via Playwright to confirm. The harness already supports happy-dom; adding a Playwright runner is ~3-5h of additional Phase 1 work surfaced if needed.
- **Risk:** Phase 1 data reveals the gap is so large + spread across so many sub-paths that no single Phase 3 chip-away closes more than ~10%. Mitigation: accept that the gap is structural; document it; surface as a v0.4 "rewrite the runtime" candidate or as an explicit "scrml's strength is compile-time correctness, not micro-benchmark wins" positioning.
- **Risk:** PGO Phase 3 work surfaced a new runtime-side regression we haven't measured yet. Mitigation: P1.C re-measurement is the load-bearing check — comparing current HEAD numbers to the v0.3.0 STABLE-era removed README claims will surface any drift in either direction.

---

## §6. Sequencing

```
Phase 1 (parallel, dispatch-ready):
  P1.A — vanilla-JS TodoMVC baseline + runner extension     [scrml-js-codegen-engineer, worktree]
  P1.B — scrml runtime per-op instrumentation                [scrml-js-codegen-engineer, worktree]

Phase 1 (sequenced, PA-direct after P1.A + P1.B land):
  P1.C — re-measurement at v0.3.3 HEAD + RESULTS.md update

Phase 2 (data-driven from P1.C; per hotspot):
  P2.X for each top-3 op identified

Phase 3 (data-driven from Phase 2; per candidate):
  P3.X for each chip-away
```

---

## §7. Open questions BEFORE Phase 1 dispatch

1. **Q-RUNTIME-OPEN-1 — Authorize Phase 1 (P1.A + P1.B parallel)?** Both are dispatch-ready; ~9-18h walltime parallel.
2. **Q-RUNTIME-OPEN-2 — Playwright Path.** If P1.C reveals happy-dom is masking the real per-op profile (happy-dom is known to have non-representative DOM cost), authorize a follow-on P1.D to add Playwright-based real-Chrome measurement (~3-5h additional)?
3. **Q-RUNTIME-OPEN-3 — Vanilla-JS style.** Hand-rolled per js-framework-benchmark style (raw DOM API, no abstractions) — or pseudo-vanilla with minimal helpers (e.g., a single `el(tag, props, children)` factory)? PA recommends raw-DOM-API style to give the most-honest lower bound.
4. **Q-RUNTIME-OPEN-4 — Scope of "TodoMVC suffering".** Do we just need to close the gap on existing 8 ops, OR do we want to add a few scrml-strength ops (e.g., complex form with cross-field validation; auto-batch SQL-N+1; auth-gated bundle variance demonstration) that show where scrml's design center sits? PA recommends Phase 1 focuses on the existing 8 (the suffering surface); scrml-strength ops are a separate "narrative" benchmark project.

---

## §8. Tags

#runtime-perf #todomvc-0-of-10 #scrml-runtime #vanilla-js-baseline #measure-first #data-driven #s102 #v0.4-track #runtime-vs-compile-time #post-pgo-phase-3
