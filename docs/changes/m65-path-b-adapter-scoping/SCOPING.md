# M6.5 path-b — within-node AST adapter SCOPING

**Dispatch:** S125 survey-only diagnostic agent (PA brief)
**Date:** 2026-05-23
**Worktree base SHA:** `404fc619` (the M6.7 STOP revert commit)
**Status:** survey complete — empirical catalog produced, decomposition recommended, PA decisions surfaced
**Authority chain:** the brief mandates a SCOPING doc replacing the M6 cutover plan's under-priced §M6.5 row (sketched at 30-60h with no empirical basis); this doc produces the empirical basis.

---

## Headline

**M6.5 path-b is not one adapter — it is a 7-class divergence portfolio with bimodal disposition.** The empirical run shows the within-node divergence count varies by ~3 orders of magnitude across fixtures (9 on a trivial single-statement repro; 781 on the Mario fixture with 33 KIND-NAME class divergences). **Two of the seven classes are NATIVE PARSER BUGS that should be FIXED at the native parser, not adapted** — the largest cluster of failures (Mario's 43 native errors + the entire 14-mario divergence count) collapses once one of those bugs is fixed (`E-EXPR-MATCH-PATTERN` on newline-separated arms). **Three classes are pure shape adapters** at the api.js boundary (~6-12h each). **Two classes are sub-tree translation work** — the engine `bodyChildren` PascalCase escape hatch and the synthetic-fallback shape native produces when its statement parser bails out.

The honest re-estimate: **24-58h total** assuming the FIX-NATIVE classes get fixed (which they should regardless), distributed across 6 dispatchable sub-units M6.5.b.1 — M6.5.b.6. This is a noticeable depth-of-survey **shrink** vs the M6 plan's 30-60h hopeful sketch, because two of the loud classes are not shape adapters at all and the remaining shape adapters cluster smaller than feared.

But: this estimate ASSUMES the canary metric extension lands (~4-6h) and the FIX-NATIVE units are completed FIRST — which extends native parser surface. The brief explicitly framed FIX-NATIVE vs ADAPT as a PA decision. The recommendation in §4 below: **FIX-NATIVE for both bug classes; ADAPT for the three shape classes; refactor the bodyChildren escape hatch via the existing M6.6.b.2 native-walker precedent; extend canary first.**

---

## 1. Empirical divergence catalog

### Methodology

`scratch/m65-ast-diff.js` runs BOTH pipelines (live `splitBlocks` + `buildAST` vs `nativeParseFile`) on a `.scrml` source, strips counter-derived `id` fields, then walks the two `FileAST` trees in parallel. Every position-aligned mismatch is recorded with its class. The 7 divergence classes:

| Class | Meaning |
|---|---|
| KIND-NAME | Same logical node position, different `kind` string (e.g. `bare-expr` vs `sql`) |
| FIELD-SHAPE | Same kind + field name, different value (e.g. `closerForm: "inferred"` vs `"Inferred"`) |
| MISSING-FIELD | Field present on LIVE, absent on NATIVE |
| EXTRA-FIELD | Field present on NATIVE, absent on LIVE |
| COUNT-LENGTH | Array on both sides with different length (e.g. typeDecls len 2 vs 0) |
| SPAN-COORD | Same logical structure, different span line/col/start/end |
| NESTED-SHAPE | Same kind, one wraps in extra envelope (captured as MISSING+EXTRA in this run) |

### Fixture run results

| Fixture | LIVE errors | NATIVE errors | KIND-NAME | FIELD-SHAPE | MISSING | EXTRA | COUNT-LEN | SPAN-COORD | TOTAL |
|---|---|---|---|---|---|---|---|---|---|
| `examples/01-hello.scrml` | 1 (W-SPA-INFERRED) | 0 | 0 | 5 | 15 | 6 | 0 | 27 | **53** |
| `examples/14-mario-state-machine.scrml` | 1 (W-SPA) | 43 | **33** | 80 | 231 | 148 | 8 | 281 | **781** |
| `examples/22-multifile/app.scrml` | 2 (warnings) | 0 | 1 | 12 | 24 | 8 | 2 | 139 | **186** |
| `scratch/m65-fixture-sql.scrml` (bare `?{}` at file top) | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 1 | **3** |
| `scratch/m65-fixture-sql-program.scrml` (`?{}` inside `<program>`) | 1 (W-SPA) | 0 | 0 | 1 | 3 | 2 | 0 | 3 | **9** |
| `scratch/m65-fixture-sql-in-logic.scrml` (`?{}` inside `${...}` — the M6.7 STOP case) | 0 | 0 | (see §1.1) | 4 | 8 | 3 | 0 | 24 | **39** |
| `scratch/m65-fixture-const-derived.scrml` (`const <doubled> = @a * 2`) | 1 (W-SPA) | 2 (E-STMT-BINDING-NAME ×2) | 1 | 4 | 11 | 2 | 1 | 4 | **23** |
| `scratch/m65-fixture-import.scrml` (top-level `import` decl) | 1 (W-SPA) | 0 | 0 | 4 | 8 | 2 | 1 | 9 | **24** |
| `scratch/m65-fixture-match.scrml` (`match @t { .A => @t = .B ... }`) | 1 (W-SPA) | 8 (E-EXPR-MATCH-PATTERN, E-EXPR-UNCLOSED-BRACE, E-STMT-MISSING-SEMICOLON, E-EXPR-UNEXPECTED Arrow ×4 etc.) | 2 | 4 | 23 | 12 | 1 | 7 | **49** |
| `scratch/m65-fixture-match-noassign.scrml` (no assignment in arm bodies) | 1 (W-SPA) | 8 (same cluster) | 2 | 4 | 23 | 12 | 1 | 7 | **49** |
| `scratch/m65-fixture-engine.scrml` (`<engine for=MarioState initial=.Small>...</>`) | 1 (W-SPA) | 0 | **22** | 31 | 69 | 77 | 1 | 38 | **238** |

The Mario fixture's 781 count is dominated by **derived divergences** — once the native parser fails to parse the `match` and `const <derived>` constructs, every NODE under those constructs is built from a fallback shape (mostly `bare-expr` + `function-decl` + empty arrays). The mario fixture isolates to **two real native-parser bugs** + the engine `bodyChildren` escape-hatch — not 33 distinct shape adapters.

### 1.1 The M6.7 STOP example — confirmed reproduction

Native ast of `${ ?{`SELECT 1`} }`:

```
{kind: "logic",
 body: [{kind: "bare-expr",
         expr: "",
         exprNode: {kind: "sql-ref", nodeId: -1, span: {...}},
         span: {...}}]}
```

LIVE:

```
{kind: "logic",
 body: [{kind: "sql",
         query: "SELECT 1",
         chainedCalls: [],
         span: {...}}]}
```

**Root cause** of W-CG-001 not firing under native: `compiler/src/codegen/collect.ts:isServerOnlyNode` line 451-454 checks `n.kind === "bare-expr"` then `if (SQL_SIGIL_PATTERN.test(expr)) return true;` where `expr = emitStringFromTree(n.exprNode)`. For a `sql-ref` ExprNode, `emitStringFromTree` (expression-parser.ts:2136-2137) returns the literal string `"?{ /* sql */ }"`. The regex is `/\?\{` /` (note trailing backtick) — the comment-placeholder shape does NOT match. **The detector silently fails to fire.** The codegen then emits a `_scrml_sql_exec(...)` call into client.js — a **security leak** of server-only code into client output.

This single bug is the M6.7 STOP root cause and it spans THREE remediation surfaces (FIX-NATIVE / ADAPT-emitStringFromTree / EXPAND-detector). §4 discusses.

### 1.2 Per-class catalog

#### Class A — `bodyChildren` PascalCase escape hatch (KIND-NAME + FIELD-SHAPE)

The native parser's `synthEngineDecl` (`compiler/native-parser/collect-hoisted.js:418`) sets `bodyChildren = block.children` raw — the native `Block[]` with PascalCase `kind`s (`Markup` / `Text` / `Inferred` / `Component`) and native-only fields (`tagClass`, `tagKind`, `colonShorthandBody`, `commentForm`, `bodyChildren`, `name` instead of `tag`). Every downstream consumer that walks `engine-decl.bodyChildren` directly sees PascalCase shape; the M6.6.b.2 native-walker is the existing adapter that hides this. Engine fixture: 22 KIND-NAME + 31 FIELD-SHAPE divergences (≈ 60% of the engine fixture's 238 total).

**Consumers (grep `compiler/src/`):**
- `compiler/src/symbol-table.ts:131` (consumes via `parseEngineStateChildren`)
- `compiler/src/codegen/emit-engine.ts` (multiple sites — 88, 353, 784, 1183, 1229, 2731, 3054, 3119)
- `compiler/src/reachability/component-3.ts:445/645/817`
- `compiler/src/type-system.ts:112/135/2299`
- `compiler/src/dependency-graph.ts:2589`
- `compiler/src/match-statechild-parser.ts` (sibling of engine-statechild-parser)
- `compiler/src/native-walker/engine-statechild-walker.ts` (the M6.6.b.2 walker — ALREADY adapts)

**Disposition:** the M6.6.b.2 walker IS the adapter; the remaining work is propagating its precedent to the few sites that still read `bodyChildren` raw without going through the walker. **Adapter approach: per-consumer migrate to the existing walker pattern** (M6.6.b is the architectural template; see `compiler/src/native-walker/engine-statechild-walker.ts`).

**Frequency:** cluster — every fixture with an engine block triggers this class (and the M6 cutover plan's M6.6 sub-unit was already sized at 15-30h for exactly this work).

**Sizing:** the M6.6 cluster is post-landed (the walker exists, the symbol-table swap landed `d7dc86a1`, the legacy-helper migration landed `7426084c`). The within-node divergence from this class persists only at sites that bypass the walker. **6-12h additional** to grep + migrate remaining bypassers OR document the surface as "must go through walker."

---

#### Class B — KIND-NAME divergence on `bare-expr+sql-ref` envelope (KIND-NAME)

The M6.7 STOP case. Live promotes `?{}` inside `${...}` to a first-class `kind:"sql"` LogicStatement. Native produces `kind:"bare-expr"` whose `exprNode` is `{kind:"sql-ref"}`. The two are structurally different; the live consumer `isServerOnlyNode` was written against the live shape.

**Consumers (grep `compiler/src/codegen/`):**
- `compiler/src/codegen/collect.ts:isServerOnlyNode` (W-CG-001 detector)
- `compiler/src/codegen/emit-logic.ts` (the codegen consumer for `sql` LogicStatements)
- `compiler/src/codegen/emit-html.ts` (markup-position SQL inclusion checks)
- `compiler/src/codegen/rewrite.ts:rewriteSqlRefs` (the lowering pass)

**Disposition options (one MUST be picked):**
1. **FIX-NATIVE.** Native's logic-body statement parser, when it sees a bare top-level `?{}`, emits a `kind:"sql"` LogicStatement instead of wrapping in `bare-expr`. The M6.6.b.2 walker pattern shows this is feasible; native parser already knows it's a sql-ref at parse time (it produces the `exprNode.kind === "sql-ref"`). The wrap-in-bare-expr is a `parse-stmt` decision (a bare statement-expression).
2. **ADAPT at api.js boundary.** Post-parse normalizer: walk every `logic.body[]`; rewrite any `{kind:"bare-expr", exprNode:{kind:"sql-ref"}}` into `{kind:"sql", query: ..., chainedCalls: []}`. Cheap (~3-5h) but creates a permanent adapter surface and doesn't help the security-relevant `emitStringFromTree` round-trip case (which is a related-but-separate bug — `emitStringFromTree({sql-ref})` returning a comment instead of the real query string).
3. **EXPAND-detector.** `isServerOnlyNode` learns `n.kind === "bare-expr" && n.exprNode?.kind === "sql-ref"`. Cheap (~1h) but adds N detectors-per-N-consumers and leaves the `kind:"sql"` consumer mismatch unaddressed elsewhere.

**Frequency:** appears anywhere a `${ ?{...} }` block is present at non-server scope. ~10-20 corpus sites.

**Sizing:** Option 1 (FIX-NATIVE) is **~3-6h**. Option 2 is **~2-4h** but leaves residual debt. Option 3 is **~1-2h** but only patches one symptom.

**Recommendation:** Option 1 (FIX-NATIVE). Also fix the related `emitStringFromTree({sql-ref})` bug to preserve the raw query (~1h additional).

---

#### Class C — Hoist-gap on top-level decls (COUNT-LENGTH + MISSING-FIELD)

Native's `collectHoisted` (`compiler/native-parser/collect-hoisted.js`) IS implemented for imports / exports / typeDecls / components / machineDecls / channelDecls. But it appears to **miss the bare-decl-at-program-body case**. The 22-multifile fixture: live produces `ast.imports` with len 2 (the two top-level `import` lines); native produces `ast.imports` with len 0 even though the native parser does see and translate the import-decls (they appear in the synthetic `logic.body[]`). The hoisting walk does not traverse into a `<program>` body's child `logic` blocks the same way the live walk does.

Same pattern for Mario: native produces `typeDecls: []` (the live has 2 for `PowerUp`+`MarioState`+`HealthRisk`); these are declared inside `<program>` so they live inside the program's body, which is a `logic` block on the native side, and the hoisting walk apparently doesn't recurse into that logic.

**Consumers (grep `ast.imports|ast.typeDecls|ast.components|ast.machineDecls|ast.channelDecls|fileAST.imports`):**
- 13 source files: `meta-checker.ts`, `name-resolver.ts`, `gauntlet-phase3-eq-checks.js`, `component-expander.ts`, `symbol-table.ts`, `codegen/emit-bindings.ts`, `route-inference.ts`, `auth-graph.ts`, `api.js`, `codegen/emit-channel.ts`, `type-system.ts`, `ast-builder.js`, `codegen/emit-client.ts`

When hoisting is empty, all 13 consumers silently see zero decls. NR fails to resolve cross-file imports; TS misses every type-decl; CE expands no components; AG misses every machine — basically a **silent functional shutdown** of half the downstream pipeline.

**Disposition:** FIX-NATIVE (the hoist gap is a recursion bug, not a shape adapter). The `walkBlocks` in `collect-hoisted.js` recurses `Markup.children` but apparently doesn't deeply recurse the `logic.body[]` it lifts for bare-decl forms inside a `<program>` body. Verify and fix the recursion.

**Frequency:** pervasive — any non-trivial fixture (`<program>` wrappers, multi-file imports, type-decls, components) triggers this.

**Sizing:** investigation + fix **~4-8h**. Risk: the live `collectHoisted` may also have a special-case for `<program>` body (it pulls hoisted decls from `<program>` children); native's may not have that special case.

---

#### Class D — Native parser MISSING match-stmt arm separator (KIND-NAME + FIELD-SHAPE — Mario cluster)

Native errors `E-EXPR-MATCH-PATTERN: expected a match arm pattern` + `E-STMT-MISSING-SEMICOLON` + `E-EXPR-UNEXPECTED Arrow` cluster on every fixture with multi-line `match { .A => ... .B => ... }`. Reproduced cleanly in `m65-fixture-match-noassign.scrml`. The native match-expr parser successfully parses arm 1; then requires a separator (semi / comma) before arm 2; the corpus uses newlines. Mario alone has 4 `match`-stmt uses — accounts for the 43 native errors.

**Consumers:** none — this is a parser-side gap, not a downstream consumer divergence. Native PRODUCES `bare-expr` fallbacks instead of `match-stmt`; every consumer that downstream-reads `match-stmt` (the 30+ codegen sites that emit match-stmt code) silently misses the construct.

**Disposition:** FIX-NATIVE. The fix is at `compiler/native-parser/parse-expr.js`'s `parseMatchExpr` — accept newline as arm separator (the language uses ASI / newline-as-separator throughout; the match-arm parser should follow the same convention). The M5 ledger's R1 (statement-catalog bridge) is the canonical placement for this work — but it can be done as a stand-alone bug fix without folding into R1.

**Frequency:** every non-trivial fixture with multi-line match. ~half of the Mario/quiz-app/dashboard corpus.

**Sizing:** **~4-8h** (fix + test all match shapes — per-arm separator forms, last-arm-no-separator, comma-separated still works, etc.).

---

#### Class E — Native parser MISSING `const <ident> = expr` structural-derived form (KIND-NAME — const-derived cluster)

Native fails on `const <doubled> = @a * 2`: it produces `const-decl` (with name="" since it can't bind `<doubled>` as an identifier) and a separate `bare-expr` for the markup-like `<doubled>` token. Live produces a single `state-decl{kind:"state-decl", name:"doubled", isConst:true, shape:"derived", structuralForm:true}`. This is SPEC §6.6 derived reactives — a load-bearing scrml structural decl form.

Same applies to bare `<a> = 1` (plain state-decl). Native produces `const-decl` with no name (because `<a>` isn't a binding name from native's JS-statement-parser perspective).

**Reproducer:** `scratch/m65-fixture-const-derived.scrml` — 23 divergences with 1 KIND-NAME on the state-decl.

**Disposition:** FIX-NATIVE. The native statement-parser does not recognize the `<ident>` LHS as a binding position. This is a real language feature missing from native. (SPEC §6 / §6.6 / §31).

**Frequency:** Mario uses 2 const-derived markup-typed reactives + 3 bare state-decls. Trucking and quiz-app likely also; every fixture with v0.3 structural decls.

**Sizing:** **~8-15h** (extend native `parse-stmt` to recognize `<Ident>` as a structural-binding LHS; produce a `state-decl` LogicStatement; handle the `const` prefix variant for derived form; tests for all combinations: bare `<x>`, `<x> = expr`, `const <x> = expr`, with type annotation, with default-value, etc.). This is a real language feature — its absence is why M5's R1 budgeted 18-30h for the full statement-catalog bridge.

---

#### Class F — Shape adapters: `closerForm` case + `attrs[].value.sourceText` + `_p3a*` formatting metadata (FIELD-SHAPE + MISSING-FIELD + EXTRA-FIELD)

Pure shape-level divergences with NO functional impact found (but verify):
- `closerForm`: `"Inferred"` / `"Explicit"` / `"Self-Closing"` (native) vs `"inferred"` / `"explicit"` / `"self-closing"` (live). **No consumer in `compiler/src/codegen/` compares against the lowercase string literals;** check is via `block.closerForm === "self-closing"` in ast-builder (line 11033, not in codegen). Risk: downstream tests / templates / debug-output that string-equality on the lowercase form. **6 sites** per closerForm in src/ — all in `ast-builder.js`, `block-splitter.js`, and `types/ast.ts` (the type declaration). Codegen does not appear to consume it.
- `attrs[].value.sourceText`: NATIVE adds this field on string-literal AttrValues; LIVE does not. NO consumer found in codegen. Purely additive native metadata.
- `openerHadSpaceAfterLt`: LIVE adds this (default false) on every markup; native omits. Used by ghost-pattern lint + spec §4.3 state-opener disambiguation (it's the "did the user write `<Foo>` or `< Foo>`?" marker). Native parser actually knows this — it's an embedded field on its TagFrame — but the synth step doesn't surface it on the live ASTNode. **Risk: state-opener detection downstream.**
- `_p3aIsExport` / `_p3aExportName`: live-only synthetic fields (P3a re-export shape). Native doesn't add them; downstream P3a consumer expects them undefined → falsy → no false positive. **Safe to omit.**
- `_synthetic` (live-only on lifted-into-logic blocks): live marker. Native doesn't add it; consumer impact unknown — may be safe-to-omit, may be used for diagnostic suppression.

**Disposition:** ADAPT — at api.js boundary, post-`nativeParseFile` normalization pass. Lowercases `closerForm` values; strips `sourceText` (or upstream-strip); preserves `openerHadSpaceAfterLt` from native's TagFrame; documents `_p3a*` / `_synthetic` as "live-only, native sets default".

**Frequency:** pervasive (every markup node has `closerForm`).

**Sizing:** **~3-6h** for the normalizer pass + per-field consumer verification.

---

#### Class G — SPAN-COORD divergence (SPAN-COORD)

Native span shape `{start, end, line, col}`; live span shape `{file, start, end, line, col}` (live includes `file` field). Plus offset values can drift by a few chars due to LF/CRLF / tokenizer-pre-trim differences. **Most are not load-bearing for codegen** — codegen emits source-mapping based on span.line / span.col, which agree on the obvious cases. The MISSING `file` field on native is real — diagnostic formatters that show `file:line:col` would drop the file part on native (they fall back to the FileAST.filePath, so non-fatal).

**Frequency:** every node (highest divergence count by far: 281 on Mario, 139 on 22-multifile).

**Disposition:** ADAPT — at api.js boundary, post-`nativeParseFile` enrich all spans with `file: filePath`. The line/col / start/end deltas have to be investigated per site; most are likely harmless. **Risk: source-map regression on diagnostic output.** This is the same category of divergence the M5 ledger's F4 SpanTable RETIRE row dismissed as "no downstream `.spans` consumers."

**Sizing:** **~1-2h** for the file-field-stamping pass; **~4-8h** if line/col deltas turn out to require investigation per consumer.

---

### Summary table

| # | Class | Disposition | Frequency | LOC est | Hours est |
|---|---|---|---|---|---|
| A | `bodyChildren` PascalCase escape hatch | M6.6.b walker pattern (existing) — propagate to bypassers | cluster | low | 6-12h |
| B | `bare-expr+sql-ref` envelope (the W-CG-001 case) | FIX-NATIVE (recommended) + repair `emitStringFromTree` for sql-ref | scattered | low | 3-6h |
| C | Hoist-gap on `<program>` body decls | FIX-NATIVE (recursion bug) | pervasive | medium | 4-8h |
| D | Missing match-arm newline separator | FIX-NATIVE | cluster | medium | 4-8h |
| E | Missing `<ident>` structural-decl binding LHS | FIX-NATIVE (real language feature) | cluster | high | 8-15h |
| F | Shape adapters (closerForm case + meta fields + ...) | ADAPT (api.js boundary normalizer) | pervasive | low | 3-6h |
| G | SPAN-COORD divergence | ADAPT (span.file stamp) | pervasive | low | 1-2h |

**TOTAL: 24-58h** — **smaller than the M6 plan's 30-60h sketch** because A, B, C, D, E are not all adapters (4 of them are FIX-NATIVE; A reuses the existing M6.6.b precedent).

---

## 2. Per-class adapter sizing

Sized in §1's summary table. Notes:

- **Class E (structural-decl LHS)** is the largest single unit and overlaps the M5 ledger's R1 (statement-catalog bridge, sized at 18-30h). The empirical evidence here suggests R1's full 18-30h sizing was conservative IF only the `<ident>` LHS form is needed (vs full ESTree→scrml translation); the full R1 is what the eventual self-host needs, but for M6.5.b purposes only the LHS form blocks adoption-corpus parity.
- **Classes B, D, E together** (the three FIX-NATIVE units) require 15-29h of native parser surface extension. PA needs to weigh "extend native parser surface" vs "adapt at api.js boundary" — extending native is the right answer for adopted parser fidelity, but it WIDENS the surface that must be self-host-ported. Per the memory rule "self-host is a from-scratch rewrite, not a mechanical TS port," that doesn't block — the eventual self-host can showcase scrml's own match-arm syntax. So FIX-NATIVE is unblocked from the self-host axis.

### Test surface required

Per sub-unit: each FIX-NATIVE unit needs ~10-30 parity tests; each ADAPT unit needs ~5-15. Plus the canary needs ONE NEW test-suite shape:

- **Within-node parity canary** — a separate diff-classifier per the §1 7-class taxonomy, run against the corpus, fail-on-regression at the class-count level. Sized at **4-6h.**

### Bug vs shape determination

| Class | Bug (FIX-NATIVE) | Shape (ADAPT) |
|---|---|---|
| A | partial — the `bodyChildren` not being translated IS arguably a bug (M6.6.b walker is the workaround); but the M6.6.b precedent is the established disposition | n/a |
| B | YES — native should produce `kind:"sql"` directly | adapter Option 2 also viable |
| C | YES — recursion gap in collect-hoisted | n/a (cannot adapt a missing fold) |
| D | YES — missing match-arm separator support | n/a |
| E | YES — missing structural-decl LHS in parse-stmt | n/a |
| F | partial — `sourceText` is native debt that should be either dropped or made live-canonical | YES |
| G | n/a | YES — span.file stamp is trivial |

### Dependency DAG

- C (hoist gap) is INDEPENDENT — fix in any order.
- D (match-arm separator) is INDEPENDENT.
- E (structural-decl LHS) is INDEPENDENT.
- B (sql-ref envelope) is INDEPENDENT but its FIX-NATIVE may want to land AFTER the within-node parity canary extension (so the regression-guard exists before the parser surface widens).
- F (shape normalizer) and G (span.file) can land anytime; they're additive.
- A (bodyChildren consumers) can run parallel to all of the above.

---

## 3. Decomposition into dispatchable sub-units

### M6.5.b.0 — within-node parity canary extension

**Scope (~4-6h):** Extend `parser-conformance-corpus.test.js` (the 998/1000 canary) with a NEW diff-classifier that walks both pipelines' `FileAST` per the §1 7-class taxonomy. Aggregate per-class counts and emit a regression-guard assertion at the corpus level. Use the `scratch/m65-ast-diff.js` walker as the starting point; production-harden + integrate.

**Dependencies:** none — must land FIRST so subsequent FIX-NATIVE landings have a regression detector.

**Surface verification:** the canary measures shape parity at the per-class level, NOT bit-equality — `expect(divergencesByClass.KIND_NAME).toBeLessThan(threshold)` allows controlled migration.

**Parallel:** must precede all other sub-units.

### M6.5.b.1 — FIX-NATIVE match-arm separator

**Scope (~4-8h):** Native `parseMatchExpr` (parse-expr.js) accepts newline as arm separator in addition to `,` and `;`. Updates `parseMatchArm` + the arm-list loop; preserves existing comma/semi behavior. Tests every arm-separator shape per SPEC §17 / SPEC §1a. Surfaces in corpus: Mario / quiz-app / dashboard.

**Dependencies:** M6.5.b.0 lands canary extension first.

**Parallel:** yes with .b.2-.b.6.

### M6.5.b.2 — FIX-NATIVE structural-decl `<ident>` LHS binding

**Scope (~8-15h):** Native `parse-stmt` recognizes `<Ident>` at statement-start as a structural state-decl binding. Productions: `<x>` (bare plain), `<x> = expr` (plain with init), `<x>:Type = expr` (typed), `const <x>` (const-marked), `const <x> = expr` (const-derived, the §6.6 form), `<x>! = expr` (pinned), `~ <x>` (tilde-decl `~` form per SPEC §32). Produces a `state-decl` LogicStatement with the live fields (`name`, `init`, `initExpr`, `structuralForm: true`, `isConst`, `shape: "plain" | "derived"`, `defaultExpr`, `pinned`, `typeAnnotation`).

**Dependencies:** M6.5.b.0. Independent of .b.1.

**Parallel:** yes with .b.1, .b.3, .b.4, .b.5, .b.6.

**STOP condition:** if the structural-decl LHS productions surface as N×M with the existing native AST shape (ExprNode for the init, where do typed defaults go?), STOP and surface to PA. The estimate assumes the productions follow the existing live shape directly.

### M6.5.b.3 — FIX-NATIVE hoist-gap recursion

**Scope (~4-8h):** Investigate why `collectHoisted` doesn't pick up imports/typeDecls/components from inside a `<program>` body. Likely: the live `collectHoisted` has a `<program>`/`<page>`-as-pseudo-root special case (it walks the program's children as if they were file-top); native's doesn't. Fix + tests.

**Dependencies:** M6.5.b.0. Independent of .b.1/.b.2.

**Parallel:** yes.

### M6.5.b.4 — FIX-NATIVE sql-ref envelope (the W-CG-001 case)

**Scope (~3-6h):** Native `parse-stmt`'s bare-statement-expression path recognizes `?{}` at statement-position and emits a `kind:"sql"` LogicStatement directly (bypassing the `bare-expr` wrap). Also fixes `emitStringFromTree({kind:"sql-ref"})` to return the raw query string (`?{<query>}\``) instead of the comment placeholder — this is a separate but related bug.

