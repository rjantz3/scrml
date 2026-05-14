# Undefined Audit — compiler/src/ — scrml-semantic vs JS-host (S89 D, mirror of Wave 7.D)

---

## ⚑ S90 CLOSURE BANNER (2026-05-13) — Option ε ratified

**Status:** This audit's framing of "~140 M-class sites across 16 M-8C-D-N items requiring sentinel migration" has been **superseded** by S90 disposition. PA scoping at `docs/changes/m-7c-d-12-runtime-sentinel-scoping/SCOPING.md` (commit `725e07c`) ratified **Option ε**: SPEC §42.1 / §42.5 / §42.8 normative sections + S89 §42.1 exclusions ratify runtime JS `null` (and `undefined` at the JS-host interop boundary per §42.9) as scrml absence. Most M-8C-D-N items close-as-spec-ratified.

**One UNIQUE-to-undefined audit item was actually substantive drift** — M-8C-D-6 `?? "undefined"` literal-JS-keyword interpolation in compiler-emitted source. That migrated via Track 3 (T3, commit `887f420`). All paired items closed via the same T1 AST cleanup.

### Item-by-item disposition (M-8C-D-N from §4)

| Item | Pair | Sites | S90 disposition | Closing commit |
|---|---|---|---|---|
| M-8C-D-1 AST.LitExpr `litType:"undefined"` branch | M-7C-D-1 | ast.ts L1483 | **MIGRATED via T1** (consolidated to `litType:"not"` + `raw` discriminator; pre-existing `litType:"undefined"` removed) | `850a298` |
| M-8C-D-2 Parser stop manufacturing `litType:"undefined"` | M-7C-D-2 | expression-parser.ts L1230-1236/1255-1258/1316/1596/2185 | **MIGRATED via T1** (reset() / array-hole / emitStringFromTree round-trip / keyword whitelist all migrated; array holes now JS `null` instead of `undefined` per §42.5/§42.8) | `850a298` |
| M-8C-D-3 gauntlet-phase3 lint detector update | M-7C-D-2 cascade | gauntlet-phase3-eq-checks.js L168/351-353/378/386/413-414/437-443/509-512/604-607 | **MIGRATED via T1** (raw-aware discrimination with legacy `litType` fallback) | `850a298` |
| M-8C-D-4 emit-expr `=== null \|\| === undefined` paired emission | M-7C-D-4 | emit-expr.ts L466/468/470/221 | **CLOSED-AS-SPEC-RATIFIED** — §42.8 normatively mandates the paired check; §42.9 interop boundary handles JS-host `undefined` correctly | (no code change required) |
| M-8C-D-5 rewrite.ts paired keyword emissions | M-7C-D-5 | rewrite.ts L475-476/506/519/546/688/705/708/713/1148-1149 | **CLOSED-AS-SPEC-RATIFIED** — §42.5/§42.8 normatively mandate this codegen | (no code change required) |
| **M-8C-D-6 `?? "undefined"` init-fallback (UNIQUE)** | — | emit-server.ts L882/L1047/L1139 + emit-logic.ts L591/1764/1823/1885/1900/2155/2262/2265/2281/2378 + scheduling.ts L127/128/129 | **MIGRATED via T3** — all 16 sites now interpolate `"null"` instead of `"undefined"` per OQ-5 (a). NEW lint `W-CG-UNDEFINED-INTERPOLATION` (Stage 3.007-adjacent walker `validators/lint-undefined-interpolation.ts`) added as regression guard. Corpus sanity sweep 334 files: 0 findings. | `887f420` |
| M-8C-D-7 emit-server emitted §45 structural-equality helper | M-7C-D-4 cascade | emit-server.ts L1293/L1303 | **CLOSED-AS-SPEC-RATIFIED** — emitted runtime helper; §42.8 + §45 normative | (no code change required) |
| **M-8C-D-8 Derived-engine init-undefined throw (UNIQUE)** | — | emit-engine.ts L2141-2145/2172-2176/2198/2211/3356-3380 | **PARTIALLY MIGRATED via T4** — SPEC error code renamed `E-DERIVED-ENGINE-INITIAL-UNDEFINED` → `E-DERIVED-ENGINE-INITIAL-ABSENT` (§34 catalog L14688 + §51.0.J rules table L21758 + §55 validators-summary L26851). Runtime-emission rename in `compiler/src/codegen/emit-engine.ts` is **DEFERRED** as compiler internal — emitted check `=== undefined` remains correct per §42.9 interop boundary (engine init coming from JS-host can be `undefined`). | T4: `8cef7f5` (SPEC rename); compiler-source rename: deferred / not required for ε |
| M-8C-D-9 Machine-property-tests + machine-fn `return undefined` | M-7C-D-17 | emit-machines.ts L252/L296/L299 + emit-machine-property-tests.ts L416 | **CLOSED-AS-SPEC-RATIFIED** — emitted runtime/test harness; §42.1 exclusion (codegen-emitted JS) | (no code change required) |
| M-8C-D-10 emit-control-flow match-arm + for-loop key | M-7C-D-13 | emit-control-flow.ts L1549/L373 | **CLOSED-AS-SPEC-RATIFIED** — emitted runtime; §42.5/§42.8 normative | (no code change required) |
| M-8C-D-11 Runtime structural-equality helper | M-7C-D-14 | runtime-template.js L1711/L1723/L1840 | **CLOSED-AS-SPEC-RATIFIED** — runtime shim; §42.1 exclusion | (no code change required) |
| M-8C-D-12 Runtime cache invalidation + array-first helpers | — | runtime-template.js L500/L2203/L2236/L2419 | **CLOSED-AS-SPEC-RATIFIED** — internal cache idiom (`delete cache[name]` would be equivalent); array-first helpers' `undefined` return is a JS-host idiom that §42.9 normalizes to scrml `not` at predicate read time | (no code change required) |
| M-8C-D-13 runtime-validators absence preprocessing | M-7C-D-18 | runtime-validators.js L185/196/205-206/226/405-409 | **CLOSED-AS-SPEC-RATIFIED** — paired `null \|\| undefined` guards are §42.9 interop boundary semantics | (no code change required) |
| M-8C-D-14 Type-system + parser keyword removal | M-7C-D-11 | type-system.ts L3143 + tokenizer.ts L61/724 + ast-builder.js L2133/2441/8461 + expression-parser.ts L2185 + route-inference.ts L1582 | **PARTIALLY MIGRATED via T1** — `type-system.ts` BUILTIN_TYPES `"null"` removed; `LOGIC_SCOPE_GLOBAL_ALLOWLIST` `"null"`/`"undefined"` removed; expression-parser.ts keyword whitelist migrated. **NOT migrated** (scope-noted in T1 progress): `route-inference.ts` JS_KEYWORDS (defensive filter, not a scrml-language emission), `tokenizer.ts` / `ast-builder.js` VALUE_KEYWORDS (lexer-level removal would break statement-boundary detection — out-of-scope follow-up). | `850a298` (partial) |
| M-8C-D-15 emit-variant-guard payload-positional undefined (UNIQUE, AMBIGUOUS) | — | emit-variant-guard.ts L744-755 | **DEFERRED** — surfaced as A-class in audit §5.3; needs separate PA disposition not folded into M-7C-D-12 scope | (no code change required) |
| M-8C-D-16 derived-cache invalidation marker (UNIQUE, AMBIGUOUS) | — | runtime-template.js L500 | **CLOSED-AS-SPEC-RATIFIED** — internal cache idiom; §42.1 exclusion | (no code change required) |

### Summary disposition

- **MIGRATED via Track 1 (T1):** M-8C-D-1, M-8C-D-2, M-8C-D-3, M-8C-D-14 (partial) — commit `850a298`.
- **MIGRATED via Track 3 (T3):** M-8C-D-6 — commit `887f420` (16 sites + new lint `W-CG-UNDEFINED-INTERPOLATION`).
- **PARTIALLY MIGRATED via Track 4 (T4):** M-8C-D-8 (SPEC error-code rename only; compiler-source rename deferred as scaffold-internal) — commit `8cef7f5`.
- **CLOSED-AS-SPEC-RATIFIED:** M-8C-D-4, M-8C-D-5, M-8C-D-7, M-8C-D-9, M-8C-D-10, M-8C-D-11, M-8C-D-12, M-8C-D-13, M-8C-D-16.
- **DEFERRED (out-of-scope for M-7C-D-12):** M-8C-D-15 (payload-positional ambiguity).

### Summary counts — post-S90 re-grep (executed against base `0ed8e55`, pre-T2)

