# BRIEF — Cycles-prereq: COW-all bracket-write + seen-set guard (S168, map-arc Dispatch 1)

> Archived verbatim per pa.md S136. change-id: `cycles-prereq-cow-bracket-write-2026-06-06`.
> This is the HARD ship-gate prereq for the value-native `map` type (S167 RATIFIED-DESIGN.md).
> Disposition ruled by user S168: **value-cycles → FORBID + make-acyclic-true.** Implementation
> shape ruled S168: **COW-all (route ALL `@arr[i]=x` through COW) + seen-set guard now; JS-host
> barrier follows separately.**

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context, read `.claude/maps/primary.map.md` in full (~100 lines). The
§"Task-Shape Routing" section tells you which additional maps to consult for a compiler-source bug
fix / feature. Follow that routing.

Map currency: maps reflect HEAD `75431e9e` as of 2026-06-06. HEAD is at `7c3f4e6b` but that commit
is docs/maps-only (no source change), so the maps are current for all source files you will touch.

Feedback: in your final report include either "Maps consulted: [list]; load-bearing finding: <one
sentence>" or "Maps consulted but not load-bearing."

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (isolation: worktree)

Your worktree path is: <ABSOLUTE-WORKTREE-PATH — confirm via pwd>

## Startup verification (BEFORE any other tool call)
1. `pwd` via Bash. MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`.
   If it is under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is
   the S90 CWD-routing failure. Save the output as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git merge main` (S112 — your worktree base is the session-start commit; merge main to inherit
   `75431e9e` Bug A + the S167 wrap). Resolve/abort+report on conflict.