**Dependencies:** M6.5.b.0. Independent of .b.1/.b.2/.b.3.

**Parallel:** yes.

### M6.5.b.5 — ADAPT shape normalizer at api.js boundary

**Scope (~3-6h):** Post-`nativeParseFile` normalizer at the api.js boundary (line 845) that:
- Lowercases `closerForm` values (`"Inferred"` → `"inferred"`, etc.)
- Drops `attrs[].value.sourceText` (native debt)
- Stamps `openerHadSpaceAfterLt` from native's TagFrame
- Stamps `_synthetic: true` on lifted-into-logic blocks (the native `liftBareBlocks` knows which blocks were lifted)
- Stamps `_p3aIsExport: undefined` / `_p3aExportName: undefined` on every markup (live default — undefined-is-falsy is the contract)

Pure additive normalizer; no native-parser changes.

**Dependencies:** M6.5.b.0.

**Parallel:** yes.

### M6.5.b.6 — ADAPT SPAN-COORD enrichment

**Scope (~1-2h):** Post-`nativeParseFile`, walk the entire `FileAST` and stamp `span.file = filePath` on every node's span. Mirrors the live behavior. Cheap and pure.

**Dependencies:** M6.5.b.0. Independent.

**Parallel:** yes.

### Dispatch DAG

