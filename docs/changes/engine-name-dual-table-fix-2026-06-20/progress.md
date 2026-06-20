# engine-name-dual-table-fix-2026-06-20 — progress

## Startup (2026-06-20)
- Worktree verified, clean, bun install + pretest OK, merge main = already up to date (HEAD 8c938a58).
- Maps consulted: primary.map.md (compiler-source-bug-fix routing + S192 engine-varname.ts block).
  Load-bearing finding: autoDeriveEngineVarName is centralized in engine-varname.ts, imported by
  ast-builder/symbol-table/type-system/emit-machines; the `name=`→var-derivation is the S192 path.

## Root-cause survey (empirical, R26)
- Reproducer COMPILES exit 0 but throws E-ENGINE-001-RT at runtime (PA-confirmed reproduced).
- Two divergences in the emitted client.js:
  1. TABLE-NAME + FORMAT mismatch: modern engine builds POPULATED `__scrml_engine_modeMachine_transitions`
     (C12 from→targets format `{ "Nav": ["Edit"] }`); §51.3 write-guard for `@mode` reads EMPTY
     `__scrml_transitions_ModeMachine` (keyed `{ "Nav:Edit": true }` format). Empty → __rule null → throw.
  2. VAR-NAME divergence: ast-builder derives engine var from `name=ModeMachine` → `modeMachine`
     (ast-builder.js:14614-14615), VIOLATING SPEC §51.0.C which says var derives from `for=Type`
     (`for=Mode` → `mode`). The user's machine-typed cell `@mode: ModeMachine` is `mode`. So the
     engine governs a phantom `modeMachine` while the user writes `@mode`.
- machineRegistry registers ModeMachine with EMPTY rules (type-system.ts:5290-5302, modern state-child
  body path); the rules live in engineMeta.stateChildren → emit-engine.ts keyed on meta.varName.
- §51.3 machineBindings (emit-reactive-wiring.ts:213) sets tableName=__scrml_transitions_<engineName>,
  rules=machine.rules (EMPTY for modern). _emitReactiveSet routes machineBindings BEFORE engineBindings.

## SPEC anchors (read in full)
- §51.0.B (24854) opener attr table: lists for/initial/derived/pinned/var/effect/accepts/server — NO `name=` row (doc-gap to fill).
- §51.0.C (25162): auto-derived var name comes from the TYPE name (`for=Type`), `var=` is the only override.
- §51.3.3 (27345)/§7495: `@x: N` machine-typed cell is GOVERNED by machine N.
- §51 P1 prose (27176): `<engine name=N for=T>` ratified-canonical (DO NOT reject).

## Fix plan (SPEC-faithful)
A. ast-builder: `name=` no longer sources var name; var = `var=` override → `for=Type` auto-derive (§51.0.C).
   engineName still = `name=` value verbatim (machine identity / cross-file mount).
B. SYM: unify engine's type-derived cell with a coincidentally-named machine-typed cell `@x: N`
   binding THIS engine — no false E-ENGINE-VAR-DUPLICATE; still fire on genuine collisions.
C. machineBindings: skip modern-engine machines (empty rules) so the populated engine write-guard owns the cell.
D. SPEC §51.0.B: add `name=` opener-attr row (doc-gap currency).

## Implementation (2026-06-20) — COMPLETE
- symbol-table.ts registerEngineDecl: modern-engine (rulesRaw `/<\s*[A-Z]/`) + name=N
  discovers the machine-typed cell `@x` (typeAnnotation === engineName), binds varName=x,
  and UNIFIES (attaches engineMeta to the existing cell record) instead of firing
  E-ENGINE-VAR-DUPLICATE. var= override + multi-cell + legacy-arrow-body all exempt.
- emit-reactive-wiring.ts buildMachineBindingsMap: skip MODERN engines (empty machine.rules,
  not derived) so the populated §51.0 engine write-guard owns the cell; also skip emitting
  the dead empty `__scrml_transitions_<name>` table for modern engines.
- emit-engine.ts: UNCHANGED — it already keys all output (table/auto-set/write-guard/hooks)
  on meta.varName, which is now the unified user cell.
- SPEC §51.0.B: added `name=` opener-attr row (doc-gap currency).

## Verification
- R26 happy-dom (compiler/tests/integration/engine-name-dual-table.test.js, 4 tests): the
  reproducer COMPILES exit 0 AND transitions Nav<->Edit at runtime (no E-ENGINE-001-RT);
  non-type-derived cell name (@m: N) works; no-name modern engine no-regression; genuine
  collision (var=mode + separate @mode) STILL fires E-ENGINE-VAR-DUPLICATE. ALL PASS.
- Engine unit suite (88 tests incl. S192 b14, P1 equivalence/regression): all pass.
- Engine integration + derived (78 tests): all pass.
- FULL suite: 24659 pass / 215 skip / 1 todo / 0 fail. No within-node OVER-BUDGET print
  (allowlist unchanged, no re-baseline).

## Scope note
Fix is a codegen-consistency + SYM-binding change (the brief's expected shape), NOT a P1
reversal. No P1 prose amended; no `<engine name=>` examples migrated; no equivalence tests
inverted. Var-derivation for the legacy arrow-body named machine (S192 @orderEngine behavior)
is UNTOUCHED — the modern-body gate scopes the change to the state-child form.
