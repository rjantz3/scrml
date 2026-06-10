# progress — formfor-component-expand-in-arms-s177-2026-06-09

## 2026-06-09 — startup + diagnosis

- Startup: worktree agent-abf96c71b4dfbc640, merged main -> base b1931f02, bun install + pretest OK.
- Reproducers built (/tmp/ff-repro/, all 4 symptoms PA-verified on b1931f02 with validateEmit:false):
  - match-formfor.scrml (loud): empty onsubmit=${} -> emits `function(event){ event.preventDefault(); (); }` (invalid JS) + raw `<formFor for="NewExpense" ...>` in arm render fn. E-CODEGEN-INVALID-JS fires under the gate.
  - match-formfor-silent.scrml: onsubmit=handleSubmit() -> compiles clean, raw `<formFor` in arm render fn, no `<form>`. Silent non-render.
  - comp-engine.scrml: `<Badge>` in engine `<Draft>` state-child -> raw `<Badge`, no `span.badge`. Silent.
  - comp-match.scrml: `<Badge>` in `<match>` `.Draft` arm -> raw `<Badge`, no `span.badge`. Silent.

## ROOT-CAUSE — SCOPE CORRECTION vs brief

The brief premise ("PURELY make the expansion walkers recurse into .bodyChildren + .arms")
is HALF-RIGHT. Empirically:

### Engine state-children (component-in-engine):
- engine-decl.bodyChildren IS walkable AST (markup nodes w/ .children) at BOTH CE + TS stages.
- formFor walker (type-system walkAndSplice) ALREADY recurses bodyChildren (r27-c6) -> formFor-in-engine WORKS.
- component-expander walkAndExpand does NOT recurse bodyChildren -> component-in-engine FAILS.
- FIX (clean, mirrors r27-c6): add bodyChildren (+ arms defensively) recursion to component-expander walkAndExpand.

### Match arms (formFor-in-match + component-in-match):
- match-block at CE/TS stage has NO walkable `.arms` (undefined) and bodyChildren = a SINGLE TEXT NODE
  (BS captures match body as STRUCTURAL_RAW_BODY raw text -> armsRaw; comment emit-match.ts:506-510).
- The arm-body AST is re-parsed from armsRaw at CODEGEN (emit-match.ts buildMatchArms, lines 678/731/736).
- => brief's "recurse into .arms" cannot find anything at the expansion stage; the formFor/component
  nodes do not exist as AST until codegen re-parse.
- formFor needs its compound state-decl HOISTED to file scope at TS (Bug 58) so the §55 validity surface
  + `@newExpense.*` cell wiring is emitted (the working engine case emits BOTH the `<form>` markup AND the
  newExpense.* reactive wiring). A codegen-only fix would render the `<form>` but NOT wire the cell -> half-fix.
- DECISION: Strategy B — populate match-block.bodyChildren with WALKABLE arm-body AST at TAB (ast-builder),
  re-parsing armsRaw per-arm into proper markup nodes, so the EXISTING CE bodyChildren-recursion + formFor-walker
  bodyChildren-recursion expand both naturally AND the formFor compound hoists at TS. Then make codegen
  buildMatchArms CONSUME the pre-expanded bodyChildren instead of re-parsing raw (or expansion is lost again).

## Empty onsubmit=${} sub-case
- Confirmed `function(event){ event.preventDefault(); (); }` — the empty `${}` interpolation handler.
- Re-check after expansion runs; if still emits `(); `, fix the empty-handler body separately.

## NEXT
- Implement engine component-expander bodyChildren recursion (sub-fix 1).
- Implement match-arm walkable bodyChildren (sub-fix 2) — assess Strategy B vs a narrower codegen re-expansion.
- Sweep tableFor for the same gap.
- Render tests (happy-dom) for all 3 slices + regression.

## 2026-06-09 — implementation

### Sub-fix 1 (component-in-engine) — committed e82e9bd4
- component-expander walkAndExpand: recurse into engine `bodyChildren` (state-child wrappers),
  descend into each wrapper's `.children` (NOT treating the wrapper tag as a component → was firing
  E-COMPONENT-020 on `Draft`/`Submitted`/`Approved`).
- CRITICAL: mutate bodyChildren IN PLACE (not `{...node}` clone). Codegen `collectC12EngineDecls`
  prefers `fileAST.machineDecls` (a pre-collected snapshot holding the ORIGINAL engine-decl refs;
  S163 F1 two-instance-identity precedent). A cloned node orphans the expansion from that snapshot →
  codegen still saw raw `<Badge>`. In-place mutation preserves identity. Root-caused via probes.
