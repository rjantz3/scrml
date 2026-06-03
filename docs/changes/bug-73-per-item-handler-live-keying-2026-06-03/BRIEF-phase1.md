# BRIEF (Phase 1) — Bug 73 per-item handler live-keying — IMPLEMENT + TEST + R26

> Archived verbatim per S136. Dispatched S159 (2026-06-03) to `scrml-js-codegen-engineer`, model opus,
> isolation:worktree, background, after PA greenlit the Phase-0 survey. Fresh dispatch (SendMessage
> agent-resume unavailable) carrying the survey + 6 PA rulings. change-id:
> `bug-73-per-item-handler-live-keying-2026-06-03`. agentId ad8b25b28b28cb072.

PA rulings encoded (greenlight of the Phase-0 survey):
1. Detection signal = post-lowering `\b<iterVar>\b` token scan WITH string/template/regex-literal-content
   blanking before the test (closes the `onclick=log("it works")` false-positive). Fallback: thread a
   `referencedIterScope` boolean from the rewriters only if blanking is fragile.
2. Null-guard `if (<iterVar> === null) return;` inside the handler closure (SPEC §42.5 canonical absence).
3. New helpers `maybeWrapEachPerItemHandler` / `maybeWrapLiftPerItemHandler` (no `_scrml_effect`), gated on
   active ctx + `ctx.iterVar === iterVarName` + blanked-token-scan. Do NOT change the existing display helpers.
4. bind:value / bind:checked sites (emit-lift.js 661, 909) EXCLUDED (write a cell, not the item).
5. Callable-direct arrow shape (emit-lift.js 788, 1090): inline-shadow wrap ONLY — emit the arrow text
   TEXTUALLY inside the wrapper `function(event){ let <iterVar> = _scrml_resolve_item(...); if (...===null)
   return; (<arrowText>)(event); }` so the wrapper's `let` lexically binds the arrow's free iter-var ref
   (a separately-referenced arrow keeps its create-time closure — a runtime rebind is a no-op). Defer ONLY
   this shape as a documented LOW follow-up if the inline-shadow proves fragile; land the dominant
   function-body shapes regardless.
6. Nested each/lift: `ctx.iterVar === iterVarName` gate handles it; OUTER-var-on-INNER-reconcile staleness
   is the pre-existing display-path limitation — OUT OF SCOPE, document don't expand.

Phase 2 tests: NEW browser runtime canary (both tiers; array-replace-same-key-new-field + in-place field
mutation triggers; click reused node -> assert LIVE field value; NEGATIVE case = global handler on
removed-key node STILL fires) + emit-shape unit assertions (prelude present on iter-reading handler /
absent on global) + no-regression set incl. TodoMVC 39/0. Baseline 15733/0/89/1 (unit+integration+conformance).

Phase 3 R26 (mandatory, S138): re-compile the repros + own repros; assert iter-reading handler body
contains `_scrml_resolve_item(` + null-guard prelude, global handler stays plain, `node --check` exit 0,
zero raw `@.` leaks. DO NOT mark DONE without R26 passing. PA runs independent dual-R26 at landing.

Fire sites: Tier-1 emit-each.ts ~663 (single `(2) event handlers` branch; ctx active 1155-1163; key local
~1153-1154). Tier-0 emit-lift.js 737/788/790/1024/1027/1051/1090/1092/1938 (WRAP-eligible) + 661/909
(bind:* EXCLUDE) + 1000 (bare cell-ref, falls out under signal); ctx pushed emit-control-flow.ts:467 +
emit-lift.js:1539. RE-VERIFY line numbers via grep before editing.

(Full verbatim dispatch prompt: see the S159 conversation transcript / the Agent call for agentId
ad8b25b28b28cb072. The discipline blocks — MAPS-required-first-read, F4 startup-verification +
path-discipline, S112 merge-startup, crash-recovery, commit-discipline — are the standard isolation:worktree
set per pa.md, identical in structure to BRIEF.md.)
