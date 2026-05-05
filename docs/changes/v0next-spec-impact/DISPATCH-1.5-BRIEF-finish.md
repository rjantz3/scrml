# Stage 0b — Dispatch 1.5 Brief: Foundation Rewrite (FINISH)

**Target agent:** `scrml-dev-pipeline` (T3 tier, worktree-isolated)
**Scope:** Pick up Dispatch 1 from where it left off. §1 + §3 already landed on main (commit `8ac5f3e`); this dispatch covers ONLY the remaining sections.
**Output:** rewritten SPEC.md §6 + §11 fold + §34 +9 codes + SPEC-INDEX.md regen + cross-ref sweep.
**Authorization:** scoped to this brief; "no holds barred" carries forward from S56-S57 deliberation phase per user re-confirmation.
**Date drafted:** 2026-05-04 (S57)
**Drafted by:** PA (S57 conversation)

---

## §0 What changed since the original Dispatch 1 brief

The original `DISPATCH-1-BRIEF-foundation.md` was launched but stalled mid-dispatch. **§1 (pillars) and §3 (V5-strict-per-context table) landed cleanly on main as commit `8ac5f3e`.** This dispatch picks up the remaining work.

**What's already done (do NOT re-do):**
- §1.1 bullet 4 updated to V5-strict framing
- §1.4 Markup-as-First-Class-Value (pillar) ADDED
- §1.5 The North Star + Tier 0/1/2 ladder ADDED
- §1.6 V5-Strict Access Model (the access principle) ADDED
- §3.4 V5-strict-per-context table ADDED
- ToC updated for §1 subsections
- Version bumped to 0.6.0-draft
- Amendments header updated

**What this dispatch covers:**
- §6 Reactivity — MAJOR REWRITE (rename heading, replace §6.1-§6.4, partial-rewrite §6.6, NEW §6.8-§6.12)
- §11 fold — into §6.12 stub OR delete; cross-refs updated
- §34 — add 9 new error codes
- SPEC-INDEX.md — regenerate via script + add new Quick Lookup entries
- Cross-reference sweep — `§11` references, deprecated framings (`@ Sigil`, `@` as "concession")

---

## §1 CRITICAL — TOOL-USE MANDATE (READ FIRST, NON-NEGOTIABLE)

**The previous Dispatch 1 attempt stalled because the agent tried to modify SPEC.md via `python3` and `node` scripts through Bash. That is GATED by design** (per S56 user directive — "I am terrified of agents autonomously deleting things"; file-writing-via-Bash is treated as a destructive op surface and prompts).

**For this dispatch:**

1. **Modify SPEC.md exclusively via the `Edit` tool.** ONE Edit call per subsection / per atomic change. Do NOT batch into a single mega-Edit unless the change is genuinely one contiguous string replacement.
2. **Do NOT use `python3`, `sed`, `awk`, `node -e`, or heredoc shell scripts to modify SPEC.md or any other file.** Bash will deny these (correctly). If you find yourself reaching for one, **stop and use `Edit` instead.**
3. **The `Write` tool is acceptable for NEW files** (e.g., progress.md). Do NOT use Write to overwrite SPEC.md — Write replaces the entire file content; for a 14k-line spec, that is a bug surface.
4. **Bash is for `git`, `grep`, `head`, `wc`, `cat` (read-only commands), and the SPEC-INDEX regeneration script (`bash scripts/update-spec-index.sh`).** Bash is NOT a substitute for Edit.
5. **If an Edit call fails** (e.g., `old_string` not unique), narrow the `old_string` by including more surrounding context — don't pivot to a script-based approach.

**This is not a constraint to work around. It is the dispatch's primary tool-use rule.** The Edit tool is exactly the right tool for surgical spec rewrites. One subsection per Edit call, with WIP commits between, is the canonical workflow.

---

## §2 STARTUP VERIFICATION + PATH DISCIPLINE

You are running with `isolation: "worktree"` — the harness has placed you in a fresh worktree of scrmlTS off main.

### Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Save the output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Run `git log --oneline -3` via Bash. Confirm HEAD is at or after `8ac5f3e` (the §1+§3 cherry-pick commit on main). HEAD should look like: `8ac5f3e spec(dispatch-1 partial): §1 pillars + §3 V5-strict context table` or later.
5. Confirm SPEC.md already contains §1.4, §1.5, §1.6, §3.4 — `grep -n '^### 1.4\|^### 1.5\|^### 1.6\|^### 3.4' compiler/SPEC.md`. All four headers MUST be present. If not, the cherry-pick didn't propagate correctly — STOP and report.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

### Path discipline (enforce on EVERY Read/Write/Edit call)

- ALL Write/Edit calls MUST use paths under WORKTREE_ROOT (relative paths preferred).
- Cross-repo Read targets (`../scrml-support/...`) — absolute paths acceptable for Reads ONLY.
- NEVER write to `/home/bryan-maclee/scrmlMaster/scrmlTS/...` directly — that's main, you'd leak into the wrong tree. Translate to `$WORKTREE_ROOT/...`.

---

