# SCOPING — Trucking slice 1b: DriverStatus / HOS engine (NOT a clean mechanical dispatch)

**Status:** scoped + de-risked S198 (PA Tier-2 waiting-time work while slice 1a runs). BLOCKED on a design ruling (the hydration fork below). Do NOT dispatch until ruled.

## Scope (DriverStatus only — distinct from 1a's LoadStatus)
- `pages/driver/hos.scrml` — the dead-decoration `<engine for=DriverStatus initial=.OffDuty>` (declared lines 71-76, never read/written); the real state is `@currentDriver.current_status` (snake string) + the `changeHosServer` string transition if-chain (lines 146-153) + `setStatus("off_duty")` buttons.
- `pages/driver/home.scrml` — DUPLICATE HOS transition logic (lines 109-116) — collapse.
- `components/driver-card.scrml` — `driverStatusClasses`/`driverStatusLabel` string if-chains (imported by hos.scrml) → match (mirrors 1a's load-status-badge shape).
- `seeds.scrml` — `drivers.current_status` `'off_duty'` → `'OffDuty'` (variant names, mirrors 1a's loads.status migration).
- Write sites: `UPDATE drivers SET current_status = ...` → variant names; `hos_change` payload from/to → variant names.

## PA-verified empirical facts (S198 probes /tmp/hos-probe)
1. `@driverStatus = @stringCell` (string holding a variant name → engine auto-cell) **compiles clean**.
2. Button transitions: `onclick=@driverStatus = .OnDuty` (bare assignment) **works**; `onclick=.advance(.X)` **fails E-ATTR-001** (bare leading-dot method-call not a valid attr value) — wrap in `${@driverStatus.advance(.X)}` or a named fn.
3. The engine emits `_scrml_engine_direct_set("driverStatus","Driving",__scrml_engine_driverStatus_transitions)` — a real transition-table guard call.

## THE DESIGN NUT (the fork — needs a user ruling)
HOS `current_status` is **persisted** and can be ANY of the 4 states. On page load the engine must show the persisted state. But the engine boots at `initial=.OffDuty` and `rule=` governs transitions — hydrating to a NON-adjacent persisted state (e.g. `.Driving` when OffDuty's `rule=` excludes it) is a **rule= violation** (compile-clean today only because dynamic-write rule= enforcement is runtime-deferred per §51.0.F + primer §13.7-B15; semantically invalid + emits a guard call). SPEC grep found **no canonical engine-hydration / restore-from-persisted-state form**.

This is exactly the "dog-food surfaces a real gap" outcome S193 wanted. Forks:
- **(a) File a gap** `g-engine-hydration-from-persisted-state` (engines can't cleanly hydrate to an arbitrary persisted variant without violating rule=) + a workaround in HOS for now (e.g. a dedicated boot transition / rule=* boot, both anti-patternish).
- **(b) Reconsider HOS as match-not-engine.** A persisted + server-validated machine may fit `match for=DriverStatus` better (like load-status); the engine's rule= value-add is partly redundant with the server-side `changeHosServer` validation. BUT this undercuts the S193 "engines everywhere — the canonical engine example the corpus is missing" goal + the S194-2C "driver HOS = singleton → genuine engine" ruling.
- **(c) A hydration pattern** — e.g. design the rule= graph so every state is reachable from `initial` in one step, OR a derived/boot-effect hydration. Each has trade-offs; (c) likely needs a SPEC clarification on the canonical persisted-engine-hydration form.

Recommendation lean: surface the finding to the user; this is a genuine engine-vs-persistence axis (possible language gap) that the S193 corpus dog-food was meant to find — resolve BEFORE briefing 1b. Likely a short deep-dive or a one-question ruling.
