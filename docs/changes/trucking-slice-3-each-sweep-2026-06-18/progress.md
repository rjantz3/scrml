# trucking-slice-3-each-sweep-2026-06-18 — progress

Append-only. Convert Tier-0 `${ for (x of @coll) { lift <markup/> } }` list-renders to Tier-1 `<each>` (PRIMER §6.3 / SPEC §17.7) across the 18 trucking files.

## Startup
- pwd: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a3a475168766ceba8
- baseline app-compile: EXIT 0, 5 warnings, 3 lints (ghost pattern)
- required reads done: primary.map.md, kickstarter-v2 §11.10/§11.11, BRIEFING-ANTI-PATTERNS, PRIMER §6.3, SPEC §17.7 (normative)

## Triage (grep for/lift over @cell)
- NOT targets (C-style index loops / string parsing, no markup lift): seeds.scrml(5), models/auth.scrml(1), dispatch/billing:102, dispatch/load-detail:119, driver/hos:202
- Real for/lift @cell sites identified across the rest; local-var iterables (assignment-picker `drivers`/`tractors`/`trailers`, status-picker `nextStates`) need inspection — may be fn-call-derived locals not bare @cell.

## Log

### customer/home.scrml — DONE (commit ad0e2be9)
- 2 sites: activeLoadRows, recentInvoiceRows → `<each in=@... as x key=@.id>`. Clean single-lift bodies. compile EXIT 0, page client.js node-check OK.

### customer/loads.scrml — DONE (commit b19af49d)
- 1 site: loadRows → `<each in=@loadRows as l key=@.id>`; `if (!matchesFilter(l.status,@statusFilter)) continue` → per-item `<tr if=(matchesFilter(...))>`. compile EXIT 0, _scrml_reconcile_list + filter emitted, node-check OK.

### customer/invoices.scrml — LEFT AS TIER-0 (compiler bug filed: BUG-1)
- Site invoiceRows:313 has both a `continue`-filter AND a per-item `const rowClass = (inv.load_id == @highlightLoadId) ? "A" : "B"`.
- Converted attempt: per-item `<tr if=(matchesFilter(...)) class="${(inv.load_id == @highlightLoadId) ? "..." : "..."}">`.
- RESULT: E-CODEGEN-INVALID-JS. Emitted JS truncated the nested-quote ternary to `... ) ? }` — both quoted string-literal arms dropped. artifact invoices.client.js byte 1319 line 30 col 103, "Unexpected token". stage CG.
- BUG-1: nested-quote ternary inside an interpolated per-item `class="${ ... ? "x" : "y" }"` attribute on an `<each>` per-item element mis-compiles (string-literal arms lost). Matches Landing-1 "complex interpolation-bearing per-item attrs are best-effort". Reverted to Tier-0 (compiles EXIT 0). Site STAYS valid Tier-0.

### customer/load-detail.scrml — DONE
- 2 sites: loadEvents:532 (continue-filter `isForThisLoad` → per-item `<li if=>`), logEntries:561 (clean). Both key=__index__ (event/timeline append lists, no stable id). compile EXIT 0, node-check OK. Pre-existing E-DG-002 @currentCustomer warning unrelated.

### BUG-1 characterized (minimal repro)
- `<each in=@rows as r><li class="${(r.n == @hi) ? "bg-yellow" : "bg-white"}">` → E-CODEGEN-INVALID-JS (nested-quote ternary in per-item interpolated attr). FN-call interp `class="base ${cls(r.n)}"` compiles EXIT 0. So bug = inline ternary with quoted string-literal arms inside per-item interpolated attribute.

### driver/* bucket — DONE
- driver/home.scrml: recentEntries:365 (clean timeline, key=__index__). EXIT 0, node-check OK.
- driver/load-log.scrml: entryRows:187 (clean timeline, key=__index__, fn-call interp class OK). EXIT 0.
- driver/load-detail.scrml: recentEntries:838 (clean timeline, key=__index__). EXIT 0.
- driver/hos.scrml: cycleEntryRows:432 (clean timeline, key=__index__). EXIT 0. (Index loop hos:202 left alone — C-style, not a render.)
- driver/messages.scrml: messageHistory:239 (fn-call interp class `${bubbleClasses(m.from_role)}` OK) + currentDriverEvents:256 (TWO continue-filters → combined `&&` per-item if=). Both key=__index__. EXIT 0, node-check OK.

