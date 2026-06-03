# Bug 73 — per-item handler live-keying (sibling-gap #2 of Bug 64)

change-id: bug-73-per-item-handler-live-keying-2026-06-03

## Goal
Per-item EVENT HANDLERS in a reconciled list close over the CREATE-TIME item, not
the live one. Fix: route per-item handler emission through the existing
`_scrml_resolve_item` plumbing so the handler re-resolves the live item AT FIRE TIME.
Tier-1 (emit-each.ts) + Tier-0 (emit-lift.js).

## Log (append-only, timestamped)
- 2026-06-03T22:05:27Z — startup verified (worktree /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad8b25b28b28cb072, HEAD ff to 3621d6a1); bun install + pretest OK; baseline repros compiled, BUG CONFIRMED both tiers (T1 closes over `_scrml_each_item`, T0 over `it`). Read primary/domain/schema maps + both fire-site source regions.
- 2026-06-03T22:19:21Z — Tier-1 emit-each.ts landed (commit 8b7e877f); coupled each-block of= test updated. Tier-0 emit-lift.js: added maybeWrapLiftPerItemHandler + maybeWrapLiftCallableHandler (inline-shadow) + shared _liftIterScopeReferenced (require emit-each iterScopeReferencedInHandler). Wired 8 function-body sites (818/871/1081/1110/1115/1141/1193/2019) + 2 callable-direct sites (876/1198 via _shadow); bind:value (742/1001) EXCLUDED. Tier-0 repro re-resolves `it` correctly, global swap stays plain, node --check OK, no @. leak.
- 2026-06-03T22:25:14Z — Tier-0 emit-lift.js landed (commit 4e637f39). Added browser test (6 tests: T1/T0 array-replace-same-key-NEW-value + field-mutation handler-divergence; T1/T0 negative global-handler-after-removal) — ALL PASS, proves live re-resolution (sink=DELTA not beta). Added emit-shape unit test (4 tests: T1/T0 prelude-present + T1/T0 global-stays-plain) — ALL PASS. No-regression set (80 tests across 8 files) + TodoMVC gates (59/0/8) GREEN. Finding: Tier-1 bare-call global handler is emitted as a per-item addEventListener (NOT delegated) and correctly stays plain via the iter-scope scan.
- 2026-06-03T22:33:50Z — Phase 3 R26 COMPLETE. 4 repros (brief's repro/repro-t0 + own non-key-field nonkey-t1/nonkey-t0), both tiers: (a) iter-reading handler has resolve-prelude+null-guard ✓; (b) global handler stays plain, 0 prelude'd ✓; (c) node --check exit 0 ✓; (d) 0 raw @. leaks ✓. False-positive guard validated: `onclick=${ log("it works") }` with iterVar `it` stays PLAIN (literal-blanking worked). FULL SUITE (bun run test incl. browser): 22856 pass / 0 fail / 220 skip. Subset (unit+integration+conformance): 15737 pass / 0 fail (+4 vs baseline 15733 = new unit tests). DONE.
- 2026-06-03T22:33:50Z — DEFERRED: none. Callable-direct arrow shape (Ruling 5) LANDED via inline-shadow at both AST-expr (1198) and string-AST (876) sites — NOT deferred. Out-of-scope per Ruling 6: outer-iter-var read inside an inner each (same pre-existing display-path limitation).
