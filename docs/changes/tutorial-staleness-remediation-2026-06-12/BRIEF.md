# Remediate docs/tutorial.md per the S186 staleness audit — change-id `tutorial-staleness-remediation-2026-06-12`

> **S136 archival of the verbatim dispatch prompt** (agent `adef19e06cca3374b`, scrml-js-codegen-engineer, isolation:worktree, S186). Docs-only remediation executing `docs/audits/tutorial-staleness-audit-2026-06-12.md`. Branched from main `538fe2d2` (which carries the audit doc).

---

This is a DOCS remediation (docs/tutorial.md + docs/tutorial-snippets/*.scrml + docs/tutorial-snippets/verify-tutorial.sh). NO compiler-source changes. You execute the remediation plan that an audit already produced; you compile-verify every snippet edit; you respect a strict do-NOT-touch list.

# THE PLAN — READ IT FIRST, IN FULL
Read `docs/audits/tutorial-staleness-audit-2026-06-12.md` IN FULL. It is the authoritative remediation spec: the VERDICT, the 26 findings (HIGH/MED/LOW), the **Remediation plan** (sections A–E, items 1–21), and the **Verified-clean (do NOT touch)** list. Execute remediation items A1 through E21. SPEC is normative (Rule 4) — when in doubt, read the cited SPEC.md section, do not guess.

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` (it routes by task shape; this is a docs/canonical-examples task). Maps reflect HEAD `a4726dd3`; current HEAD `538fe2d2` only adds docs since — current for this task.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-` — else STOP (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT; `git status --short` clean.
3. `git merge main` (base may trail; no conflicts expected — main only adds docs).
4. `bun install` (worktrees don't inherit node_modules — the compiler + verify script need it).
5. `bun run pretest`.
- **Apply ALL edits via Bash** (`perl -0pi`/`python3`/heredoc) on WORKTREE_ROOT-ABSOLUTE paths including the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools (S126). Echo the path before each write; `git diff`/`grep` after. **NEVER `cd` into the main repo**; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, absolute paths only. First commit message includes verbatim `pwd`: `WIP(tutorial-remediation): start at $(pwd)`.
- Commit incrementally per remediation group (A / B / C / D / E). Update `docs/changes/tutorial-staleness-remediation-2026-06-12/progress.md` after each. `git status` clean before reporting DONE.

# LOAD-BEARING GUARDRAILS (the audit's do-NOT-touch list + the subtle distinctions — get these wrong and you damage valid scrml)

1. **Arm-arrow migration `=>`/`->` → `:>` is CONTEXT-SENSITIVE.** Migrate ONLY in match-arm and `!{}`-handler-arm positions. **MUST NOT touch:**
   - `->` as the **fn-return separator** (`function persist(...)! -> Err`, `fn f() -> T`) — STAYS.
   - `=>` as a **JS arrow-function glyph** (`(e) => fn(e)`, `t => t.id == id`) — STAYS.
   - `=>` as a **§51.9 projection-rule separator** inside a `derived=` engine / the §4.5 Mario `.Small => .AtRisk` / `.Big | .Fire => .Safe` rules and the glossary `<engine derived=>` entry — STAYS (canonical; `examples/14-mario-state-machine.scrml` compiles clean with these). The audit's Verified-clean section names these exact lines.
   Use a targeted regex anchored on arm shape (`^\s*\|?\s*\.?\w+(\([^)]*\))?\s*(=>|->)\s*\{`) then MANUAL review each hit. A blind global replace WILL break the above. After migration, compile each touched snippet and confirm `W-MATCH-ARROW-LEGACY` is gone AND no new error.

2. **`not`: negation (FLIP to `!`) vs absence (KEEP).** The §7 HIGH is that the tutorial teaches `not x` as boolean NEGATION, which SPEC §42.10 forbids (`!` is negation; `not` is absence-only).
   - **FLIP to `!`:** `not @bool`, `not t.done`, `not (a == b)`, and the §7 negation-table row + the anti-pattern-table RIGHT column that tell adopters to "use `not x` instead of `!x`". Audit names sites (≈ lines 601, 626, 690, 762, 825, 807, 811, 1095).
   - **KEEP (these are ABSENCE, correct):** `x is not` / `x is some` / `= not` / `default=not` / `(not to T)` lifecycle / `.get()` → `not` / `null`/`undefined` → `not`. Do NOT touch these.
   - NOTE: the compiler currently UNDER-ENFORCES E-TYPE-045 (filed gap `g-not-negation-unenforced`), so `not x` compiles clean today — but the tutorial must teach the SPEC-correct `!`. Don't rely on the compiler to flag it; follow the audit + SPEC §42.10.

3. **Verified-clean — do NOT touch** (audit's final section): projection-rule `=>` arrows (above), fn-return `->`, the `if=`/`else-if=`/bare-`else` conditional chain (§3.5/§4.1 — still canonical, compiles clean), the schema DDL field syntax (only `<schema>` PLACEMENT moves, not the column syntax), `row is some` presence checks, the `const user = fetchUser()` anti-pattern replacement code.

4. **`<each>` binder is the SPACE form `as x`, NEVER `as=x`.** `<each in=@items as=x>` FAILS `E-SCOPE-001`. Use `<each in=@coll as x>...</each>` (or `<each in=@coll key=@.id>` + `<li : @.name>`). Keep the Tier-0 `for`/`lift` as the documented Tier-0 form; ADD `<each>` as the canonical Tier-1.

# COMPILE-VERIFY EVERY SNIPPET EDIT (mandatory — this is the whole point)
For every snippet you touch (02b, 03, 04a, 04b, 05, 06, 07, and the inline §3.3 example as a temp file): `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <snippet> --output-dir /tmp/tut-rem/<name> 2>&1`. Confirm:
- 02b: `E-SCHEMA-003` CLEARS (compiles) after moving `<schema>` inside `<program>`.
- the `=>`/`->`→`:>` snippets: `W-MATCH-ARROW-LEGACY` gone, no new error.
- the dropped-`${}`-wrapper snippets: `W-PROGRAM-REDUNDANT-LOGIC` gone, no new error.
- `07-channel-chat`: `W-DEPRECATED-SERVER-MODIFIER` gone after `server function`→`function`.
- glossary `rule=(.A | .B)`: a repro of the parenthesized form compiles (the bare form fails `E-ENGINE-RULE-INVALID-VARIANT`).
- the block-form `<match for=Type on=expr>` example you add: compiles clean.
The informational `W-PROGRAM-SPA-INFERRED` and `W-TAILWIND-UNRECOGNIZED-CLASS` are EXPECTED background noise on these single-file snippets — do not chase them (unless a Tailwind class is genuinely typo'd).

# FINAL VERIFICATION (before DONE)
1. `bash "$WORKTREE_ROOT"/docs/tutorial-snippets/verify-tutorial.sh` → ALL 11 snippets PASS (it currently FAILS on 02b; it must pass after). Also update the script's stale header comment ("v0.2.4 compiler" → "v0.7.0 compiler", audit item C17).
2. Re-grep the remediated `docs/tutorial.md` + snippets for RESIDUAL staleness the plan should have closed: deprecated arm `=>`/`->` in arm context (should be 0 outside the projection-rule do-not-touch set); `server function`; `v0.2.6`/`v0.3.0-alpha`/`v0.3` version labels; `26,000` line-count; `not ` as negation; `<schema>` at file root. Report the residual counts.
3. Confirm you did NOT touch any Verified-clean item (grep the projection-rule `=>` lines + fn-return `->` lines still present + unchanged).

# OUT OF SCOPE
- Any compiler-source change (the E-TYPE-045 under-enforcement is a SEPARATELY filed gap `g-not-negation-unenforced` — do NOT try to fix the compiler; only teach the SPEC-correct `!` in the tutorial).
- The `<program channel-reconnect=>` plumbing residual + the onserver-cell-read design Q (separate gaps).
- Rewriting beyond the audit's plan (don't editorialize the whole tutorial — execute the listed items A1–E21).

# FINAL REPORT (your final message IS the data)
- WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED.
- Per remediation group (A snippet fixes / B prose migrations / C version / D section-refs / E new-canonical): done? + the compile-verify result for each snippet.
- `verify-tutorial.sh` final result (all 11 PASS?).
- Residual-staleness re-grep counts (target: 0 for each closed class).
- Confirmation the Verified-clean items were untouched (with the projection-`=>` / fn-return-`->` / if=else-if= lines still intact).
- Any audit item you could NOT complete + why (Phase-0 STOP if an item contradicts the live SPEC on read).
- Maps feedback line.
