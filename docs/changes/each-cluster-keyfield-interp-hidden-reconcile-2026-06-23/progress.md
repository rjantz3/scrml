# progress — each-cluster-keyfield-interp-hidden-reconcile-2026-06-23

pwd at startup: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a296c10168d532450
base after `git merge main`: f5f15009

## Phase 0 + FIX — Bug 1 (GITI-030 reframe) — DONE 2026-06-23
- Brief framed Bug 1 as: `<each>` body interpolation of the `key=` field emits as literal;
  root-cause "key field excluded from substitution"; fix "substitute regardless of key=".
- EMPIRICAL FINDING: brief framing is a MISDIAGNOSIS.
  - `<span>${@.id}</span>` (key field, NON-raw element) substitutes CORRECTLY → `String(_scrml_each_item.id)`.
  - `<code>${@.label}</code>` (NON-key field, RAW-content element) emits LITERAL `"${_scrml_each_item.label}"`.
  - So the trigger is the RAW-CONTENT element (`<code>`/`<pre>`, SPEC §4.17), NOT the key field.
- AST confirms: inside an each body, a `<code>` child's body is captured as `{kind:"text", value:"${@.id}"}`
  (literal, per §4.17 raw-content); a `<span>` child's body is `{kind:"logic",...}` (interpolated).
- SPEC §4.17 line 1101 is NORMATIVE: inside `<pre>`/`<code>`, `${...}` SHALL NOT be recognized as
  interpolation; `$`,`{`,`}` pass through as text. Top-level `<code>${@count}</code>` correctly ships
  verbatim `${@count}` in HTML + fires W-INTERP-IN-RAW-CONTENT.
- ACTUAL BUG (in-scope, emit-each.ts): the each-body text path
  (renderTemplateChildToJs, emit-each.ts ~L372-378) runs `rewriteContextualSigil` on raw-content body
  text, HALF-corrupting the §4.17 verbatim literal: `${@.id}` -> `${_scrml_each_item.id}` (sigil rewritten,
  `${}` framing left). The correct §4.17 emit is the VERBATIM `${@.id}`.
- The brief's requested fix (substitute the key field inside `<code>`) would VIOLATE §4.17. Rejected per Rule 4.
- CORRECT FIX: each-body text children whose parent is a raw-content element emit VERBATIM (no sigil rewrite,
  no interpolation) — matching top-level §4.17 behavior. Thread `parentIsRawContent` through renderTemplateChildToJs.
- repro: ui/repros/repro-29-each-key-field-interp-leaks.scrml
- Secondary gap noted (OUT OF SCOPE, codegen-adjacent): W-INTERP-IN-RAW-CONTENT does NOT fire inside an
  each body (the lint walks top-level BS blocks; each body is re-split separately). Deferred / surfaced to PA.

## Phase 0 — Bug 2 (each-item hidden subtree stale) — NOT-REPRODUCED at HEAD (R26)
- Brief: loop-var `${p.*}` text inside an initially-HIDDEN each-item subtree (static `hidden` class +
  reactive `class:hidden`) renders STALE and never reconciles on `@arr` replacement; visible part reconciles.
- flogence evidence: `/home/bryan-maclee/scrmlMaster/flogence/src/app.scrml` lines 89-92 + 1119-1129 + changelog
  line 14-16 (workaround commit be2a553, dated 2026-06-23 — TODAY). Drawer reads @expandedMeta.* (top-level cell
  workaround) instead of p.* because p.* "never reconciles ... in a hidden subtree → showed 0".
- CODEGEN finding: emit-each emits the hidden-subtree `${p.deltas}` text node IDENTICALLY to the visible
  `${p.name}` text node — BOTH get `_scrml_effect` + `_scrml_resolve_item(_mount, key)` + `String(p.field)`.
  No structural difference between hidden and visible per-item text effects (verified across all shapes).
- RUNTIME finding: `_scrml_reconcile_list` (runtime-template.js:1574-1579) re-fires per-item effects on reconcile
  via `_scrml_trigger(container, "_scrml_items")`; `_scrml_resolve_item` (:1755) subscribes via
  `_scrml_track(container, "_scrml_items")`. flogence's OWN dist runtime (scrml-runtime.00y8ghjn.js) HAS this
  mechanism. The Bug64/R28-1c fix (af3175e2, S158, 2026-06-03) predates flogence's bug by 3 weeks.
- REPRO ATTEMPTS (all FAIL to reproduce staleness on HEAD; all show correct reconcile):
  1. simple per-item-field gate (class:hidden=!p.open) + field-mutation/array-replace reveal-then-reload
  2. separate-cell gate (class:hidden=(@expanded != p.name)) — faithful flogence shape
  3. deep nesting + nested <each in=@subRows> inside the drawer
  4. nested <each in=sessionsFor(p.name)> (function-call in= reading outer loop var) — faithful flogence
  5. RAW set path `_scrml_reactive_set("fleet", rawArray)` (mirrors the ACTUAL server-load codegen at
     app.client.js:2928 `_scrml_reactive_set("fleet", await _scrml_fetch_loadFleet())` — NO deep_reactive wrap)
  Plus the PRE-WORKAROUND flogence app compiled (p.deltas restored): drawer effect is byte-identical shape.
- CONCLUSION: Bug 2 does NOT reproduce on current scrml HEAD in any faithful minimal shape. Per R26 + adversarial-
  verify, NOT fabricating a fix. Likely already-closed by Bug64/R28-1c (S158); flogence's workaround is corpus
  artifact (ouroboros), OR the trigger is a flogence-specific runtime condition not reproducible without its live
  server+DB (e.g. an SSE/channel-driven `@fleet` set path, or a stale dist the author actually ran).
- DELIVERED: a GUARD test locking the current-correct behavior (hidden each-item ${p.*} text reconciles on
  @arr replace) so any future regression of this exact shape is caught. STOP-and-surface to PA for the flogence-
  live-repro request (the brief offered it "on request").


## Phase FIX — Bug 1 (GITI-030) — DONE 2026-06-23
- emit-each.ts: added RAW_CONTENT_ELEMENT_NAMES={"pre","code"} + threaded
  `parentIsRawContent` through renderTemplateChildToJs. Text path now emits VERBATIM
  (JSON.stringify(txt), no rewriteContextualSigil) when parent is raw-content; the
  markup recursion computes `childIsRawContent` from the element's tag and passes it.
- file:line: emit-each.ts renderTemplateChildToJs text path (~L387) + markup recursion (~L482).
- Symptom GONE: repro-29 now emits `createTextNode("${@.id}")` (verbatim §4.17), label still live.
- Regression checks green: key field in non-raw <span> still substitutes; mixed plain text both live;
  <pre> verbatim; no `${_scrml_each_item.*}` corruption.
- New unit test g-each-raw-content-interp-leaks-giti030.test.js: 7 pass / 22 expects.
- Within-node parity: 1013/0 (codegen change does not perturb parser parity; NO allowlist change).
- Edit method NOTE: perl -0pi corrupts UTF-8 (em-dash/§) across the whole file; used utf-8-safe python3 in-place instead.