## §3 CRASH RECOVERY — INCREMENTAL COMMITS + PROGRESS REPORTS

This is a multi-hour dispatch. Crashes happen.

1. **Commit after each meaningful change.** After each subsection rewritten or each error-code added, commit with a short WIP message: `WIP: §6.3 Variant C compound state` or `WIP: add E-DERIVED-WRITE error code`. Don't batch.
2. **Update progress.md after each step.** Path: `docs/changes/v0next-spec-impact/progress-dispatch-1.5.md` (relative to WORKTREE_ROOT). Append-only, timestamped:
   ```
   ## YYYY-MM-DD HH:MM — <short summary>
   Just done: <what>
   Next: <what>
   Blockers: <any>
   ```
3. **WIP commits are EXPECTED.**
4. **Pre-commit hook.** Do NOT bypass with `--no-verify`. If it fails, fix the underlying issue.
5. **Do NOT push.** Main-PA handles integration after you finish.

---

## §4 SOURCES TO READ IN FULL BEFORE ANY EDIT

Same load-bearing list as the original brief. Read in this order:

1. `docs/changes/v0next-spec-impact/IMPACT-ASSESSMENT.md` — master plan
2. `docs/changes/v0next-spec-impact/DISPATCH-1-BRIEF-foundation.md` — the ORIGINAL brief; §3.3 (§6 Reactivity rewrite) and §3.4 (§11 fold) and §3.5 (§34 codes) are your detailed content guide. **Treat the original brief as your primary content reference for §6/§11/§34 — this 1.5 brief is the wrapper that fixes the tool-use issue.**
3. `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md` — locks L1-L20 with full §3.x detail
4. `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md` — moves M1-M20 (M7+M21 dropped)
5. `../scrml-support/docs/deep-dives/state-as-primitive-redesign-synthesis-2026-05-03.md` — narrative context
6. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — LOCKED kickstarter; authoritative tiebreaker; cross-reference §3, §3.1, §6 (validators), §11 recipes when shaping §6 of SPEC
7. `compiler/SPEC.md` — your target. **Verify §1.4/§1.5/§1.6/§3.4 are present at startup.**
8. `compiler/SPEC-INDEX.md`
9. `pa.md` — repo conventions
10. `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — mandatory before any scrml code example
11. `docs/changes/v0next-spec-impact/IMPLEMENTATION-ROADMAP.md` — Phase A1+ context (S57 addition)

---

## §5 SCOPE — what to do, in order

Detailed content guidance for each subsection lives in `DISPATCH-1-BRIEF-foundation.md` §3.3, §3.4, §3.5. Treat the original brief as your primary content reference. This section enumerates the work order.

### §5.1 §6 Reactivity — MAJOR REWRITE

Per original brief §3.3:
- Title rename: "Reactivity — The `@` Sigil" → "Reactivity and the V5-Strict Access Model" (or similar)
- §6.1 V5-strict access — the two forms (NEW, 60-90 lines)
- §6.2 Three RHS shapes for state declarations (NEW, 100-150 lines)
- §6.3 Compound state — Variant C (NEW, 120-180 lines)
- §6.4 Render-by-tag semantics (NEW, 80-120 lines)
- §6.5 Reactive arrays (PRESERVE existing — note in progress.md if you find any pre-V5-strict code examples in this section that contradict §6.1; do NOT rewrite them in this dispatch unless the contradiction is load-bearing)
- §6.6 Derived values — `const @x` and `const <x>` (PARTIAL REWRITE, 200-300 lines)
- §6.7 Lifecycle / cleanup / `<timeout>` (PRESERVE existing)
- §6.8 The `default=` attribute and `reset(@cell)` keyword (NEW, 150-220 lines)
- §6.9 Hoisting model (NEW, 100-150 lines)
- §6.10 The `pinned` keyword (NEW, 80-120 lines)
- §6.11 Auto-synthesized validity surface (NEW stub, 30-50 lines, cross-ref §55 forthcoming)
- §6.12 Migration / inheritance from §11 (NEW, folded content, 80-150 lines)

**Order of operations:**
1. ONE Edit call to rename the §6 heading.
2. ONE Edit call per NEW subsection insertion (§6.1, §6.2, §6.3, §6.4, §6.8, §6.9, §6.10, §6.11, §6.12).
3. ONE Edit call (or a few targeted ones) for §6.6 partial rewrite.
4. WIP commit after each subsection lands.

If you find that an Edit's `old_string` is not unique, narrow it by including more surrounding context (e.g., add the closing `---` separator or the next subsection header). Do NOT batch.

### §5.2 §11 fold

Per original brief §3.4. Audit current §11 (lines 5330-5473 per SPEC-INDEX). Categorize each piece into (a) subsumed by §6 V5-strict / (b) preserves into §6.12 / (c) belongs to §52 (future dispatch).

Output: §11 either DELETED or REDUCED TO STUB (`## §11 (Reserved — content folded into §6 and §52)`).

Document fold decisions in progress.md so reviewers can verify.

After fold, grep SPEC.md for `§11` references and rewrite via Edit (one Edit per location, or `replace_all` if the exact same `old_string` appears in multiple places — verify uniqueness intent first).

