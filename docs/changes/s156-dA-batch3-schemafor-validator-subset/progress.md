# progress — s156-dA-batch3-schemafor-validator-subset

## Phase 0 — survey (DONE)
Worktree base merged main → 7a3c018f (batch2). Tree clean, bun install + pretest OK.

Empirical probe (SF_PROBE instrumentation on type-system walker; reverted) findings:

1. **Subset, no `req`** (`role: Role oneOf([.A,.B])`): walker receives proper subset
   PredicatedType (kind "predicated", baseType "enum", subsetVariants {A,B}, enumBase set).
   BUT classifyFieldForSql returns `no-mapping` (predicated branch → mapPrimitiveToColumnType("enum")
   → null). So currently FIRES E-SCHEMAFOR-NO-SQL-MAPPING incorrectly. FIX: add enum-subset branch.
2. **notIn, no `req`** (`role: Role notIn([.Viewer])`): identical predicated shape, subsetVariants
   already complemented to {Admin,Editor}. Same fix covers it.
3. **Nullable subset** (`role: Role oneOf([.A,.B]) | not`): walker receives union [predicated, not]
   → no-mapping. FIX: union branch's recursive classify must handle the predicated-enum-subset inner.
4. **Subset WITH `req`** (`role: Role oneOf([.A,.B]) req`): field dropped to asIs; walker fallback
   (type-system.ts ~12549) extracts ONLY leading token `Role`, re-resolves to BARE EnumType → emits
   ALL 3 variants. SUBSET LOST (§41.15.6 VIOLATION). FIX: walker fallback re-resolves the type-portion
   via parseEnumSubsetRefinement / resolveTypeExpr instead of bare leading-token.

5. **Deliverable 3 (validator .OneOfFailed)**: CONFIRM only.
   - Form (a) state-cell validator `<role oneOf([.Admin,.Editor])>`: emits
     `_scrml_validator_fire("oneOf", value, ["Admin","Editor"])` — carries the SUBSET. Already correct.
   - Form (b) refinement-TYPE cell: per SPEC §55 notes (L30150-30154) enforced via §53.4 three-zone
     (E-CONTRACT-001 / -RT), NOT the validity surface; "§53.15 introduces no change to the validity
     surface." Distinct enforcement layers (§53.6.2). NO WIRE — by design.

## Phase 1 — implement (IN PROGRESS)

### Phase 1 impl (DONE — emitter + walker)
emit-schema-for.ts:
- factored `enumHasPayloadVariant` helper (shared by full-enum + subset paths)
- classifyFieldForSql predicated branch: enum-subset (baseType="enum"+subsetVariants)
  → bare-enum result with `enumSubset:true`; payload-enum subset still rejects (§53.15.5);
  variant order preserved by base-enum decl order
- union branch propagates `enumSubset` through nullable recursion
- SqlMappingResult bare-enum + SchemaForFieldInfo gain `enumSubset`/`enumSubsetRefinement`
- lowerFieldToSharedCore: when enumSubsetRefinement, DROP user-authored variant-LITERAL
  oneOf/notIn clause; emit §41.15.6 string-literal subset form from bareVariantNames

type-system.ts walker:
- `_schemaForRecoverEnumSubset(clauseRaw, typeRegistry)` helper — isolates the
  `Base oneOf/notIn(...)` type-portion (depth-aware close-paren) + runs canonical
  parseEnumSubsetRefinement, so a subset+req field dropped to asIs recovers the subset
- asIs fallback: subset recovery FIRST (before bare leading-token), composes |not/T?
- union conflict case (`Role oneOf([.A,.B]) req | not` → [asIs,not]): reconstitute
  the subset member from clause so it rides nullable-subset path (nullable wins → req dropped)
- threads enumSubsetRefinement into includedFields

Empirical (probe, instrumentation reverted): 6 cases verified:
1. subset no-req      → text oneOf(['Admin','Editor'])
2. subset WITH req    → text req oneOf(['Admin','Editor'])
3. nullable subset    → text oneOf(['Admin','Editor'])  (no NOT NULL)
4. notIn subset       → text oneOf(['Admin','Editor'])  (complemented)
5. nullable+req conflict → text oneOf(['Admin','Editor'])  (req dropped)
6. full-enum (REGRESSION) → text req oneOf(['Admin','Editor','Viewer'])  (all 3, unchanged)

113 existing schemaFor + batch1/2 tests pass (impl not transiently-red).

## Phase 2 — tests (IN PROGRESS)

### Phase 2 tests (DONE)
compiler/tests/unit/enum-subset-schemafor-da-b3.test.js — 18 tests:
- §A classifyFieldForSql pure-fn: subset→bare-enum SUBSET+enumSubset; base-order;
  notIn complement; nullable union; payload-enum subset rejects; full-enum unchanged;
  non-enum predicated maps to base.
- §B lowerFieldToSharedCore: enumSubsetRefinement drops variant-literal clause + emits
  string-literal subset; nullable drops req; full-enum injects all.
- §C end-to-end DDL (compileToTS→extractSchemaBodyText→parseSchemaBlock→diffSchema):
  subset no-req / WITH req (NOT NULL) / notIn / nullable (no NOT NULL) / nullable+req conflict
  → all assert CHECK (role IN ('Admin','Editor')) — NOT Viewer.
- §D full-enum non-regression (all 3 variants); payload-enum subset (named payload) rejects.
- §E Deliverable 3 CONFIRM — fireOneOf carries exact set passed (subset).

NOTE (pre-existing, out of scope): positional-payload variant syntax `Ok(int)` does NOT
materialize payload Maps at the schemaFor classify layer — so a positional-payload enum
(full OR subset) classifies as bare-enum and misses E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1.
Identical behavior on full-enum + subset paths (verified via probe). NAMED-payload
(`Ok(value: string)`) fires correctly on both. Test uses named-payload to match §8 convention.

190/190 schemaFor + batch1/2/3 + schema-differ tests pass.

## Phase 3 — empirical probe (NEXT)

### Phase 3 empirical probe (DONE — PASS)
Probe /tmp/p3probe/subset.scrml: Post{ role: Role oneOf([.Admin,.Editor]) req,
nullRole: Role oneOf([.Admin,.Editor]) | not, title: string req } + Audit{ actor: Role req }.
End-to-end DDL (parseSchemaBlock → diffSchema sqlite):
  posts.role     → TEXT NOT NULL CHECK ("role" IN ('Admin', 'Editor'))        [subset+req]
  posts.nullRole → TEXT CHECK ("nullRole" IN ('Admin', 'Editor'))             [nullable subset, no NOT NULL]
  audits.actor   → TEXT NOT NULL CHECK ("actor" IN ('Admin', 'Editor', 'Viewer'))  [full-enum, all 3 — NO REGRESSION]
0 E-SCHEMAFOR errors. node --check clean on subset.client.js + scrml-runtime + _scrml/data.js.

Phase 3 criteria a/b/c/d all PASS.

### Full suite
unit+integration+conformance: 15647 pass / 0 fail / 89 skip / 1 todo (826 files).
Pre-commit gate ran clean (exit 0 + browser validation passed) on each of the 3 commits.

## STATUS: COMPLETE
Deliverables 1 (subset CHECK) + 2 (nullable subset) IMPLEMENTED + tested + probe-verified.
Deliverable 3 (.OneOfFailed set) CONFIRMED already-correct (state-cell form carries subset;
refinement-type is §53.4 three-zone not validity-surface — by SPEC design, no wire).