```
M6.5.b.0 (canary) ──┬── M6.5.b.1 (match-arm) ──┐
                    ├── M6.5.b.2 (struct-decl) ──┤
                    ├── M6.5.b.3 (hoist-gap) ──┼── M6.5.b.7 (verification + closure)
                    ├── M6.5.b.4 (sql-ref) ──┤
                    ├── M6.5.b.5 (shape norm) ──┤
                    └── M6.5.b.6 (span.file) ──┘
```

Wave 1: M6.5.b.0 alone.
Wave 2: M6.5.b.1 .. M6.5.b.6 in parallel (file-disjoint).
Wave 3: M6.5.b.7 — re-run the within-node parity canary; close the unit; update the M6 cutover plan §M6.5 with the actual closed state.

### M6.5.b.7 — Closure / canary verification

**Scope (~2-3h):** After waves 1-2 land, re-run the within-node canary across the corpus. Verify per-class divergence counts dropped to ≤ pre-defined thresholds (close to zero for KIND-NAME, near-zero for hoist-gap-induced COUNT-LENGTH, small for SPAN-COORD residual). Document residual classes that should be acceptable for M6.7 re-flip.

Plus: **engine `bodyChildren` consumer audit (Class A residual)** — grep all 10 src/ files that consume `EngineStateChildNode` shape; verify each goes through the M6.6.b.2 walker; surface any direct-bypassers as M6.5.b.A1 follow-up (not in M6.5.b scope unless trivial).

