# Progress: phase-a1a-step-11-5-fold-derived

## Tier classification

**T2 — Standard.** Multi-file but single subsystem boundary (the AST `kind` discriminator). No new contracts; the unified target shape `state-decl{shape:"derived",isConst:true,structuralForm:false}` already exists per Step 4 (S59 `96dbe92`). Mechanical sweep across 10 src files + 11 test files. Risk surface (codegen byte-shift) confirmed but bounded — fold preserves byte-output for the legacy form by routing on `shape === "derived"` AND `structuralForm === false`.

## Cumulative log

- [start] Branch `phase-a1a-step-11-5-fold-derived` created from main HEAD `b3c446d`.
- [start] Baseline confirmed: 8874 pass / 43 skip / 0 fail / 8917 across 439 files. Matches BRIEF.
- [survey] Grep counts: src/=10 files (32 refs), tests/=11 files, self-host/=6 files (16 refs).
- [survey] Codegen byte-shift confirmed via two probe compiles — see Survey §Codegen-byte-output below. Fold preserves legacy byte-output. Shape-3-derived latent codegen gap (pre-existing) NOT fixed in this step; documented for A1c.

## Survey

### §Construction sites

**File: `compiler/src/ast-builder.js`** — TWO construction sites:

1. **L3678 / L3680** — inside `parseOneStatement` (nested-statement branch, called within compound bodies and other nested contexts). Path: `if (tok.kind === "KEYWORD" && tok.text === "const")` → `if (peek().kind === "AT_IDENT")` → constructs `kind: "reactive-derived-decl"`. Two return points: with `=` (L3678) and without `=` (L3680).
2. **L5891 / L5901** — top-level branch (`buildLogicNodes`). Same shape: const + AT_IDENT → push `kind: "reactive-derived-decl"`. Two push points: with `=` (L5891) and without `=` (L5901).

Total: 4 construction lines across 2 sites.

### §Consumer sites — disposition table

| File | Line(s) | Today | Disposition |
|---|---|---|---|
| `compiler/src/codegen/emit-bindings.ts` | 96 | `if (stmt.kind === "state-decl" \|\| stmt.kind === "reactive-derived-decl")` | DROP `\|\| reactive-derived-decl` clause (state-decl covers post-fold). |
| `compiler/src/route-inference.ts` | 1066, 1225 | `case "reactive-derived-decl":` (fall-through to state-decl identical handling) | DELETE both cases. |
| `compiler/src/types/ast.ts` | 562-570 | `interface ReactiveDerivedDeclNode` | DELETE interface + remove from `LogicStatement` union (L1128). |
| `compiler/src/component-expander.ts` | 1104, 1113 | `case "reactive-derived-decl":` + `n.kind === "reactive-derived-decl"` in shadow logic | DELETE case (state-decl covers); drop `\|\| n.kind === "reactive-derived-decl"` clause. Plus delete the `ReactiveDerivedDeclNode` import + type-union entry. |
| `compiler/src/dependency-graph.ts` | 466-489 (collectAllReactiveDerivedDecls), 663-664, 877-908, 1079-1108, 1129 | DEDICATED collector + walker resolving `_pendingDerivedReads`/Callees. Critical — derived nodes go through a SECOND loop after `collectAllReactiveDecls` sets up base dgNodes. | RENAME to `collectAllStateDeclsWithDerivedShape`; FILTER on `kind === "state-decl" && shape === "derived"`. Drop `\|\| reactive-derived-decl` from L664 (state-decl covers). Update L1129 to `kind === "state-decl"` (combined with bare-expr). Update import. |
| `compiler/src/codegen/emit-client.ts` | 72 (comment), 147 | `case "reactive-derived-decl": chunks.add("derived")` | REPLACE: state-decl with `shape === "derived"` branch adds "derived" chunk. Currently L156-158 state-decl always adds `deep_reactive`. Need: state-decl always adds `deep_reactive`, plus IF shape derived also `derived`. |
| `compiler/src/codegen/reactive-deps.ts` | 150, 220, 388 | Three filters on `kind === "reactive-derived-decl"` | REPLACE all three with `kind === "state-decl" && shape === "derived"`. |
| `compiler/src/codegen/emit-logic.ts` | 657-682 | DEDICATED case `reactive-derived-decl` emits `_scrml_derived_declare` + subscribe. **CRITICAL — different bytes from state-decl plain.** | MOVE this body inside the existing `case "state-decl"` on a `node.shape === "derived" && node.isConst && node.structuralForm === false` early-branch. Preserves legacy byte-output. Shape 3 (`structuralForm:true`) still falls through to `_scrml_reactive_set` (latent pre-existing bug, NOT fixed here). |
| `compiler/src/type-system.ts` | 4511 (comment), 4751-4765 (case), 7751 | Dedicated `case "reactive-derived-decl"` (minimal: ident-check + scope-bind only — no predicate/machine handling). Plus L7751 or-test for declaredReactives. | DELETE the case; legacy `const @x = expr` post-fold flows through `case "state-decl"` (which has full predicate/machine handling). **Side effect:** legacy form now receives predicate/machine handling that today's reactive-derived-decl skips. Document as "type-system uniformity gain" — likely no test depends on the omission, but verify via full test run. Drop `\|\| reactive-derived-decl` at L7751. |

