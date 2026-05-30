# Anomaly Report: s144-match-codegen-comma-and-bare-tail (RE-DISPATCH)

Compares pre-snapshot (HEAD 505f4ace) to post-fix (tip 963b7996 + docs).

## Test Behavior Changes
### Expected
- +12 unit tests (compiler/tests/unit/match-arm-separator-and-value-unused-s144.test.js), all pass.
- Pre-commit hook test count 15292 -> 15304 (+12), 0 fail before and after. No prior test changed verdict.
### Unexpected (Anomalies)
- none

## E2E Output Changes
### Expected
- pretest (13 compilation-test samples): unchanged — still compile clean.
- Bug Y reproducers: E-CODEGEN-INVALID-JS (generic, codegen) -> E-MATCH-ARM-SEPARATOR (clean, source-anchored,
  typer) for BOTH markup and decl forms. This is the intended replacement.
- Bug AA reproducer: previously compiled with a silent value-discarding IIFE and NO diagnostic; now emits
  W-MATCH-VALUE-UNUSED (warning, non-fatal). Emitted JS for bare()/withReturn() is byte-identical to before
  (no codegen change for AA — diagnostic only). Verified `node --check` passes; withReturn still return-IIFE.
### Unexpected (Anomalies)
- none. Full samples/*.scrml scan (incl. gauntlet-r11 files) produced ZERO new E-MATCH-ARM-SEPARATOR or
  W-MATCH-VALUE-UNUSED — no false positives in real code.

## New Warnings or Errors
- E-MATCH-ARM-SEPARATOR (Error, §34/§18.2) — fires only on a match-arm-inline whose result ends with a
  trailing comma. Replaces the generic E-CODEGEN-INVALID-JS for that input class.
- W-MATCH-VALUE-UNUSED (Warning, §34/§48.11) — fires only when a plain function's LAST statement is a
  value-producing match-stmt (>=1 inline arm with non-empty result) with no enclosing return.

## Guardrails verified (no regression)
- newline arms (mk+decl), return match, fn/return-typed, const = match, block-form <match>, =>/-> arms:
  none trip E-MATCH-ARM-SEPARATOR; inner result commas (fmt(1,2)) do not false-positive.
- W-MATCH-VALUE-UNUSED does NOT fire for: return match, fn/return-typed, side-effect block-arm match,
  or a non-last match. (All covered by tests §8-§11 + R26.)

## Anomaly Count: 0
## Status: CLEAR FOR MERGE
