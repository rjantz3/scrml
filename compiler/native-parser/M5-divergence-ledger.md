# M5 divergence ledger

status: refreshed-S117 (M5-swap dispatch, Phase 0 re-survey)
last-reviewed: 2026-05-21
supersedes: S114-M5.4 ledger (the M5-LIGHT-era ledger; that snapshot is
            archived in git history at the prior content of this file)
authority: BRIEF-M5-SWAP.md · DD #27 (m5-m6-scope-revision-2026-05-21.md)

This is the **Phase 0 re-survey** ledger: native-parser output at HEAD
`8c9d855b` (post F1/F3/F5/F6/F7/F8) vs the live `FileAST` the downstream
pipeline (PRECG onward) consumes. It refreshes the S114-stale ledger to
reflect what the v0.5 + v0.6-bridge F-units actually closed.

---

## Scope of this re-survey

The M5-swap dispatch premise (per SCOPE-v0.6 + DD #27) was: F1/F7/F8 close the
native-parser → `FileAST` divergence; the swap itself is ~6-12h of api.js
wiring. Phase 0 verifies that premise per-row before any swap code.

`--parser=scrml-native` at HEAD is still observability-only (api.js:1835 emits
`I-PARSER-NATIVE-SHADOW`). The native parser exits via `parseMarkup(source)` →
flat `Block[]` and `parseProgram(tokens, source)` → `{ body: Stmt[], errors }`.
No `nativeParseFile` / FileAST assembler exists.

---

## Per-feature divergence — refreshed

| F# | Feature | DD #27 disposition | Landed? | Residual gap |
|---|---|---|---|---|
| F1 | `attrs[]` + `tokenizedAttrs` on Markup | BRIDGE-LIGHT | **YES** (`a915ad19`) | `block.attrs` + `block.tokenizedAttrs` present on every Markup block (parse-markup.js:1108-1109). The `attrs[]` value union is native-shaped. **CLOSED.** |
| F2 | ESTree expression decorations | RETIRE | **N/A** (retired) | The native ExprNode catalog (`ast-expr.js`, scrml-shaped `IdentExpr`/`BinaryExpr`/...) is what `emit-expr.ts` walks. **No bridge needed** — confirmed against emit-expr dispatch. **CLOSED.** |
| F3 | Hoisted collections | BRIDGE-LIGHT | **PARTIAL** (`3c21c885`) | `collect-hoisted.js` collects `imports`/`exports`/`channelDecls`/`hasProgramRoot`. But `typeDecls`/`components`/`machineDecls` are **hard-coded empty** — the v0.5 header states "NO native kind for engine/type/component/state declarations." F7 added state/sql/css *body* parsers, NOT top-level declaration kinds. **HOIST GAP OPEN.** |
| F4 | SpanTable | RETIRE | **N/A** (retired) | Native parser puts span on each node. Zero downstream `.spans` consumers. **CLOSED.** |
| F5 | PGO has* flags | RETIRE-FROM-PARSER (downstream PGO pass) | **YES** (`85645a93` F5/F6 + PRECG relocation S115) | Stage 3.004 PRECG (`computePGOFlags`) runs pipeline-agnostically against the top-level node stream. **CLOSED** — the swap does not produce has* flags. |
| F6 | authConfig / middlewareConfig | BRIDGE-LIGHT (derived from attrs) | **YES** (`85645a93`) | `computeProgramConfig` in PRECG derives both from the `<program>` node's attrs, pipeline-agnostically. Needs the native Markup `<program>` block exposed with `attrs[]` — F1 supplies that. **CLOSED at PRECG; the adapter must surface the program node in `ast.nodes`.** |
| F7 | State / SQL / CSS rich payloads | BRIDGE-FULL | **YES** (`68a805ac`) | Sql blocks: `query` + `chainedCalls`. Css blocks: `rules`. State openers: `stateNodeKind`/`stateType`/`typedAttrs`. Rich payloads present on the Block stream. **CLOSED at block-payload depth** (catalog-rename to live `sql`/`css-inline`/`state` node kinds is adapter work — see below). |
| F8 | Error-effect arms + Meta payloads | BRIDGE-LIGHT (catalog-rename) | **YES** (`200737e1`) | ErrorEffect blocks: `arms[]`. Meta blocks: native-`Stmt[]` `body` + `parentContext`. Downstream meta walk-sites case-renamed by F8's `compiler/src/` edits. **CLOSED at block-payload depth.** |
| F9 | Forbidden-switch pre-scan | RETIRE | **YES** | Native parser rejects `switch` at the keyword site (parse-stmt). **CLOSED.** |

---

## The TWO residual gaps the swap cannot absorb at ~6-12h

### Residual gap A — the statement-catalog bridge (native `Stmt[]` → `LogicStatement[]`)

The native `LogicEscape.body` (and `Meta.body`) is a native **`Stmt[]`** — the
`ast-stmt.js` catalog: PascalCase, ESTree-shaped — `VarDecl` / `If` / `While` /
`For` / `ForIn` / `ForOf` / `Return` / `Break` / `Continue` / `ExprStmt` /
`FunctionDecl` / `ClassDecl` / `Import` / `Export` / `Try` / `Throw` / `Block` /
`Empty` / `Labeled` / `DoWhile` (20 kinds).

The live `FileAST` `logic` node carries `body: LogicStatement[]` — a
**scrml-specific lowercase union** — `let-decl` / `const-decl` / `tilde-decl` /
`lin-decl` / `reactive-decl` / `function-decl` / `component-def` / `engine-decl` /
`if-stmt` / `for-stmt` / `while-stmt` / `return-stmt` / `match-stmt` /
`bare-expr` / `lift-expr` / `fail-expr` / `propagate-expr` / `guarded-expr` /
... (~25 kinds).

**These are structurally different catalogs, not a case-rename.** Confirmed:
`compiler/src/codegen/emit-logic.ts` dispatches on the lowercase scrml union
(`let-decl`, `const-decl`, `if-stmt`, `fail-expr`, `lift-expr`, `bare-expr`,
`match-arm-inline`, `derived`, ...). **37 downstream files** walk `logic.body`
/ the `LogicStatement` union by lowercase kind.

DD #27's F2-RETIRE verdict was about the **expression** layer (`emit-expr.ts`
walks the native scrml-shaped ExprNode catalog already — that retirement holds
and is confirmed). It did **not** cover the **statement** layer. The native
`Stmt[]` ↔ `LogicStatement[]` mapping is an N×M translation with non-trivial
per-kind mappings (e.g. native `VarDecl{kind:"let"}` → live `let-decl`; native
`If{consequent,alternate}` ESTree-shape → live `if-stmt{then[],else[]}`
arrays; native `For` variants → live `for-stmt`; the scrml-only kinds —
`tilde-decl` / `lin-decl` / `reactive-decl` / `lift-expr` / `fail-expr` /
`propagate-expr` / `guarded-expr` — have native productions but the kind
catalog must be reconciled).

