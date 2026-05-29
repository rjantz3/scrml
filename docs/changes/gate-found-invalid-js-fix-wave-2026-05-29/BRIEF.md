# Gate-found invalid-JS fix-wave — BRIEF (archived per pa.md S136)

Dispatched S141-continuation (2026-05-29, `full wrap` directive) to `scrml-js-codegen-engineer`, isolation:worktree, opus, background. Agent `ab2914bfb23c81da7`. Baseline HEAD `fe0c8335` (v0.6.9, gate flag-gated). change-id `gate-found-invalid-js-fix-wave-2026-05-29`.

## Goal: close the ~16 gate-found pre-existing invalid-JS artifacts in examples/ → flip `validateEmit` default-ON + wire `--validate-emit` CLI (the ratified end-state).

Use the gate (`validateEmit` ON) as the enumerator/verifier. Known roots:
- **C10 (HIGH, dominant)**: compound `if=(X is some && X != "")` lowering truncates `!= ""` → dangling `!==`. ~12 in trucking-dispatch (board/billing/drivers/loads/home/load-detail .client.js). Codegen lowering bug, not example-specific.
- **C11 (MED)**: leaked `server {` block in trucking-dispatch/seeds.server.js.
- +~4 more across examples — gate enumerates; root-cause each.

Deliverables: (1) enumerate via gate-ON; (2) fix root causes + regression test per root; (3) flip validateEmit default-ON in api.js + `--validate-emit`/`--no-validate-emit` CLI flag in cli.js + SPEC §2.2.1 update; (4) ACCEPTANCE: FULL `bun run test` GREEN (≥22,121/0) WITH gate ON = proof all closed (drive to green by fixing codegen, NOT exempting); (5) R26 re-compile affected examples gate-clean.

Disciplines: F4 startup · S126 Bash-edits worktree-absolute no-cd-into-main · S83 incremental commits · NO --no-verify (full suite is the gate) · progress.md. STOP-and-report if full suite can't go green with gate on (report residual, don't disable gate).
