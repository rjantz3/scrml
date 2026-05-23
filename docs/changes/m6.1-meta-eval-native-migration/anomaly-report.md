# Anomaly Report: m6.1-meta-eval-native-migration

## Test Behavior Changes

### Expected
- `compiler/tests/unit/meta-eval.test.js`: +5 new tests (§27-§31), all pass. These exist BECAUSE of the M6.1 change (per `feedback_write_test_always.md`).
- `compiler/tests/conformance/conf-META-EVAL-002.test.js`: POS-case exemplar string changed from `<p if=>broken</>` to `<p>unclosed`. Test intent (meta emit of invalid scrml -> E-META-EVAL-002) preserved. CHANGE traceable to the M6.1 migration: native parser is intentionally more permissive than legacy BS+TAB for the malformed-attribute form (no §34.1 native equivalent to E-ATTR-001).

### Unexpected (Anomalies)
none

## E2E Output Changes

### Expected
- meta-emit re-parse now exercises the C1 assembler path; emitted hoist counts (typeDecls/components/etc.) propagate via collectHoisted instead of via buildAST's hoisting pass. For the meta-eval call site this is a no-op because reparseEmitted returns `tabOutput.ast?.nodes` and never reads the hoist arrays — meta-emit emits markup/structural nodes that land in `nodes`, not hoisted decls.

### Unexpected (Anomalies)
none

## New Warnings or Errors

none observed in any test run. The pre-existing pre-test warning lines (`assertEqual ... near offset 0`, `return "ok"`) are unchanged in count and location.

## Anomaly Count: 0

## Status: CLEAR FOR MERGE

## Notes for downstream M6 units (M6.2/M6.3/M6.5/M6.7)

- The CONF-META-EVAL-002 exemplar adjustment is M6.1-LOCAL and does not preempt the §34.1 reconciliation pass scheduled with M6.7. Future M6 work that adds a native E-ATTR-* equivalent could re-instate the original `<p if=>broken</>` exemplar.
- The `I-` skip in reparseEmitted's diagnostic filter is forward-compatible with future I-NATIVE-BLOCK-* codes added by the assembler.

## Tags
#scrmlts #m6.1 #meta-eval #anomaly-report #clear

## Links
- [pre-snapshot.md](./pre-snapshot.md)
- [progress.md](./progress.md)
