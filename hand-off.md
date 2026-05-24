# scrmlTS — Session 128 (CLOSE)

**Date:** 2026-05-24
**Previous:** `handOffs/hand-off-130.md` (S127 CLOSE)
**Machine:** same as S127 (no switch).
**HEAD at S128 OPEN:** `003ee3a8` · **HEAD at S128 CLOSE:** `d6b07839` (D7) + the wrap-docs commit on top.
**pkg.json:** 0.6.0 (no tag this session).
**Wrap:** full 8-step. **PUSH: authorized — scrmlTS (4 unit commits + wrap-docs) + scrml-support (user-voice S128) pushed at close.**

---

## S128 CLOSE SUMMARY — read first

Continued the S127 "keep momentum until I stop you / do everything right" mode. **M6.7 pre-flip wave: 4 units processed** (1 STOP-empty + 3 real fixes), **0 regressions, 0 codegen touched.** Full `bun run test` **21,393 pass / 0 fail / 174 skip / 1 todo / 783 files** (+56 = the 3 new native-parser tests). strict-pass **EXACT held 964** every unit; within-node **1005/0**.

**Landed (all S67 file-delta, PA-authored, EXACT-hold-gated, PA-dual-verified + independently re-probed):**
- `b5bb8cfd` session-open hand-off rotation.
- `b40ab415` **M6.7-D4** — STOP-and-report: **object-literal bucket EMPTY at HEAD** (5th consecutive stale bucket label). Native already had full object-literal parity (PA independently probed all 8 forms). NO parser fix; doc-only landing. **Carries the re-measured current corpus NSBH residual (293 fires / 110 files, down from D1's pre-D2 474) re-classified by upstream first-error-code** — the load-bearing payoff of the unit; re-slices the genuine D-class into D5/D6/D7/D8.
- `1de4a17b` **M6.7-D3** — native `parseMatchArm` accepts `:>` colon-arrow separator. PA verified against MAIN ground truth that live accepts `:>` (tokenizer.ts:1054 first-class op; ast-builder isArmArrow treats `=>`/`:>`/`->` identically). Cluster was 7 sub-bugs; fixed dominant `:>` (12/24 files), filed D3a–D3f. Corpus NSBH 293→246.
- `90c74222` **M6.7-D6** — native `parseNamedImportSpecifiers` accepts string-literal specifier (`import { "kebab-name" as alias }`, SPEC §38.12.5/§12821). Gap was UNIVERSAL to string-literal specifiers (the agent disproved the PA pre-check's "narrow variant" hypothesis via direct `parseProgram`). E-STMT-IMPORT-NAME 12 files → 0. Closing it unmasked downstream gaps in the same files (E-STMT-MISSING-SEMICOLON 7 / E-EXPR-PARAM 3 / E-EXPR-EXPECT-RPAREN 2 — filed).
- `d6b07839` **M6.7-D7** — native parser handles the `given` presence-guard (§42.2.3 `given ident[,ident]* => { body }`). New `StmtKind.GivenGuard` + dispatch + bridge. D3b (given-in-match) SUBSUMED (one production). Corpus KwGiven 8→0.

**✅ M6.7 D-class: D3/D6/D7 closed (+ D4 confirmed empty).** 7 levers now closed since the flip-harness last measured 567 (D1/D2/C1/C2 from S127 + D3/D6/D7 this session).

---

## ⚠ NEXT-SESSION PRIORITY — flip-harness RE-MEASURE (recommended first action)

We've closed 7 native-parser levers since the S127 flip-harness diagnostic measured **567** deterministic failures. **The honest current flip-failure count is unknown** — a fresh flip-harness re-measure (reversible: throwaway worktree, temp-flip `api.js:604` `parser=null`→native, full suite, classify A/B/C/D/E, discard; main untouched — the S127 pattern) is the highest-value next step. It gives the real flip-readiness signal AND re-slices the remaining D-class accurately (the corpus-NSBH proxy understates progress — see cascade-unmasking below). **The default-flip itself remains a USER decision.**

## NAMED FOLLOW-ON UNITS (the M6.7 pre-flip remainder — re-slice after the re-measure)
From the D4 re-measure (293/110, by upstream first-error-code) + D6/D7 unmaskings:
- **function/fn param-list cluster** (E-EXPR-PARAM, ~20 fires / 12 first-error files) — the REAL cluster behind D7's mislabel (D7 was actually KwGiven, not E-EXPR-PARAM). lin params / multi-arg / `function(fn)`. Distinct native gap; **strongest next unit.**
- **D5 markup-escape seam** (E-EXPR-UNEXPECTED, 18 files) — `${...}` expr-seam + `server {}` + `^{}` meta; PARTLY test-fixture-placeholder — TRIAGE genuine-vs-fixture first.
- **D3a–D3f** (from the D3 split) — literal match arms (§18.16) · `given`-binding-in-match (D3b SUBSUMED by D7 — verify) · `not` standalone · `|` alternation · `if` guard · same-line space-sep arms.
- **D6-unmasked in trucking-dispatch:** E-STMT-MISSING-SEMICOLON (7, likely cascade), E-EXPR-EXPECT-RPAREN (2, likely cascade) — re-measure to confirm cascade vs distinct.
- await/async/throw/try-NOT-IN-SCRML (~11) — DELIBERATE rejections (live rejects too) → corpus-migration backlog, NOT parser-fix units.
- **M6.6 Class-A engine bodyChildren** (128) — SEPARATE M6.6 work, NOT flip-blockers.

**Cascade-unmasking reality (banked):** parse-completeness work peels layers — closing one error class promotes the next to first-position in the same files (D6 cleared 12 import fires but the 12 files still fail downstream). So corpus NSBH (293→~246) UNDERSTATES real progress; files go fully-clean only when all their layers peel. **The definitive flip-readiness gate is the flip-harness re-measure, NOT corpus NSBH.**

---

## v0.7 critical path (post-S128)
flip-harness RE-MEASURE → re-slice → remaining D-class units (function-param + D5 + D3a-f, ~est 15-30h) → flip decision (USER) → M6.6 Class-A engine-bodyChildren (~15-30h) → SOAK → M6.8 deletion (~12-20h) → v0.7 cut.

---

## OPERATIONAL LEARNINGS BANKED (S128 — apply next session)
1. **`compileScrml(..., {parser:"scrml-native"})` MASKS native parse failures** — `nativeParseFile` escape-hatches on parse error, so the hard error never surfaces in `result.errors`. PA's D3+D6 pre-checks via compileScrml falsely showed "ACCEPTS." **For native parse-gap detection use DIRECT `parseProgram(lex(src),src)` (JS bodies) or `nativeParseFile(path,src)` (full .scrml files) and inspect `.diagnostics`/`.errors`.** Match the entry-point to the input (parseProgram = JS-statement body; nativeParseFile = full file). Memory: [[feedback_native_parse_probe_method]].
2. **A completed `isolation:worktree` agent DETERMINISTICALLY leaves PA Bash CWD in that agent's worktree** (D6→D6 tree, D7→D7 tree — not random slips). **At the start of EVERY post-completion landing sequence: `cd /home/bryan/scrmlMaster/scrmlTS` + verify `pwd`, AND use `git -C "$M"` for all git ops** (CWD-independent). No damage this session (caught via git -C + pwd checks) but it muddied two landings. Memory: [[feedback_cwd_slip_after_worktree_dispatch]].
3. **The within-node allowlist regen LOOP has cross-file state/order artifacts** — a sequential `enumerateScrmlCorpus` loop computed raw counts that differed from the per-fixture canary for ~16 non-affected files (would have committed spurious allowlist changes). **The per-fixture within-node CANARY failure-list is ground truth for which fixtures a fix moved.** To land an allowlist change on main: run the canary with the committed allowlist + the fix → the FAILING fixtures are the moved set → splice ONLY those (the agent's regen'd values are valid if the fix is orthogonal to other landed units). NEVER full-regen (masks regressions) and NEVER trust a sequential regen loop's changed-set.
4. **Parallel same-file source conflict:** once two units modify the same source file from a common base (D6+D7 both touched `parse-stmt.js`), wholesale `git checkout <branch> -- file` REVERTS the other. **Land the second via `git diff <base>..<branch> -- file | git apply`** (the D6/D7 regions were disjoint → applied clean). Verify both fixes coexist via grep after.
5. **The D-class bucket labels keep being wrong/imprecise** (5 in a row: b.3/D1/C1/C2/D4 empty; D6 narrowing wrong; D7 was KwGiven not E-EXPR-PARAM). Every brief's mandated Phase-0-root-cause-confirmation caught it each time. KEEP MANDATING IT.

---

## State-as-of-close
| Item | Value |
|---|---|
| HEAD | `d6b07839` (D7) + wrap-docs commit |
| pkg.json | 0.6.0 (no tag) |
| Full test | 21,393 pass / 0 fail / 174 skip / 1 todo / 783 files |
| strict-pass canary | 1000/1001 (EXACT 964) — held all session |
| within-node canary | 1005/0 (PARSE-FAILURE:0); aggregate ~95,077 (non-monotonic; not the flip gate) |
| corpus NSBH | 293 (D4 re-measure) → ~246 (D3) → KwGiven 8→0 (D7); proxy understates (cascade-unmasking) |
| Worktrees | main only (3 cleaned this session) |
| scrmlTS origin | 4 unit commits + wrap-docs — PUSHED at close |
| scrml-support origin | user-voice S128 — PUSHED at close |
| S99 path-discipline counter | 15 (ZERO new agent leaks; 2 PA CWD-slips, deterministic post-agent-completion, recovered clean) |

## Pre-existing carry-forwards (unchanged from S127 — still open)
compiler-managed-async gap (A9-class transitive async-coloring; dashboard/full-stack-runtime cluster — do NOT blind-patch) · 6nz-V (MED, GENUINE runtime class:NAME-on-for-lift) · GITI-015 (LOW) · 6nz-U (LOW, M6-subsumed) · 6nz-L/T (M6-deferred) · MCP-V0.D/E (parallel-eligible, no M6 dep; Tool-7 needs A-side serverFnNodeIds) · build-story arc (6 open Qs, M6-gated) · V-kill READ-side fire · §29 vanilla-interop (user decision pending) · Generator policy (S114 open) · dev.to articles · Living Compiler retraction · `~snapshot` tilde raw-sigil · adopter corpus migration · v0.7 cut (gated on M6.7 flip + M6.8 deletion) · **versioning drift (pkg.json 0.6.0 vs changelog — reconcile before any tag).**

## Tags
#session-128 #CLOSE #m6.7-D-class #d4-empty #d3-colon-arrow #d6-string-import #d7-given-guard #7-levers-since-567 #flip-harness-remeasure-next #4-units-0-regressions #cascade-unmasking #compileScrml-probe-masks #cwd-slip-deterministic