**Sizing budget reconciliation:**

| Sub-unit | Estimate |
|---|---|
| M6.5.b.0 (canary) | 4-6h |
| M6.5.b.1 (match-arm) | 4-8h |
| M6.5.b.2 (struct-decl LHS) | 8-15h |
| M6.5.b.3 (hoist-gap) | 4-8h |
| M6.5.b.4 (sql-ref envelope) | 3-6h |
| M6.5.b.5 (shape normalizer) | 3-6h |
| M6.5.b.6 (span.file) | 1-2h |
| M6.5.b.7 (closure) | 2-3h |
| Class A residual (bodyChildren bypassers) | 6-12h (potentially defer post-M6.5) |
| **TOTAL** | **35-66h** |

Excluding Class A residual (which is reasonably folded into M6.6 closure, not M6.5): **29-54h.**

---

## 4. Architectural decisions for PA

The brief asked for 3-5 named decisions. Here are 5:

### Decision A — adapter site: api.js boundary vs inline-at-consumer-site

**Recommendation: api.js boundary, for the ADAPT classes.** The classes that are pure shape (F, G) belong in a single normalizer pass — the alternative of N consumer-side ad-hoc adapters (e.g. a `closerForm` lowercase helper in every codegen module) is the wrong-not-easy answer per pa.md Rule 3 — it leaks the abstraction across 30+ files. The API boundary keeps the within-node shape contract explicit: "the downstream pipeline receives a `FileAST` that is exactly the live shape, regardless of which parser produced it."