### dispatch/* bucket — DONE
- dispatch/billing.scrml: invoiceRows:263 (continue-filter→per-item `<tr if=>`, key=@.id, literal class). EXIT 0, node-check OK.
- dispatch/customers.scrml: customerRows:123 — TWO-element per-item body (main `<tr>` + conditional expand-row `if (c.id==@expandedId){lift <tr>}` → sibling `<tr if=(c.id==@expandedId)>`). key=@.id. EXIT 0, node-check OK.
- dispatch/drivers.scrml: driverRows:148 (continue-filter→per-item `<tr if=>`, fn-call interp class on td OK). key=@.id. EXIT 0.
- dispatch/load-detail.scrml: logEntries:507 (clean timeline, key=__index__). EXIT 0. (Index loop load-detail:119 + the 3 `${ lift <div><Component/></div> }` component-wrappers at 406/436/484 left alone — not for-loops.)
- dispatch/load-new.scrml: customerOptions:243 — `<select>`/`<option>` with per-item bare attrs `value=c.id` + `disabled=(...)`; both emit correctly (setAttribute String(c.id) / String((...))) + inner per-item `if=`. key=@.id. EXIT 0, node-check OK.

### components/* bucket — DONE (component-body each over PROP iterables — new dog-food path)
- assignment-picker.scrml: 3 sites (drivers/tractors/trailers) — `<each in=PROP as x key=__index__>` over component props (typed asIs), per-item `<option value=x.id selected=(...)>` bare attrs. EXIT 0. Standalone component .client.js is 3L (renders at instantiation); real render exercised via consuming page dispatch/load-detail (full-app compile below).
- status-picker.scrml: 1 site (nextStates string[] prop) — `<each in=nextStates as target key=__index__>`, per-item `<button onclick=onTransition(target)>`. EXIT 0.
- FINDING: `<each in=<bare-prop-local>>` inside a component body compiles clean (in= accepts any expression per SPEC §17.7.2, not just @cell). The PRIMER/kickstarter examples only show @cell; component-prop iterables are a less-documented but working path.

## FINAL TALLY
- Files touched (scrml): 11 of the 18 actually had convertible for/lift list-renders.
  - DONE (converted): customer/home(2), customer/loads(1), customer/load-detail(2), driver/home(1), driver/load-log(1), driver/load-detail(1), driver/hos(1), driver/messages(2), dispatch/billing(1), dispatch/customers(1), dispatch/drivers(1), dispatch/load-detail(1), dispatch/load-new(1), components/assignment-picker(3), components/status-picker(1).
  - LEFT TIER-0 (BUG-1): customer/invoices(1).
  - NO for/lift markup renders (only C-style index/seed/parse loops, out of scope): seeds.scrml, models/auth.scrml. (Also out-of-scope index loops within touched files: billing:102, dispatch/load-detail:119, driver/hos:202.)
- Sites converted: 20 (all hand-lift; promote tool not used — it mangles indentation badly + fails standalone-strict on program-scope-symbol files / match-over-asIs).
- Sites left Tier-0: 1 (invoices, BUG-1).
- WHOLE-APP compile: EXIT 0, 5 warnings + 3 lints — IDENTICAL diagnostic codes to baseline (verified via diff of code-only uniq counts). No new errors, no regression.
- All converted page client.js node --check OK (per-file); all app-level emitted JS node --check OK.

## COMPILER BUGS FILED
### BUG-1 (MED) — nested-quote ternary in per-item interpolated attribute mis-compiles
- File surfaced: customer/invoices.scrml:313 (left as Tier-0).
- Shape: `<each in=@rows as r key=@.id><li class="${(r.n == @hi) ? "bg-yellow" : "bg-white"}">…`
- Expected: emit a per-item element whose class is the ternary's chosen string.
- Actual: E-CODEGEN-INVALID-JS. Emitted JS truncates the ternary to `...) ? }` — BOTH quoted string-literal arms dropped (artifact byte 1319, line 30 col 103, "Unexpected token", stage CG).
- Boundary: fn-call interpolation in a per-item interpolated attr (`class="base ${cls(r.n)}"`) compiles EXIT 0. So the bug is specifically an INLINE ternary with QUOTED string-literal arms inside a per-item interpolated attribute on an `<each>` element.
- Minimal repro saved in this report (not committed to corpus). Matches the Landing-1 "complex interpolation-bearing per-item attrs are best-effort" caveat — but it's a hard E-CODEGEN-INVALID-JS, not a silent best-effort drop, so worth a codegen fix.
