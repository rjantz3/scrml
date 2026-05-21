# DISPATCH BRIEF — M5-swap (the v0.6 milestone)

**Status:** DRAFT — authored S116, not yet dispatched. Maps-currency SHA + worktree
path are filled by PA at dispatch time.
**Authority:** DD #27 (`scrml-support/docs/deep-dives/m5-m6-scope-revision-2026-05-21.md`,
Shape α, ratified S115) · `docs/changes/m5-v0.5-compressed-ladder/SCOPE-v0.6.md`.
**Agent:** `scrml-js-codegen-engineer` · `isolation: "worktree"` · `model: opus` ·
`run_in_background: true`.
**Predecessors (all landed S115):** F1 (`a915ad19`), F7 (`68a805ac`), F8 (`200737e1`),
F2 (`65157654`), F3 (`3c21c885`), F5+F6 (`85645a93`). v0.5 + v0.6-bridge complete —
this dispatch is the **re-entered M5**: the actual pipeline swap.

---

## What M5-swap is

`--parser=scrml-native` currently does ONE thing (M5.1/M5.3, S114): emits an
`I-PARSER-NATIVE-SHADOW` info diagnostic. Downstream stages still consume the
live BS+TAB `FileAST`. M5-swap makes the flag **route the pipeline through the
native parser** — the v0.6 milestone.

The bridge work the M5 agent priced at 90-180h (the "MD ladder") was compressed
by DD #27 into the F1-F9 unit set. v0.5 landed F2/F3/F5/F6; v0.6 landed F1/F7/F8.
**The premise of this dispatch is that those eight units closed the
native-parser → `FileAST` divergence and the swap itself is now ~6-12h of
api.js wiring.** Phase 0 VERIFIES that premise before any swap code is written.

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full.
The §"Task-Shape Routing" section routes you to additional maps; this is a
compiler-source change to `api.js` + the native-parser seam + a SPEC §34
amendment — follow the routing for "compiler-source bug fix / new feature" and
"spec amendment".

Map currency: maps reflect HEAD `<PA-FILLS-SHA>` as of `<PA-FILLS-DATE>`. If your
work touches files modified after that point, treat map content as a hypothesis
to verify via grep/Read against current source.

Feedback: in your final report, state either "Maps consulted: [list]; load-bearing
finding: <one sentence>" or "Maps consulted but not load-bearing".

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: `<PA-FILLS-ABSOLUTE-WORKTREE-PATH>`

**S99 leak-history: this project has had path-discipline leaks where agent
Write/Edit calls landed in the main checkout instead of the worktree. Do not be
the next incident.**

## Startup verification (BEFORE any other tool call)