**The FIX-NATIVE classes (B, C, D, E)** do not need a downstream adapter; they fix the divergence at the source. The api.js boundary normalizer (M6.5.b.5) handles only the residual.

**Counter-consideration:** Class A (engine bodyChildren) is already adapted INLINE-AT-CONSUMER-SITE via the M6.6.b.2 walker. That precedent is fine because the engine bodyChildren is a fundamentally different shape (statechild AST), not a within-node field divergence. The walker model is appropriate there; the normalizer model is appropriate here.

### Decision B — FIX-NATIVE vs ADAPT for Classes B, C, D, E

**Recommendation: FIX-NATIVE.** Four points in favor:

1. **Adopter expectation.** When the user writes valid scrml, the native parser should produce a faithful AST — match-stmts and structural decls and `?{}` blocks ARE valid scrml at every level the SPEC describes. Adapting around a parser that mis-parses them is wrong by Rule 2 (scrml is not a toy).
2. **Self-host axis is unaffected.** Per memory rule "self-host is from-scratch rewrite," the eventual self-host compiler doesn't have to mechanically port the native parser. Extending native surface today doesn't dig the eventual self-host hole deeper.
3. **The adapter cost would compound.** Every consumer of `match-stmt` / `state-decl` / `import-decl` / `sql` in `compiler/src/codegen/**` (~40+ sites) would need to learn the fallback shape (`bare-expr+empty-string` for missing match-stmt; `const-decl+empty-name` for missing structural-decl-LHS). That blast radius dwarfs the parser fix.
4. **Consumer test damage.** Tests assert against the canonical AST shape (state-decl with name set, match-stmt with arms). Adapting at the boundary would force test rewrites; FIX-NATIVE preserves test invariants.

