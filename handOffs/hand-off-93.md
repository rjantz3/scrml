# scrmlTS — Session 93 (CLOSE)

**Date:** 2026-05-14 → 2026-05-15
**Previous:** `handOffs/hand-off-92.md` (S92 CLOSE — v0.3.0 STABLE CUT + Approach A FULLY CLOSED + Wave 4.A FULLY CLOSED)

**Session-defining outcome:** First post-v0.3.0-STABLE session. **16-commit v0.3.x patch arc opened.** Three threads ran in parallel: (1) canonical-examples sweep recovery + completion end-to-end across 21 single-file + 22/23 multi-file + 1115-line tutorial; (2) **six substantive compiler bugs closed** via the v0.3.x bug-hunt arc; (3) adopter-facing roadmap drafted (status: draft).

---

## Final state at S93 close

- **scrmlTS HEAD:** `d437589` (W-DEAD-FUNCTION false-positives fix — guarded-expr / test-block / when-handler walker gaps)
- **scrmlTS tag:** `v0.3.0` annotated, on `c520369` (S92 STABLE cut; unchanged this session)
- **scrmlTS ahead/behind origin:** 1 commit pending wrap-CLOSE push (will land per pa.md wrap step 7)
- **scrml-support:** untouched this session (0/0 against origin if checked)
- **Working tree:** clean (pre-CLOSE-commit state)
- **Worktrees:** main only
- **Inbox:** empty (`handOffs/incoming/` only `dist/` + `read/` subdirs)
- **Hook config:** configuration B (`.git/hooks/` carries `pre-commit` + `post-commit` + `pre-push`)

**Tests at HEAD `d437589`:** **12,721 pass / 117 skip / 1 todo / 0 fail / 641 files / 42,667 expect** (full `bun run test` chained pretest). Delta vs S92 close `c520369` (12,694 / 638 files): **+27 pass / +3 files / 0 fail / 0 regressions**.

---

## S93 commit ledger (16 scrmlTS commits)

```
d437589  fix(ri): W-DEAD-FUNCTION false-positives in guarded-expr / test-block / when-handler contexts
7f38721  fix(ri): W-DEPRECATED-SERVER-MODIFIER suppression for lift-using bodies + corpus migration
6ee81be  fix(codegen): close W-CG-UNDEFINED-INTERPOLATION leaks across 6 codegen sites
6e744c2  fix(api): info-level diagnostics are non-fatal — partition into result.warnings
7ea5f62  canonical-examples: Phase 3 — drop ${} workarounds in 4 files (BS-layer fixes landed)
cb1d48c  bs-layer-batch: fix 5 BS-layer corpus-friction bugs + W-PROGRAM-001/E-IMPORT-001 over-eagerness
3a7eeb6  docs(website): adopter-facing roadmap from v0.3 — direction, not schedule
0dc49c3  cg-006: fix server-only function body leak to client JS (3-layer fix)
2edf828  bench-refresh: v0.3.0 STABLE full bench refresh + new per-route per-role bench
c8612af  docs(s93): file 2 deferred canonical-examples sweep items — types.scrml + hos.scrml
1fc881d  docs(s93): file 5 BS-layer corpus-friction bugs surfaced during canonical-examples sweep
1054f22  canonical-examples: tutorial v0.3 program-as-container completion sweep
6469e96  canonical-examples: 09-error-handling — v0.3 program shape with documented BS-layer workaround
a011a1d  canonical-examples + tutorial: v0.3 program-as-container sweep (19 examples + tutorial partial)
a2f9f9b  canonical-examples: 14-mario v0.3 program-as-container restructure
102a7db  docs(s93-open): incremental map refresh + S92 hand-off rotation
```

Plus this wrap-CLOSE commit landing master-list + changelog + hand-off updates.

---

## Six compiler bugs closed this session

