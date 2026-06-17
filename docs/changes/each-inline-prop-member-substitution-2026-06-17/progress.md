# Progress — each-inline-prop-member-substitution-2026-06-17

Approach B: patch CE markup-attribute prop-substitution gap.

## 2026-06-17 (start)
- DONE: startup verification (pwd under worktree, toplevel matches, merged main (already up to date at caa8f77b), tree clean, bun install, bun run pretest).
- DONE: read DD /home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/each-inline-component-architecture-2026-06-17.md in full. Approach B decisive.
- NEXT: read known-gaps entries + CE fire sites; build empirical baseline via R26 on the board.

## 2026-06-17 (root-cause confirmed via R26 baseline + debug trace)
- DONE: R26 baseline on board (for-lift form, iter var `l`). Confirmed 4 fire sites in board.client.js:
  - `setAttribute("href", "/dispatch/loads/${load.id}")` — RAW ${} (string-literal attr), `load` unsubstituted.
  - `setAttribute("class", "... border ${statusBadgeClasses(status)}")` — RAW ${} on Badge inlined-root.
  - `setAttribute("status", load.status)` — Badge member-arg, `load` unsubstituted.
  - `statusLabel(load.status)`, `load.weight_lbs !== null` — `load` unsubstituted.
- DONE: debug trace (added+removed) showed exact attr kinds at CE markup-attr path:
  - `status` = variable-ref, val="load.status", NO exprNode, props=[[load,l],[customerName,l.customer_name]]
  - `href` = string-literal val="/dispatch/loads/${load.id}"
  - root `class` = string-literal val="...${statusBadgeClasses(status)}", props=[[status,load.status]]
  - `if` = expr, val="(load.weight_lbs is some)", NO exprNode
- DONE: probes proved the ${}-RAW emit is a SHARED lift+each markup-emitter gap (NOT CE):
  - non-component `<a href="/x/${r.id}">` in for-lift → `setAttribute("href","/x/${r.id}")` RAW (emit-lift.js emitCreateElementFromMarkup string-literal branch ~L1081).
  - same in `<each>` → RAW (emit-each.ts renderTemplateAttrToJs string-literal branch ~L789).
  - STATIC `<a href="/x/${@id}">` → CORRECTLY lowered (emit-bindings.ts template-attr path). So loop emitters are the gap.
- ROOT (two layers):
  - LAYER 1 (CE): substituteProps markup-attr path drops prop-substitution for (a) variable-ref whose name is a member-access base `load.status` (key `load`, not `load.status`; no exprNode), (b) string-literal ${}-interp `${load.id}`/`${statusBadgeClasses(status)}` (applyPropSubstitutions only matches whole-prop-name `${load}`), (c) expr with no exprNode `(load.weight_lbs is some)`. walkAndExpand is OUTER-FIRST so a single CE fix cascades `load`->`l` then `status`->`l.status` through transitive Badge.
  - LAYER 2 (codegen loop emitters): string-literal attr with ${} emits JSON.stringify(value) RAW in BOTH emit-lift.js (~L1081) and emit-each.ts (~L789). Mirror the existing ${}-template-literal lowering in those same files.
- NEXT: implement LAYER 1 (CE substituteProps), then LAYER 2 (emit-lift + emit-each), then R26 + regression test.

## 2026-06-17 (LAYER 1 + class-merge + coupled test update)
- DONE: CE substituteProps markup-attr fix (3 branches) + substituteInterpSegments helper.
  - string-literal: substituteInterpSegments rewrites prop leading-idents inside ${} segments only (literal text untouched).
  - variable-ref member-access (no exprNode): parse->substitutePropsInExprNode (structured: var prop `load`->`l` => `l.status`; string prop via LitExpr), raw-rewrite fallback on parse failure.
  - expr (no exprNode, e.g. `(load.weight_lbs is some)`): substitutePropsInRawExpr (predicate keywords not plain JS, so raw rewrite is the safe path).
