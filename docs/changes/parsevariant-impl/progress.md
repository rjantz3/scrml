# parseVariant implementation — progress

## Phase 1 — STATUS

[2026-05-06 20:35] - Startup verification: pwd=/home/bryan-maclee/scrmlMaster/scrmlTS; HEAD=2d38e000 (matches expected); `bun run pretest` passed (12 samples compiled).
[2026-05-06 20:38] - L22 record landed at scrml-support: commit `5e25586` (lock: L22 type-as-argument language primitive (S65 debate-05 + Path A)). Adds §3.22 detail, lock-table row, and source-artifact cross-refs in `docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`.
[2026-05-06 20:42] - stdlib/data/parse.scrml created + stdlib/data/index.scrml re-export added: commit `c2fc731` on scrmlTS (this commit also bundled SPEC §41.13 from parallel Phase 3 work). parse.scrml declares `ParseError:enum` (4 variants: MissingDiscriminator, UnknownVariant(tag), InvalidPayload(field, reason), Malformed(reason)) plus `parseVariant(json, T)! -> ParseError` marker export with defensive runtime fallback.
[2026-05-06 20:48] - Sniff test result: **PASS**. Two scrml fixtures compiled clean against `import { ParseError } from 'scrml:data'`:
  - Fixture 1 (qualified + bare-dot variant access): `ParseError.Malformed(...)`, `.MissingDiscriminator`, `.UnknownVariant("foo")`, `.InvalidPayload(f, r)` all type-resolve and codegen.
  - Fixture 2 (exhaustive match): all four `ParseError` variants matched in a `match e { ... }` block — compiled clean. Cross-file stdlib enum import resolves into the importing file's typeRegistry, including for exhaustiveness checking. Risk #1 (cross-file stdlib enum resolution) is **CLOSED**.
[2026-05-06 20:50] - Full suite: **8941 pass / 44 skip / 1 todo / 0 fail / 8986 total**. Exact baseline match. Zero new failures from Phase 1 changes.

## Phase 1 verdict

**GREEN.**

- L22 lock recorded at scrml-support (commit `5e25586`).
- ParseError + parseVariant marker scaffold landed at scrmlTS (commit `c2fc731`).
- Cross-file stdlib enum import resolution VERIFIED — Risk #1 closed.
- Exhaustiveness check VERIFIED against ParseError.
- Full test suite green, baseline unchanged.

Phase 2 (TS pass + codegen — `E-PARSEVARIANT-TYPE-NOT-ENUM` riding the `E-ENGINE-004` helper, plus `emit-parse-variant.ts` modeled on `emit-machines.ts`) can fire.

## Notes for Phase 2 dispatch

- The committed parse.scrml is the marker stub. Phase 2 codegen at each call site supersedes it; the body's `fail ParseError.Malformed("internal: parseVariant not monomorphized at call site")` is a defensive fallback only.
- `compiler/SPEC.md` §41.13 (parseVariant API entry) was added in the same commit as the stdlib scaffold (parallel Phase 3 work bundled in). Phase 3's remaining items (§53.10 type-as-argument family subsection + §34 catalog adds + family-precedent doc + primer/kickstarter updates) still need to fire.
- `!{}` handler integration verified at the type-resolution level via the exhaustive-match sniff; full `!{}` codegen integration will be exercised in Phase 2 once the call's failure-type is annotated by the TS pass.
