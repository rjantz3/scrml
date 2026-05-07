---
title: parseVariant implementation — scope + decomposition
date: 2026-05-06
session: S65
authority: debate-05 verdict (5/5 unanimous, judge-ratified) + S65 Path-A architectural commit
status: SCOPE LOCKED — Path A · awaiting dispatch authorization
path: A (compile-time special form — type-as-argument as language primitive)
family: parseVariant is FIRST member of type-as-argument feature family
roadmap: parseVariant → serialize → formFor → schemaFor → tableFor → variantNames + reflective metadata
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

## Implementation path — LOCKED: Path A (compile-time special form)

**Decision:** S65 — Bryan locked Path A after evaluating the type-as-argument feature pipeline. **`parseVariant` is the FIRST member of a type-as-argument family**, not a one-off. The architectural commit is paid here, once; subsequent family members ride on the precedent.

### What Path A means

`parseVariant(json, EnumType)` is recognized by the compiler as a special call form. The second argument is a **type expression**, not a value. The compiler:
1. Resolves `EnumType` to its variant set at compile time (parser + type-system pass)
2. Emits monomorphized parser code per call site (codegen pass)
3. Verifies (compile-error: `E-PARSEVARIANT-TYPE-NOT-ENUM`) that the type argument is a scrml-native enum, not a struct/named-shape/literal

### Why Path A (over B/C)

The deciding factor is **the family**, not parseVariant itself:

| Future family member | Path A enables | Path C blocks |
|---|---|---|
| `serialize(value, Type)` | ✅ symmetric with parseVariant; reuses precedent | ⚠️ requires retrofit |
| `formFor(StructType)` | ✅ requires compile-time structural walk of type | ❌ desugar can't carry structural walk |
| `schemaFor(StructType)` | ✅ requires compile-time field+predicate enumeration | ❌ same |
| `tableFor(StructType, rows)` | ✅ same family | ❌ same |
| `variantNames(EnumType)` | ✅ reflective metadata via type-as-argument | ⚠️ requires synthetic `.foo` property explosion |

**Two of these (`formFor`, `tableFor`, `schemaFor`) genuinely require type-as-argument as a structural language concept**, not as a desugar trick. Without Path A here, the language hits a wall at `formFor` and has to retrofit type-as-argument anyway. Pay the architectural cost ONCE; harvest across the family.

### The discipline that bounds Path A's surface

Path A opens a door. The discipline that prevents bloat:

1. **Per-shape sliver test mandatory** for every future type-as-argument addition (debate-02 + debate-04 methodology)
2. **Synonym-detection precondition** (debate-04) — every candidate must produce a distinct semantic shape vs. existing primitives
3. **Asymmetric-forfeit-cost decomposition** (debate-03) — every candidate weighs SHIP-and-wrong vs DON'T-SHIP-and-wrong honestly
4. **No `Type.foo` request enters the language without its own deep-dive + debate** if the convener has any doubt

Without these, Path A is the slippery slope simplicity-defender warned about. With them, Path A is the load-bearing infrastructure for a family of 5-7 high-leverage features that scrml's existing design center already points at.

### Family roadmap (concrete shipping order)

1. **`parseVariant`** — THIS DOC. Establishes the type-as-argument precedent + ParseError type + compile-time enum-only verification
2. **`serialize`** — symmetric counterpart; round-trips with parseVariant; same type-as-argument machinery
3. **`formFor(StructType)`** — flagship. Walks struct fields → emits `<form>` markup tree using existing Shape 2 + auto-synth validity surface + `<errors of=>` machinery. Closes Gaps #19 + #20 (validator-set transform via `pick=`/`omit=`/`partial=true`)
4. **`schemaFor(StructType)`** — emits `<schema>` SQL DDL from struct predicates. Closes the §39 + L4 vocabulary-unification loop ("define type once → schema, form, validator, parser all derive")
5. **`tableFor(StructType, rows)`** — auto-`<table>` from struct + rows; per-column slot overrides; sorting/selection/empty-state attrs
6. **`variantNames(EnumType)` / reflective metadata** — small primitives that tighten the family

Each member is its own dispatch with its own deep-dive when it fires. **The architectural commitment is THIS DOC.**

### Family demo (the "we are not React" pitch)

```scrml
type User:struct = {
    name:  string req length(>=2)
    email: string(email) req unique
    age:   int min(13) max(120)
}

<schema>${schemaFor(User)}</>
<users>: [User] = []

<program>
    ${ async () => @users = await loadUsers() }
    <{formFor(User, submit=createUser)}/>
    <{tableFor(User, rows=@users)}/>
</>

server function createUser(input)! -> CreateError {
    ?{ insert into users values (${input.name}, ${input.email}, ${input.age}) }
    @users = await loadUsers()
}
```