### §Field-by-field shape comparison (target invariants)

| Field | reactive-derived-decl (today) | state-decl{shape:"derived",isConst:true,structuralForm:false} (post-fold) |
|---|---|---|
| `kind` | `"reactive-derived-decl"` | `"state-decl"` |
| `name` | derivedName | derivedName |
| `init` | expr (string) | expr (string) |
| `initExpr` | ExprNode | ExprNode |
| `typeAnnotation` | optional, if `: T` present | optional, same |
| `span` | yes | yes |
| `id` | yes | yes |
| `shape` | absent | `"derived"` (NEW — required by invariant) |
| `isConst` | absent | `true` (NEW — required by invariant) |
| `structuralForm` | absent | `false` (NEW — distinguishes from Shape 3) |

Per AST-CONTRACTS-AND-DECOMPOSITION §1.1 invariant: `shape:"derived"` ⇒ `isConst === true` AND `initExpr !== null` AND `renderSpec === null`. Construction post-fold: emit all three discriminants explicitly.

### §Test §S4.5 baseline

`compiler/tests/integration/parse-shapes-v0next.test.js` §S4.5 — DOCUMENTED the divergence by asserting `kind === "reactive-derived-decl"` for `const @doubled = @count * 2`. Update to assert `kind === "state-decl"`, `shape === "derived"`, `isConst === true`, `structuralForm === false`, `initExpr` present.

### §Codegen byte-output

Direct probe via `compiler/src/cli.js` on two test files:

**Probe A** — legacy `const @doubled = @count * 2` (the to-be-folded form):
```js
_scrml_reactive_set("count", 0);
_scrml_derived_declare("doubled", () => _scrml_reactive_get("count") * 2);
_scrml_derived_subscribe("doubled", "count");
_scrml_derived_get("doubled");
```

**Probe B** — Shape 3 `const <doubled> = @count * 2` (V5-strict, Step 4 produces state-decl shape derived):
```js
_scrml_reactive_set("count", 0);
_scrml_reactive_set("doubled", _scrml_reactive_get("count") * 2);
_scrml_reactive_get("doubled");
```

**Latent gap discovered (pre-existing, NOT in scope):** Shape 3 derived emits `_scrml_reactive_set` instead of `_scrml_derived_declare`. The `case "state-decl"` in emit-logic.ts has no `shape === "derived"` branch today, so Step 4's shape-population is observable in the AST but not honored by codegen. Documented for A1c follow-up. After Step 11.5 fold, the existing `_scrml_derived_declare` path is gated on `shape === "derived" && structuralForm === false` to preserve byte-output for the legacy form ONLY — the Shape 3 latent gap is left as-is.

### §Self-host policy

Per BRIEF §3.6 + Steps 4-7 precedent: self-host parity is typically deferred at this phase. Self-host references (6 files / 16 refs in `compiler/self-host/`) are AST literals in static dispatch tables; folding self-host requires re-bootstrapping which is out of scope. **Disposition: NO CHANGE to self-host this step.** Self-host bootstrap will catch up on next bootstrap regen (separate cadence).

### §Survey conclusions

- 10 src files / 4 construction lines / ~13 consumer-call-sites identified.
- 1 critical hidden coupling (codegen emit-logic.ts dispatch — DIFFERENT bytes for derived vs plain).
- 1 pre-existing latent gap (Shape 3 codegen — NOT in scope, documented).
- Self-host: defer per Steps 4-7 policy.
- Test plan: update §S4.5 + sweep ~10 other tests asserting old kind + add §F11.5.1-5.

## Steps

- [ ] WIP 1: Survey commit (this file)
- [ ] WIP 2: Parser rewire (ast-builder.js)
- [ ] WIP 3: Consumer-site sweep (9 src files)
- [ ] WIP 4: Types update + kind-enum cleanup (types/ast.ts)
- [ ] WIP 5: Test updates + new cases
- [ ] Final: Compile commit