| Metric | Pre-S90 baseline (this audit) | Post-T1+T3+T4 |
|---|---|---|
| Total `\bundefined\b` hits | 861 (62 files) | **933 (70 files; +72, +8 files)** |
| **Substantive change** | — | T3 ELIMINATED all 16 `?? "undefined"` literal-JS-keyword interpolation sites (M-8C-D-6 — the audit's only UNIQUE-to-undefined drift). NEW lint `compiler/src/codegen/lint-undefined-interpolation.ts` (+29 `undefined` hits internal to lint helper — reference-strings + comments). Count grew net of T3 reduction because (a) +29 from new lint file, (b) +22 from new `constant-folder.ts` (S89 A-2.2), (c) +43 from new `usage-analyzer.ts` (S89 A-2.2), (d) T1 doc-comment annotation in `ast-builder.js`, `expression-parser.ts`, `types/ast.ts`. |
| **NET RESIDUAL DRIFT** | — | **Zero new M-class drift.** Pre-S90 the audit flagged 71 `"undefined"` string-literal sites as HIGH-leverage — post-S90 grep of `"undefined"` quoted literals in `emit-server.ts` / `emit-logic.ts` / `scheduling.ts` (the M-8C-D-6 dispatch targets) confirms ZERO remaining interpolation patterns. All remaining `"undefined"` quoted literals are `typeof X !== "undefined"` env-guards (J-class legitimate per §42.1 exclusions) or T3-introduced explanatory comments. |
| Classification of post-S90 sites | — | **~110 J-class** (typeof guards, DOM/Map/Bun host APIs, setInterval handles, Bun.serve contract); **~590 I-class** (TS `as X \| undefined` cast narrowings — TS scaffold internal); **~140 M-class** — all dispositions above (most CLOSED-AS-SPEC-RATIFIED per §42.5/§42.8/§42.9 interop boundary). |

The substantive change post-S90 is that the M-class is no longer "migration backlog" — it's spec-ratified per Option ε with one exception (M-8C-D-6, which T3 closed). The pre-S90 framing presented these sites as drift; the SPEC-ratified framing recognizes them as the canonical interop ABI.

**Empty-string `""` orthogonality preserved:** S89 ruling explicitly carves `""` as a DEFINED value; the audit's 26 `=== ""` sites remain correctly non-migration-targets. T1+T3+T4 introduced zero new `""`-related drift.

**See:** `docs/changes/m-7c-d-12-runtime-sentinel-scoping/SCOPING.md` §3 Option ε + §5 OQ-5 ratification (`?? "undefined"` → `?? "null"`) + §5 OQ-6 ratification (`E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT` rename).

---

**Date:** 2026-05-13
**Driver ruling (S89, verbatim):** "null does NOT EXIST IN SCRML! and never will! yes this extends to undefined. `""` is still defined."
**Scope:** `compiler/src/**` excluding `tests/`, `module-resolver.js`, and `meta-checker.{js,ts}` (Wave 8.C handles those directly). Also out of scope per brief: `compiler/runtime/` (JS shims), `compiler/tests/`.
**Audit type:** READ-ONLY classification. No code changes.
**Companion audit:** [null-audit-compiler-src-2026-05-13.md](./null-audit-compiler-src-2026-05-13.md) — Wave 7.D mirror; this audit cross-references it via the `Null-audit-overlap?` column.

**S90 amendment:** "Undefined as first-class migration target" rescoped at S90 — `undefined` is correctly handled by the §42.9 interop boundary (JS-host `undefined` → scrml `not` at predicate-read time). The literal-JS-keyword interpolation pattern (M-8C-D-6) WAS substantive drift and migrated via T3 (`887f420`). All other M-8C-D-N items close per Option ε. See banner above.

---

## §1 Methodology

### Source
Exhaustive grep:

```
grep -rn "\bundefined\b" compiler/src/ \
  --exclude-dir=tests \
  --exclude=module-resolver.js \
  --exclude=meta-checker.ts \
  --exclude=meta-checker.js
```

### Volume
- **Total hits:** 861 occurrences
- **Files affected:** 62 (out of 96 non-empty source files; 34 files are undefined-free)
- Per-file counts range from 1 (e.g., `api.js`, `serve-client.js`, `codegen/index.ts` minimal, `emit-test.ts`) to 260 (`type-system.ts`).

### Classification taxonomy (mirror of Wave 7.D)

Each `undefined` site is classified into ONE of three buckets:

1. **JS-host-interop-leave (J)** — `undefined` is required/produced by a JS host API or by TypeScript's idiomatic optional-property typing. The site never leaks scrml-author observable values. Examples: `Map.get(...) → T | undefined`, optional-arg defaults, `typeof globalThis !== "undefined"` environment guards, `RegExp.exec()` returning a match-object whose capture groups can be `undefined`.
2. **Scrml-semantic-mirror-migrate (M)** — `undefined` represents "scrml-side absence" in:
   - data structures the compiler emits into compiled JS output,
   - values that surface back to scrml-author code (engine state, server-fn results, audit-log entries, history cells, match-arm bindings),
   - or AST nodes that mirror scrml-source absence into JS `undefined` at codegen.
3. **Internal-implementation-detail (I)** — `undefined` used for compiler-internal control state (e.g., lookup-miss in a Map; an AST field that wasn't populated yet; a typed-as-optional ResolvedType). Never surfaces outside the compiler. Leave OR migrate at user's discretion; flagged for ratification when uncertain.

### `""` empty-string adjacency (per brief)

Per S89: `""` IS defined; the `undefined` check IS absence; they are orthogonal. Sites where the same code does `=== ""` AND `=== undefined` are noted but classified independently — the `undefined` half is the audit's concern. Empty-string check sites (mostly emit-html, emit-logic, ast-builder) total 26 occurrences in 12 files and are NOT migration targets.

### Pattern frequency (orthogonal slice)
- 112 sites: equality-with-undefined (`=== undefined`, `!== undefined`, `== undefined`, `!= undefined`)
- 17 sites: `return undefined` (signaling lookup-miss / abort / skip / default-fallback)
- 457 sites: TS type-union `| undefined` or `undefined |` (the dominant form — TS optional-typing for AST cast narrowing + Map lookups)
- 3 sites: `?? undefined` (vanishingly rare — the codebase prefers `?? null` per existing pattern)
- 71 sites: string-literal `"undefined"` / `'undefined'` (HIGH-leverage — codegen emits the literal `undefined` JS keyword into compiled output via these strings)
- 33 sites: `typeof X !== "undefined"` / `typeof X === "undefined"` (environment-guard idiom; all J)

### Cross-reference with Wave 7.D null audit

The null audit found 2,777 sites across 81 files. Of those 81 files, **62 also have undefined sites**. The classification overlap is structural: most files with M-class `null` mirrors ALSO have parallel M-class `undefined` mirrors at the SAME line (e.g., `=== null || === undefined` paired emission in emit-expr.ts L466). The `Null-audit-overlap?` column in §2 flags PAIRED migration candidates that should be solved together.

### Why per-file bucketed counts (not per-line table)
861 line-by-line classifications would produce a ~30-page table dominated by repetitive TS-cast patterns (`p?.x as T | undefined`, `Map.get → T | undefined`, `attr as Span | undefined`). The audit instead:
- §2 enumerates per-file pattern composition + classification verdict with explicit line callouts for M-class sites
- §4 enumerates the high-leverage migration items by file:line for follow-on dispatch
- §5 surfaces AMBIGUOUS cases that need user disposition

---

## §2 Per-File Findings

Legend: **J** = JS-host-interop-leave / **M** = scrml-semantic-mirror-migrate / **I** = internal-implementation-detail / **A** = AMBIGUOUS (see §5).

Null-audit-overlap column: **Y** = file also flagged M-class in null audit § corresponding row; **P** = paired site (same line carries both null + undefined drift); **—** = no overlap (undefined-only).

### A. AST + types (canonical structural surface)

| File | Count | Bucket | Key sites | Null-audit-overlap? | Verdict |
|---|---|---|---|---|---|
| `compiler/src/types/ast.ts` | 7 | **M** | **L1483 `litType: "undefined"`** (canonical absence variant in LitExpr discriminated union — direct sibling to `"null"` L1482); L1475-1476 `value: string | number | boolean | null` docstring says "for null/undefined/not: the keyword string"; **L1543-L1544** docstring: `"is-not"` → `(x === null \|\| x === undefined)` + `"is-some"` → `(x !== null && x !== undefined)`; L235/L630/L802 doc-strings about ASTs that may have undefined fields. | **P** (paired with null-audit M-7C-D-1) | **M.** Direct sibling to `litType:"null"`. Per S89, `litType: "undefined"` must be removed from the union together with `"null"`; both fold into a single absence representation (`"not"` or a new `AbsenceMarker` discriminator). |
| `compiler/src/type-system.ts` | 260 | **I (predominant) + M-edge** | **L3143 `"undefined", "null", ...` GLOBAL_NAMES set** (built-in identifiers the type-system reserves — undefined IS registered as a built-in scrml identifier today); **L181 docstring "absence value type (replaces null/undefined in scrml source)"** — confirms NotType is the intended replacement. ~250 sites are TS-cast patterns: `as X \| undefined` for Map.get, ASTNodeLike fields, RegExp capture, `Span \| undefined`, `ExprNode \| undefined` (e.g., L2042, L2100, L3288, L3304, L3312, L3318, L3375, L3389, L3402, L3417, L3460, L3487, L3527, L3607-3608, L3614, L3634, L3706-3707, L3721, L3745, L3760, L3762, L3767-3768, L3794-3795, L3804, L3820, L3822, L3855, L3867, L3901, L3907, L3924, L7529, L7553, L7861, L7920, L7937, L8190, L8192, etc.). L181 explicitly names "null/undefined" as the JS-host absence pair that scrml's `not` supersedes. | **Y** (paired M-7C-D-11) | **Mixed I + M.** L3143 GLOBAL_NAMES `"undefined"` registration is the highest-leverage M site — same shape as null-audit M-7C-D-11 (`"null"` primitive type). Remove `"undefined"` from GLOBAL_NAMES alongside `"null"`. The 250+ TS-cast `\| undefined` patterns are I (compiler-internal). |
| `compiler/src/symbol-table.ts` | 67 | I + M-edge | L229 docstring "remain `undefined` until A5-2/A5-3 dispatches populate them"; L367 "Absent (undefined) for unnamed [shapes]"; L612 "presence/absence of `parentField` is the discriminator"; L1937 `if (cellKind === undefined) return` defensive; many `Scope \| null \| undefined` (L8419, L8422, L8448, L8478, L8481, L8503, L8528-8530, L8548-8550, L8563-8565, L8579, L8594, L8630). L3995-3997 `historyAttr: undefined, internalRules: undefined, onTimeoutElements: undefined` — engine-meta record initialized with explicit undefined (later populated). | **Y** (parallel to null-audit symbol-table M+I) | **Predominant I.** Same verdict as null-audit: symbol-table fields never directly emit literal `undefined` into scrml-output; they drive codegen branches that may. The MIRROR happens in codegen sites that consume them — those are M. |

### B. Parser + AST builders

| File | Count | Bucket | Key sites | Null-audit-overlap? | Verdict |
|---|---|---|---|---|---|
| `compiler/src/ast-builder.js` | 33 | I + M-edge | **L2133+L2441+L8461 `VALUE_KEYWORDS = new Set(["true", "false", "null", "undefined", ...])`** — parser whitelists `undefined` as a value keyword in scrml source today (mirror of null entries). L4788+L7916 `// Single: \`given x => { body }\` — execute body if x is not null/undefined` (presence-guard semantics doc). L171/L1857/L1861 `safeParseExprToNode` returns undefined on parse failure (I). L1249/L2815 `argExprNodes: ... : undefined` (additive AST field). L3091 `argsExpr: ... : undefined`. L3467 `reactivity = undefined`. L4607/L5722/L7345 `partial: isPartial \|\| undefined` and friends. L7005-7006 `route = undefined, method = undefined`. L9300-9301 `_p3aIsExport, _p3aExportName`. L9535/L9593/L10273 ADDITIVE-field doc. | **Y** (parallel to null-audit B6) | **I.** The M-edge sites are L2133+L2441+L8461 (VALUE_KEYWORDS sets containing `"undefined"`) — parser-layer recognition of `undefined` as a value keyword that subsequently dispatches to `litType:"undefined"`. Migration: drop `"undefined"` from VALUE_KEYWORDS alongside `"null"`. The remaining `: undefined` initializers are AST-additive-field plumbing (I). |
| `compiler/src/expression-parser.ts` | 23 | **M (critical) + I** | **L1230-L1236 `LitExpr{ raw:"undefined", value: undefined as unknown as null, litType:"undefined" }`** — zero-arg `reset()` synth target uses undefined-literal; **L1255-L1258 same shape** for multi-arg reset; **L1316 array-hole element** → `LitExpr{ raw:"undefined", ..., litType:"undefined" }`; **L1596 emitStringFromTree**: `if (node.litType === "undefined") return "undefined";` — round-trips `litType:"undefined"` back to source text; **L2185 keyword whitelist** `"true", "false", "null", "undefined", "not"`; **L2300 doc** `"Most lit kinds (string, number, bool, null, undefined, not) are leaves."`. L167/L287/L323/L1502/L1503 `let X: T \| undefined` ESTree-walk internals (I). L350+L401+L410+L434+L441+L443+L452 ASTwalk cast `as ESNode \| undefined` (I). L1146 `rawSource is undefined` (I). L1255 `firstArg as ESNode \| undefined` (I). | **P** (paired with M-7C-D-2) | **M.** Mirror of null-audit M-7C-D-2. The parser manufactures `litType:"undefined"` nodes for: (a) array-holes, (b) zero-arg / multi-arg `reset()` synth, (c) ad-hoc placeholder. Each is a scrml-AST mirror of an internal JS `undefined`. Per S89 these must migrate to absence-marker AST nodes (no JS-undefined value field). |
| `compiler/src/component-expander.ts` | 15 | I + M-edge | L551-L552 `if (decl.isSnippet === undefined) decl.isSnippet = false; if (decl.snippetParamType === undefined) decl.snippetParamType = null;` (I); L1128/L1130/L1194/L1235/L1239 sub-expression sub builders return `... : undefined` (I); L1894 `as Record<string, unknown> \| undefined`; L2394 `as MarkupNode \| undefined`; L2477+L2719 `compDef as ... \| undefined`; L2878+L2889 import-graph nullable params; L3055 `clone._p3aIsExport = undefined`; L3060 `if (node === null \|\| node === undefined) return node;` (presence check). | **Y** (parallel to null-audit C5 component-expander.ts) | **I.** The M-class null site at L745-752 (`default="null"` → litType:"null") has no direct undefined equivalent — undefined never appears as a component default string. The 15 undefined sites here are all TS-narrowing or recursive-clone internal plumbing. |
| `compiler/src/block-splitter.js` | 0 | — | (none) | — | n/a |
| `compiler/src/body-pre-parser.ts` | 0 | — | (none) | — | n/a |
| `compiler/src/tokenizer.ts` | 5 | I + M-edge | L61 `"class", "extends", ..., "null", "undefined", ...` (KEYWORD set); L699/L707/L713/L724 `VALUE_KEYWORDS` parser-state set including `"undefined"`. | **Y** | **M-edge for L61/L724** (tokenizer recognizes `undefined` as a keyword/value-keyword — same status as `null`, must be removed together). |

### C. Gauntlet / lint / source-level enforcement

| File | Count | Bucket | Key sites | Null-audit-overlap? | Verdict |
|---|---|---|---|---|---|
| `compiler/src/gauntlet-phase3-eq-checks.js` | 30 | I + M-edge | **L21 docstring**: `E-SYNTAX-042 — null / undefined keywords used in scrml source`; L25 `x == null, x != null, x == undefined, x != undefined`; **L168 `if (node.litType === "undefined") return "undefined";`** — gauntlet lint walker inspects LitExpr `litType:"undefined"`; L351-L353 walker visits `lit{ litType: "null" \| "undefined" }` and ident `name: "null" \| "undefined"`; L368 §42.7 W3 amendment "rejection of null/undefined SHALL apply"; L378 `if (node.kind === "lit" && (node.litType === "null" \|\| node.litType === "undefined"))`; L386 `if (node.kind === "ident" && (node.name === "null" \|\| node.name === "undefined"))`; L413-414 bare null/undefined in mixed positions; L437 docstring; L443 `if (operand.name === "undefined") return { kind: "lit", primType: "undefined" };` — gauntlet synthesizes a fake lit for type-checking; L509-512 E-SYNTAX-042 dispatch; L592-593 docstring "Emit E-SYNTAX-042 for a bare lit-null / lit-undefined / ident-null / ident-undefined"; L604-607 emit error tok `"null"` / `"undefined"`. | **P** (paired — same code paths fire on both) | **I (lint detector).** Mirror of null-audit C-gauntlet entry. When the AST migrates away from `litType:"null"`/`"undefined"`, this lint must move to the new absence-sentinel form. Migration is downstream of AST migration, not a separate site. |
| `compiler/src/lint-i-match-promotable.js` | 0 | — | (none) | — | n/a |
| `compiler/src/lint-ghost-patterns.js` | 0 | — | (none) | — | n/a |
| `compiler/src/gauntlet-phase1-checks.js` | 0 | — | (none) | — | n/a |

### D. Codegen — emit-* (highest scrml-output leakage surface)

| File | Count | Bucket | Key sites | Null-audit-overlap? | Verdict |
|---|---|---|---|---|---|
| `compiler/src/codegen/emit-expr.ts` | 11 | **M (critical)** | **L466 `(${left} === null \|\| ${left} === undefined)`** — `is-not` emission (paired with M-7C-D-4); **L468 `(${left} !== null && ${left} !== undefined)`** — `is-some` emission; **L470 same for `is-not-not`**; **L221 `return /* C5 */ undefined`** — emitted string with literal `undefined` keyword for unexpected reset target shape; L83/L102/L115/L357 docstrings ("treats undefined as null"); L245 `emitExprField(exprNode: ExprNode \| null \| undefined, ...)`; L377+L474 type-system docstring listing `null, undefined, not`. | **P** (paired with M-7C-D-4) | **M.** Direct mirror of null-audit M-7C-D-4. The `is-not`/`is-some`/`is-not-not` emissions use `=== null \|\| === undefined` (defensive double-check). When M-7C-D-12 lands (runtime absence-sentinel), both sides should fold to `_scrml_is_absent(x)`. |
| `compiler/src/codegen/rewrite.ts` | 17 | **M (critical) + I** | **L506 `expr = expr.replace(/\bis\s+undefined\b/g, '=== undefined');`** — scrml-source `is undefined` rewritten to JS `=== undefined`; **L519+L546 `if (${varName} !== null && ${varName} !== undefined) {`** — §42 presence-guard emission; **L688 nullRe** detects bare `null`/`undefined` keywords in scrml source (E-SYNTAX-010); **L705+L708 presence emission** `($1 !== null && $1 !== undefined)`; **L713 absence emission** `($1 === null \|\| $1 === undefined)`; **L1148-L1149 match-arm `not`**: `condition = ${tmpVar} === null \|\| ${tmpVar} === undefined`; L475 `if (result === undefined) return "undefined";` (derived-ref miss → literal `"undefined"` JS keyword string); L503-L504+L554+L563 docstrings about `is null / is undefined`; L610 `// Uses double-equals to match both null and undefined`; L1295/L1785 docstrings. | **P** (paired with M-7C-D-5) | **M.** Direct mirror of null-audit M-7C-D-5. Same fix shape: replace all `=== null \|\| === undefined` patterns with a single sentinel check. The bare-keyword detector at L688 already lints both — keep parity. |
| `compiler/src/codegen/emit-server.ts` | 10 | **M + J** | **L882 `emitExprField(stmt.initExpr, stmt.init ?? "undefined", ...)`** — when scrml init expression is absent, the literal string `"undefined"` is interpolated as the fallback JS source for the server-side init; **L1047 same**; **L1139 same**; **L1293 `if (a === null \|\| b === null \|\| a === undefined \|\| b === undefined) return false;`** — emitted scrml-equality helper checks both null AND undefined (paired with §45 structural equality); **L1303 `if (a._tag !== undefined && b._tag !== undefined)`** — emitted tagged-union equality. L334+L528 `typeof globalThis !== "undefined"` / `typeof Bun !== "undefined"` (J — environment guards). L35+L80 parser signature `string \| null \| undefined` (I). L60 `mult !== undefined` (I — Map.get pattern). | **P** (paired with null-audit M-7C-D-6 server wire format) | **M.** The `?? "undefined"` initializer fallback at L882/L1047/L1139 emits the literal JS keyword `undefined` into compiled output, which the runtime then carries into scrml-side reads. The §45 equality emission at L1293/L1303 mirrors the null-audit emit-expr `is-not` pattern. Both need the absence-sentinel migration. |
| `compiler/src/codegen/emit-logic.ts` | 34 | **M (critical) + I** | **L591 `if (!initStr \|\| initStr === "undefined") return null;`** — defensive guard checking for the literal string `"undefined"` (the `?? "undefined"` fallback's downstream consumer); **L1764 `${_emitReactiveSet(encoded21, "undefined", opts, ...)}`** — E-TYPE-001 diagnostic emits literal `undefined` as JS string to fail-safe reactive-set; **L1823 `const initStr: string = node.init ?? "undefined";`** — same fallback pattern as emit-server; **L1885+L1900 `initStr !== "undefined"`** check; **L2155 `: "undefined"` ternary fallback** for init emission; **L2262+L2265 `emitExprField(..., guardedNode.init ?? "undefined", ...)`** — engine-guarded init fallback; **L2281 `return [\`    ${resultVar} = undefined;\`];`** — emitted assignment of literal `undefined`; **L2378 `node.value ?? "undefined"`** — value-init fallback; **L1233-L1241 presence-guard `if (${varName} !== null && ${varName} !== undefined) {`** (§42 §-paired); **L2180-L2187 multi-variable presence guard** same shape; **L3010+L3036 `${tmpVar} === null \|\| ${tmpVar} === undefined`** for match-arm `not`; L1081+L1094 `typeof process !== "undefined"` (J — Node env guard). L170 doc "null/undefined at top-level cell scope". L330/L359/L380/L386/L392/L1737/L2487 internal `\| undefined` narrowing (I). | **P** | **M.** Most M-class sites in this file. The recurring `node.init ?? "undefined"` pattern (L1823, L2262, L2265, L2378, L882-equivalent) is the dominant scrml-init-absent mirror — when a scrml `let x;` has no init, the emit-layer interpolates the literal string `"undefined"` into the JS output. Migration target: emit a real absence-sentinel reference. |
| `compiler/src/codegen/emit-engine.ts` | 55 | **M (critical) + I** | **L2141+L2143 `if (__scrml_derived_v === undefined) { throw new Error("E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT: ... (upstream is undefined). ...");`** — derived-engine identity projection emits a `=== undefined` check + diagnostic STRING containing the word "undefined" into compiled JS; **L2172 same shape** for inline-match form; **L2198+L2211 same** in canonical-form doc; **L2117+L2120+L2123 docstring** about init-undefined throw per §51.0.J; **L3263 docstring** "`varName:armTag`. `undefined`/`null`/empty"; **L3270 `engineArm: string \| null \| undefined`** in TS signature; **L3356+L3373+L3380 `if (__scrml_hook_old !== undefined && __scrml_hook_old !== __scrml_hook_new)`** — emitted hook-firing guard; **L1561+L1571+L1584+L1601+L1694+L1755+L1851+L1930 docstrings** all about "runtime treats undefined as null and short-circuits" (8 sites — tree-shake / arg-omit ABI); L1292 `postMountJs: string \| undefined = undefined`; L1640/L1647/L1657/L1664 emit-options `... : undefined` (I); L2430/L2444/L2467/L2492/L2496/L2553/L2623 importBindings nullable (I); L854/L860/L870/L876 docstrings about `bodyChildren undefined`. **L500 (runtime-template)** parallel: `_scrml_derived_cache[name] = undefined;` (runtime-template — see below). | **P** (paired with M-7C-D-7) | **M.** The §51.0.J derived-engine init-undefined throw IS scrml-author-observable (`E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT` fires in user runtime). The compiler emits a hardcoded `=== undefined` check and a diagnostic string that names "undefined" — both must migrate to absence-sentinel semantics. The tree-shake ABI docstrings (L1561, L1571, L1584, L1601, L1694, L1755, L1851, L1930) describe a contract where omitted args ↔ undefined ↔ null at runtime — this contract IS the migration target. |
| `compiler/src/codegen/emit-machines.ts` | 8 | **M + I** | **L252 `lines.push(\`  return undefined;\`);`** — emitted machine-fn return for "no rule matched" (parallel to null-audit M-7C-D-17); **L224 docstring** `*     return undefined;`; **L296+L299 `... ? __prev.data.${b.fieldName} : undefined;`** + same for __next — emitted machine-property-test harness uses `undefined` for "absent prev/next data"; L118 doc "null/undefined → wildcard fallback"; L54-55 `typeof process !== "undefined"` (J); L609 doc "null/undefined → '*'". | **P** (paired with M-7C-D-17) | **M.** Same dispatch as null-audit M-7C-D-17 (machine-property-tests). Emitted runtime harness uses literal `undefined` for no-match; migrate together with sentinel. |
| `compiler/src/codegen/emit-control-flow.ts` | 5 | M + I | **L1549 `return \`${tmpVar} === null \|\| ${tmpVar} === undefined\`;`** — emitted match-arm `not` predicate; **L373 `... item?.id !== undefined ? item.id : i ...`** — for-loop key extraction in reconciler emitted code; L1204 doc "When `engineCtx.exprCtxExtras` is null/undefined, the spread is a [no-op]"; L1350 doc "`opts` may be undefined"; L1554 doc "(`tests` field is undefined or length 1)". | **P** (paired with M-7C-D-13) | **M for L1549 + L373.** The match-arm `not` predicate at L1549 mirrors the null-audit M-7C-D-13. The for-loop key fallback at L373 currently uses `!== undefined ? ... : i` (defensive — if user has `id: 0` it survives, but `id: ""` is treated as defined per S89 — that's already correct). |
| `compiler/src/codegen/emit-html.ts` | 11 | I | L230+L249 `firstArg?.value !== undefined` (parser-output narrowing check before reading numeric value — I); L285+L529+L578+L579 `let X: T \| undefined` (I); L573 `const allFlag = allAttr !== undefined` (I); L608-L609 `...(fieldName !== undefined ? { fieldName } : {})` (I — additive object props); L1023 `cellKind = decl ? getCellKind(...) : undefined` (I); L1047 `attrs: undefined` (I). | — | **I.** All compile-time text-scan / object-construction defaults. Output text production doesn't emit literal `undefined` from these sites. |
| `compiler/src/codegen/emit-client.ts` | 1 | I | L1140 `v.payload === null \|\| v.payload === undefined` (enum-variant payload-absent check — internal classification). | Y-paired | I. |
| `compiler/src/codegen/emit-validators.ts` | 7 | I | L34 docstring "null/undefined or empty array"; L169 `dbVar: undefined`; L295 `inlineOverride: string \| null \| undefined`; L449-L452 `...(node.X !== undefined ? ...)` additive-property pattern. | — | I. |
| `compiler/src/codegen/emit-channel.ts` | 6 | I + J | L140-L141 nullable importer/registry args (I); L156 `let sourceMap: ... \| undefined` (I); L207 `parseChannelReconnect(raw: string \| null \| undefined): number \| null` (I); L229 `mult !== undefined ? ... : null` (I); **L609 `return ok ? undefined : new Response(...)`** — server WS upgrade returns `undefined` to defer to Bun (J — Bun.serve contract). | — | I + J. |
| `compiler/src/codegen/emit-event-wiring.ts` | 10 | I + M-edge | L100+L265+L284 `kind === undefined` reactive-text default discrimination (I — but observable indirectly in compile-time behaviour); L418+L508 (var-guard sibling) `as ... \| undefined`; **L453 `if (node && typeof node.value !== "undefined") return JSON.stringify(node.value);`** — handler-arg literal-value reflection (mirrors scrml-author author-arg into JS at codegen); L675/L734/L735+L756/L805 condition/refs narrowing (I). | Y-paired | I-predominant, M-edge at L453 (handler args reflect-into-output). |
| `compiler/src/codegen/emit-functions.ts` | 4 | J + I | L37 `(p as any).typeAnnotation as string \| undefined` (I); **L202+L220+L229 `typeof crypto !== 'undefined'` / `typeof document !== 'undefined'`** — environment guards emitted into compiled JS (J — server/client polyglot). | — | **J + I.** Emitted environment guards are legitimate JS-host polyglot; not migration target. |
| `compiler/src/codegen/emit-machine-property-tests.ts` | 7 | M | **L80 docstring** "`undefined` if no fallback exists"; **L391 docstring** "`undefined` when no fallback exists"; **L416 `lines.push(\`    return undefined;\`);`** — emitted harness returns literal `undefined` for "no rule matched"; **L455-L461 docstring** "the all-falsy → undefined terminal test"; L489-L531 internal `... \| null \| undefined` narrowing. | **P** (paired with M-7C-D-17) | **M.** Same dispatch as null-audit M-7C-D-17. |
| `compiler/src/codegen/emit-reactive-wiring.ts` | 5 | I | L213+L305-L306 `machineRegistry as Map<...> \| undefined`; L291 `typeDeclsForRegistry as ... \| undefined`; L233 `auditTarget as string \| null \| undefined`. | — | I. |
| `compiler/src/codegen/emit-variant-guard.ts` | 10 | I + M-edge | L123 doc "Empty / undefined when arm is non-composite"; L368/L508/L554/L558/L926 `as ... \| undefined` narrowing (I); **L538 `if (node && typeof (node as any).value !== "undefined") return JSON.stringify((node as any).value);`** — handler-arg reflect (same as emit-event-wiring L453); L744-L755 doc "payload positionals: `_payload[0]`, ... — undefined" (this IS observable — user payload reads on a 1-arg machine get JS undefined for positions 2+, which crosses into scrml-observable land); L846+L926 `attrs/children: any[] \| undefined`. | Y-paired | **I + M-edge at L744-L755 (payload-positional undefined visible to scrml user code).** Surface to PA. |
| `compiler/src/codegen/emit-test.ts` | 1 | I | L66 docstring "`bindKind === undefined` (defensive default)". | — | I. |
| `compiler/src/codegen/emit-messages.ts` | 1 | I | L28 docstring "null/undefined or empty array". | — | I. |
| `compiler/src/codegen/emit-css.ts` | 2 | I | L62+L110 `rule.value !== undefined` parsed-value narrowing. | — | I. |
| `compiler/src/codegen/emit-library.ts` | 3 | I | L149/L259/L278 `as ... \| undefined` narrowing. | — | I. |
| `compiler/src/codegen/emit-bindings.ts` | 3 | I | L249 `encodingCtx: ... \| null \| undefined`; L397+L676 `enumTypeName = ... : undefined` (Map.get pattern). | — | I. |
| `compiler/src/codegen/emit-parse-variant.ts` | 3 | I + M-edge | L74/L86 `name/base as string \| undefined`; **L92 docstring** "accept any non-null/non-undefined value" (parseVariant absence-tag contract). | Y-paired | **I + M-edge.** parseVariant absence-tag wiring; needs migration audit per null-audit M-7C-D (parse-variant). |
| `compiler/src/codegen/emit-synth-surface.ts` | 2 | J | L315-L316 `typeof document !== "undefined"` emitted environment guard. | — | J. |
| `compiler/src/codegen/index.ts` | 2 | I | L649 `children: any[] \| undefined`; L772 `machineRegistry as ... \| undefined`. | Y | I. |
| `compiler/src/codegen/binding-registry.ts` | 5 | I | L27/L35/L36/L95/L186 docstrings about `reactiveRefs/refs/condExpr as Set/string/string[] \| undefined`. | — | I. |
| `compiler/src/codegen/collect.ts` | 1 | I | L238 `ProtectAnalysis \| null \| undefined`. | — | I. |
| `compiler/src/codegen/reactive-deps.ts` | 4 | I | L123+L150+L151+L314 `as Map/Array/... \| undefined`. | — | I. |
| `compiler/src/codegen/scheduling.ts` | 3 | M-edge + I | **L127+L128 `emitExprField((stmt as any).initExpr, initStr \|\| "undefined", _exprCtx)`** — same `"undefined"` fallback string as emit-logic; **L129 `return "undefined";`** when no init/expr present. | **P** (paired with emit-logic) | **M.** Same migration target as the emit-logic `?? "undefined"` pattern. The literal string `"undefined"` is interpolated into compiled JS. |
| `compiler/src/codegen/runtime-chunks.ts` | 3 | I | L153 `typeof console !== "undefined"` (J); L179+L181 chunks defensive presence check. | — | I + J. |
| `compiler/src/codegen/type-encoding.ts` | 3 | I | L358 `existing !== undefined` Map.get-narrowing; L504+L506 `ResolvedType \| undefined` getType return. | — | I. |
| `compiler/src/codegen/analyze.ts` | 1 | I | L124 `ProtectAnalysis \| undefined`. | — | I. |
| `compiler/src/codegen/ir.ts` | 1 | I | L189 doc "When the field is undefined". | — | I. |

### E. Analyzers / type-side

| File | Count | Bucket | Key sites | Null-audit-overlap? | Verdict |
|---|---|---|---|---|---|
| `compiler/src/route-inference.ts` | 8 | I + M-edge | L383+L1416+L1437 `as ExprNode \| undefined` walker types (I); L693+L743+L1047 doc "`init` is `""` and `initExpr` is undefined" (I — describes parse-state, observable only through diagnostic messages); **L1582 `"true", "false", "null", "undefined", "NaN", "Infinity",`** — keyword whitelist (M-edge, mirrors tokenizer L61); L2201 `callers !== undefined` (I). | Y | I + M-edge at L1582 (keyword recognition). |
| `compiler/src/dependency-graph.ts` | 16 | I | L429-L449 ESTree-walk casts `as Record<...> \| undefined`; L1311 `metaNode.deterministic !== undefined` defensive default; L1842+L2011+L2027+L2039+L2069+L2134+L2135+L2215+L2266 narrowing. | Y | I. |
| `compiler/src/protect-analyzer.ts` | 4 | J + I | L472 `stmt === undefined` array-pop defense (I); L539+L541 `findAttr` returns `AttrNode \| undefined`; L554 `attrStringValue(attrNode: AttrNode \| undefined): string \| null`. | Y (J for sqlite handle elsewhere) | I. |
| `compiler/src/monotonicity-analyzer.ts` | 13 | I | L43+L246+L294+L296+L298+L300+L335+L338+L388+L390+L392+L409+L457 ASTNodeLike narrowing. | Y | I. |
| `compiler/src/name-resolver.ts` | 2 | I | L162+L244 `Span \| undefined`. | Y | I. |
| `compiler/src/idempotency-store-resolver.ts` | 6 | I | L6/L11/L59/L68/L112 docstrings: `auto" (or undefined) → walk through chain`; L214 `extractDbDriverFromValue(value: string \| undefined \| null)`. | Y | **I.** The `undefined → "auto"` default semantic is compiler-internal config; never reaches scrml. |
| `compiler/src/batch-planner.ts` | 2 | I | L121+L155 docstrings and `null \| undefined` typing. | Y | I. |
| `compiler/src/engine-statechild-parser.ts` | 12 | I | L313+L324 `nameVal: string \| undefined` parser-state; L414/L607/L644/L648/L656/L764/L918/L935/L1085/L1116 character-stream lookahead `ch === undefined` boundary check. | I (parallel to null-audit) | I. |
| `compiler/src/meta-eval.ts` | 5 | I | L92+L96 `as ExprNode \| undefined`; L296 `n.rawInit/rawTest/rawUpdate !== undefined` for-loop shape narrowing; L545+L569 `: undefined` precedingDecls default. | I | I. |
| `compiler/src/validators/ast-walk.ts` | 6 | I | L33+L47+L80+L104+L108+L117 `as ... \| undefined` narrowing in the shared walker. | I | I. |
| `compiler/src/validators/post-ce-invariant.ts` | 2 | I | L64+L125 `ast: FileAST \| null \| undefined`. | I | I. |
| `compiler/src/validators/attribute-allowlist.ts` | 2 | I | L145+L162 same shape. | I | I. |
| `compiler/src/validators/attribute-interpolation.ts` | 2 | I | L114+L131 same shape. | I | I. |
| `compiler/src/validator-arg-parser.ts` | 6 | I | L175 `spanOfArg(span: Span \| undefined, ...)`; L238+L545+L571+L573 `validators: ValidatorEntry[] \| null \| undefined`; L576 `v.args === undefined` Args-absent guard. | I | I. |
| `compiler/src/validator-catalog.ts` | 4 | I + M-doc | L146+L154 specRef docstrings mention "null/undefined fail"; L262 docstring "Returns `undefined` if name does NOT match"; L269 `lookupPredicate(name: string): PredicateSignature \| undefined`. | I | I (the M-doc is informational). |
| `compiler/src/tailwind-classes.js` | 2 | I | L1075+L1090 `prop === undefined` Map.get-narrowing. | I (huge static map of `null`) | I. |
| `compiler/src/usage-analyzer.ts` (codegen) | 43 | I | All `as ASTNode \| undefined` / `as ExprNode \| undefined` / `as string[] \| undefined` ASTNodeLike-walker type narrowings (L154/L213/L313/L317/L384/L398/L420/L425/L445/L459/L461/L501/L506/L510/L514/L518/L523/L527/L529/L563/L567/L575/L576/L596/L603/L605/L607/L627/L630/L648/L658/L668/L675/L676/L687/L688/L696/L702/L703/L704/L709). Plus L313+L317 `idempotencyStore as ... \| undefined` (with explicit undefined-as-"default-auto" mapping, parallels idempotency-store-resolver). | I | I. |

### F. CLI commands / orchestration

| File | Count | Bucket | Key sites | Null-audit-overlap? | Verdict |
|---|---|---|---|---|---|
| `compiler/src/api.js` | 1 | I | L1267 `prior !== undefined && prior !== filePath` cache-narrowing. | Y | I. |
| `compiler/src/serve-client.js` | 1 | J | L39 `typeof globalThis !== "undefined"` env guard. | I | J. |
| `compiler/src/commands/serve.js` | 2 | J + I | L94 `typeof Bun !== "undefined"` env guard (J); L169 `body.outputDir ? resolve(...) : undefined` (I). | I | J + I. |
| `compiler/src/commands/build.js, compile.js, dev.js, init.js, migrate.js, promote.js` | 0 each | — | (none) | — | n/a |
| `compiler/src/index.js, cli.js` | 0 each | — | (none) | — | n/a |

### G. Runtime + emitted shims

| File | Count | Bucket | Key sites | Null-audit-overlap? | Verdict |
|---|---|---|---|---|---|
| `compiler/src/runtime-template.js` | 32 | **J (predominant) + M** | Mostly JS-host APIs: L143 setInterval-handle `id !== undefined`; L245 doc "endIdx undefined → state lands at log[log.length - 1].to"; **L500 `_scrml_derived_cache[name] = undefined;`** — derived-cache invalidation uses literal `undefined` (M — derived-cache is observable through `_scrml_derived_get` which scrml programs call indirectly); L936+L943+L964+L994 reconciler key-state `_scrml_key !== undefined` (J — reconciler internal); L1093 `if (handle === undefined) return;` (J — clearTimeout-style); L1155 `_scrml_reactivity_timers[name] === undefined` (J — Map-like); **L1209+L1273+L1318+L1321+L1352+L1399+L1537+L1567+L1590+L1652+L1663+L1668+L1678 `typeof document/globalThis/navigator/requestAnimationFrame/cancelAnimationFrame !== "undefined"`** — environment guards (J); **L1711 `if (a === null \|\| b === null \|\| a === undefined \|\| b === undefined) return false;`** — runtime structural-equality helper (M — observable through scrml `==` operator); **L1723 `a._tag !== undefined && b._tag !== undefined`** — tagged-union equality (M); **L1840 `if (value === null \|\| value === undefined) return value;`** — scrml-absence passthrough (M — observable); L2165 doc; **L2203+L2236 `return arr.length > 0 ? arr[0] : undefined;`** — scrml-helper returns literal undefined for empty-array first; **L2267 doc** "never returns undefined"; **L2312 doc** "Unknown tag — fallback (never undefined)"; L2419 doc "When null/undefined (engines)"; L2662 doc "clearTimeout(undefined) no-op". | **P** | **Mixed J + M.** L500/L1711/L1723/L1840/L2203/L2236 are M-class — they emit / consume scrml-observable absence using JS `undefined`. Paired with null-audit M-7C-D-14 (runtime _scrml_lift_target). |
| `compiler/src/runtime-validators.js` | 11 | **M** | **L64 doc** "undefined | fail Required | fail NotSome"; **L185 `if (value === null \|\| value === undefined) return { tag: "Required" };`** — `req` validator fails on null OR undefined; **L196 `if (value === null \|\| value === undefined) return { tag: "NotSome" };`** — `some` validator parallel; **L205-L206+L226 `if (value === null \|\| value === undefined) { /* treat as 0 / empty */ }`** — length validator null-or-undefined preprocessing; L181+L192 docstring describing semantics; **L405+L409 `if (fn === undefined) return undefined;`** — predicate-lookup miss returns literal `undefined`. | **P** (paired with null-audit M-7C-D-18) | **M.** Same dispatch as null-audit M-7C-D-18 (runtime-validators sweep). Validators are scrml-author-observable: their tag results round-trip through `messageFor`. Migration must coordinate with the runtime absence sentinel. |

---

## §3 Summary Metrics

### Bucket totals (per-file dominant classification + cross-checked against line callouts)

| Bucket | Files (dominant) | Estimated site count* | Notes |
|---|---|---|---|
| **Scrml-semantic-mirror-migrate (M)** | 8 files M-predominant + ~10 files M-secondary | **~140 sites** (incl. AST `litType:"undefined"` mirror, codegen emit-into-output `"undefined"` string interpolation, derived-engine init-undefined throw + diagnostic, §45 structural-equality emission, `is-not`/`is-some` operator emission paired with null, runtime validator null-or-undefined paired guard, runtime structural equality helper) | The migration backlog. |
| **JS-host-interop-leave (J)** | ~10 files predominantly J or J-secondary | **~110 sites** (typeof guards, DOM/Map/Bun host APIs, setInterval handles, Bun.serve return contract, RegExp narrowing) | Legitimate. |
| **Internal-implementation-detail (I)** | ~44 files predominantly I | **~590 sites** (massive: TypeScript `as X | undefined` cast narrowings, ASTNodeLike walkers, optional-arg defaults, Map.get fallbacks, recursive-clone plumbing, additive-AST-field initializers) | Leave OR migrate at user discretion — see §5 for borderline items. |
| **AMBIGUOUS (A)** | scattered | **~20 sites** | See §5. |
| **TOTAL** | 62 files | **861** | |

\* "Estimated site count" derived by combining per-file pattern composition with the line-level reads of each high-leverage file in §2. Most of the ~590 I-sites are pure TypeScript narrowing patterns (`p?.x as T | undefined`, `Map.get → T | undefined`) and are mechanically classifiable as I.

### "" empty-string adjacency count
- 26 occurrences (`=== ""` / `!== ""` / `== ""` / `!= ""`) across 12 files. These are orthogonal to `undefined` per S89 ruling. NOT migration targets.

### High-leverage scrml-semantic-mirror clusters (counts within the M total)
1. **AST `LitExpr.litType: "undefined"` creation + consumption:** ~5 direct creation sites (expression-parser.ts L1230-1236, L1255-1258, L1316; component-expander indirect) + ~10 consumer sites (codegen + gauntlet).
2. **Codegen `?? "undefined"` init fallback (literal JS keyword interpolation):** ~10 sites — emit-server.ts L882/L1047/L1139; emit-logic.ts L591/L1764/L1823/L1885/L1900/L2155/L2262/L2265/L2281/L2378; scheduling.ts L127-L129.
3. **Codegen `=== null || === undefined` paired emission for `is-not`/`is-some`/`is-not-not`:** ~8 sites — emit-expr.ts L466/L468/L470; rewrite.ts L519/L546/L705/L708/L713/L1148-L1149; emit-control-flow.ts L1549; emit-logic.ts L1233-L1241/L2180-L2187/L3010/L3036. All paired with null-audit M-7C-D-4 (`is-not` operator).
4. **Derived-engine init-undefined check + emitted diagnostic:** ~4 sites in emit-engine.ts L2141-L2145, L2172-L2176 (E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT).
5. **Runtime structural equality helper (`a === null || b === null || a === undefined || b === undefined`):** 2 sites — runtime-template.js L1711/L1723; emit-server.ts L1293/L1303 (emitted server-side parallel).
6. **Runtime validator absence preprocessing:** L185/L196/L205-L206/L226 in runtime-validators.js.
7. **Type-system `"undefined"` GLOBAL_NAMES + tokenizer/parser keyword whitelist:** type-system.ts L3143; ast-builder.js L2133/L2441/L8461; tokenizer.ts L61/L724; expression-parser.ts L2185; route-inference.ts L1582.
8. **Machine-property-tests harness `return undefined`:** emit-machine-property-tests.ts L416; emit-machines.ts L252.
9. **Machine-fn payload positional undefined (scrml-observable):** emit-variant-guard.ts L744-L755.
10. **For-loop key fallback `item?.id !== undefined ? item.id : i`:** emit-control-flow.ts L373 (mirrors null-audit's for-loop reconciler key emission).

---

## §4 Migration Backlog

Items are scoped to be self-contained dispatch packets. Each is keyed by file:line and includes the fix shape. **Numbering mirrors Wave 7.D's M-7C-D-N — these items use M-8C-D-N.** Items are paired with the null-audit migration where applicable.

**M-8C-D-1 — AST.LitExpr.litType "undefined" branch elimination (paired with M-7C-D-1)**
- **File:** `compiler/src/types/ast.ts`
- **Lines:** 1483 (`"undefined"` branch in litType union), 1475-1476 (docstring referencing null/undefined), 1543-1544 (`is-not`/`is-some` docstrings).
- **Current shape:** `litType: "number" | "string" | "template" | "bool" | "null" | "undefined" | "not"`; LitExpr can be a JS-undefined-mirror.
- **Fix:** Remove `"undefined"` from `litType` union alongside `"null"` (single coordinated change per M-7C-D-1). `"not"` becomes sole absence carrier; alternatively introduce `AbsenceMarker` discriminated kind.
- **Cascades to:** M-8C-D-2 (parser), M-8C-D-3 (gauntlet/lint detector), M-8C-D-4 (emit-expr), M-8C-D-5 (rewrite.ts).

**M-8C-D-2 — Parser stop manufacturing litType:"undefined" (paired with M-7C-D-2)**
- **File:** `compiler/src/expression-parser.ts`
- **Lines:** 1230-1236 (zero-arg reset synth), 1255-1258 (multi-arg reset synth), 1316 (array-hole), 1596 (emitStringFromTree round-trip), 2185 (keyword whitelist).
- **Current shape:** Constructs `LitExpr{ litType:"undefined", value: undefined as unknown as null, raw:"undefined" }` for (a) reset() arity errors, (b) array holes.
- **Fix:** (a) Use `AbsenceMarker` AST kind for reset target synth; (b) array-hole should use `AbsenceMarker` or be skipped entirely (most JS engines treat array holes as `undefined` natively — the AST should preserve hole semantics without a fake LitExpr); (c) remove `"undefined"` from keyword whitelist.

**M-8C-D-3 — gauntlet-phase3 lint detector update (paired with M-7C-D-2 cascade)**
- **File:** `compiler/src/gauntlet-phase3-eq-checks.js`
- **Lines:** 168, 351-353, 378, 386, 413-414, 437-443, 509-512, 604-607
- **Current shape:** Inspects LitExpr `litType:"undefined"` and IdentExpr `name:"undefined"` to fire E-SYNTAX-042.
- **Fix:** Mechanical follow-on once M-8C-D-1 + M-8C-D-2 land. Detect the new `AbsenceMarker` / `not` form. The lint message text already enumerates both null/undefined — keep parity.

**M-8C-D-4 — emit-expr `is-not`/`is-some`/`is-not-not` emission (paired with M-7C-D-4)**
- **File:** `compiler/src/codegen/emit-expr.ts`
- **Lines:** 466 (`is-not` → `=== null || === undefined`), 468 (`is-some`), 470 (`is-not-not`); also L221 emitted defensive `undefined` for reset shape (paired with M-8C-D-2).
- **Current shape:** `(${left} === null || ${left} === undefined)` and the inverse.
- **Fix:** Replace with `_scrml_is_absent(${left})` / `_scrml_is_some(${left})` runtime helpers (coordinated with M-7C-D-12 runtime absence sentinel). Single migration packet.

**M-8C-D-5 — codegen/rewrite.ts paired-keyword emissions (paired with M-7C-D-5)**
- **File:** `compiler/src/codegen/rewrite.ts`
- **Lines:** 475-476 (derived-ref miss → literal `"undefined"` string), 506 (`is undefined` → `=== undefined`), 519/546 (§42 presence guard `!== null && !== undefined`), 688 (nullRe), 705/708 (presence emission), 713 (absence emission), 1148-1149 (match-arm `not` predicate).
- **Current shape:** Mass scrml→JS substitution emits both `null` AND `undefined` keywords.
- **Fix:** Replace paired emissions with `_scrml_is_absent`/`_scrml_is_some` helpers (coordinated with M-7C-D-12 + M-8C-D-4).

**M-8C-D-6 — emit-server / emit-logic / scheduling `?? "undefined"` init fallback**
- **Files + Lines:**
  - `compiler/src/codegen/emit-server.ts` L882, L1047, L1139
  - `compiler/src/codegen/emit-logic.ts` L591, L1764, L1823, L1885, L1900, L2155, L2262, L2265, L2281, L2378
  - `compiler/src/codegen/scheduling.ts` L127, L128, L129
- **Current shape:** `emitExprField(stmt.initExpr, stmt.init ?? "undefined", ctx)` — when scrml has no init, the literal string `"undefined"` is interpolated as JS source. The compiled output then has `let x = undefined;` which is observable through scrml `is not`/`is some` reads.
- **Fix:** Interpolate `_scrml_absent` reference instead of `"undefined"`. Update downstream consumers (L591 `initStr === "undefined"` defensive guard, L1885/L1900 same) to detect the new sentinel string.

**M-8C-D-7 — emit-server emitted §45 structural-equality helper**
- **File:** `compiler/src/codegen/emit-server.ts`
- **Lines:** 1293 (`if (a === null || b === null || a === undefined || b === undefined) return false;`), 1303 (`a._tag !== undefined && b._tag !== undefined`).
- **Current shape:** Emitted server-side `_scrml_eq` helper checks both null AND undefined.
- **Fix:** Use `_scrml_is_absent(a) || _scrml_is_absent(b) → return false`; `a._tag` check becomes `_scrml_is_some(a._tag) && _scrml_is_some(b._tag)`. Paired with M-8C-D-4.

**M-8C-D-8 — Derived-engine init-undefined throw (paired with M-7C-D-7)**
- **File:** `compiler/src/codegen/emit-engine.ts`
- **Lines:** 2141-2145, 2172-2176 (E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT emission), 2198, 2211, 3356-3380 (hook-firing `__scrml_hook_old !== undefined` guard).
- **Current shape:** Emitted runtime check `if (__scrml_derived_v === undefined)` + diagnostic string `E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT` literally names "undefined".
- **Fix:** (a) Replace check with `_scrml_is_absent(__scrml_derived_v)`. (b) Rename diagnostic to `E-DERIVED-ENGINE-INITIAL-ABSENT-RT` and update §51.0.J spec language ("Initial-value undefined" → "Initial-value absent"). Spec amendment required.

**M-8C-D-9 — Machine-property-tests + machine-fn return undefined (paired with M-7C-D-17)**
- **Files + Lines:**
  - `compiler/src/codegen/emit-machines.ts` L252 (`return undefined;`), L296, L299 (binding undefined fallback)
  - `compiler/src/codegen/emit-machine-property-tests.ts` L416 (`return undefined;`)
- **Current shape:** Emitted machine-fn returns literal `undefined` for no-match.
- **Fix:** Replace with sentinel return. Coordinate with M-7C-D-17 + M-7C-D-12.

**M-8C-D-10 — emit-control-flow match-arm + for-loop key (paired with M-7C-D-13)**
- **File:** `compiler/src/codegen/emit-control-flow.ts`
- **Lines:** 1549 (match-arm `not` predicate), 373 (for-loop reconciler key `item?.id !== undefined`).
- **Current shape:** Same as null-audit M-7C-D-13.
- **Fix:** Replace with sentinel check. For L373 the `!== undefined` defensive narrowing should also accept `0` and `""` (per S89: `""` is defined) — confirm current behaviour preserves that (it does — `?.id !== undefined` survives `0` and `""`).

**M-8C-D-11 — Runtime structural-equality helper (paired with M-7C-D-14, runtime-template)**
- **File:** `compiler/src/runtime-template.js`
- **Lines:** L1711 (`a === null || b === null || a === undefined || b === undefined`), L1723 (`a._tag !== undefined && b._tag !== undefined`), L1840 (`if (value === null || value === undefined) return value;`).
- **Fix:** Replace with `_scrml_is_absent`/`_scrml_is_some` helpers. Coordinated with M-7C-D-12 + M-8C-D-7.

**M-8C-D-12 — Runtime cache invalidation + array-first helpers**
- **File:** `compiler/src/runtime-template.js`
- **Lines:** L500 (`_scrml_derived_cache[name] = undefined;`), L2203 (`return arr.length > 0 ? arr[0] : undefined;`), L2236 (parallel), L2419 (engine null/undefined doc).
- **Fix:** Replace `undefined` assignments / returns with sentinel. Note: L500 is cache-internal (could stay JS-undefined) but consumer-facing readers must use the sentinel boundary.

**M-8C-D-13 — runtime-validators absence preprocessing (paired with M-7C-D-18)**
- **File:** `compiler/src/runtime-validators.js`
- **Lines:** L185, L196, L205-L206, L226 (paired `null || undefined` absence checks); L405-L409 (predicate-lookup miss returns literal `undefined`).
- **Current shape:** `if (value === null || value === undefined) return { tag: "Required" };` etc.
- **Fix:** Same dispatch as null-audit M-7C-D-18. Use `_scrml_is_absent(value)`.

**M-8C-D-14 — Type-system + parser keyword removal (paired with M-7C-D-11)**
- **Files + Lines:**
  - `compiler/src/type-system.ts` L3143 (`"undefined", "null", ...` in GLOBAL_NAMES)
  - `compiler/src/tokenizer.ts` L61, L724 (KEYWORD / VALUE_KEYWORDS sets)
  - `compiler/src/ast-builder.js` L2133, L2441, L8461 (VALUE_KEYWORDS sets in parser fast paths)
  - `compiler/src/expression-parser.ts` L2185 (keyword whitelist)
  - `compiler/src/route-inference.ts` L1582 (reserved-name list)
- **Current shape:** `"undefined"` recognized as a built-in identifier / value-keyword throughout the parser/type-system.
- **Fix:** Remove `"undefined"` from all keyword sets alongside `"null"`. Per S89, scrml has no `undefined` keyword; any source code using it should fail at the lexer/parser stage (E-SYNTAX-042 fires from gauntlet today; promoting to lexer-stage is M-8C-D-14b).

**M-8C-D-15 — emit-variant-guard payload-positional undefined (AMBIGUOUS — see §5.3)**
- **File:** `compiler/src/codegen/emit-variant-guard.ts`
- **Lines:** L744-L755 (docstring + implementation: payload positionals `_payload[0]`, `_payload[1]`, ... — `undefined` for un-provided positions).
- **Current shape:** A scrml machine-fn with N declared payload positions called with M < N positions gets `undefined` for positions M..N-1.
- **Fix:** PA disposition needed. Two options:
  - (a) Treat as static-arity-error (compile-time fail if call-site arity < decl arity).
  - (b) Use sentinel for un-provided positions (runtime detectable).

**M-8C-D-16 — derived-cache invalidation marker (internal — possibly leave)**
- **File:** `compiler/src/runtime-template.js`
- **Line:** L500 `_scrml_derived_cache[name] = undefined;`
- **Current shape:** Cache slot cleared with JS `undefined`; reader uses `=== undefined` to detect dirty.
- **Fix:** Either use sentinel for consistency, or migrate to `delete cache[name]` (idiomatic JS for slot-clear). Surface to PA.

---

## §5 AMBIGUOUS / PA Disposition Items

### §5.1 — Type-system field types `X | undefined` (~590 I-class sites)

The vast majority of undefined sites in TS code are type-narrowing patterns: `as X | undefined`, optional parameters, Map.get returns, ASTNodeLike walker casts. These never reach scrml-output. Three possible PA dispositions (parallel to null-audit §5.2):

- (a) **Migrate all to `X | null`** — uniformizes to a single absence form. But pa.md Rule 3 wave-7.D suggests the OPPOSITE direction (migrate `X | null` to `X | undefined`). So this would conflict.
- (b) **Migrate to discriminated unions / explicit `?` optional** — verbose; lots of churn.
- (c) **Leave as I (internal)** — acceptable since they never surface to scrml.

**Recommend (c)**, but surface to PA.

### §5.2 — Environment guards (`typeof X !== "undefined"`)

~33 sites in compiler/src/ emit `typeof globalThis/document/window/Bun/crypto/navigator !== "undefined"` into compiled JS. These are legitimate JS-host polyglot patterns (the compiled bundle runs both server-side under Bun and client-side in browsers). Classification J — leave. Surfacing here in case someone wants stricter rules.

### §5.3 — Payload-positional undefined in machine-fn

emit-variant-guard.ts L744-L755 documents that machine-fn payload positions get JS `undefined` when call-site provides fewer positions than declared. This crosses into scrml-observable land (user-written machine-fn body reads `_payload[2]` and may get `undefined`). Per S89, this should not happen — but the migration target is unclear:

- (a) Static arity error (compile-time fail).
- (b) Sentinel fill (runtime detectable).
- (c) Author-required default in machine-fn signature.

**Surface to PA.** Same shape as M-7C-D-15 schema-differ disposition question.

### §5.4 — Runtime-template `_scrml_derived_cache[name] = undefined` (L500)

Cache-slot clear uses JS `undefined`. The reader at the call site uses `=== undefined` to detect dirty cache. This is functionally identical to using a sentinel, but the JS idiom is well-known. **Recommend keep as J/I**, but surface for ratification (a future test could assert "compiled output contains no literal `undefined`").

### §5.5 — Empty-string `""` orthogonality (per S89 ruling)

The S89 ruling explicitly preserves `""` as a defined value. Audit found 26 `=== "" / !== "" / == "" / != ""` occurrences in 12 files. Most pair with `undefined` checks but treat them as ORTHOGONAL (`init === undefined || init === ""` means "missing OR empty-string", not "absent OR absent"). These sites should remain as-is — the `""` half is correct; the `undefined` half may migrate but the AND/OR composition stays.

Example: `compiler/src/codegen/emit-html.ts` L1309 `if (_drVal === "") { ... }` — pure empty-string check, not undefined-related.

### §5.6 — `emitStringFromTree` round-trip (expression-parser.ts L1596)

`if (node.litType === "undefined") return "undefined";` round-trips a `litType:"undefined"` AST node back to the source-text string `"undefined"`. Used for debug formatting + lint diagnostics. Once M-8C-D-1 lands and the AST has no `litType:"undefined"` branch, this case is dead code. Confirm during migration land.

### §5.7 — `engine-statechild-parser.ts` lookahead `ch === undefined` (12 sites)

Character-stream `at(i)` returns `undefined` past end-of-string. This is the JS idiom and is robust (`""[5] === undefined` correctly). Classification I; never migrates.

### §5.8 — `idempotency-store-resolver.ts` "auto" default

`idempotencyStore: undefined → treat as "auto"` is a config-default semantic. The `undefined` here means "scrml-author did not set the attribute." This is INTERNAL config (never reaches scrml runtime). Classification I. Same shape as the symbol-table I/M boundary discussion in null-audit §5.10.

### §5.9 — `runtime-template.js` array-first helpers (L2203/L2236)

`return arr.length > 0 ? arr[0] : undefined;` — emitted runtime helper for stdlib `.first()`/`.head()`. Returns literal JS `undefined` for empty array. This is scrml-author-observable. Per M-7C-D-9 (SQL absence), the sentinel must surface here too. M-8C-D-12 covers this.

### §5.10 — Cross-cutting with null-audit §5.1 (`null` vs `undefined` policy)

The null audit §5.1 raised this question; the S89 ruling that prompted THIS audit answers it: **"yes this extends to undefined."** So all PA-disposition items in null-audit §5.1 that asked "does ruling extend to undefined?" — the answer is YES, fully. This audit consumes that ruling and treats undefined as a first-class migration target.

---

## §6 High-priority Recommendations

Recommended dispatch order (most leverage first):

1. **M-7C-D-12 (Runtime absence-sentinel) — UNCHANGED FROM NULL-AUDIT.** Same blocker. Without `_scrml_absent` + `_scrml_is_absent` + `_scrml_is_some` runtime helpers, M-8C-D-4/5/6/7/8/9/10/11/13 cannot land cleanly. **Start here.** Both audits depend on this single infrastructure packet.

2. **M-8C-D-1 + M-7C-D-1 BUNDLED (AST LitExpr null/undefined branch elimination)** — Single coordinated edit to `ast.ts` removing BOTH `"null"` and `"undefined"` from `litType` union. The parser, lint, codegen, and runtime cascades all benefit from a single AST shape change.

3. **M-8C-D-4 + M-7C-D-4 BUNDLED (emit-expr is-not/is-some/is-not-not)** — The `=== null || === undefined` paired emission collapses to a single sentinel check. Coordinated land.

4. **M-8C-D-5 + M-7C-D-5 BUNDLED (rewrite.ts paired keyword rewrites)** — Same shape; single edit packet.

5. **M-8C-D-6 (init fallback `?? "undefined"` interpolation)** — UNIQUE TO UNDEFINED (null-audit has no parallel `?? "null"` interpolation pattern). Affects every scrml `let x;` without an init expression. Migration target alongside M-8C-D-4 sentinel.

6. **M-7C-D-6 (Server-fn wire format) — UNCHANGED.** Highest user-visibility leak per null-audit; bears here only insofar as the wire format must distinguish `not` from `null` from `undefined`.

7. **M-7C-D-9 (SQL row-absence) — UNCHANGED.** Same as null-audit.

8. **M-8C-D-8 (Derived-engine init-undefined throw)** — UNIQUE TO UNDEFINED. The §51.0.J + §34 spec language ("Initial-value undefined") needs amendment alongside the codegen change. Spec coordination required.

9. **M-8C-D-11 + M-7C-D-14 BUNDLED (runtime-template equality + lift-target)** — Both touch the runtime shim; bundle.

10. **M-8C-D-13 + M-7C-D-18 BUNDLED (runtime-validators)** — Same file, both audits flag the same paired guards.

11. **M-8C-D-14 + M-7C-D-11 BUNDLED (keyword removal from type-system + tokenizer + parser)** — Mechanical sweep; remove both `"null"` and `"undefined"` from VALUE_KEYWORDS/GLOBAL_NAMES sets in one packet.

12. **M-8C-D-3 + M-7C-D-3 BUNDLED (gauntlet lint update)** — Mechanical follow-on once AST migration lands.

13. **M-8C-D-15 (payload-positional undefined) — needs PA disposition (§5.3) first.**

14. **M-8C-D-2 (parser undefined-literal synth) — paired with M-7C-D-2; mechanical after AST migration.**

### Cross-cutting recommendation
- **All M-8C-D-N items pair with an M-7C-D-N item** (except M-8C-D-6 init-fallback + M-8C-D-8 derived-engine throw + M-8C-D-15 payload-positional). Recommend landing the paired items together to minimize churn.
- **Spec amendments required:** §51.0.J (derived-engine init-undefined → init-absent); §45 (structural-equality null/undefined handling); §42 (presence-guard semantics).

---

## §7 Coupling with Wave 7.D `null` audit

### Paired migration candidates (same site touches both null and undefined)

These are the highest-leverage items — single edit packets close BOTH audits' migration targets:

| Item | Files | Lines | Description |
|---|---|---|---|
| **AST LitExpr union** | `types/ast.ts` | 1476, 1482-1484 | Remove `"null"` AND `"undefined"` from `litType` union |
| **expression-parser synth** | `expression-parser.ts` | 971, 987, 1187-1235, 1255-1258, 1316, 1483, 1596 | Drop both `litType:"null"` and `litType:"undefined"` manufacture |
| **emit-expr `is-*` operators** | `emit-expr.ts` | 466-470 | `=== null || === undefined` → single sentinel check |
| **rewrite.ts paired emissions** | `rewrite.ts` | 519, 546, 688, 705, 708, 713, 1148-1149 | Mass keyword rewrite + match-arm `not` predicate |
| **emit-server `_scrml_eq` helper** | `emit-server.ts` | 1293, 1303 | Emitted equality helper checks both null AND undefined |
| **emit-logic match-arm `not`** | `emit-logic.ts` | 3010, 3036 | Same pattern |
| **emit-logic presence guard** | `emit-logic.ts` | 1233-1241, 2180-2187 | §42 `!== null && !== undefined` paired emission |
| **emit-control-flow match-arm** | `emit-control-flow.ts` | 1549 | Same |
| **emit-machines + emit-machine-property-tests** | (both) | L252, L416 | `return undefined` for no-match (null-audit had separate `null` returns elsewhere) |
| **runtime-template equality helper** | `runtime-template.js` | 1711, 1723, 1840 | Runtime `_scrml_eq` + scrml-absence passthrough |
| **runtime-validators absence preprocessing** | `runtime-validators.js` | 185, 196, 205-206, 226 | Paired `null || undefined` validator guards |
| **gauntlet detector** | `gauntlet-phase3-eq-checks.js` | 168, 351-353, 378, 386, 413-414, 437-443, 509-512, 604-607 | Lint walker inspects both null AND undefined |
| **VALUE_KEYWORDS sets** | `tokenizer.ts`, `ast-builder.js`, `expression-parser.ts`, `route-inference.ts`, `type-system.ts` | various | Both `"null"` AND `"undefined"` reserved keywords |

### Items unique to undefined (no null-audit parallel)

These are M-class undefined sites with NO paired null-audit migration target:

| Item | Files | Lines | Description |
|---|---|---|---|
| **M-8C-D-6 init fallback `?? "undefined"`** | `emit-server.ts`, `emit-logic.ts`, `scheduling.ts` | various (see §4) | The literal string `"undefined"` is interpolated as a JS-source fallback when scrml init expr is absent. Null-audit has no `?? "null"` parallel — this pattern is unique to undefined. |
| **M-8C-D-8 Derived-engine init-undefined throw** | `emit-engine.ts` | 2141-2200 | `E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT` checks `=== undefined` (not `=== null`). Per §51.0.J the spec language is "initial-value undefined" — needs spec amendment. |
| **M-8C-D-15 Payload-positional undefined** | `emit-variant-guard.ts` | 744-755 | Machine-fn payload with fewer call-site positions than declared → scrml-observable JS `undefined`. AMBIGUOUS. |
| **Runtime cache-slot invalidation** | `runtime-template.js` | 500 | `_scrml_derived_cache[name] = undefined;` cache-clear marker. AMBIGUOUS (cache-internal). |
| **Array-first helpers** | `runtime-template.js` | 2203, 2236 | `arr.length > 0 ? arr[0] : undefined` — scrml `.first()` returns undefined for empty. |

### Items unique to null (already enumerated in 7.D)

These are M-class null sites with NO paired undefined-audit migration target (i.e., the site has `null` but no `undefined` adjacent):

- M-7C-D-3 component-expander default="null" path — undefined has no `default="undefined"` equivalent.
- M-7C-D-6 server-fn HTTP response `JSON.stringify(... ?? null)` — wire format uses `null` specifically; no undefined-side equivalent in the JSON envelope (JSON has null but not undefined).
- M-7C-D-7 engine state-cell history initial null — `_scrml_state[cellKey] = null;` (initialize state slot to null specifically).
- M-7C-D-8 audit-log label/auditTarget literal "null" interpolation — string `"null"` interpolated, not `"undefined"`.
- M-7C-D-9 SQL row-absence `[0] ?? null` — SQL absence specifically.
- M-7C-D-10 reactive-wiring `targetExpr = "null"`.
- M-7C-D-15 Schema column-default null — schema-differ.js (zero undefined hits).
- M-7C-D-16 Route-record boundary fields — route-inference.ts is largely null-typed.

### Net coupling summary

- **Total paired items:** ~13 (most M-class undefined sites pair with a null-audit M-7C-D-N).
- **Undefined-unique items:** ~5 (init-fallback, derived-engine throw, payload-positional, cache-slot, array-first).
- **Null-unique items:** ~8 (component-default, server-wire, engine-history, audit-log, SQL, reactive-wiring-default, schema, route).

The recommended dispatch ordering in §6 bundles paired items into single edit packets. After all bundles land, the only remaining work is the 5 undefined-unique items + 8 null-unique items + the runtime infrastructure packet (M-7C-D-12).

---

## §8 What was NOT audited

- `compiler/src/module-resolver.js` (Wave 8.C handles directly)
- `compiler/src/meta-checker.ts` / `meta-checker.js` (Wave 8.C handles directly)
- `compiler/runtime/**` (out of scope per brief — JS shims)
- `compiler/tests/**` (out of scope per brief)
- `lsp/**`, `stdlib/**`, `scripts/**`, `e2e/**`, `samples/**`, `docs/**`

The audit is exhaustive within scope. The actionable surface is §4 (~140 M-class sites); the ~590 I-class sites are listed by file in §2 but not enumerated line-by-line because they require no action under the S89 ruling.

Per pa.md Rule 3 + self-host-is-from-scratch directive: the TS impl is a scaffold. Migration items in §4 prioritize scrml-observable surfaces. Over-recommending migration of internal JS-host `undefined` would be wasted work since the TS impl will be discarded.

---

## Tags
#audit #s89 #undefined-eradication #compiler-src #scrml-semantic-mirror #ts-migration #wave-8c-d #paired-with-7c-d
