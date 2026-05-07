# A1b Step B15 — Phase 0 Survey Notes

**Date:** 2026-05-07
**Scope:** Engine state-child exhaustiveness + rule= typer + initial= validation per SPEC §51.0.B/E/F + §34.

## Survey gates (per BRIEF §7)

### (a) §51.0.F-vs-primer-§7 syntax reconciliation — RESOLVED

The audit (`docs/audits/a1b-b15-rule4-audit-2026-05-07.md` §1.1 + §4) flagged a substantive drift: SCOPE row + primer §7 used legacy event-arrow form `rule="event -> Variant"`, but SPEC §51.0.F shows three target-only forms (single / multi / wildcard).

**Resolution:** §51.0.F three target-only forms are CANONICAL. Primer §7 was corrected at S67 (`53825da`); SPEC amendment landed at `1de05ef`. B15 validates against the three forms ONLY; event-arrow rule= values fire a NEW `E-ENGINE-RULE-LEGACY-SYNTAX` diagnostic with a migration message.

### (b) §34 catalog rows — 5 NEW ROWS ADDED

Pre-B15 §34 catalog had E-ENGINE-INVALID-TRANSITION, E-ENGINE-EFFECT-AMBIGUOUS, E-ENGINE-VAR-DUPLICATE, W-ENGINE-INITIAL-MISSING, E-ENGINE-MOUNT-NOT-ENGINE, plus derived-engine + history + internal-rule rows. **Missing for B15:**

| Code | Section | Severity |
|---|---|---|
| E-ENGINE-STATE-CHILD-MISSING | §51.0.B, §51.0.F | Error |
| E-ENGINE-STATE-CHILD-INVALID-VARIANT | §51.0.B | Error |
| E-ENGINE-INITIAL-INVALID-VARIANT | §51.0.E | Error |
| E-ENGINE-RULE-INVALID-VARIANT | §51.0.F | Error |
| E-ENGINE-RULE-LEGACY-SYNTAX | §51.0.F | Error |

Added in commit `0186c26` to SPEC.md after row E-ENGINE-MOUNT-NOT-ENGINE (line 14240) and before E-HISTORY-NO-INNER-ENGINE (line 14241). All five rows include §-references + remediation hints + (Catalog addition S68 — A1b B15) marker.

### (c) Compile-time E-ENGINE-INVALID-TRANSITION fire site — DEFERRED

**Finding:** B15's territory per audit §1.4 + brief #4 — but state-child bodies are stored as RAW TEXT in `engine-decl.rulesRaw` (per primer §13.7 B14 specifics: "Engine bodies are RAW TEXT (engine-decl.rulesRaw) — no walkable children today"). The body-walking dispatch needed to detect `@engineCell = .Variant` or `.advance(.X)` writes inside state-child bodies is structurally absent.

**Decision:** Same pattern as B14's E-COMPONENT-ENGINE-SCOPE deferral (per primer §13.7 B14 specifics §667). The walker shape is READY (`engineMeta.stateChildren[].rule` carries the per-state-child rule set). When state-child bodies become walkable, PASS 11 dispatches on the engine variable's `_resolvedStateCell` annotation inside each state-child body. **§34 catalog row already exists** — E-ENGINE-INVALID-TRANSITION (line 14230) is currently labeled Runtime tier; the compile-time fire when added by a future dispatch extends the existing row's coverage.

### (d) `engineMeta.variants` reliability — POPULATED BY B15

**Finding:** B14 explicitly leaves `variants: []` (per primer §13.7 B14 specifics: "B15 populates from type-system"). B15 populates at walker entry per engine via local helper `parseEnumVariantNamesFromRaw` over `ast.typeDecls[]`.

**Why a local helper, not the canonical `parseEnumBody` from type-system.ts:** the type-system pass runs LATER than SYM in the pipeline (per `compiler/PIPELINE.md`). SYM cannot consume the typeRegistry that TS produces. Local helper mirrors `parseEnumBody`'s variant-extraction logic minus the payload + `transitions {}` resolution + struct/refinement passes — split on `\n` / `,` / `|` at depth 0, strip payload `(...)`, strip `renders ...` suffix, validate PascalCase.

**Why NOT use `meta-checker.ts:parseEnumVariantsFromRaw`:** that function only splits on `|`, missing the canonical `,` / `\n` separators per SPEC §14.4. Verified empirically — passing `{ Small , Big , Fire , Cape }` to it returns `[]`. Inline helper is correct.

## §1 Friction observed (none blocking)

**Block-splitter limitation:** BS does not currently create an engine block when state-child bodies use `:`-shorthand (`<X rule=.Y> : "body"`). Verified by debug test — engine block silently dropped. Per SPEC §51.0.I (Move 15), `:`-shorthand IS canonical for state-children, but parser support is pending. **Workaround:** B15 tests use the explicit-closer form (`<X rule=.Y></>`) which BS DOES support; engine-statechild-parser handles BOTH forms (parser-level test codifies the contract), so when BS gains `:`-shorthand support PASS 11 needs no changes.

## §2 Cost — actuals vs estimate

| Metric | Estimate | Actual |
|---|---|---|
| BRIEF time | 5-7h | ~3.5h |
| §34 rows added | 4 | 5 (added LEGACY-SYNTAX as 5th) |
| Code added | walker + parser | walker + parser + 43 tests |
| Tests added | (unspecified) | 43 |

The lower-than-estimate actuals reflect the clean reusability of B14's `engineMeta` + the simpler-than-anticipated `rulesRaw` parsing requirement (no compile-time write check needed today since bodies are still raw text — the deferred portion is the parser-tightening dispatch).

## §3 Tags

#a1b-b15 #engine-state-child-exhaustiveness #rule-typer #initial-validation #§51.0.F-three-forms #§51.0.E-initial #§34-catalog-additions #s68
