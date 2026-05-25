---
status: in-progress
started: 2026-05-25
worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a62e146b0484f8f5b
branch: worktree-agent-a62e146b0484f8f5b
base-sha: ee0d048eb5138a48319c81e8f999e3d6e3b69b78 (after merge main)
---

# Lifecycle Landing 1 — E-TYPE-001 access-before-transition fire

## Step 1 — startup verification + authority-doc reading — DONE 2026-05-25
- worktree verified
- main merged in (FF, no conflicts)
- bun install + pretest clean
- read: docs/heads-up/lifecycle-annotation-extension-2026-05-25.md (HU-1 ratifications)
- read: scrml-support/docs/deep-dives/lifecycle-annotation-extension-and-flagship-scope-2026-05-25.md (DD)
- read: .claude/maps/primary.map.md (watermark 3a909c1d, S127)

## Step 2 — Phase 0 root-cause confirmation — DONE 2026-05-25
Confirmed all three assumptions in the brief:

1. `(A -> B)` IS parsed today
   - parseStructBody at type-system.ts:1106 calls resolveTypeExpr
   - resolveTypeExpr at line 1444 detects `->` and recurses on RHS
   - Existing tests at type-system.test.js:399 + :1243 use OBSOLETE `(null -> string)` syntax (S89 migration not applied to these tests)

2. Resolver IS producing type B without per-access tracking
   - resolveTypeExpr:1444-1453 returns post-transition type B
   - No metadata on the resolved type indicating "this was a lifecycle annotation"
   - Field consumers (checkStructFieldAccess at 6544 + the formFor/schemaFor/tableFor sites at 10519/10937/11565) see only the resolved type B

3. E-TYPE-001 is REGISTERED but lifecycle fire site is MISSING
   - E-TYPE-001 fires at codegen/emit-logic.ts:822, :1876 for §14.11 positional-arity mismatch
   - No fire site for §14.3 lifecycle access-before-transition
   - SPEC §14.3 line 7106 normatively requires this fire

## Step 3 — Phase 0.5 implementation-design pick — DONE 2026-05-25

### Surfacing the options

**(α) Type-system tags the resolved type with a lifecycle-state metadata field; resolver consults at access**
- Add a new ResolvedType variant `LifecycleType { kind: "lifecycle"; preType: ResolvedType; postType: ResolvedType }` OR add an optional `lifecycle?: { preType: ResolvedType }` annotation on existing types
- resolveTypeExpr produces this rich type instead of dropping the pre-state
- checkStructFieldAccess (or a new check function) consults the type + a per-binding transition map to decide whether to fire E-TYPE-001
- PRO: type-aligned; preserves the semantics in the type itself
- CON: every existing consumer of ResolvedType needs to handle the new variant or unwrap; ripple risk across the 12.9k-line type-system + downstream code (formFor/schemaFor/tableFor classifications). Existing tests assert resolved type IS `string` (post-transition), so wrapping would break them.

**(β) Symbol-table tracks per-binding lifecycle state separately; intersects at access**
- New side-table: `Map<bindingName, Map<fieldName, "pre" | "post">>` per scope
- resolveTypeExpr STAYS producing type B (no ripple)
- A new check function `checkLifecycleFieldAccess` (or extension to checkStructFieldAccess) walks fn bodies the same way `checkFunctionBodyStateCompleteness` does: collect bindings, track field assignments as transitions, fire E-TYPE-001 on pre-transition access
- Type-side metadata: minimal — a new `Map<typeName, Map<fieldName, {preType, postType}>>` registry of lifecycle fields per struct type (built during buildTypeRegistry from the raw `(A -> B)` syntax)
- PRO: zero ripple — resolveTypeExpr unchanged, formFor/schemaFor/tableFor unchanged, existing tests pass
- PRO: directly mirrors checkFunctionBodyStateCompleteness (existing precedent in this file)
- CON: introduces a new pass-like analysis; the binding→state tracking duplicates some scope-walking
- CON: predicate vs lifecycle disambiguation still needed at parse-time (already partially present via `->` detection)

**(γ) Codegen-time check (would push E-TYPE-001 into a different pass)**
- Eliminated: pushes a §14.3 type-system semantic into codegen; mismatches stage contract
- E-TYPE-001 is a TS-stage diagnostic per §34 catalog; firing from codegen would be a stage-discipline violation

**(δ) Per-scope analysis pass (separate walker)**
- Effectively a variant of β where the lifecycle walk is a top-level pass distinct from checkStructFieldAccess
- Could land as a sibling of checkFunctionBodyStateCompleteness
- Slightly heavier than β but cleaner separation of concerns

### PICKED: (β) — symbol-table side-table with binding-tracking

**Rationale:**
- Smallest correct surface that closes the SPEC promise
- Zero ripple to existing ResolvedType consumers
- Mirrors the proven shape of checkFunctionBodyStateCompleteness (state-instance collection + field-assignment tracking)
- Predicate-vs-lifecycle disambiguation already partially handled by `->` detection at parse time
- Test surface lives at the same shape as existing checkStructFieldAccess tests (§10/§11)
- Bounded scope per the brief — Landing 1 is bug-fix-sized, not a refactor

