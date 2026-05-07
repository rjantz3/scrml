---
title: parseVariant implementation — scope + decomposition
date: 2026-05-06
session: S65
authority: debate-05 verdict (5/5 unanimous, judge-ratified)
status: SCOPE — awaiting Bryan's dispatch authorization
---

# parseVariant implementation — scope + decomposition

## Authority

5/5 unanimous panel verdict (debate-05) ratified by debate-judge:
- `scrml-support/docs/debates/debate-05-boundary-parsing-primitive-2026-05-06.md` (transcript)
- `scrml-support/docs/debates/debate-05-judgment-2026-05-06.md` (judgment)
- `scrml-support/design-insights.md` §"Boundary-parsing primitive" (design insight #4)

## Verdict-locked design

### What ships

```scrml
import { parseVariant } from 'scrml:data'

type LoadResult:enum = { Success(rows: int), Empty, Failed(reason: string) }
type LoadError:enum  = { Malformed(reason: string), Network(msg: string) }

server function loadResult()! -> LoadError {
    const raw = fetch("https://api.example.com/results")
    const result = parseVariant(raw, LoadResult) !{
        | ::ParseError msg -> { fail LoadError::Malformed(msg) }
    }
    return result    // typed as LoadResult; <match> exhaustive
}
```

### Constraints (from debate-05 verdict — ALL FOUR are load-bearing)

1. **Second argument MUST be a scrml-native `enum` type descriptor.** Struct types and arbitrary type literals are rejected at compile time. Closes the string-discriminator trap at the type system.
2. **Discriminator key is fixed: the enum's own variant names.** No custom field-name override. No name-mapping table. Wire formats with non-matching shapes (`{type: "SUCCESS"}` vs enum `Success`) require a server-fn normalization step.
3. **Returns typed enum value or fails with `::ParseError msg`.** The function is failable; call site uses standard `!{}` handler pattern.
4. **Companion design statement closes `parseShape` as intentionally absent.** Struct boundary parsing is a server function or §53 boundary-zone refinement on assignment. Documentation must explicitly close this slope or the next request follows.

### What does NOT ship (closed by verdict)

- `parseShape(json, StructType)` — closed as synonym for §53 SPARK boundary refinement on assignment to typed parameter
- `parseArray` — synonym for `[].map(parseVariant(...))`; closed
- `parseRecord`, `parseTuple`, `parsePartial` — closed; document explicitly

## Implementation paths — choose ONE before dispatch

### Path A — compile-time special form (debate panel's mental model)

`parseVariant(json, EnumType)` is recognized by the compiler as a special call form. The second argument is a *type expression*, not a value. The compiler:
1. Resolves `EnumType` to its variant set at compile time
2. Emits monomorphized parser code per call site
3. Verifies (compile-error) that the type argument is an enum, not a struct

**Pros:** clean syntax; matches Crystal `from_json` precedent; type-driven dispatch is paradigm-aligned for scrml's compiler-owns-wiring stance (Pillar 3); zero runtime type-tag overhead.

**Cons:** introduces "type-as-argument" precedent to the language. No prior scrml feature does this; would establish the pattern. Scope-impact on parser, type-system, codegen non-trivial.

### Path B — schema-as-value (existing stdlib pattern)

`parseVariant(json, EnumType.schema)` or `parseVariant(json, schemaOf(EnumType))` — the second argument is a value. The compiler emits a per-enum `schema` synthetic property OR `schemaOf` is a special form returning a runtime descriptor. Stdlib `parseVariant` is a normal function over `(unknown, EnumSchema)`.

**Pros:** smaller language change. Uses existing stdlib calling conventions (`validate(data, schema)` precedent). No "type-as-argument" precedent. Easier to test/iterate.

**Cons:** less ergonomic at call site. The synthetic `.schema` property is itself a language addition. May leak into user code in undesirable ways.

### Path C — hybrid (compiler recognizes call but uses schema substrate)

The compiler recognizes `parseVariant(json, EnumType)` (Path A surface) but DESUGARS it to `parseVariant(json, EnumType.schema)` (Path B substrate) before codegen. User-facing syntax matches debate verdict; implementation is the simpler stdlib pattern.

**Pros:** best of both. Crystal-style call site; existing-stdlib runtime.

**Cons:** desugaring rule needs SPEC entry; added compiler complexity over Path B; compile-time error reporting from desugar must be specced carefully.

**PA lean: Path C.** Best ergonomics + smallest invasive change. Awaiting Bryan's call.

## Decomposition (once path selected)

### Pipeline tier classification

This is **T2** (compiler change with new SPEC surface). T1 (stdlib only) won't work because the function needs compiler-side type-argument or special-form handling.

### Steps

1. **Lock L22 record** — append to `scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md` (or wherever L21 was recorded). Cite debate-05 verdict + judge ratification.
2. **SPEC §10.4 (`scrml:data`)** — add `parseVariant` API entry. Cite §53 SPARK boundary semantics for sequencing rationale.
3. **SPEC §53.x (new subsection)** — formalize the type-establishment-vs-predicate-enforcement sequencing per design insight #4. ~30-50 lines.
4. **SPEC §34 catalog** — add `E-PARSEVARIANT-TYPE-NOT-ENUM` (compile-time error when second arg is not an enum) and `E-PARSEVARIANT-DISCRIMINATOR-MISSING` (runtime, surfaced via `::ParseError`).
5. **Compiler change** — depends on path:
   - Path A: parser recognizes type-as-argument; type-system validates enum-only; codegen emits monomorphized parser
   - Path B: synthetic `.schema` property generation per enum; stdlib `parseVariant` over `(unknown, EnumSchema)`
   - Path C: parser recognizes call form; desugar pass to schema substrate; stdlib runtime
6. **Stdlib `stdlib/data/parse.scrml` (new file)** OR extend `validate.scrml` — implement runtime parser. Includes `ParseError:enum = { Malformed(reason: string), UnknownVariant(tag: string), MissingDiscriminator, InvalidPayload(field: string, reason: string) }`.
7. **`stdlib/data/index.scrml`** — re-export `parseVariant` and `ParseError`.
8. **Tests** — at minimum:
   - Happy path: variant with payload, variant without payload, all variants in single enum
   - Failure paths: missing discriminator, unknown variant, payload type mismatch, second-arg-not-enum (compile error)
   - Edge: nested enums (does `parseVariant` recurse? — answer: no, per minimalism. Document.)
9. **Primer update** — primer §10 stdlib catalog: add `parseVariant` row. Primer §13 locks: add L22. Note Gap #19 closure.
10. **Predicate-gaps inventory** — flip Gap #19 status from "captured" to "closed by parseVariant (debate-05 verdict, S65)" in `scrml-support/docs/predicate-gaps-inventory-2026-05-06.md`.
11. **Kickstarter v2 update** — add `parseVariant` to scrml:data section (line 750 area); add anti-pattern row "parsing untyped JSON without typed boundary → use `parseVariant`".

### Estimated effort

- Path C (lean): ~10-15h focused. Compiler desugar pass + stdlib runtime + spec writing + tests.
- Path A (full): ~20-30h focused. Larger compiler scope.
- Path B (substrate): ~8-12h focused. Smallest change but worst ergonomics.

**Depth-of-survey discount may apply.** Existing parser shape inference (the `<request>`-shape element absorbs typed-response inference per article line 39) may already have machinery that lifts cleanly. Survey-first-phase recommended before committing to a path.

## Risks

1. **Path-selection lock.** Once Path A/B/C is chosen, the SPEC text crystallizes around it. Choose deliberately.
2. **Recursion question.** Does `parseVariant` over an enum whose payload is *another* enum recurse? Recommended: NO. Each level is an explicit call. Forces composition discipline. Document.
3. **Name-mapping insistence from adopters.** External APIs send `{type: "ok"}` against scrml `Ok`. Adopters will request a `discriminatorKey=` or `mapping=` argument. Hold the line — verdict-locked. Server-fn normalization is the answer.
4. **Compile-time errors must be specific.** `parseVariant(json, MyStruct)` should produce a clear "must be enum" message, not a generic type error. Diagnostic quality is worth budget.
5. **The "Type-as-argument" precedent** (Path A or C). If accepted, future requests for `validateAgainst(data, Type)` and similar follow naturally. May be feature, may be slope. Decide consciously.

## Dispatch readiness

When Bryan authorizes:
- Confirm path (A/B/C; PA lean: C)
- Write tier-classified brief per S64 worktree-isolation discipline
- Use `general-purpose` no-isolation per S64 hand-off note 43 (worktree-routing harness bug)
- Strong incremental-commit instructions

## Tags

#parsevariant #scrml-data #predicate-gap-19-closing #debate-05-verdict #L22 #SPEC-10.4 #SPEC-53.x #scope-document