One struct definition + five lines of glue → SQL schema with constraints, working form with validation, working table with rendered cells, full reactive lifecycle, zero npm packages. **scrml.dev flagship demo.**

## Decomposition (once path selected)

### Pipeline tier classification

This is **T2** (compiler change with new SPEC surface). T1 (stdlib only) won't work — the function needs compiler-side type-argument handling.

### Steps (Path A)

1. **Lock L22 record** — append to `scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md` (or wherever L21 was recorded). L22 phrasing: *"Type-as-argument is a first-class scrml language primitive, introduced by `parseVariant`. Foundation for the type-as-argument family (`serialize`, `formFor`, `schemaFor`, `tableFor`, reflective metadata). Each future family member must independently pass per-shape sliver test + synonym-detection precondition + asymmetric-forfeit-cost decomposition."* Cite debate-05 verdict + judge ratification + S65 family-roadmap commit.

2. **SPEC §10.4 (`scrml:data`)** — add `parseVariant` API entry with full call signature, second-arg type-constraint (enum-only), `::ParseError` failure type, exhaustive failure-variant list. Cite §53 SPARK boundary semantics for type-establishment-vs-predicate-enforcement sequencing. ~40-60 lines.

3. **SPEC §53.x (new subsection — "Type-as-argument primitives")** — formalize type-as-argument as a language concept per design insight #4. Distinguishes type-establishment step (constructor selection from discriminator) from predicate-enforcement step (SPARK boundary refinement). Documents the discipline that bounds the family (sliver test mandatory; synonym detection mandatory; per-feature deep-dive). ~80-120 lines (load-bearing for the family; first member specification carries the architectural framing).

4. **SPEC §34 catalog** — add error codes:
   - `E-PARSEVARIANT-TYPE-NOT-ENUM` — compile-time; second arg is not a scrml-native enum
   - `E-PARSEVARIANT-DISCRIMINATOR-MISSING` — runtime, surfaced via `::ParseError::MissingDiscriminator`
   - `E-PARSEVARIANT-UNKNOWN-VARIANT` — runtime, via `::ParseError::UnknownVariant(tag)`
   - `E-PARSEVARIANT-INVALID-PAYLOAD` — runtime, via `::ParseError::InvalidPayload(field, reason)`

5. **Compiler change (Path A scope):**
   - **Parser:** recognize `parseVariant(expr, TypeRef)` as a call form where the second positional arg is a TypeRef AST node, not an Expr. Same kind of recognition the compiler already does for type annotations after `:`.
   - **Type-system:** at the call site, resolve TypeRef → enum metadata; reject struct/named-shape/literal types with `E-PARSEVARIANT-TYPE-NOT-ENUM`; thread the enum's variant set into codegen.
   - **Codegen:** emit monomorphized parser per call site, walking the resolved enum's variant declarations to generate the discriminator dispatch + per-variant payload-shape verification + ParseError construction.
   - **Self-host shim:** if self-host pipeline depends on this surface, add to `parser-workarounds.js` setBPPOverrides hook.
   - **Survey first** — before committing implementation specifics, run a 1-2h survey of existing type-resolution machinery (`type-system.ts`, `ast-builder.js` for type annotations, `codegen/` for any existing per-type specialization). Depth-of-survey discount likely applies; existing infrastructure may carry more than the brief assumes.

6. **Stdlib `stdlib/data/parse.scrml` (new file)** — declares `ParseError:enum` with the four variants. Provides any per-call-site runtime helpers the compiler-emitted code needs (e.g., common type-coercion routines for primitive payloads). Most parsing logic is monomorphized at the call site; this file is mostly the error-type declaration + helpers. Smaller than expected.

7. **`stdlib/data/index.scrml`** — re-export `parseVariant` (special-form name) and `ParseError`.