- Full pre-commit suite GREEN.

### Sub-fix 2 (formFor + component in match arms; tableFor sibling) — this commit
- ROOT (confirmed): match-block arm bodies are RAW TEXT (`armsRaw`) at the expansion stage, re-parsed
  to AST only at CODEGEN (emit-match.ts buildMatchArms). The brief's "recurse into `.arms`" finds
  nothing — `.arms` is undefined + bodyChildren is a single text node at CE/TS. So the walkers had
  nothing to walk.
- FIX (Strategy B): ast-builder now builds `match-block.armBodyChildren` — walkable per-arm body AST
  (markup WRAPPER per variant, `.children` = re-parsed bodyRaw markup; mirrors engine bodyChildren).
    - CE + formFor-walker + tableFor-walker recurse into `armBodyChildren` → expand IN PLACE; formFor
      compound hoists to file scope at TS (the §55 validity surface + `@cell.*` wiring works).
    - codegen buildMatchArms CONSUMES the expanded armBodyChildren wrapper body when the raw arm body
      contained a `<formFor>` / `<tableFor>` / PascalCase component (gate), EXCEPT `<each>` bodies
      (those keep codegen's each-block id-restamping route). Else falls back to the armsRaw re-parse.
    - ast-builder SKIPS building armBodyChildren for each-bearing arms (avoids a phantom each-block
      that collectEachBlocks would pick up).
- tableFor sibling: the §53.14 tableFor walker (type-system walkAndSplice @16384) had the SAME
  `.children`-only blind spot → fixed by adding bodyChildren + armBodyChildren recursion. schemaFor is
  a function-call in `<schema>` context (NOT a renderable-in-arm shape) — left untouched.
- Empty `onsubmit=${}` sub-case: SELF-RESOLVED once expansion runs (the formFor's onsubmit handler is
  emitted from the expanded `<form>`, not the raw `<formFor>` opener — the `preventDefault(); ();`
  invalid JS is gone). No separate empty-handler fix needed.

### Regressions caught + fixed (baseline was 0-fail)
1. each-in-block-form-match.browser §2 (3 tests): the test HARDCODES `data-scrml-match-mount="match_7"`.
   My armBodyChildren wrapper construction consumed `++counter.next` BEFORE the match-block's own id →
   shifted match_7 → match_9. FIX: assign the match-block id FIRST, build wrappers after (their ids
   come after, don't shift the match-block id).
2. parser-conformance-within-node match-002 (MISSING-FIELD residual 1): `armBodyChildren` +
   `_matchArmBodyForm` are LIVE-only fields the native parser doesn't produce. FIX: added both to the
   within-node classifier STRIP_KEYS (live-internal expansion-support, no native analogue — `bodyStart`
   precedent). within-node 1008/0.

### Verified
- All 6 reproducers (4 happy-dom slices + 2 tableFor) pass with the emitted-JS GATE ON + node --check clean.
- Regression: engine-formFor (r27-c6) + top-level formFor + top-level component STILL render.
- `bun test -t "match"`: 2046 pass / 0 fail (was 4 fail mid-impl, now 0).

### SCOPE CORRECTION surfaced to PA
The brief framed this as "PURELY make the expansion walkers recurse into .bodyChildren + .arms." That is
correct for component-in-engine (bodyChildren walkable) but WRONG for match arms: match arm bodies are
raw text re-parsed at codegen, so there was nothing for a walker to recurse into. The fix required a
new walkable `armBodyChildren` (ast-builder) + a codegen consume path + within-node STRIP_KEYS — a
larger surface than "walker recursion only." The render codegen was touched (buildMatchArms consume)
because the match arm-body AST does not exist before codegen.

## 2026-06-09 — render tests (canary) + final gates

- NEW compiler/tests/browser/formfor-component-expand-in-arms-s177.browser.test.js (13 tests, all pass):
  happy-dom DOM-render assertions for ALL slices (the canary the original tests lacked) + emit-level
  raw-tag-absent + regression. Committed 58f31ec4.
- Parser-shape canary: within-node 1008/0 (no rebump — STRIP_KEYS addition kept parity).
- Pre-commit subset (unit+integration+conformance): 16512 pass / 0 fail / 89 skip.
- Full `bun run test` (incl. browser): 23727 pass / 0 fail / 220 skip (962 files).
- Commits: 093a2d6b (diagnosis) · e82e9bd4 (component-in-engine) · 2c35053c (match-arm + tableFor) · 58f31ec4 (render canary).
