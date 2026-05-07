# api-js-stdlib-enum-reexport — Progress

[2026-05-06 start] - Survey written: SURVEY.md captures pre-fix data flow,
  why P2's BUILTIN_TYPES["ParseError"] masks the gap, the minimal-shape fix
  (chase re-export chain in api.js seeder), edge cases (export *, renamed,
  circular), and 5-case test plan.

[2026-05-06] - Implementation: api.js seeder (~lines 790-895) now chases
  re-exports recursively via the importGraph entry's exports[] entries
  (each carries reExportSource from MOD). Memoized per-file
  buildTypeRegistry cache; visited-set keyed by `${absSource}::${name}`
  breaks cycles.

[2026-05-06] - Adjacent fix discovered: auto-gather pre-pass regex only
  matched `import ... from`, so re-export target files weren't in the
  compile set even when the seeder asked for them. Extended regex to
  match `(?:import|export) ... from` so re-export chains pull their
  intermediates into the gathered set.

[2026-05-06] - Tests landed: compiler/tests/unit/api-js-stdlib-enum-reexport.test.js
  with 5 cases (direct re-export, multi-hop chain, exhaustiveness fires
  for missing variant, circular termination, direct-import regression).
  Used fresh enum names (Color, Mode, Status, LoadResult, Phantom) to
  exercise the seeder path rather than the BUILTIN_TYPES["ParseError"]
  shortcut.

[2026-05-06] - Full suite: 8975 + 5 (new) / 44 / 1 / 0 / 9020. No regressions.

## Verdict

GREEN — re-export chase implemented, 5 new tests pass, full suite clean.

## Notes

- BUILTIN_TYPES["ParseError"] grant from Phase 2 left in place; it's now
  defensible-not-required (seeder would also reach ParseError via the
  scrml:data → parse.scrml chain). Future stdlib enum additions like
  SerializeError do NOT need builtin status.
- Out-of-scope re-export forms (documented in SURVEY.md): `export *`,
  renamed re-exports `export { A as B }`. The TAB grammar at
  ast-builder.js:5428 doesn't parse them today; revisit when grammar grows.