**Implementation outline:**
1. New registry built at buildTypeRegistry time: `Map<structName, Map<fieldName, {preType: ResolvedType, postType: ResolvedType}>>` recording lifecycle fields per struct
2. Extend parseStructBody to RECORD lifecycle fields into this registry as it encounters `(A -> B)` patterns (without changing what it returns)
3. NEW exported function `checkLifecycleFieldAccess(body, scopeChain, typeRegistry, lifecycleRegistry, errors)`:
   - Walks statements collecting `let x = StructLiteral{...}` bindings (with initial transition state per field — initial value B-shape = `"post"`, B-shape value `not` = `"pre"`)
   - Tracks `x.field = value` as transition to `"post"` (Landing 1 simple transition-marker; more elaborate per Q3 Phase 2 sub-question)
   - At every `x.field` read site: if field is lifecycle AND state is `"pre"`, fire E-TYPE-001
4. New test file `compiler/tests/unit/type-system-lifecycle.test.js` covering the 5 cases in the brief

## Step 4 — Implementation — DONE 2026-05-25

### Step 4.1 — Lifecycle registry builder (LANDED)
- `LifecycleFieldSpec` interface + `LifecycleRegistry` type alias added near ResolvedType discriminated union (type-system.ts)
- `buildLifecycleRegistry(typeDecls, typeRegistry)` — extracts `(A -> B)` lifecycle fields per struct
- `extractLifecycleFields(raw, typeRegistry)` — per-struct-body extractor
- `findTopLevelArrow(inner)` — depth-aware whitespace-tolerant `->` detector (handles `->`, `- >`, `-  >` produced by parser tokenization)
- `formatTypeForDiagnostic(t)` — compact human-readable type label for E-TYPE-001 messages
- Exported from type-system.ts

### Step 4.2 — Per-access transition-state checker (LANDED)
- `checkLifecycleFieldAccess(body, structInstances, lifecycleRegistry, errors, fileSpan, initialFieldStates?)` — statement-by-statement walker that fires E-TYPE-001 on pre-transition reads
- Per-binding transition state map: bindingName → fieldName → "pre" | "post"
- Write detector (`FIELD_WRITE_RE`) + read detector (`FIELD_REF_RE`); writes processed before reads in left-to-right source order
- Recurses into child node arrays (body, children, consequent, alternate, then, else, arms.body) — mirrors checkFunctionBodyStateCompleteness:13032
- Skips nested function-decl bodies (own scope; Landing 2 may extend if needed)
- `statementText(node)` — text-fragment extractor; covers value/expr/text/raw/init/exprNode/initExpr (with dedup via Set)
- Diagnostic message names: binding, field, type, pre-state, post-state, resolution path, SPEC §14.3 anchor
- Exported from type-system.ts

### Step 4.3 — Pipeline integration (LANDED)
- `runLifecycleAccessCheck(topNodes, typeRegistry, lifecycleRegistry, errors, fileSpan)` — file-level driver
- `readInitText(node)` helper — multi-source init reconstruction (handles parser's `init` field, `initExpr.raw` escape-hatch, structured `emitStringFromTree`, fallback `value`)
- `collectStructBindings(nodes)` — collects bindingName → structTypeName + initial field states
- `recordInitialFromAttrs(stmt, ...)` + `recordInitialFromAttrText(text, ...)` — seeds POST state for fields initialized at construction
- Wired into `processFile` after annotateNodes, before the §51.9 reactive-bindings collector
- Builds the per-file lifecycleRegistry once during the type-registry phase (line ~11916)

### Step 4.4 — Unit tests (27/27 pass)
- File: `compiler/tests/unit/type-system-lifecycle.test.js`
- 7 describe blocks: §L1 buildLifecycleRegistry / §L2-L6 checkLifecycleFieldAccess per case / §L7 edge cases
- Covers all 5 brief-mandated cases + 7 edge cases:
  - Pre-transition fire (3 tests)
  - Post-transition pass (2 tests)
  - Non-lifecycle field unaffected (3 tests)
  - Per-binding tracking (3 tests)
  - B-shape initial value (2 tests)
  - Edge cases: non-tracked binding / empty registry / empty bindings / if-branch nested / branch-write conservative / multi-field independence / write-LHS-no-fire / diagnostic message contents

### Step 4.5 — Integration tests (6/6 pass)
- File: `compiler/tests/integration/lifecycle-access-pipeline.test.js`
- End-to-end pipeline fires: full compileScrml() invocation
- 6 cases mirror unit test surface at the pipeline-shape:
  - SPEC §14.3 worked example fires E-TYPE-001
  - Post-transition pass
  - Non-lifecycle field pass
  - No-lifecycle-struct pass
  - Attribute-style construction seeds POST
  - Diagnostic message shape (binding + field + types + SPEC anchor + Resolution)

### Test surface summary
- 27 unit tests + 6 integration tests = 33 new tests
- All pass; zero pre-existing test regressions in unit+conformance suites (12484/12484 pass)
- Pre-commit gate passed at the final commit

### Issues found + resolved during integration
1. Parser produces `( not - > string )` (spaces around `->`) — `findTopLevelArrow` made whitespace-tolerant
2. `let-decl` uses `init`/`initExpr` fields, not `value` — `statementText` + new `readInitText` helper accept both
3. Parser collapses subsequent statements into a single `let-decl` init when statement-boundary detection fails (separate parser-shape issue surfaced via [scrml] warnings) — my walker handles this correctly because the collapsed text contains both the construction and the subsequent reads/writes
4. Initial unit-test failures were `Set`-dedup issues (parser populates both `value` AND `expr` with same string) — `statementText` deduplicates via Set