1. `pwd` — MUST equal the worktree path above AND start with
   `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If it is
   under any other repo, STOP and report (S90 CWD-routing failure). Save as
   `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` — MUST equal `WORKTREE_ROOT`.
3. `git merge main --no-edit` — worktrees branch from the session-start commit,
   not live `main` HEAD (S112). Merge `main` so you build on current truth.
   Resolve any conflict or STOP and report.
4. `git status --short` — confirm clean after the merge.
5. `bun install` — worktrees do not inherit `node_modules`.
6. `bun run pretest` then `bun run test` for the baseline — record pass/fail/skip.
   Baseline expectation: **18,102 pass / 0 fail / 169 skip / 1 todo / 738 files**
   (S115 CLOSE). If your baseline diverges, STOP and report before any change.

If ANY check fails: DO NOT proceed. Report and exit.

## Path discipline (EVERY Read/Write/Edit call)

- Write/Edit: ALWAYS absolute paths under `WORKTREE_ROOT`. NEVER paths starting
  with the bare main repo root. NEVER relative paths.
- Your first commit message MUST include the verbatim `pwd` output, e.g.
  `WIP(m5-swap): start at $(pwd)`.
- If an intake/context doc names `/home/bryan-maclee/scrmlMaster/scrmlTS/foo`,
  translate to `$WORKTREE_ROOT/foo` before writing.

# COMMIT DISCIPLINE (two-sided rule — S83)

- After EVERY edit: `git diff <file>` to verify; `git add <file>`; commit
  IMMEDIATELY. Do NOT batch — commit per phase / per sub-fix. WIP commits expected.
- A code change and its coupled test update are ONE logical unit — ONE commit
  (S113). Never split them; never `--no-verify` to paper over a transient red.
- Before reporting DONE: `git status` MUST be clean. "Work in worktree, no
  commits" is NOT an acceptable terminal report.
- Update `docs/changes/m5-v0.5-compressed-ladder/progress-M5-SWAP.md` after each
  phase — timestamped, append-only.

---

# CONTEXT — read before Phase 0

Authority + background, in order:

1. `docs/changes/m5-v0.5-compressed-ladder/SCOPE-v0.6.md` — the v0.6 cut scope.
2. `compiler/native-parser/M5-ast-bridge-scoping.md` — the M5 agent's original
   divergence inventory (the surface this dispatch closes). **Note:** its cost
   estimates are PRE-compression — DD #27 superseded them. Read it for the
   *divergence inventory table*, not the hours.
3. `compiler/native-parser/M5-divergence-ledger.md` — what the native parser
   produced at S114 vs the live `FileAST`.
4. `scrml-support/docs/deep-dives/m5-m6-scope-revision-2026-05-21.md` §"Phase 3"
   — the compressed MD ladder + the F-unit → MD-step mapping.
5. `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` §3 (M5/M6
   rows) + §4.4 (K-ledger — K9 is M6-gated, not your concern).
6. `compiler/SPEC-INDEX.md` §34 row — the error-code catalog you amend in Phase 1.

The seam you will wire: `compiler/src/api.js` Stage 2 (BS, `_splitBlocks`) +
Stage 3 (TAB, `_buildAST`) produce `tabResults` — each `{ filePath, ast: FileAST,
errors }`. Stage 3.004 (PRECG) onward consume `tabResult.ast`. The native-parser
path must produce the SAME `tabResults` shape; everything from PRECG onward stays
unchanged. The `parser` option is already threaded into `compileScrml` (api.js
~line 481; the `parser === "scrml-native"` branch at ~line 1835 currently only
emits the shadow diagnostic).

---

# PHASE 0 — bridge-divergence re-survey + STOP GATE

**Do not write swap code until this phase is done and PA has cleared it.**

The native parser today exits via `parseMarkup(source)` (a flat `BlockNode[]`
stream) + `parseProgram(tokens, source)` (`Stmt[]`). The live downstream expects
a `FileAST` (~30-kind node union + hoisted collections + attrs + native ExprNode
kinds + state/sql/css/meta/error-effect payloads).

Tasks:

1. For EACH row of the `M5-ast-bridge-scoping.md` divergence inventory, verify by
   grep/Read against current `compiler/native-parser/` source whether F1-F9
   closed it. Produce a **refreshed divergence ledger** at
   `compiler/native-parser/M5-divergence-ledger.md` (overwrite — it is S114-stale;
   carry forward the doc-currency `status:`/`last-reviewed:` frontmatter shape).
2. Identify the residual gap: what the native parser still does NOT produce that
   PRECG-onward consumers need. The F-units were BRIDGE-LIGHT — confirm the
   `FileAST` assembly the swap needs is genuinely a thin adapter and not a
   re-implementation.
3. Estimate the residual swap implementation honestly.

**STOP GATE:** if the residual swap work exceeds **~14h** — i.e. the F1/F7/F8
bridge did NOT close the divergence and real bridge work remains — STOP, write
the refreshed ledger + a residual-work decomposition, and report to PA. Do NOT
absorb a hidden MD-ladder remnant into this dispatch silently. (This is the same
escalation the M5.1 agent used; the budget premise is DD #27's 6-12h.)

If the residual is within budget: report the cleared ledger and proceed to Phase 1.

---

# PHASE 1 — SPEC §34 reconciliation (PLAN → STOP GATE → execute)

The native parser fires **~66 diagnostic codes not in SPEC §34** — the
`E-EXPR-*` family (~32) and `E-STMT-*` family (~34). (`E-ASYNC-NOT-IN-SCRML`,
`E-AWAIT-NOT-IN-SCRML`, `E-UNQUOTED-DISPLAY-TEXT` ARE already in §34.) Today this
is harmless — the codes are never user-facing because the native parser is not
routed. **The moment Phase 2 swaps the pipeline, every one of these codes becomes
adopter-visible.** SPEC §34 is normative (pa.md Rule 4); a routed code with no
§34 row is a spec-vs-impl divergence the swap itself creates.

Step 1.1 — enumerate. `grep -rohE '"E-[A-Z-]+"' compiler/native-parser/*.scrml`
(and `.js` shadows) → the authoritative live set. Cross-check against §34.

Step 1.2 — classify each code into one of:
- **(a) NEW §34 row** — a genuine, distinct, adopter-meaningful parse error.
- **(b) MAP to an existing §34 code** — a native-parser code that is a finer-grained
  variant of an existing catalog entry (e.g. the `E-SYNTAX-*` family). If mapped,
  the native-parser `.scrml`/`.js` source is updated to emit the canonical code.
- **(c) internal/transient** — a code that should not reach adopters at all
  (rename or fold).

Step 1.3 — recommend a **family-level approach**: do the ~66 codes get ~66
individual §34 rows, OR a new §34 sub-section grouping the native-parser
parse-error family, OR a fold into `E-SYNTAX-*`? This is a structural SPEC
decision.

**STOP GATE:** write the enumeration + per-code classification table + the
family-level recommendation to
`docs/changes/m5-v0.5-compressed-ladder/M5-SWAP-S34-RECONCILIATION-PLAN.md` and
report to PA. **Do NOT write 66 catalog rows before PA ratifies the approach.**

After ratification: execute the plan — `compiler/SPEC.md` §34 amendment +
`compiler/SPEC-INDEX.md` §34 row update (line-count + summary) + any (b)-class
code renames in `compiler/native-parser/*.scrml` (and `.js` shadows) + the
conformance-test code-name updates.

---

# PHASE 2 — the pipeline swap

Implement the native-parser routing in `compiler/src/api.js`:

1. Build a `nativeParseFile(filePath, source)` (or equivalent) that produces the
   `{ filePath, ast: FileAST, errors }` shape `tabResults` carries — assembling
   the native parser's `parseMarkup` + `parseProgram` output + the F3
   collectHoisted analogue into a `FileAST`. Phase 0's ledger defines exactly
   what this adapter must populate.
2. Gate it: when `parser === "scrml-native"`, the BS+TAB loop (api.js Stage 2 +
   Stage 3) is replaced by the native path; `tabResults` is produced natively.
   Stage 3.004 (PRECG — `computePGOFlags` + `computeProgramConfig`) onward is
   UNCHANGED — it already runs pipeline-agnostically against `tabResult.ast`
   (that was the point of F5/F6).
3. Replace the M5.1 `I-PARSER-NATIVE-SHADOW` observability stub (api.js ~1835):
   the flag now does real routing. Decide — surface to PA in your report — whether
   `I-PARSER-NATIVE-SHADOW` is retired, downgraded, or kept as a "you are on the
   native pipeline" notice.
4. Default path (no flag) is the live pipeline — ZERO behavioral change.

Do NOT delete BS / ast-builder / Acorn / BPP / tokenizer / the statechild
re-tokenizers — that is **M6**, explicitly out of scope (see below).

---

# PHASE 3 — canary + conformance gate

1. **Dual-pipeline canary.** Compile the `.scrml` corpus (samples + examples)
   under BOTH `--parser=scrml-native` and the default. The native-routed compile
   must produce **equivalent diagnostics and equivalent codegen output**, OR each
   divergence is documented + justified in the progress doc. A divergence that is
   a native-parser bug → STOP and report (do not patch over it).
2. **Zero regression on the default path** — full `bun run test` after every
   phase; the 18,102/0 baseline holds for the live pipeline throughout.
3. **Conformance promotion.** `parser-conformance-corpus.test.js` was left
   SMOKE-only "explicit Tier 1+2 promotion is M5+ scope" (roadmap MK4.3 C8).
   Promote it to the extent the swap makes real — at minimum, assert the native
   pipeline compiles the canary corpus crash-free with cataloged-only diagnostics.
4. **`.scrml`-correctness guard.** If Phase 1 renamed any codes in
   `compiler/native-parser/*.scrml`, grep every touched `.scrml` for malformed
   predicates — `is not not` is NOT scrml (presence is `is some`, SPEC §42.2.2a).
   The native-parser `.scrml` tier is not test-run; this grep is the gate.

---

# OUT OF SCOPE — do NOT do these

- **M6** — deleting `block-splitter.js` / `ast-builder.js` / `body-pre-parser.ts`
  / Acorn integration / `tokenizer.ts` / the statechild re-tokenizers; retiring
  the `--parser` flag; the native parser self-hosting its `.scrml`. M6 is a
  separate later cut, gated on M5-swap landing + soak.
- **K9** (markup-layer `block-context`↔`parse-ctx` circular import) — M6-gated.
- Any native-parser feature work beyond what the FileAST adapter strictly needs.

---

# REPORT SHAPE

Final report MUST include:
- `WORKTREE_PATH` + `FINAL_SHA` + `FILES_TOUCHED`.
- Phase 0: the cleared/escalated divergence verdict + residual estimate.
- Phase 1: where the §34 reconciliation plan landed; PA-ratified approach;
  count of new rows / mapped codes / renames.
- Phase 2: the swap seam — what `nativeParseFile` populates; the
  `I-PARSER-NATIVE-SHADOW` disposition.
- Phase 3: canary divergence count (with justification) + final test counts for
  BOTH pipelines.
- Maps-consulted line.
- Any STOP-gate escalation, verbatim.

# Tags
#m5-swap #v0.6 #native-parser #pipeline-swap #s34-reconciliation #DD-27 #S116
