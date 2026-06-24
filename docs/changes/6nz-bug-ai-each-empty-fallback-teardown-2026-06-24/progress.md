# progress — 6nz Bug AI: `<each>`/`<empty>` fallback not torn down on empty→non-empty

change-id: 6nz-bug-ai-each-empty-fallback-teardown-2026-06-24
base: main HEAD 82f76085 (v0.7.0)

## 2026-06-24 — startup
- Startup verification PASS: worktree toplevel correct, HEAD==main==82f76085, tree clean, bun install OK, bun run pretest OK (13 samples).
- Maps read: primary.map.md (full grep). Routing: domain.map "Codegen each/match/engine Emit Map"; structure.map S217 emit-each.

## 2026-06-24 — root-cause confirmed
- runtime-template.js `_scrml_reconcile_list` (~L1541). Empty-fast-path L1581 `replaceChildren()` only fires on the NON-empty→empty direction (items.length===0). On empty→non-empty the `<empty>` fallback text node (NO `_scrml_key`) is left in the container by the emitted render fn (emit-each.ts emitEachReconcileLines L1637-1646: replaceChildren+appendChild(_emptyFrag)+return in the empty branch; non-empty branch calls _scrml_reconcile_list directly WITHOUT clearing).
- In reconcile, `oldNodes` (L1605-1609) only collects children with `_scrml_key`. Fallback has none → oldNodes.size===0 → bulk-create-from-empty fast path (L1612-1632) appends new <li>s WITHOUT clearing → stale fallback survives.
- PA root-cause CONFIRMED verbatim. Fix locus: runtime helper bulk-create branch.
- Blast-radius check: every _scrml_reconcile_list callsite (emit-each, emit-control-flow ${for..lift}, emit-lift) writes into a dedicated mount/wrapper that only ever holds keyed reconcile content (or the <each>'s own <empty> fallback). oldNodes.size===0 guarantees ZERO keyed children, so clearing stray non-keyed content is safe at every callsite.

## next
- Apply fix: `container.replaceChildren()` at top of the `oldNodes.size === 0` branch (both PERF + non-PERF arms).
- Verify the fix reaches emitted runtime (runtime-chunks.ts mirror).
- Browser regression test (Phase 3) + S215 adversarial matrix.

## 2026-06-24 — fix applied + verified
- FIX: runtime-template.js _scrml_reconcile_list — `container.replaceChildren()` at top of `oldNodes.size === 0` bulk-create branch (covers both PERF + non-PERF arms; one insert before the __SCRML_PERF split). +9 lines incl. comment.
- Reaches emitted runtime: runtime-chunks.ts splits SCRML_RUNTIME string from runtime-template.js (no separate mirror). Verified by compiling /tmp/6nz-repro/each-empty.scrml and grepping emitted scrml-runtime.*.js — fix present at L966; emitted client.js confirms PA root-cause shape (empty branch replaceChildren+append fallback+return; non-empty calls _scrml_reconcile_list without clear).
- TEST: compiler/tests/browser/each-empty-fallback-teardown-6nz.browser.test.js (NEW, happy-dom, 5 tests). Mount is `<div data-scrml-each-mount>` INSIDE the list element; assertions target mount.innerHTML.
  1. 5-step transition: [] -> EMPTY-FALLBACK; add -> <li>item 1</li>; add -> <li>item 1</li><li>item 2</li>; clear -> EMPTY-FALLBACK; add -> <li>item 1</li>. PASS.
  2. >=4 empty<->non-empty round-trips: PASS.
  3. adversarial <each> WITHOUT <empty>: first render "" / add / remove / empty "": PASS.
  4. adversarial struct items key=@.id: add/remove-from-middle/reorder + fallback round-trip + 2nd cycle: PASS.
  5. adversarial nested <each>: fresh inner mounts, outer list intact (2), no fallback cross-leak (g1 NO-TAGS / g2 <li>t1</li>; replace -> g3 <li>a</li><li>b</li> / g4 NO-TAGS): PASS.
- ADVERSARIAL (R26): stashed fix, ran test WITHOUT fix -> 3/5 FAIL with exact bug signature `NO-ROWS<li>Alpha</li>...`. Restored fix -> 5/5 pass. Test proven to catch the bug.
- OUT OF SCOPE (surfaced, NOT my bug): nested-each does NOT re-render when its OUTER item node is REUSED (same outer key) on outer reconcile — inner mount frozen at create-time value. Pre-existing nested-each subscription gap (Bug 72 / S212 Approach C). Verified independent of this fix.
- COMMIT 017c181b: fix + coupled test (one logical unit, S113). Pre-commit gate: 17708 pass / 0 fail / 68 skip / 1 todo (980 files, 90s). Browser canary green. No --no-verify.

## next
- Full `bun run test` (within-node parity + full browser/lsp). before-baseline: 25031 pass / 2 fail / 213 skip (the 2 fails are benchmarks/todomvc dist-not-compiled ENV-GAP, NOT in the blocking gate, unrelated to runtime change).
