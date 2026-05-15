# scrmlTS — Session 94 (OPEN)

**Date:** 2026-05-15
**Previous:** `handOffs/hand-off-93.md` (S93 CLOSE — v0.3.x patch arc opened · 6 compiler bugs closed · 16 commits · canonical-examples sweep complete · adopter-facing roadmap drafted)

---

## Session-start state (pre-work, S94 OPEN)

- **scrmlTS HEAD:** `de84260` (S93 CLOSE wrap commit)
- **scrmlTS tag:** `v0.3.0` annotated, on `c520369` (unchanged since S92)
- **scrmlTS sync:** 0/0 against origin — S93 push completed pre-session
- **scrml-support sync:** 0/0 against origin — untouched this session
- **Working tree:** clean
- **Worktrees:** main only (`git worktree list` shows main checkout only)
- **Inbox:** empty (`handOffs/incoming/` only `dist/` + `read/` subdirs)
- **Hook config:** configuration B (full set per S88 amendment — `pre-commit` + `post-commit` + `pre-push`)
- **Tests at HEAD:** 12,721 / 117 skip / 1 todo / 0 fail / 641 files / 42,667 expect (per S93 close measurement)

### Maps currency

- `primary.map.md` updated `2026-05-14T16:19:26-06:00` at commit `13154ba`
- HEAD is `de84260` — **17 commits ahead of map base**
- S93 landings touched: `route-inference.ts`, multiple codegen sites (`emit-engine.ts`, `emit-machines.ts`, `emit-machine-property-tests.ts`, `emit-control-flow.ts`, `emit-channel.ts`, `emit-server.ts`), `api.js`, `commands/compile.js`, `ast-builder.js`, `block-splitter.js`, `component-expander.ts`, `gauntlet-phase1-checks.js`, examples + tutorial corpus
- **Recommendation:** incremental map refresh before HIGH-priority dispatch (closure-analysis tree-shake will touch route-splitter.ts / chunk emission)

---

## S94 priority backlog (carried from S93 close)

| Priority | Item | Notes |
|---|---|---|
| HIGH | Closure-analysis runtime tree-shake for single-page apps | Biggest v0.3.x perf-narrowing patch; recovers most of v0.3.0 bench regression. Detect zero-`<auth>` + zero-`<page>`-siblings statically; emit zero of FNV-1a router / chunk loader / role-detection bootstrap / prefetch helpers |
| MEDIUM | BS-batch v2 (3 residual shapes) | 12 component-def-with-`${children}`-spread / 19 `lin`+template-literal / 20 multi-line `server function` body. ~6-12h with BS-layer experience in hand |
| MEDIUM | `hos.scrml` restructure | 424-line non-entry-file `<program>` violation per S85 Q2; 3 open questions (db/auth attribute inheritance + engine placement + pre-existing E-CG-006) |
| MEDIUM | Auth-redirect resolution + login-page scaffolding tightening | `<program auth="required">` adopters → tighten `I-AUTH-REDIRECT-UNRESOLVED` + `W-AUTH-LOGIN-MISSING` + `scrml generate auth` scaffold link |
| MEDIUM | Performance characterization | Closure-analysis pipeline cost on large codebases not yet measured |
| LOW | W-AUTH-001 single-instance investigation | 18-state-authority — not yet investigated |
| LOW | `feedback_diagnostic_stream_partition.md` memory rule write | <1h |
| LOW | `reset` kickstarter note | <1h |
| LOW | pkg.json versioning convention formalization | <1h |
| LOW | Roadmap doc publication-site decision | User call; doc currently status: draft |
| LOW | 09-error-handling residual edge case (BS-batch v2 candidate) | Renders-clause type-decl with multiple `${ident}` + state cells + multiple functions |
| BACKLOG | v0.4 hard ratification | Body-split soft-ratified S93; awaits patch arc drain + user commit |

---

## Open questions to surface immediately

1. **Maps refresh before HIGH dispatch?** 17 commits behind; touched files include all the codegen sites the next HIGH dispatch is likely to touch.
2. **Next priority pick?** HIGH item (closure-analysis runtime tree-shake) is the obvious lead, but BS-batch v2 / `hos.scrml` / auth tightening are all reasonable parallel candidates.
3. **Adopter-facing roadmap doc** — `docs/website/roadmap-from-v0.3-2026-05-14.md` is status: draft. User-call on publication site (scrml.dev / dev.to / GitHub discussion / README link).

---

## Things S94 PA must NOT screw up (carried from S93)

### Rules permanently load-bearing
- Rule 1 — no marketing/article/tweet work unless user brings it up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999% of the time
- Rule 4 — spec is normative; derived planning docs are NOT
- S86 ratifications — idiomatic-examples styling rule + corpus-ouroboros warning + BS-layer over SPEC retreat
- S87 memory rules — bash-cleanup dry-run + file-delta base SHA check
- S88 memory rules — file-delta-vs-cherry-pick + stated-intent-vs-corpus migration + `isolation: "worktree"` MUST be explicit on every dev-agent Agent() call
- S89 memory rules — land-before-cleanup + agent-crash-partial-recovery + null-does-not-exist-in-scrml (ABSOLUTE; extends to undefined; `""` is defined) + self-host-is-from-scratch
- S90 memory rule — agent-isolation-cwd-routing (Bash shell CWD routes harness worktree allocation; `git -C` preferred for sibling-repo ops)

### S93 carried
- **Source-fix-first vs lint-tighten judgment** — when a diagnostic fires + the recommended fix would break compilation under specific shapes, the diagnostic's predicate is incomplete; fix the lint, not just the corpus
- **Diagnostic-stream partition canon** — `result.warnings` = `W-*` prefix OR `I-*` prefix OR `severity:"warning"` OR `severity:"info"`; `result.errors` = everything else (fatal). `result.errors.length > 0` triggers CLI exit 1. Documented in primer §12.

### Anti-patterns
- **DO NOT** revisit "TS parity" as load-bearing scrml property
- **DO NOT** treat `null` or `undefined` as canonical scrml tokens in ANY context
- **DO NOT** clean up agent worktree BEFORE landing its content into main
- **DO NOT** drop `${ }` wrappers on the 3 residual BS-batch shapes (12 / 19 / 20) without first running BS-batch v2 dispatch
- **DO NOT** publish the adopter-facing roadmap doc without explicit user authorization on publication site

---

## Cross-machine state at S94 open

- scrmlTS: 0/0 against origin
- scrml-support: 0/0 against origin
- Working tree: clean
- No agent worktrees retained

---

## Tags

#session-94 #OPEN #v0.3.x-arc-active #post-S93-CLOSE #6-bugs-closed-S93 #adopter-roadmap-draft #body-split-soft-ratified-v0.4
