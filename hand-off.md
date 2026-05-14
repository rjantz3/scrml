# scrmlTS — Session 93 (OPEN)

**Date:** 2026-05-14
**Previous:** `handOffs/hand-off-92.md` (S92 CLOSE — v0.3.0 STABLE CUT + Approach A FULLY CLOSED + Wave 4.A FULLY CLOSED)

---

## Session-open state (verified)

- **scrmlTS HEAD:** `13154ba` (`docs(v0.3.0-announce): scrml v0.3.0 release announcement post`)
- **scrmlTS tag:** `v0.3.0` annotated, on `c520369`
- **scrmlTS ahead/behind origin:** 0/0 (fully pushed)
- **scrml-support HEAD:** `a74fd0a` (S92 A-5 dive correction)
- **scrml-support ahead/behind origin:** 0/0 (fully pushed)
- **Working tree:** clean both repos
- **Worktrees:** main only
- **Inbox:** empty (`handOffs/incoming/` only `dist/` + `read/`)
- **Hook config:** configuration B (`.git/hooks/` carries `pre-commit` + `post-commit` + `pre-push`)
- **Tests at HEAD `13154ba`:** not re-run S93-open (no source changes since S92 final-test baseline `12,694 / 117 / 1 / 0 / 638 files / 42,596 expect`)

---

## Resolved since S92 close

Per S92 close hand-off "Open questions to surface immediately":

- **Q-OPEN-1 (push v0.3.0 + tag)** → ✅ RESOLVED. scrmlTS 16 commits + tag `v0.3.0` pushed to origin (now 0/0). scrml-support 3 commits pushed to origin (now 0/0).
- **Q-OPEN-2 (v0.3.0 STABLE announce post)** → ✅ RESOLVED. Commit `13154ba` `docs(v0.3.0-announce): scrml v0.3.0 release announcement post` landed between S92 wrap commit and session-open.

---

## Open questions carried into S93 (unchanged from S92 close)

### Q-OPEN-1 — A-2.9 perf + memory characterization (carried; not v0.3.0-blocker)

Standalone 7-12h. Corpus-wide ceiling-baseline measurement post-A-2. Lower priority. Candidate for v0.3.1 work or independently.

### Q-OPEN-2 — A-5.2 mount-marker emitter granularity (S92 deferred finding)

A-5.2 surfaced that the chunk-mount-emitter does NOT recurse into CE-expanded children for per-element markers — they all fold into the imported component's root mount marker. NOT a closure-analysis correctness issue (componentNodeIds path is authoritative); codegen-mount-emission concern. Either (a) extend chunk-mount-emitter to recurse for per-element markers, OR (b) accept the granularity as-is and document. PA-lean (b) — document; user may prefer (a) for future test-bind / DevTools precision. Surface for ratification.

### Q-OPEN-3 — `reset` reserved-keyword note for kickstarter / naming-conventions doc (S92 finding)

A-5.4 dispatch surfaced that `reset` is a reserved keyword per §6.8 (E-RESERVED-IDENTIFIER); fixture's "reset all counters" function had to be renamed to `clearAll()`. Worth a kickstarter / naming-conventions doc note for adopters who reflexively use `reset` for clear-state actions. <1h.

### Q-OPEN-4 — `feedback_diagnostic_stream_partition.md` memory rule write (S92 deferred)

Cornerstone false-negative pattern + canonical cross-stream `allDiags` helper for test-authoring against W-/I- codes deserves a saved memory rule. Not written S92; surface for S93 memory write OR fold into kickstarter primer dispatch. <1h.

### Q-OPEN-5 — pkg.json convention going forward (Q-OPEN-4 adjacent from S92)

Q-OPEN-4 ratification means pkg.json bumps couple to tag-cut events. v0.3.1 patches OR v0.4.0 minor will require pkg.json bump to next pre-release tag (e.g., `0.3.1-alpha.0` OR `0.4.0-alpha.0`). Convention to formalize at next development-cycle open. <1h.

---

## S93 PA dispatch backlog (in priority order — same as S92 close, less Q-OPEN-1/2 which closed)

| Priority | Item | Est | Notes |
|---|---|---|---|
| MEDIUM | A-2.9 perf + memory characterization | 7-12h | Carried Q-OPEN-1; v0.3.1 candidate |
| LOW | A-5.2 mount-marker emitter granularity decision | TBD | Q-OPEN-2; user-call-needed |
| LOW | `reset` keyword note for kickstarter | <1h | Q-OPEN-3 |
| LOW | `feedback_diagnostic_stream_partition.md` memory write | <1h | Q-OPEN-4 |
| LOW | pkg.json convention formalization | <1h | Q-OPEN-5; surfaces at next development-cycle open |

---

## Rules permanently load-bearing (carried)

- Rule 1 — no marketing/article/tweet work unless user brings it up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999% of the time
- Rule 4 — spec is normative; derived planning docs are NOT
- S86 ratifications — idiomatic-examples styling rule + corpus-ouroboros warning + BS-layer over SPEC retreat
- S87 memory rules — bash-cleanup dry-run + file-delta base SHA check
- S88 memory rules — file-delta-vs-cherry-pick + stated-intent-vs-corpus migration + `isolation: "worktree"` MUST be explicit on every dev-agent Agent() call
- S89 memory rules — land-before-cleanup + agent-crash-partial-recovery + null-does-not-exist-in-scrml (ABSOLUTE; extends to undefined; "" is defined) + self-host-is-from-scratch
- S90 memory rule — agent-isolation-cwd-routing (Bash shell CWD routes harness worktree allocation; `git -C` preferred for sibling-repo ops)
- S92 candidate (still pending write) — diagnostic-stream partition + cross-stream `allDiags` helper for test authoring against W-/I- codes (Q-OPEN-4 above)

---

## Tags

#session-93 #OPEN #post-v0.3.0-STABLE #approach-A-CLOSED #wave-4A-CLOSED #fully-pushed-both-repos #clean-tree
