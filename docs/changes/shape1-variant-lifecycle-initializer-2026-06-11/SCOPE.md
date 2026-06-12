# SCOPE — Shape-1 cell variant-progression lifecycle: initializer doesn't resolve

**Filed:** S184 (2026-06-11). **Authorized:** user ruled option (b) "compiler-wire" + "start scoping" on the
Shape-1-variant-lifecycle gap (the S184 lifecycle dog-food R3 finding).

## The gap (narrower than first thought)

A Shape-1 reactive cell with a VARIANT-progression lifecycle annotation + a variant initializer fails:
```
type Phase:enum = { Idle, Active, Done }
<status>: (.Idle to .Done) = .Idle      // E-VARIANT-AMBIGUOUS  (the bug)
```

**Empirical isolation (S184):**
- `status: TicketStatus (Open to Closed)` STRUCT FIELD (§14.12.4) → **compiles clean** (struct-field path resolves it).
- `<status>: (.Idle to .Done)` cell WITHOUT an initializer → **clean** (the annotation parses + tracks fine).
- `<status>: (.Idle to .Done) = .Idle` cell WITH initializer → **E-VARIANT-AMBIGUOUS**.
- fn-return variant `-> (.Tendered to .Assigned)` → **works** (R2) — because a fn-return has NO initializer.

So the lifecycle ANNOTATION is fine. The failure is ONLY the **`= .Variant` initializer**: B20's
bare-variant inference (`inferBareVariantsInExpr`, `type-system.ts annotateNodes`) checks the initializer
`.Idle` against the cell's type, but the cell's type is the lifecycle annotation `(.A to .B)`, which B20
does not recognize as providing enum context → the bare `.Idle` value is ambiguous.

`parseLifecycleReturnAnnotation` (type-system.ts ~19515) deliberately tracks by variant NAME
(`preVariantName`/`postVariantName` strings, matched against discrimination forms) and never resolves the
enum TYPE — correct for tracking, but the initializer is a VALUE that needs the enum.

Presence-progression Shape-1 `(not to T)` works (verified) — `not` needs no enum. Only variant-progression
Shape-1 with an initializer is affected.

## Fix surface (type-system.ts)
- Core: extend B20 `inferBareVariantsInExpr` so a Shape-1 cell whose type is a variant-progression lifecycle
  `(.A to .B)` resolves its `.Variant` initializer against the enum implied by the annotation.
- Mirror the WORKING reference: the struct-field path (`extractLifecycleFields`) already handles
  `TicketStatus (Open to Closed)` — use it as the implementation template.
- `isLifecycleAnnotation` (`buildCellValueLifecycleMap` ~20436) currently requires the annotation to
  start+end with bare parens — so an enum-NAMED form `Phase (.A to .B)` isn't even recognized for a cell
  (only `(.A to .B)`). Whether to extend this depends on the design call below.

## EMBEDDED DESIGN CALL — how does the initializer get its enum? (needs user ruling before dispatch)
The annotation `(.A to .B)` names the variants but not the enum. Two ways to give the initializer an enum:

- **(i) INFER the enum from the annotation's variant names** — scan enums for the one containing {A, B};
  unambiguous → resolve; two enums sharing {A,B} → E-VARIANT-AMBIGUOUS (now only when GENUINE).
  - Makes the PRIMER §14.12.3 table example `<status>: (Idle to Active) = .Idle` work AS WRITTEN (doc was right, impl was missing). Consistent with fn-return (which also names no enum). NO doc change.
- **(ii) REQUIRE the enum name** — canonical `<status>: Phase (.Idle to .Done) = .Idle`, mirroring the
  struct-field form `status: TicketStatus (Open to Closed)` (§14.12.4, the established working precedent).
  - Unambiguous by construction; consistent with struct fields. REQUIRES a §14.12.3 table doc-correction
    (add the enum name) since today's example omits it.

PA lean: **(i) infer** — it makes the existing §14.12.3 doc correct (no doc-debt), matches fn-return's
no-enum-name shape, and the variant set already constrains the enum; genuine ambiguity stays flagged.
But struct-field uses (ii), so this is a real consistency call — user's designer-card.

## Out of scope
- The lifecycle TRACKING itself (works for the no-init annotation). Only the initializer value-resolution.
- Presence-progression Shape-1 (works).
- The double-fire / W-LINT-007 (fixed S184 `3587af46`); the given-arrow migration (done `809044c3`).

## Tests
- `<status>: <enum-form> (.A to .B) = .A` compiles clean + lifecycle E-TYPE-001 tracking works on a
  pre-transition read; a genuinely ambiguous variant set still fires E-VARIANT-AMBIGUOUS; presence-progression
  + struct-field + fn-return paths unchanged (regression).

## RULED — S184 user: option (i) INFER the enum from the annotation's variant names.
No doc-correction needed for option (i) — the §14.12.3 example `<status>: (Idle to Active) = .Idle` should
work as-written once the fix lands. Both BARE `(Idle to Done)` and DOTTED `(.Idle to .Done)` annotation
forms must be supported (struct-field §14.12.4 uses bare-variants-with-named-enum; fn-return §14.12.6 uses
dotted). Genuine cross-enum ambiguity (two enums share the variant set) stays E-VARIANT-AMBIGUOUS.
