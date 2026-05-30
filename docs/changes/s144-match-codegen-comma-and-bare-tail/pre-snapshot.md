# Pre-Snapshot: s144-match-codegen-comma-and-bare-tail (RE-DISPATCH)

Base HEAD: 505f4ace (S143 close, v0.7.0)

## Test baseline (bun test compiler/tests/)
- 22207 pass / 5 fail / 65337 expect() calls / 22436 tests / 841 files
- The 5 fails are PRE-EXISTING (present on clean base before any change). Pre-commit hook passes.

## E2E / pretest baseline
- pretest (scripts/compile-test-samples.sh): 13 samples compiled clean.

## Reproduced bug behavior (baseline, validate-emit ON via compile cmd)
- Bug Y decl  (/tmp/bugy_decl.scrml):   FAILED 1 error E-CODEGEN-INVALID-JS  (`_scrml_tilde_2 = "a" ,;`)
- Bug Y markup (/tmp/bugy_markup.scrml): FAILED 1 error E-CODEGEN-INVALID-JS  (`return "a" ,;`)
- Bug AA       (/tmp/bugaa.scrml):       COMPILES; plain `function bare()` emits
                                          `(function(){...returns...})()` with NO outer return (silent discard);
                                          `fn withReturn()` emits `return (IIFE)()` correctly.

## Invariants that MUST NOT change
- newline-separated arms, `return match`, `fn name() -> T { match }`, `const x = match {...}`,
  block-form `<match for=Type>`, `=>`/`->` arms (no trailing comma) compile clean.
- W-MATCH-VALUE-UNUSED MUST NOT fire for: return match, fn/return-typed, side-effect (block-arm) match,
  or a match that is not the last statement.