- DONE: class-merge base sourced from POST-substitution `expanded` node (was raw defNode) — fixes root-class ${} interp keeping substituted prop (case-c).
- DONE: coupled test update g-nested-component-member-arg.test.js — S200 tests used STRING props (`row="x"`); now S201 substitutes base->caller-value, so switched to VAR props (`row=@val`) and assert member TAIL preserved + base substituted (`@val.name`, `@row.status`). 3 pass.
- BOARD after LAYER 1: setAttribute("status", l.status), statusLabel(l.status), l.weight_lbs, ${statusBadgeClasses(l.status)} — all prop refs substituted. ${} still ships RAW (LAYER 2 next).
- NEXT: LAYER 2 — lower ${} in string-literal attr values in emit-lift.js (~L1081) + emit-each.ts (~L789).

## 2026-06-17 (LAYER 2 — loop-emitter ${} lowering + browser regression gate)
- DONE: emit-lift.js string-literal attr branch (~L1081) — lower ${} interp to a template literal (parseLiftContentParts + emitExprField), live-keyed via maybeWrapLiftPerItemEffect inside a reconcile ctx. No-${} stays plain JSON.stringify (byte-identical).
- DONE: emit-each.ts string-literal attr branch (~L789) — new buildEachAttrTemplate helper (brace-balanced ${} segment split, each interior via lowerEachExpr), live-keyed via maybeWrapEachPerItemEffect.
- DONE: BOARD R26 /tmp/r26-B-verify — exit 0; node --check OK. Substituted emit confirmed:
  - setAttribute("href", `/dispatch/loads/${l.id}`) — template literal, l.id
  - setAttribute("class", `... border ${statusBadgeClasses(l.status)}`) — template literal, l.status (case-c CLOSED)
  - setAttribute("status", l.status), statusLabel(l.status), l.weight_lbs — all substituted
  - FAIL-CHECK clean: ZERO bare unsubstituted load/status in loop body.
- DONE: new browser gate compiler/tests/browser/g-each-inline-prop-member.browser.test.js — 10/10 pass:
  - §1 substituted-emit shape (each + for-lift): member-arg base, root href ${} lowered, root class ${} lowered + status base substituted (case-c).
  - §2 happy-dom render (each + for-lift): NO ReferenceError; 2 cards; href evaluated (/x/1, /x/2); pill colour computed from substituted status (red/grey); label text (HOT/cold).
- NOTE (NO-SILENT-CAPS): setAttribute("load", l) / ("customerName", ...) / ("status", l.status) — component prop NAMES leak as DOM attrs on the inlined root. Values now CORRECTLY substituted (cosmetic only — `load` stringifies to [object Object] as an HTML attr). PRE-EXISTING props-as-DOM-attrs leak, NOT introduced here, NOT a render-breaker. Logged as deferred follow-up.
- NEXT: full suite (bun run test) incl within-node parity canary + browser/lsp; commit LAYER 2.

