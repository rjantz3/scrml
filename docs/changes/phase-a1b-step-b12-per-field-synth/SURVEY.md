# A1b Step B12 — per-field synth surface — SURVEY

Phase 0 survey gate per audit §2 item 8: confirm B11's API supports per-field
extension; B8's PASS 6 walker covers compound + supports B12 extension; B7's
dep-graph public API supports B12 emitting cross-field edges.

## §1 B11 surface state at base

After rebasing my worktree onto local main (commit `e4a12fd`, B11 SHIP),
the relevant B11 surface is:

- **`StateCellRecord` extension fields:** `isSynthesized`, `synthProperty`,
  `parentCompound`, `runtimeHookKind` (`compiler/src/symbol-table.ts:241-256`).
- **PASS 8 walker:** `walkRegisterSynthSurface` + `dispatchWalkSynth`
  (`compiler/src/symbol-table.ts:2706-2784`). Walks every state-decl;
  `_cellKind === "compound-parent"` triggers `registerCompoundSynthSurface`
  which inserts 4 synth records into the compound's `_scope.stateCells`.
- **Synth-cell builder:** `makeSynthRecord` (`compiler/src/symbol-table.ts:2633-2657`)
  — hardcoded to compound semantics (declNode = compound's decl, no
  parentField slot).
- **PASS 6 dispatch:** B8's walker calls `checkSynthAssignFire` /
  `checkSynthNestedAssignFire` BEFORE the derived-mutate scan. Both
  guard `if (!hit.record.isCompoundParent) return false;` — explicitly
  documented as "B12's domain" (line 2853, 2853 comment-out: "those
  would be a write into a compound-CHILD's namespace... B12's domain").
- **`lookupQualifiedStateCell`** (`compiler/src/symbol-table.ts:3100-3116`)
  requires every intermediate segment to be `isCompoundParent`.
  Won't descend through a regular field. **B12 must extend this.**
- **Constants:** `SYNTH_PROPERTY_NAMES` (4 names), `COMPOUND_SYNTH_PROPERTIES`
  (4-tuple). `submitted` is in both.
- **Public APIs:** `isSynthesizedCell(record)`, `getSynthRecords(compoundDecl)`.

**Survey verdict:** B11's API is well-shaped for extension. The only
required intervention beyond "add B12 helpers" is RELAXING the
`lookupQualifiedStateCell` descent rule and the PASS 6 compound-only guard.

## §2 B8's PASS 6 walker — extension affordance

B8's PASS 6 walker (`checkExprNodeForMutations` +
`checkReactiveNestedAssign`) is structured around `findDeepestRegisteredOnPrefix`,
a longest-prefix-match resolver that handles single-segment, compound-nav
(depth-2), and intermediate-prefix-resolves cases uniformly (per primer
§13.7 B8 specifics). The audit §1.4 directly says: "B12's per-field
synth-cells are registered at depth-2 (compound + field-name); the prefix
walk will find them."

**Survey verdict:** with B12's `lookupQualifiedStateCell` extension (descent
through any `_scope`), `findDeepestRegisteredOnPrefix` will resolve
`["signup","name"]` to the field cell automatically. B12's PASS 6 work is
just relaxing the compound-only guard plus adding the `submitted`
boundary check.

## §3 B7's dep-graph public API

Per audit §1.5, B12 emits cross-field dep-edges via B10 Phase 3's existing
`validator-reads` infrastructure. **B7's public API does NOT need extension
for B12** — B12 emits ZERO new DG edges. The cross-field reactivity is a
consequence of synth-record annotations + B10 Phase 3's already-wired
edges. Materialization happens at A1c codegen.

**Survey verdict:** B7 contract is sufficient as-is.

## §4 Decision: per-field scope shape

The cleanest design adds a `kind:"field"` `Scope` onto each compound
child's decl node via `declNode._scope`. The three per-field synth records
(`isValid`, `errors`, `touched`) register into that field-scope.
`lookupQualifiedStateCell` is extended to descend through ANY cell with
`_scope` (B11 compound parent's compound-scope OR B12 child's field-scope
— uniform).

**Compound-typed child case** (e.g., `<form><address>...`):
The audit §1.1 says "EVERY compound child" gets the surface. But for a
compound-typed child, B11 ALREADY attached a `kind:"compound"` scope
holding the four compound-level synth records. Those records ARE the
per-field surface for that path (`@form.address.isValid` resolves to a
compound-level synth on `address`'s compound scope). To avoid duplicate /
conflicting synth records on the same scope, B12 SKIPS per-field
registration on compound-typed children. The compound-level synth IS
the per-field view — the two interpretations coincide.

This decision is documented in `registerPerFieldSynthSurface` and tested
in §B12.11.

## §5 8-point brief — coverage check

Per audit §2 — required additions beyond the SCOPE row:

1. ✅ **Per-field surface unconditional** for ALL fields (not just
   validator-tagged) — `registerPerFieldSynthSurface` is called for every
   non-synth, non-compound-typed child regardless of validator presence.
2. ✅ **Three properties per field, NOT four** — `PER_FIELD_SYNTH_PROPERTIES`
   excludes `submitted`; `getPerFieldSynthRecords` iterates 3 entries.
3. ✅ **Type shapes per §55** — per-field `errors` records carry
   `synthProperty: "errors"`; documented in primer §13.7 B12 row that the
   shape is array-of-tags, not singular-string. Type-system materialization
   is A1c codegen.
4. ✅ **E-SYNTHESIZED-WRITE walker extension** — relaxed B11's
   compound-only guard in both `checkSynthAssignFire` and
   `checkSynthNestedAssignFire`. Per-field firing covers the 3 per-field
   properties; `submitted` write at per-field is OOS (returns false).
5. ✅ **Cross-field deps consume B7** — no new DG edges; relies on B10
   Phase 3's existing `validator-reads` infrastructure.
6. ✅ **`touched` runtime-hook annotations** — `B12_PER_FIELD_RUNTIME_HOOK`
   table mirrors B11's; `touched` is `"touch"` per §55.7 line 24457.
7. ✅ **Sequential after B11** — B12 dispatch fires after B11 lands;
   worktree rebased onto B11 SHIP.
8. ✅ **Phase-0 survey gate** — this document.

## §6 Cost actual vs estimate

Audit §3 estimated 3-5h. Actual implementation ~1h (mostly because B11's
infrastructure was very clean and the audit's brief was precise). Tests
+ docs ~45min.

## §7 Tags

#a1b-b12 #per-field-synth #l11-edge-b #§55.6 #b11-extension
#field-scope #s68