4. `git status --short` clean (post-merge).
5. `bun install` (worktrees don't inherit node_modules).
6. `bun run pretest` (populates samples/compilation-tests/dist for browser tests).
7. Baseline: `bun run test` — record pass/fail counts. The contract is 0 fail.

## Path discipline (S99/S126 — leak-class mitigation, in force until the PreToolUse hook lands)
- **Apply ALL file edits via Bash** (`perl -0pi`, `python3`, heredoc, `cp`) on **worktree-absolute
  paths that include the `.claude/worktrees/agent-<id>/` segment**. Echo the target path before each
  write; re-verify via `git diff` / `grep` after. Do NOT use the Edit/Write tools (they have leaked to
  MAIN — incidents #12/#13).
- **NEVER `cd` into the main repo** (or anywhere outside WORKTREE_ROOT). Use worktree-absolute paths,
  `bun --cwd "$WORKTREE_ROOT"`, `git -C "$WORKTREE_ROOT"` exclusively. (S126 #14/#15 leak class.)
- First commit message MUST embed your startup `pwd`: `WIP(cycles-prereq): start at $(pwd)`.

## Crash recovery (global directive)
Commit after each meaningful change — don't batch. Update
`$WORKTREE_ROOT/docs/changes/cycles-prereq-cow-bracket-write-2026-06-06/progress.md` after each step
(append-only, timestamped). WIP commits expected. Before reporting DONE, `git status` MUST be clean.

---

# CONTEXT — what this is and why

scrml just ratified (user, S168) that **value-cycles are FORBIDDEN and the language must make
"acyclic value-data" actually true.** A deep-dive (`scrml-support/docs/deep-dives/scrml-data-model-
value-vs-object-2026-06-05.md`) proved a true cycle is constructible TODAY in pure scrml:

- `@arr[0] = @arr` compiles to `_scrml_reactive_get("arr")[0] = _scrml_reactive_get("arr")` — a raw
  IN-PLACE write against the live backing array → `arr[0] === arr` (a real self-cycle that survives
  into the reactive cell). Root cause: the AT_IDENT path-collector in `ast-builder.js` (~line 5508)
  gates on `if (peek().text === ".")`, so a `[` target never enters the COW (`reactive-nested-assign`)
  branch — it falls through to the bare-expr fallback (~line 5568) which emits the expression
  VERBATIM (raw in-place). Dotted writes (`@obj.a.b = x`) DO go through COW (`_scrml_deep_set`).
- Separately, `_scrml_structural_eq` (runtime-template.js:2491) recurses with **no seen-guard**, so
  `==` of two distinct-but-equal cyclic values throws `RangeError: Maximum call stack size exceeded`.

This dispatch closes the SCRML-NATIVE construction path + the equality crash. (The JS-host
Appendix-D hatch barrier is a SEPARATE follow-on — out of scope here; zero adopter usage empirically.)

**Empirical blast radius (PA-verified): the adopter corpus has ZERO real `@name[...] =` write sites**
(the only two occurrences are comment lines in `samples/compilation-tests/gauntlet-r10-solid-
spreadsheet.scrml` that document bracket-writes as "not supported"). So COW-all UPGRADES a currently
broken/non-reactive/cycle-capable form into a reactive, acyclic one — strict improvement, ~0 regression
risk in the corpus. Verify TEST blast radius yourself (Phase 0).

---

# THE THREE LANDINGS

## Landing 1 — seen-set guard in `_scrml_structural_eq` (runtime-template.js:2491)

Add a cycle-safe seen-guard so `==` of cyclic values terminates instead of stack-overflowing. The
function currently: `a===b` fast-path (2492), null/undef + typeof checks, then recurses arrays /
enums (`_tag`) / structs field-by-field with no guard.

- Thread an optional `seen` parameter (default created lazily on first object-recursion). Use a
  structure that tracks **visited (a,b) pairs** (e.g. a `Map<object, WeakSet<object>>` or a pair of
  parallel arrays / a `WeakSet` keyed on `a` holding the set of `b`s compared against it). On entering
  the OBJECT branch (after the `typeof !== "object"` guard), if the `(a,b)` pair was already seen,
  return `true` (assume-equal-on-revisit — the standard structural-eq cycle convention; the only way
  to reach a revisit is a matching cyclic shape). Record the pair before recursing.
- Keep the `a===b` identity fast-path. Keep all existing array/enum/struct logic. The guard is purely
  additive and only engages on the (now-forbidden-but-belt-and-suspenders) cyclic case.
- Add unit tests: two distinct-but-equal cyclic objects compare without throwing; acyclic equality
  unchanged (regression-guard the existing struct/enum/array cases).

## Landing 2 — parser: route bracket-index WRITES through COW (ast-builder.js ~5503-5572)

In the `if (tok.kind === "AT_IDENT")` branch, GENERALIZE the path-segment collector so it accepts
BOTH `.ident` segments (current) AND `[indexExpr]` segments.

- Change the entry/loop condition from `peek().text === "."` to also enter on `peek().text === "["`.
- The path becomes a **heterogeneous segment list**: a `.ident` segment is a STRING (unchanged); a
  `[...]` segment is collected by scanning to the matching `]` (bracket-depth aware, string-aware) and
  recorded as a COMPUTED segment carrying the index expression text + its `safeParseExprToNode(...)`
  ExprNode. Mixed paths must work: `@obj.field[i].x = val` → segments `["field", {index:<i>}, "x"]`.
- **Literal-index optimization (do this):** if the bracket index is a bare integer/string literal
  (`@arr[0]`, `@m["DAL"]`), record it as a STRING segment (`"0"` / `"DAL"`) so it rides the existing
  representation with no computed segment (JS array-index coercion makes `arr["0"] === arr[0]`). Only
  a NON-literal index becomes a `{index: ExprNode}` computed segment.
- The array-mutation check (`@arr.push(...)`, dotted-only) is unaffected — bracket targets never
  collide with it.
- Route to `reactive-nested-assign` ONLY on a following `=` (write). A bracket READ (`@arr[i]` not
  followed by `=`, e.g. `@arr[i].foo()`) must STILL reconstruct as bare-expr (verbatim, unchanged) —
  reads are not COW'd. Update the bare-expr fallback reconstruction (~5568) to faithfully rebuild
  bracket segments too (`@arr[i].x` not `@arr.i.x`).

## Landing 3 — codegen + AST type: emit computed-index path segments (emit-logic.ts:3007, types/ast.ts:757)

- **AST type (types/ast.ts):** widen `ReactiveNestedAssignNode.path` from `string[]` to
  `(string | { index: ExprNode })[]` (name the computed-segment field consistently with the parser).
  Update the doc comment.
- **Codegen (emit-logic.ts:3003 `reactive-nested-assign` case):** replace `const path =
  JSON.stringify(node.path ?? [])` with a piecewise JS-array-literal build: for each segment, emit
  `JSON.stringify(seg)` if it is a string, else emit the index ExprNode via `emitExprField(...)` /
  the standard expr emitter (so `[_scrml_reactive_get("sel")]`). Result e.g.
  `_scrml_reactive_set("arr", _scrml_deep_set(_scrml_reactive_get("arr"), ["field", (<idx>), "x"], <val>))`.
- `_scrml_deep_set` (runtime-template.js:1543) needs **NO change** — it already clones array segments
  (`Array.isArray(obj) ? [...obj] : {...obj}`) and uses dynamic `current[key]`. Confirm this; the COW
  clone breaks any self-ref into a stale snapshot (acyclic by construction), exactly like dotted paths.

---

# PHASE 0 — CONFIRM GATE (do this FIRST; STOP only if it surfaces a breaker)

Before the Landing-2/3 edits, VERIFY the `(string | {index: ExprNode})[]` path representation against
EVERY consumer of `reactive-nested-assign.{path,target}`. Known consumers (grep to confirm + find any
others): `codegen/emit-logic.ts`, `codegen/emit-client.ts` (chunk-selection — likely only reads
`kind`), `symbol-table.ts` (SYM B8 derived-mutation detection cases 2/3 — reads `.target` + builds a
receiver path; a computed segment is opaque, so longest-static-prefix resolution off `.target` must
still work), `type-system.ts`, `body-dg-builder.ts`, `component-expander.ts`, `route-inference.ts`.

For each: does it assume `path` is `string[]`? Would a heterogeneous segment break it? Because dotted
paths STAY pure `string[]` (computed segments appear ONLY on the new bracket-write case), most
consumers should be unaffected. Record findings in `progress.md` (a CONFIRM table).

**PROCEED to Landings 1-3 in this same dispatch IF the representation cleanly covers all consumers
(expected).** **STOP and report (do NOT edit)** ONLY IF you find a consumer the heterogeneous path
genuinely breaks that this brief did not anticipate, OR the codegen array-literal approach diverges
from this brief. (PA has done the inline survey; this gate is a confirm, not a discover-from-scratch.)

---

# PHASE 3 — R26 EMPIRICAL VERIFICATION (mandatory; S138 doctrine — do NOT mark DONE without it)

This is a codegen fix relying on the AST. Regression tests alone are NOT sufficient. Re-compile real
probes on the post-fix build and verify the SYMPTOM is gone:

```
mkdir -p /tmp/r26-cycles-prereq
# probe A — computed-index write is now COW + reactive
cat > /tmp/r26-cycles-prereq/probeA.scrml <<'EOF'
<arr> = [1, 2, 3]
<sel> = 1
function bump() { @arr[@sel] = 99 }
EOF
# probe B — self-ref index write no longer builds a live cycle
cat > /tmp/r26-cycles-prereq/probeB.scrml <<'EOF'
<arr> = [1, 2, 3]
function evil() { @arr[0] = @arr }
EOF
for p in probeA probeB; do
  bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile /tmp/r26-cycles-prereq/$p.scrml \
    --output-dir /tmp/r26-cycles-prereq/$p > /tmp/r26-cycles-prereq/$p.log 2>&1
done
```
Verify in the emitted JS:
- probeA: `@arr[@sel]=99` emits `_scrml_reactive_set("arr", _scrml_deep_set(_scrml_reactive_get("arr"),
  [_scrml_reactive_get("sel")], 99))` (COW reassign, NOT raw `[...]=` in-place). `node --check` exit 0.
- probeB: `@arr[0]=@arr` emits the COW form (clone-then-set) so the result is a STALE SNAPSHOT, NOT a
  live cycle. Confirm the emitted JS does NOT contain a raw `_scrml_reactive_get("arr")[0] =
  _scrml_reactive_get("arr")` in-place statement. `node --check` exit 0.
- Optional: a tiny node harness that runs probeB's emitted fn + asserts `arr[0] !== arr` (no cycle) and
  `JSON.stringify` does NOT throw.
- seen-set guard: a unit test comparing two distinct cyclic objects with `_scrml_structural_eq` returns
  without RangeError.

Report the R26 table (probe → expected emit shape → actual → pass/fail) in your final report.

---

# CONSTRAINTS / DONE CRITERIA

- 0 test regressions (`bun run test` full suite — pre-commit subset + the browser/within-node full set).
- This is NOT a release/cut — no pkg.json bump, no tag.
- SPEC: this dispatch is CODE-ONLY (the §6.5.1 normative text already says "reassignment-canonical /
  clone-mutate-replace" — COW-all aligns the bracket-write path TO the existing spec, no amendment
  needed). If you believe a §6.5.1 clarification is warranted, note it for PA — do NOT edit SPEC.md.
- Final report MUST include: WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, the Phase-0 CONFIRM table, the
  Phase-3 R26 table, test deltas, maps feedback, and any deferred items.

# DONE = Phase 0 clean → Landings 1-3 landed → 0 regressions → R26 verified → clean `git status`.
