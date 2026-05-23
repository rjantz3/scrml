# Pre-Snapshot: m6.1-meta-eval-native-migration

Recorded 2026-05-23 before any code changes.

## Test baselines

- **unit:** 11579 pass / 0 fail / 44 skip (525 files, 11623 tests)
- **integration:** 1857 pass / 0 fail / 18 skip / 1 todo (75 files, 1876 tests)
- **conformance:** 383 pass / 0 fail / 30 skip (105 files, 413 tests)
- **meta-eval focused:** 35 pass / 0 fail (104 expect() calls)

## Pre-existing notes

- The `import { assertEqual ... }` parse error printed during integration is pre-existing — not introduced by this change.
- The conformance "return ok" parse-error printout is also pre-existing.

## Change scope

Migrate `compiler/src/meta-eval.ts:366-367` away from the hard-bound
`splitBlocks("__meta_emit__", normalized) + buildAST(bsOutput)` pair to
`nativeParseFile("__meta_emit__", normalized)` from
`compiler/native-parser/parse-file.js`.

The synthesized source is **scrml**: meta-eval's `emit()` produces scrml
source text (markup + structural blocks + logic). The native equivalent is the
C1 assembler `nativeParseFile`, which returns the identical
`{ filePath, ast: FileAST, errors }` shape that the existing code consumes.

## Tags
#scrmlts #m6.1 #meta-eval #native-parser #pre-snapshot

## Links
- [/home/bryan/scrmlMaster/scrml-support/docs/deep-dives/m6-joint-retirement-cutover-plan-2026-05-23.md](../../../../../scrml-support/docs/deep-dives/m6-joint-retirement-cutover-plan-2026-05-23.md)
- [compiler/src/meta-eval.ts](../../../compiler/src/meta-eval.ts)
- [compiler/native-parser/parse-file.js](../../../compiler/native-parser/parse-file.js)