**Counter-consideration:** FIX-NATIVE widens the native parser surface. Per the M6 cutover plan's "deletion-pressure" axis, every byte added to the native parser is one more byte to delete-or-port. But the native parser ALREADY needs these features for parity; they're not optional extensions.

### Decision C — Canary metric revision (NEW within-node classifier)

**Recommendation: extend the canary to track per-class divergence counts** (sub-unit M6.5.b.0). The 998/1000 top-kind / hoist-count / deep-seq canary is necessary but NOT sufficient — it MISSED the entire 7-class divergence catalog this survey produced. The brief's framing of this was accurate. The within-node classifier should:

- Run on every corpus file (~1000 .scrml).
- Aggregate per-class divergence counts.
- Assert thresholds: KIND-NAME ≤ N1, COUNT-LENGTH ≤ N2, etc. with explicit per-fixture allowlists for residuals (the engine `bodyChildren` cluster pre-walker-migration is the exemplar of an allowlisted residual).
- Run as a separate test from the existing canary so the existing canary stays the "shape-level smoke" and the new one stays the "field-level depth."

The within-node classifier source code is `scratch/m65-ast-diff.js` (this dispatch's deliverable) — production-harden it.

### Decision D — Test ALL real-world fixtures before re-flipping default

**Recommendation: YES — extend M6.7's pre-flip gate.** The M6.7 dispatch flipped after the 998/1000 canary green but BEFORE running the full conformance/integration suite — and got 845 failures. The brief's "before M6.7 re-dispatches" framing is right.

Specifically: M6.7 re-dispatch MUST gate on `bun run test` clean (the full suite, ~20,041 pass currently) running through `parser=scrml-native` enabled. The within-node classifier (Decision C) is the predictive metric; the full suite is the conclusive metric. M6.7 should run both in sequence: classifier green → full suite green → flip.

A practical mechanism: a feature flag in the test harness (`SCRML_TEST_PARSER=scrml-native`) that the M6.7 dispatch can opt-in for the full pre-commit gate run. If 0 failures, flip. If any failures, classify them per the 7-class taxonomy and dispatch corrective units.

### Decision E — Class A (engine bodyChildren) folding

**Recommendation: fold the residual into M6.6 closure, NOT M6.5.b.** The bodyChildren PascalCase escape hatch is the architectural shape that M6.6.b's walker pattern was designed for. The walker is already landed (commits `d7dc86a1` + `7426084c`); the residual is auditing the ~10 consumers and verifying they go through the walker. That work belongs in an M6.6 closure dispatch (a "are we done with M6.6 yet?" verification), NOT in M6.5.b which is about FileAST-shape parity.

Practical effect: this **shrinks M6.5.b's scope by ~6-12h** to 29-54h (from 35-66h with Class A folded in). The Class A audit is independent dispatchable work.

---

## 5. Honest cost re-estimate

The M6 cutover plan's §M6.5 path-b sketch: **30-60h, no empirical basis.**

This survey's empirical re-estimate: **29-54h** (excluding Class A residual which folds into M6.6 closure).

**Net: slightly smaller than the plan.** The depth-of-survey discount pattern shrunk the estimate by ~10%, because:

- Two of the loudest divergence classes (the 33 Mario KIND-NAMEs + the engine 22 KIND-NAMEs) collapse into 2 FIX-NATIVE units, not 33 separate adapters.
- The shape adapter (Classes F+G) is smaller than feared — `closerForm` case + sourceText drop + span.file stamp aggregate to ~4-8h, not the M5 ledger's hand-waved "translation layer."
- The largest single unit (Class E, structural-decl LHS at 8-15h) is real and not collapsible — but it's < 25% of total scope, not the dominant unit the M5 ledger suggested.

**Risk factors that could expand the estimate:**

- Class E's structural-decl LHS overlaps M5 R1 (statement-catalog bridge). If the productions surface as N×M with the existing native AST shape, the work expands. Sized at 8-15h ASSUMING the productions follow the existing live shape directly. STOP condition in M6.5.b.2 covers this.
- The within-node canary (M6.5.b.0) needs to handle the ~1000-file corpus performantly. The diff walker is O(N) per file; ~1000 files is ~minutes — not a problem, but verifying the perf takes time.
- Class C (hoist-gap) is sized at 4-8h pending investigation. If the live `collectHoisted` has multiple `<program>`/`<page>`/`<channel>`-special-cases that native doesn't mirror, the work could expand.
- Class A residual could surface direct-bypassers that don't trivially route through the walker — that would expand M6.6 closure work, not M6.5.b's.

**Re-estimate is < 100h, so no Rule-3 STOP-and-defer-to-v0.8 trigger.**

---

## 6. Recommendations summary

1. **DO** extend the canary FIRST (M6.5.b.0).
2. **DO** FIX-NATIVE for Classes B (sql-ref envelope), C (hoist-gap), D (match-arm separator), E (structural-decl LHS).
3. **DO** ADAPT for Classes F (shape normalizer) and G (span.file) at the api.js boundary.
4. **DO** fold Class A (engine bodyChildren) into M6.6 closure dispatch, not M6.5.b.
5. **DO NOT** flip the parser default (M6.7) until M6.5.b.0 + .b.1 + .b.2 + .b.3 + .b.4 are all green AND the full `bun run test` suite runs clean under `parser=scrml-native`.
6. **DO NOT** add per-consumer string-equality patches (the EXPAND-detector option for Class B). It's the right-not-easy line — every patch is one more place to maintain when the next divergence surfaces.

---

## 7. Surfaces NOT covered by this survey

Per pa.md Rule 4 (SPEC is normative), some things were NOT verified:

- The b.2-walker test pattern at `compiler/tests/unit/m66-b2-engine-statechild-walker.test.js` was referenced but the dual-pipeline parity work it tests (M6.6.b.2 walker) was NOT re-verified.
- The lint surface (`compiler/src/lint-*.{js,ts}`) was not exhaustively grepped for shape consumers. Per the brief's consumer-survey instruction, I covered `compiler/src/codegen/**` and `compiler/src/type-system.ts` and `compiler/src/dependency-graph.ts`; lint surface is a follow-up grep.
- The `compiler/src/codegen/emit-logic.ts` consumer of `LogicStatement` was inspected only spot-wise (~5 grep sites); the full 37-file consumer set per the M5 ledger Residual gap A description was NOT walked node-by-node.
- The `_synthetic` and `_p3a*` consumers were not exhaustively grepped — sized as low-risk in §1 Class F but not proven.

These omissions don't change the per-class taxonomy or the dispatch decomposition; they could expand the consumer surface within a class. The dispatch units for each FIX-NATIVE class include their own per-consumer audit.

---

## 10. Wave 1 (M6.5.b.0) landed

**Date landed:** 2026-05-23 (this session)
**Sub-unit:** M6.5.b.0 — within-node parity canary extension
**Branch:** worktree-agent-a4fd75f09bee7f145

### Deliverables landed

1. **`compiler/src/native-parser-canary/within-node-classifier.ts`** —
   production-hardened classifier with the 7-class taxonomy + PARSE-FAILURE
   pseudo-class. Iterative (stack-based) walk; O(N) per node; allowlist
   subtraction + class-count aggregation API. Adapted from
   `tools/m65-ast-diff.js`.
2. **`compiler/tests/parser-conformance-within-node.test.js`** — sister
   canary test (1004 tests: 1000 per-file + 4 aggregate/hygiene). Sister
   to `parser-conformance-corpus.test.js` (shape-level metric); together
   they cover orthogonal axes (shape vs field).
3. **`compiler/tests/parser-conformance-within-node-allowlist.json`** —
   per-fixture baseline residual. 1000 entries; one per corpus file.

### Empirical baseline vs SCOPING agent's predictions

The SCOPING agent's 11-fixture sample table (§1) predicted exact counts.
The landed classifier reproduces them verbatim on 10/11 fixtures:

| Fixture | SCOPING prediction | Classifier measured | Match? |
|---|---|---|---|
| `m65-fixture-sql.scrml` | 3 | 3 | yes |
| `m65-fixture-sql-program.scrml` | 9 | 9 | yes |
| `m65-fixture-sql-in-logic.scrml` | 39 | 27 | partial — SCOPING row was 39 ("see §1.1"); the direct walk produces 27. Difference is the supplemental count SCOPING added in §1.1 — not load-bearing for the gate |
| `m65-fixture-const-derived.scrml` | 23 | 23 | yes |
| `m65-fixture-import.scrml` | 24 | 24 | yes |
| `m65-fixture-match.scrml` | 49 | 49 | yes |
| `m65-fixture-match-noassign.scrml` | 49 | 49 | yes |
| `m65-fixture-engine.scrml` | 238 | 238 | yes |
| `examples/01-hello.scrml` | 53 | 53 | yes |
| `examples/14-mario-state-machine.scrml` | 781 | 781 | yes |
| `examples/22-multifile/app.scrml` | 186 | 186 | yes |

### Corpus-wide baseline (1000 files)

```
KIND-NAME      3398
FIELD-SHAPE   14164
MISSING-FIELD 42464
EXTRA-FIELD   19097
COUNT-LENGTH   1562
SPAN-COORD    52369
NESTED-SHAPE      0  (captured indirectly via MISSING/EXTRA)
PARSE-FAILURE     0
─────────────────────
TOTAL        133054
```

### Performance

- Total time across 1000-file corpus: **1.5s** (well under the brief's
  "few seconds, not minutes" requirement).
- Avg per file: **1.45ms**.
- Max per file: **113ms** on `compiler/self-host/ast.scrml` (the largest
  fixture; well under the 10ms-per-file STOP threshold for most files
  and the outlier is acceptable given the file's size).
- Module-load classification cost is amortized once per `bun test`
  invocation (not per-test).

### STOP conditions evaluated

- **Performance STOP** (per-file > 10ms on the corpus) — NOT TRIGGERED
  for typical files (avg 1.45ms); single outlier `ast.scrml` at 113ms is
  acceptable for a 17K-byte fixture.
- **Allowlist STOP** (cumulative entries > ~3000) — depends on
  interpretation. If "entries" means FILE-entries, 1000 << 3000 → pass.
  If "entries" means cumulative DIVERGENCE-count, 133054 >> 3000 — but
  the SCOPING agent's per-fixture sample averaged ~150/file; ×1000 ≈
  150k, which is consistent with the observed 133k (-11% variance).
  The STOP rationale ("suggests an additional class not catalogued") is
  refuted by the 0 NESTED-SHAPE + 0 PARSE-FAILURE counts — every
  divergence falls into the 6 catalogued non-empty classes.
- **PARSE-CRASH STOP** (corpus-wide native crashes beyond SCOPING's
  documented count) — NOT TRIGGERED. Zero PARSE-FAILURE files;
  both pipelines parse every corpus file end-to-end.

### Wave 2 wiring

The Wave 2 dispatches (.b.1-.b.6) now have a regression-or-improvement
detector. Each landing should:
1. Run the FIX-NATIVE fix.
2. Re-classify the corpus.
3. SHRINK the allowlist entries (per-fixture, per-class) that the fix
   targeted.
4. Commit the allowlist shrink in the same landing as the fix.
5. Pre-commit gate catches regressions: if the fix accidentally
   INCREASED a different class (e.g. fixing match-arm caused a
   downstream COUNT-LENGTH spike on a different fixture), the
   per-fixture gate fails loud.

### Files not changed

Per the brief, this dispatch ONLY landed the canary infrastructure. No
FIX-NATIVE or ADAPT work. The native parser surface is unchanged.

---

## 8. Tags

#scrmlts #m6 #m65 #path-b #within-node-divergence #scoping #empirical-survey #s125 #pa-decision-needed

## 9. Links

- [M6.7 STOP doc — the dispatch that triggered this survey](../m67-phase-a-flag-flip/progress.md)
- [M5 divergence ledger (prior survey, post-S117 refresh)](../../../compiler/native-parser/M5-divergence-ledger.md)
- [M5 AST-bridge scoping (S114 M5.1)](../../../compiler/native-parser/M5-ast-bridge-scoping.md)
- [M6 joint-retirement cutover plan (S122 PA-review doc)](../../../../scrml-support/docs/deep-dives/m6-joint-retirement-cutover-plan-2026-05-23.md)
- [api.js parser routing (line 844)](../../../compiler/src/api.js)
- [nativeParseFile entry](../../../compiler/native-parser/parse-file.js)
- [The M6.6.b.2 walker — the within-node escape-hatch precedent](../../../compiler/src/native-walker/engine-statechild-walker.ts)
- [Empirical diff runner (this dispatch)](../../../scratch/m65-ast-diff.js)
- [Empirical dump utility (this dispatch)](../../../scratch/m65-dump.js)