### §5.3 §34 +9 error codes

Per original brief §3.5. Add (one Edit each):
- E-NAME-COLLIDES-STATE
- E-DERIVED-WRITE
- E-STATE-PINNED-FORWARD-REF
- E-CELL-NO-RENDER-SPEC
- E-CELL-RENDER-SPEC-NOT-BINDABLE
- E-RESERVED-IDENTIFIER
- E-SYNTHESIZED-WRITE
- E-RESET-NO-ARG
- W-LIFECYCLE-CANDIDATE

Each follows the existing §34 format (code, severity, description, example trigger, fix recommendation).

### §5.4 SPEC-INDEX.md regeneration

1. Run `bash scripts/update-spec-index.sh` (Bash IS allowed for read-only or repo-script commands).
2. Verify line numbers align with rewritten sections.
3. Add new Quick Lookup entries via Edit (one Edit per new entry, or one Edit for a contiguous block):
   - "V5-strict access" → §6.1
   - "three RHS shapes" → §6.2
   - "Variant C compound state" → §6.3
   - "render-by-tag" → §6.4
   - "default= attribute" → §6.8
   - "reset keyword" → §6.8
   - "hoisting" → §6.9
   - "pinned" → §6.10
   - "validity surface (auto-synthesized)" → §6.11 + §55 (forthcoming)
   - "markup-as-value pillar" → §1.4
   - "north star + Tier ladder" → §1.5
4. Update existing entries that reference §11 to point to §6.

### §5.5 Cross-reference sweep

Grep + Edit each:
- `§11` references — should be 0 except for the stubbed section header (if you stubbed) or 0 entirely (if you deleted)
- `@ Sigil` heading or `@` framed as "concession" — update to V5-strict / canonical framing
- Any existing `§6.X` references — verify they still resolve after the rewrite

---

## §6 SUCCESS CRITERIA

The dispatch is DONE when:

1. **§6 has new structure:** §6.1-§6.4 NEW, §6.5 PRESERVED (or contradictions noted), §6.6 PARTIAL REWRITE done, §6.7 PRESERVED, §6.8-§6.12 NEW. Title renamed.
2. **§11 is FOLDED.** Either deleted entirely or reduced to a stub with cross-refs.
3. **§34 has 9 new error codes added** in the existing §34 format.
4. **SPEC-INDEX.md regenerated** + new Quick Lookup entries added + §11 references updated.
5. **Cross-reference sweep complete.** No dangling `§11` refs (or zero, depending on fold); no `@ Sigil` / `@`-as-concession framings.
6. **Each subsection committed independently** per crash-recovery directive.
7. **Final commit message:** `spec(dispatch-1.5): finish foundation — §6 V5-strict, §11 fold, §34 +9 codes, INDEX regen` or close variant.

The dispatch is NOT required to make `bun test` pass. Test breakage from spec changes is expected.

---

## §7 DO NOT

- **DO NOT** modify §51 (engines), §18 (match), §38 (channels), §53 (predicates), §39 (schema), §55 NEW (validators) — those are Dispatches 2-3.
- **DO NOT** modify compiler source code (`compiler/src/`).
- **DO NOT** modify tests.
- **DO NOT** modify kickstarter v2.
- **DO NOT** modify `pa.md`, `master-list.md`, `hand-off.md`.
- **DO NOT** use python/sed/awk/node-script-via-Bash for file modification. Edit tool only. (See §1.)
- **DO NOT** push.

---

## §8 ESTIMATED WALL-TIME

- §6 Reactivity rewrite: 8-16 hours (the big one)
- §11 audit + fold: 2-4 hours
- §34 error code additions: 1-2 hours
- SPEC-INDEX regen + cross-ref sweep: 1-2 hours

**Total: 12-24 hours** (down from the original 14-27 since §1+§3 are done).

---

## §9 REPORT BACK

When done (or if you crash), report to the calling PA with:
- Branch name (`git rev-parse --abbrev-ref HEAD`)
- Final commit SHA
- Summary of subsection-by-subsection completeness vs success criteria
- Any open questions encountered (especially §11 fold decisions, §6 ↔ kickstarter contradictions)
- Pointer to `progress-dispatch-1.5.md`

---

## §10 Cross-references

- **Original brief (primary content reference):** `DISPATCH-1-BRIEF-foundation.md`
- **Master plan:** `IMPACT-ASSESSMENT.md`
- **Implementation roadmap (S57):** `IMPLEMENTATION-ROADMAP.md`
- **S56 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`
- **S55 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md`
- **Kickstarter v2:** `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- **Anti-patterns brief:** `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- **PA directives:** `pa.md`
- **Worktree path discipline source:** `pa.md` §"Worktree-isolation: startup verification + path discipline (S42 finding F4)"

---

## §11 Tags

#stage-0b #dispatch-1-5 #foundation-finish #spec-major #§6-V5-strict-major-rewrite #§11-fold #§34-error-codes #scrml-dev-pipeline-T3 #worktree-isolated #edit-tool-mandate