| # | Bug | Commit | Surface | Mechanism |
|---|---|---|---|---|
| 1 | `cg-006` server-only body emission leak | `0dc49c3` | `route-inference.ts` + `emit-logic.ts` + `collect.ts` | `walkBodyForTriggers` had no handler for `return-stmt` / `throw-stmt` / `lift-expr` carrying `sqlNode`; canonical `return ?{...}.get()` shape missed by trigger detection → emit-functions emitted full body to .client.js. 3-layer fix mirroring existing let-decl/state-decl sqlNode handling. **Tier-1 security-shaped bug in flagship 23-trucking-dispatch demo.** +3 regression tests. |
| 2 | BS-layer corpus-friction batch (5 bugs) | `cb1d48c` | `ast-builder.js` + `block-splitter.js` + `component-expander.ts` + `gauntlet-phase1-checks.js` + 4 test files | Bug 2 (`const Name = <markup>` no auto-lift at `<program>` direct-child) + Bug 3/3-adj (template-literal `${ident}` in function/type-decl bodies fires E-SCOPE-001) + Bug 4 (HTML `<!-- -->` inside component-def body causes E-COMPONENT-035) + Bug 6 (non-entry pure-module E-IMPORT-001 + W-PROGRAM-001 over-eagerness). Bug 1 (markup `//` E-TYPE-026) verified-already-fixed by post-S87 BS-comment-skip. 18-test regression suite + 5-of-9 workaround drops in example corpus. |
| 3 | `info`-level diagnostic partition (CLI exit-1 on info-only) | `6e744c2` | `api.js:1674-1675` partition rule + `commands/compile.js` formatWarning | Pre-fix: `I-*` prefix + `severity:"info"` partitioned into `result.errors`, CLI exited 1 on info-only files. 2-layer fix: partition extended to include `I-*` + `severity:"info"` in `result.warnings` (non-fatal bucket); formatter distinguishes cyan "info" label from yellow "warning" by severity+prefix. **Both flagship demos (07-admin-dashboard + 23-trucking-dispatch) exit-0 post-fix.** +4 regression tests. |
| 4 | W-CG-UNDEFINED-INTERPOLATION codegen leaks | `6ee81be` | 6 codegen sites: `emit-engine.ts` (×2) + `emit-machines.ts` + `emit-machine-property-tests.ts` + `emit-control-flow.ts` + `emit-channel.ts` + `emit-server.ts` | `undefined` JS keyword leaking to compiled output, violating M-7C-D-12 OQ-5(a) (canonical scrml absence is JS `null` per §42.5/§42.8). Per-site fix: `=== undefined` → `== null` (loose); `return undefined;` → `return null;`; `void 0` for the Bun WebSocket-upgrade-API-required undefined-return. **Corpus-wide leak count: 9 (+ 53 in trucking-dispatch multi-file) → 0.** |
| 5 | W-DEPRECATED-SERVER-MODIFIER over-eager | `7f38721` | `route-inference.ts` D5 predicate + 3 corpus migrations | Lint fired on `server function` bodies whose only "redundancy" was server-only resource. Missed: `server function` bodies accept `lift ?{}` per SPEC §49.6.2; bare `function` bodies don't. Removing `server` on `lift`-using body → E-SYNTAX-002. Fix: new `hasLiftInFunctionBody` walker; D5 predicate tightened to `isExplicitServer && !hasLiftInFunctionBody(...)`. Plus 3 corpus migrations (16, 17:lookupUser, 18). **Corpus-wide count: 7 → 0.** |
| 6 | W-DEAD-FUNCTION false-positives (3 walker gaps) | `d437589` | `route-inference.ts` walkBodyForTriggers + walkMarkupContext | guarded-expr (failable call in let-init) generic-fallback only walked array fields, missed `guardedNode` (single object); test-block bodies stored as raw strings in `testGroup.tests[*].body` not walked; when-handler bodies (`when-effect` / `when-message` / `when-worker-*`) in raw `bodyRaw` string outside EXPR_STRING_FIELDS. 3 explicit-case fixes + 1 corpus migration (17:lookupUser wired into postNote). **Corpus-wide count: 4 (3 FP + 1 genuine) → 0.** |

---

## Canonical-examples sweep — recovery + completion

**Two background-agent crashes; zero work-lost** (file-delta protocol per S67 held end-to-end).

**Agent 1** (canonical-examples sweep, `general-purpose` worktree): crashed at 529 overload after 19 commits + tutorial WIP. PA file-delta'd the 19 example commits + WIP-committed tutorial in worktree first → file-delta into main + per-file revert filtering for stale-views. 22 files landed in `a011a1d`.

**Agent 2** (BS-layer corpus-friction bug batch, `scrml-js-codegen-engineer` worktree): crashed at stream-idle-timeout ~8h / 280 tool-uses post-Phase-2. PA file-delta'd 11 files (5 commits' worth) + manually completed Phase 3 (4 of 5 example workaround drops).