This is the MD.2-statement-tier work the compressed ladder did NOT separately
budget — DD #27 compressed MD.2 to ~3-5h on the assumption it was purely the
expression-ESTree retirement. The statement catalog is a distinct surface.

**Estimate: 18-30h** (catalog map + N×M translation + the 37-site
verification + tests). This alone exceeds the ~14h STOP-GATE threshold.

### Residual gap B — the hoist gap (typeDecls / components / machineDecls)

`collect-hoisted.js` returns `typeDecls`/`components`/`machineDecls` as
**always-empty** arrays. The native parser has no top-level declaration kind
for `<type>` / component definitions / `<engine>`. Downstream stages that
walk these (`name-resolver.ts`, `symbol-table.ts`, `component-expander.ts`,
`auth-graph.ts` — per DD #27 F3 grounding) would silently see an empty
collection — a **correctness regression** the moment the pipeline swaps, NOT
a graceful degradation.

The native parser DOES parse `<engine>` / `<type>` / component markup
structurally (they are markup tags + state-shape constructs) — but it does
not emit them as the hoistable top-level declaration kinds the live
`collectHoisted` collects. Closing this requires either (a) native
declaration-kind productions + a collect-hoisted extension, or (b) a
collect-hoisted walk that recognizes these from the Markup/LogicEscape
block stream.

**Estimate: 10-16h** (declaration recognition + collect-hoisted extension +
the name-resolver/symbol-table/component-expander/auth-graph consumer
verification).

### Plus — the FileAST assembler itself

`nativeParseFile` — the `{ filePath, ast: FileAST, errors }` adapter — must
also map the Block-stream kinds (PascalCase `Markup`/`Text`/`Comment`/`Sql`/
`Css`/`Meta`/`ErrorEffect`/`LogicEscape`) to the live `ast.nodes` lowercase
ASTNode union (`markup`/`text`/`comment`/`sql`/`css-inline`/`meta`/
`error-effect`/`logic`), assemble the hoisted collections, and produce the
top-level `FileAST` shape. With gaps A + B closed this is genuinely thin
(~6-10h); with them open it is blocked.

---

## Residual swap total — STOP GATE verdict

| Work item | Estimate |
|---|---|
| Residual gap A — statement-catalog bridge | 18-30h |
| Residual gap B — hoist gap (type/component/engine) | 10-16h |
| FileAST assembler (`nativeParseFile`) — thin once A+B closed | 6-10h |
| SPEC §34 reconciliation (Phase 1 — ~66 codes) | 6-12h |
| Phase 3 canary + conformance promotion | 6-10h |
| **TOTAL residual** | **46-78h** |

**The DD #27 budget premise was 6-12h for the swap.** The residual is
**46-78h** — the F-units closed the *block-payload* divergence (F1/F7/F8 did
real work) but did NOT close the *statement-catalog* divergence (gap A) or the
*hoist gap* (gap B). The ~14h STOP-GATE threshold is exceeded by gap A alone.

**Phase 0 STOP GATE TRIPPED.** Escalated to PA. The residual-work decomposition
is in `M5-SWAP-residual-decomposition.md` (same dir as this ledger).

---

## What IS closed (the F-units delivered)

The re-survey is not all-negative — F1/F7/F8 closed the genuinely hard
parser-side work:

- F1: native attribute tokenization (no double-tokenize translation layer).
- F7: native state/sql/css sub-parsers — the only DD #27 BRIDGE-FULL row.
- F8: native error-effect + meta payloads.
- F2/F4/F5/F9: retired (no bridge needed) — confirmed against current source.
- F6: PRECG derives authConfig/middlewareConfig pipeline-agnostically.

The residual is the catalog-reconciliation tier (statements + declarations),
which DD #27's compression under-counted: it compressed MD.2 to the
expression-ESTree retirement and did not separately price the statement
`LogicStatement` catalog or the type/component/engine declaration hoisting.

## Tags

#scrmlts #m5 #m5-swap #native-parser #divergence-ledger #phase-0 #stop-gate
#statement-catalog-bridge #hoist-gap #DD-27 #S117

## Links

- [M5-ast-bridge-scoping.md](./M5-ast-bridge-scoping.md)
- [M5-SWAP-residual-decomposition.md](./M5-SWAP-residual-decomposition.md)
- [BRIEF-M5-SWAP.md](../../docs/changes/m5-v0.5-compressed-ladder/BRIEF-M5-SWAP.md)
- [DD #27](../../../scrml-support/docs/deep-dives/m5-m6-scope-revision-2026-05-21.md)
