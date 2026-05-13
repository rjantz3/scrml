# §13.2 auto-await stdlib extension — SCOPING progress

## 2026-05-13 — dispatch start
- Verified worktree root + clean status; bun install + pretest pass.
- Read primary.map.md + domain.map.md + schema.map.md + error.map.md.
- Read SPEC §13.2 in full (lines 6481-6526), §41.4 (protocol prefixes), §43.5.1 (cross-program RPC), §40.4 / E-PROG-004.
- Read safeCallAsync source: `compiler/runtime/stdlib/host.js:117-143`.
- Read host/index.scrml stub: `stdlib/host/index.scrml:130-135`.
- Read S88-landed two-step pattern: `stdlib/auth/password.scrml:60-69`.
- Inventoried 14 stdlib `Promise<T>`-returning exported functions across host/auth/oauth (redis/http excluded as I/O-heavy, but still in inventory).
- Located compiler auto-await impl site: `compiler/src/codegen/scheduling.ts:96-115` (`isServerCallExpr`) → emits `await` at lines 285/292/314/316.
- Located the route-map server classification: `compiler/src/route-inference.ts:2314, 2411` (boundary set to "server").
- Confirmed E-PROG-004 is in SPEC catalog (line 14872) but NOT yet implemented in `compiler/src/` (grep found zero hits).

## Next
- Write SCOPING.md with §1-§8 per dispatch.
- Commit single deliverable.

## 2026-05-13 — SCOPING.md complete
- Drafted SCOPING.md (§1 current state / §2 proposed surface / §3 stdlib inventory ~40 surfaces / §4 compiler touchpoints / §5 E-PROG-004 interaction / §6 sub-phase decomposition 5 phases / §7 6 open questions / §8 25-39h estimate).
- Load-bearing finding: auto-await fires ONLY on routeMap.functions[boundary==="server"]; stdlib async fns have no static Promise<T> classification path today; the typer needs a new annotation pass (Sub-Phase B is the largest single cost).
- Recommendation on E-PROG-004: AMEND (Position C) — auto-await fires; explicit `await` idempotent.
- Ready to commit + DONE.