**Example corpus state at S93 close:**
- 21 of 21 single-file examples migrated to v0.3 program-as-container shape (logic-default body inside `<program>`; types/state/functions/engines as direct `<program>` children; co-located scoped `#{}` per S86 styling rule)
- 22-multifile + 23-trucking-dispatch (entry files only) migrated; non-entry-file children left as-is for follow-up (`hos.scrml` deferred per DEFERRED.md)
- 1115-line tutorial migrated to canonical shape; 1 `${ }` left at L362 (markup-context inside `<ul>` for/lift — load-bearing per Rule 3)

**Three residual BS-batch edge cases (filed for BS-batch v2 dispatch):**
- 12-snippets-slots: component-def with `${children}` spread — drop breaks E-COMPONENT-031
- 19-lin-token: function with `lin` parameter + template-literal interpolation — drop breaks E-SCOPE-001
- 20-middleware: multi-line `server function` body — drop breaks E-PARSE-001 + E-SCOPE-001

Documented in `docs/changes/canonical-examples-sweep/DEFERRED.md`.

---

## Adopter-facing roadmap doc (draft)

`docs/website/roadmap-from-v0.3-2026-05-14.md` (revision 2). Status: draft. Publication site TBD (scrml.dev / dev.to / GitHub discussion / README link — user's call).

User directive: **no timelines**. "scrml is a one-person language; estimates are inherently soft. What's stable is the *direction*. The order is what matters." Structure:
1. Where v0.3.0 stands (whole-stack closure analysis + the trade single-page-pays vs multi-page-benefits)
2. v0.3.x patches (6 items in order)
3. v0.4 anchor: body-split (failable batches + idempotent retries)
4. v0.5+ horizon (profile-guided optimization + long-running compiler + self-host after v1.0)
5. The shape, not the schedule

**Revision 2 scrubbed internal terminology** per user — "Approach A/B" → "whole-stack closure analysis / profile-guided optimization", "BS-layer corpus-friction" → "edge-case parser fixes for the program-as-container shape", "canonical-examples sweep" → "example-corpus migration", "PA primer + anti-patterns brief" → "the language reference, the canonical examples, and an LLM anti-pattern catalog", etc.

---

## v0.4 anchor — soft-ratified body-split

User read the three v0.4 themes (body-split / formFor flagship / Approach A maturation) + indicated body-split is "probably the right answer." Documented in roadmap doc. **Not yet hard-committed**; revisits when v0.3.x patch arc drains (currently 6 of ~10 surfaced items closed).

v0.3.x patch backlog remaining (from roadmap):
- **Closure-analysis runtime tree-shake for single-page apps** — biggest perf-narrowing patch; should recover most of the v0.3.0 bench regression. Detect zero-`<auth>` + zero-`<page>`-siblings case statically; emit zero of FNV-1a router / chunk loader / role-detection bootstrap / prefetch helpers.
- **Auth-redirect resolution + login-page scaffolding tightening** — `<program auth="required">` adopters who don't author `/login` get I-AUTH-REDIRECT-UNRESOLVED + W-AUTH-LOGIN-MISSING; `scrml generate auth` CLI scaffolds a default; diagnostic + scaffold link should be tightened so adopters get a one-line fix.
- **Performance characterization** — closure-analysis pipeline cost on large codebases not yet measured.
- **BS-batch v2** (3 residual `${ }` wrapper shapes per DEFERRED.md).
- **`hos.scrml` restructure** (424-line non-entry-file `<program>` wrapper — needs proper restructure per S85 Q2).
- **W-AUTH-001 single-instance** (18-state-authority — not yet investigated).
- Smaller items: `reset` kickstarter note · pkg.json versioning convention · `feedback_diagnostic_stream_partition.md` PA memory rule write · 09-error-handling residual edge case (BS-batch v2 candidate; renders-clause type-decl with multiple `${ident}` interpolations + state cells + multiple functions).

---

## Patterns validated this session

- **File-delta protocol per S67** held across 2 background-agent crashes — zero work-lost. Per-file stale-view filtering robust.
- **Pre-push gate (configuration B, full suite + TodoMVC gauntlet)** never blocked, ran on every push (3 batches mid-session).
- **S91 CWD-routing memory rule** held — no traps triggered this session (no sibling-repo `cd` in PA Bash chain).
- **Dig-then-map pattern** validated by Tina side-quest (user authorized as ongoing practice).
- **Source-fix-first vs lint-tighten** when over-eager lint surfaced (W-DEPRECATED-SERVER-MODIFIER): tighten the lint when the diagnostic's framing is wrong, not just the corpus when the lint is right.
- **Compile-spot-check before commit** caught the lift-body-context regression that the W-DEPRECATED-SERVER-MODIFIER over-eager migration would have introduced.

---

## Things S94 PA must NOT screw up (carried + extended)

### Rules permanently load-bearing
- Rule 1 — no marketing/article/tweet work unless user brings it up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999% of the time
- Rule 4 — spec is normative; derived planning docs are NOT
- S86 ratifications — idiomatic-examples styling rule + corpus-ouroboros warning + BS-layer over SPEC retreat
- S87 memory rules — bash-cleanup dry-run + file-delta base SHA check
- S88 memory rules — file-delta-vs-cherry-pick + stated-intent-vs-corpus migration + `isolation: "worktree"` MUST be explicit on every dev-agent Agent() call
- S89 memory rules — land-before-cleanup + agent-crash-partial-recovery + null-does-not-exist-in-scrml (ABSOLUTE; extends to undefined; "" is defined) + self-host-is-from-scratch
- S90 memory rule — agent-isolation-cwd-routing (Bash shell CWD routes harness worktree allocation; `git -C` preferred for sibling-repo ops)

### S93 additions
- **Source-fix-first vs lint-tighten judgment** — when a diagnostic fires + the recommended fix would break compilation under specific shapes, the diagnostic's predicate is incomplete; fix the lint, not just the corpus
- **Diagnostic-stream partition canon** — `result.warnings` = `W-*` prefix OR `I-*` prefix OR `severity:"warning"` OR `severity:"info"`; `result.errors` = everything else (fatal). `result.errors.length > 0` triggers CLI exit 1. Documented in primer §12.

### Anti-patterns
- **DO NOT** revisit "TS parity" as load-bearing scrml property
- **DO NOT** treat `null` or `undefined` as canonical scrml tokens in ANY context
- **DO NOT** clean up agent worktree BEFORE landing its content into main
- **DO NOT** drop `${ }` wrappers on the 3 residual BS-batch shapes (12 / 19 / 20) without first running BS-batch v2 dispatch
- **DO NOT** publish the adopter-facing roadmap doc without explicit user authorization on publication site

---

## S94 PA dispatch backlog (in priority order)

| Priority | Item | Notes |
|---|---|---|
| HIGH | Closure-analysis runtime tree-shake for single-page apps | The biggest v0.3.x perf-narrowing patch; recovers most of the bench regression. Detect zero-`<auth>` + zero-`<page>` shape; emit zero of FNV-1a/chunk-loader/role-detection-bootstrap/prefetch helpers. |
| MEDIUM | BS-batch v2 (3 residual shapes) | 12 component-def-with-`${children}`-spread / 19 `lin`+template-literal / 20 multi-line `server function` body. ~6-12h with the BS-layer experience now in hand. |
| MEDIUM | `hos.scrml` restructure | 424-line non-entry-file `<program>` violation per S85 Q2. Surfaces 3 open questions (db/auth attribute inheritance + engine placement in non-entry pages + pre-existing E-CG-006). |
| MEDIUM | Auth-redirect resolution + login-page scaffolding tightening | `<program auth="required">` needs corresponding `/login` page; `scrml generate auth` scaffolds; diagnostic + scaffold link should be tighter. |
| MEDIUM | Performance characterization | Closure-analysis pipeline cost on large codebases not yet measured. |
| LOW | W-AUTH-001 single-instance investigation | 18-state-authority — not yet investigated. |
| LOW | `feedback_diagnostic_stream_partition.md` memory rule write | <1h. |
| LOW | `reset` kickstarter note | <1h. |
| LOW | pkg.json versioning convention formalization | <1h. |
| LOW | Roadmap doc publication-site decision | User-call; doc currently status: draft. |
| LOW | 09-error-handling residual edge case (BS-batch v2 candidate) | Renders-clause type-decl with multiple `${ident}` + state cells + multiple functions; documented workaround in place. |
| BACKLOG | v0.4 hard ratification | Body-split soft-ratified S93; awaits patch arc drain + final user commit. |

---

## Cross-machine state at S93 close

- scrmlTS: 1 commit pending wrap-CLOSE push (final commit landing master-list + changelog + hand-off updates)
- scrml-support: untouched this session
- Working tree: clean pre-CLOSE-commit
- No agent worktrees retained

---

## Tags

#session-93 #CLOSE #v0.3.x-arc-opened #6-compiler-bugs-closed #3-corpus-migrations #adopter-roadmap-drafted #2-agent-crashes-recovered #zero-work-lost #file-delta-protocol-held #tina-side-quest #body-split-v0.4-soft-ratified