## 2026-06-17 (LAYER 2 un-masked a STEP-2A two-hop helper-hoist gap — fixed)
- FOUND: full-suite 4 fail in browser-multifile-import.test.js — `ReferenceError: badgeColor is not defined`. CONFIRMED introduced (base source files → 6 pass; my source → 4 fail).
- ROOT: my LAYER 2 ${}-lowering correctly EVALUATES `style="background:${badgeColor(role)}"` (was raw literal `${badgeColor(role)}`, never evaluated → masked the gap). The helper `badgeColor` is a TWO-HOP transitive dep: app imports UserBadge from components.scrml, which imports badgeColor from types.scrml; UserBadge's inlined body calls badgeColor. STEP-2A only hoisted helpers from a transitively-reached COMPONENT's own module (one hop) + skipped types.scrml because app DIRECTLY imports it (only UserRole, not badgeColor) — directImportKeys guard was too coarse.
- FIX (component-expander.ts): factored synthHelperImport closure; (a) called for the component's own module AND for helper-bearing import sources of the inlined component's file (two-hop); (b) when the module is ALREADY a direct import (app's types.scrml), AUGMENT the existing import node's specifiers (badgeColor added to `const { UserRole, badgeColor }`) instead of synthesizing a duplicate import — guarded per-helper by alreadyImported.
- VERIFIED: app.client.js now `const { UserRole, badgeColor } = _scrml_modules["types.client.js"]`; multifile browser 6/6 pass; board R26 clean + node --check OK; new gate 10/10; helper-hoist + transitive gates 10/10; g-nested-component-member-arg 3/3.
- NEXT: full suite re-run.

## 2026-06-17 (helper-hoist fix + coupled §4 test update)
- Gate caught a 2nd coupled test: cross-file-module-registry-emit.test.js §4 asserted exact `const { UserRole } = _scrml_modules["types.client.js"]`. My augmentation made it `{ UserRole, badgeColor }` (CORRECT — badgeColor must be bound). Updated the regex to match UserRole within the destructure + assert badgeColor IS bound there; intent (reads from _scrml_modules, not raw import) preserved. 7/7 pass.
- Checked siblings: cross-file-import-export.test.js (lines 387/612 exact { UserRole }) — those cases don't trigger two-hop augmentation (imported items aren't components calling third-file helpers); 17/17 pass.
- NEXT: re-run FULL suite.

## 2026-06-17 (DONE — full suite green + gaps marked resolved)
- FULL SUITE: bun run test → 24412 pass / 0 fail / 225 skip (Ran 24638 across 1016 files). No within-node OVER-BUDGET (allowlist UNCHANGED). No browser/lsp fails.
- FINAL board R26 (HEAD 3986f1a7): compile exit 0, node --check OK, 21 substituted-emit sites, 0 bare unsubstituted load/status in loop body.
- DD each-form repro: <each> form (pre-fix loud E-SCOPE-001) now compiles + lowers (href=`/x/${l.id}`, class=`pill ${cls(l.status)}`, setAttribute("status", String(l.status))), node --check OK.
- known-gaps.md: g-each-inline-component-prop-member-unsubstituted (HIGH) + g-inlined-component-root-class-interp-raw (MED case-c) → status=resolved with RESOLVED S202 notes.

## GAPS CLOSED (empirical evidence)
1. g-each-inline-component-prop-member-unsubstituted (HIGH) — board emits l.status/l.id/l.weight_lbs/${l.id}/${statusBadgeClasses(l.status)}; ZERO bare load/status; each-form no E-SCOPE-001; browser gate 10/10 render NO ReferenceError.
2. g-inlined-component-root-class-interp-raw (MED case-c) — root class `pill ${cls(l.status)}` template literal (computed), not raw ${}; verified board + DD repro + browser gate (pill colour red/grey computed from substituted status).
3. silent for-lift runtime-ReferenceError class — shared CE root; for-lift browser gate renders NO ReferenceError; board for-lift node --check OK + substituted.
4. href="${load.id}"-raw site — `/dispatch/loads/${l.id}` template literal, evaluated.

## NO-SILENT-CAPS — enumerated markup-attr prop-reference shapes
COVERED: member-access base on nested-component arg (variable-ref); inlined-root markup attrs (string-literal ${} interp: href, class); inlined-root class ${} (case-c); no-exprNode expr predicate (if=); chained member (row.inner.name); two-hop transitive helper (badgeColor).
DEFERRED (logged, NOT silently left):
- (a) component PROP NAMES leak as DOM attrs on the inlined root (setAttribute("load", l) / ("status", l.status)) — values substituted (cosmetic; [object Object] for object props); PRE-EXISTING props-as-DOM-attrs leak, separate gap candidate, not a render-breaker.
- (b) string-literal PROP value used as member-access base (`<Card row="x"/>` + `<Badge s=row.name/>`) lowers `row`->`x` (bare ident) via the raw-rewrite fallback when the structured parse path doesn't fire — semantically degenerate (member-access on a string), not a real-world shape; the var-prop path (the board shape) is structured-correct. Logged as a follow-up edge if a real adopter hits it.