8. **Tests** — comprehensive:
   - Happy path: variant-with-payload, variant-without-payload, mixed enums, all-variants-tested
   - Failure paths: missing discriminator, unknown variant, payload type mismatch (per-primitive), nested-payload mismatch
   - Compile-time errors: `parseVariant(json, MyStruct)` → E-PARSEVARIANT-TYPE-NOT-ENUM with helpful message; `parseVariant(json, "Foo")` → same; `parseVariant(json)` (arity) → standard arity error
   - Edge cases: enum with single variant, enum with one no-payload variant + one with payload, empty enum (compile-error E-EMPTY-ENUM if scrml has such; otherwise document)
   - Recursion question: nested enums — `parseVariant` does NOT recurse on payload-typed-as-enum. Document. Dev calls `parseVariant` again at the inner site if needed. (Forces composition discipline; matches family's sliver-test minimalism.)

9. **Primer update**:
   - §10 stdlib catalog: add `parseVariant` row + `ParseError` enum description
   - §13 locks: add L22 entry
   - §13.5 spec-real-estate-vs-adoption table: parseVariant now ACTIVE
   - **§14 (NEW) Type-as-argument family** — short reference paragraph naming the 5-member family with shipped/planned status; cross-references SPEC §53.x

10. **Predicate-gaps inventory update** — `scrml-support/docs/predicate-gaps-inventory-2026-05-06.md`: flip Gap #19 status from "captured" to "CLOSED by parseVariant (debate-05 verdict + Path-A architectural commit, S65)". Add note: Gap #20 (validator-set transform operators) still open; planned closure via `formFor(StructType, pick=/omit=/partial=)` (next family member after `serialize`).

11. **Kickstarter v2 update** — add `parseVariant` to scrml:data section (line 750 area); update anti-pattern row "parsing untyped JSON without typed boundary" to point at `parseVariant`. Add section §11.X "Type-as-argument primitives" with parseVariant as the worked example + family roadmap.

12. **Family-precedent doc (NEW)** — `scrml-support/docs/type-as-argument-family-2026-05-06.md` records: (a) the 5-7 family members with sliver-test status per member, (b) the discipline that bounds future additions, (c) the design insight #4 reasoning that grounds the family (type-establishment vs predicate-enforcement sequencing). This is the doc future PA's read when a new `Type.foo` request lands and they need to apply the discipline.

### Estimated effort (Path A)

**~20-30h focused** for parseVariant alone. Breakdown:
- Spec writing (§10.4 + §53.x + §34 + family-precedent doc): ~6-8h
- Compiler change (parser + type-system + codegen): ~10-15h (depth-of-survey discount may apply)
- Stdlib runtime + tests: ~3-5h
- Primer + kickstarter + inventory updates: ~1-2h
- Lock L22 record + family doc: ~1-2h

**Survey-first phase mandatory.** Existing type-resolution machinery may carry significant fraction of the compiler change. Audit recommends 1-2h dedicated survey before per-step decomposition (per S64 depth-of-survey-discount methodology).

**Family economics:** the 20-30h here pays for `serialize` (~10-15h riding precedent), `formFor` (~25-40h flagship), `schemaFor` (~15-25h), `tableFor` (~15-25h), reflective metadata (~5-10h). **~85-145h total family**, of which ~20-30h is the architectural commit here. The remaining ~65-115h is harvest across the next 6-12 months.

## Risks

1. **Recursion question.** Does `parseVariant` over an enum whose payload is *another* enum recurse? **Recommended: NO** — each level is an explicit call. Forces composition discipline; matches family's sliver-test minimalism. Document explicitly in §10.4 entry. Adopters who want recursion compose `parseVariant` at each level.

2. **Name-mapping insistence from adopters.** External APIs send `{type: "ok"}` against scrml `Ok`. Adopters will request a `discriminatorKey=` or `mapping=` argument. **Hold the line — verdict-locked.** Server-fn normalization is the canonical answer. The variant-name-as-fixed-key constraint is the type-system-level enforcement of the string-discriminator-trap mitigation.

3. **Compile-time errors must be specific.** `parseVariant(json, MyStruct)` should produce a clear "second argument must be a scrml-native enum type — got struct" message, not a generic type error. Diagnostic quality is worth dedicated budget. The compile-error message is the doc adopters first encounter.

4. **Type-as-argument precedent floodgate.** Path A's value comes from the family — but the family discipline (sliver test + synonym detection + per-feature deep-dive) MUST be applied with full force on every future addition. Without that discipline, every `Type.foo` request becomes a credible feature ask. The family-precedent doc (Step 12) records the discipline so future PA's apply it automatically.

5. **Survey-first phase under-scoped.** The 1-2h survey before per-step decomposition is mandatory, not advisory. Existing type-resolution + codegen specialization machinery may make Path A's compiler scope significantly smaller than estimated. If the survey reveals a 4-6x discount (per depth-of-survey pattern), update the dispatch brief BEFORE firing implementation.

## Dispatch readiness

When Bryan authorizes:
- **Path A LOCKED** — no further architectural review needed
- Survey-first phase: ~1-2h dedicated diagnostic dispatch BEFORE implementation per-step decomposition
- Write tier-classified brief per S64 worktree-isolation discipline (paste absolute worktree path; bun install + bun run pretest in startup verification)
- Use `general-purpose` no-isolation per S64 hand-off note 43 (worktree-routing harness bug)
- Strong incremental-commit instructions per pa.md §"Background Agents"
- Brief MUST include: `docs/articles/llm-kickstarter-v1-2026-04-25.md` + `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` (per S64 PA-orchestration discipline)
- Dispatch brief MUST cite: this SCOPE doc + debate-05 transcript + judgment + design insight #4

## Tags

#parsevariant #scrml-data #predicate-gap-19-closing #debate-05-verdict #path-A-locked #L22 #SPEC-10.4 #SPEC-53.x #type-as-argument-family #serialize-next #formfor-flagship #schemafor #tablefor #scope-document
