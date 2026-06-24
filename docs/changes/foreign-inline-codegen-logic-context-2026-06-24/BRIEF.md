# DISPATCH BRIEF — dpa-003 BUILD: inline `_{}` foreign-code codegen in a logic context (ts/js, in-app)

change-id: `foreign-inline-codegen-logic-context-2026-06-24`
agent: scrml-js-codegen-engineer · model: opus · isolation: worktree · background
dispatched by PA, S218, 2026-06-24, against main HEAD `82f76085` (v0.7.0)

This is a **FEATURE BUILD of a RATIFIED design** (dpa-003, ratified S215 Approach B + S216 OUT-typing hybrid), NOT a bug fix and NOT a re-deliberation. Two user decisions are FINAL (do not revisit): **(1) crossing syntax = the `in:{}` header form** (below); **(2) target = in-app first** (standalone is OUT of scope — gated on a separate library-mode-db item).

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (execute BEFORE any other tool call)

S99 had FOUR path-discipline leaks in one session; S126 added two more (Edit/Bash filesystem divergence). Do NOT become the next incident.

## Startup verification (in order)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If under any OTHER repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report (S90 CWD-routing failure). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git merge main` (or confirm base `82f76085` / descendant) — no-op if current; report on conflict.
4. `git status --short` clean. 5. `bun install` (worktrees don't inherit node_modules). 6. `bun run pretest` (populates gitignored `samples/compilation-tests/dist/`). Use `bun run test` for full-suite baselines.

If ANY check fails: STOP, report, exit.

## Path discipline (EVERY write)
- ALL edits via **Bash** (`perl`/`python3`/heredoc/`cp`) on **worktree-absolute paths including the `.claude/worktrees/agent-<id>/` segment** — NOT Edit/Write (S126 filesystem divergence). Echo path before each write; re-verify with `git diff`/`grep`.
- NEVER `cd` into the main repo. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.
- First commit message embeds the verbatim startup `pwd`: `WIP(foreign-inline): start at $(pwd)`.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full, then follow §"File Routing" for a **compiler-source feature build touching block-splitter + tokenizer + codegen + type-system + SPEC**. Map watermark **489951aa** (~several commits behind HEAD `82f76085`). Treat maps as hypothesis; verify against current source.

Feedback in report: "Maps consulted: [list]; load-bearing finding: <sentence>" OR "not load-bearing."

---

# THE RATIFIED DESIGN (authority — read these before building)

- **dPA artifact (the codegen survey + Approach B):** `../scrml-support/docs/deep-dives/foreign-code-logic-context-codegen-2026-06-23.md` — READ IT (it surveyed every locus; sections C-1..C-7 + Approach B). Translate WORKTREE-relative: it lives in the sibling `scrml-support` repo, read via absolute path `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/foreign-code-logic-context-codegen-2026-06-23.md`.
- **OUT-typing refinement artifact:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/foreign-code-inline-typed-boundary-2026-06-23.md`.
- **Ratified insight:** `~/.claude/design-insights.md` [S216/dpa-003].

## What `_{}` inline is (the form to build)

The INLINE value-returning form `const out = _={ … }=` in a LOGIC context (server-fn body / default-logic), `lang="ts"`/`"js"` ONLY. Today §23 `_{}` is spec + markup-PARSE only — NO codegen consumer; in logic, `_={…}=` is mis-tokenized as `_ = {` (identifier + assign + object) → `E-CODEGEN-INVALID-JS`. The `ForeignBlock` AST node (§23.2.2) is spec-only — NO producer, NO consumer.

## RATIFIED crossing syntax — the `in:{}` header (user decision, FINAL)

The crossing set is declared ONCE at the top of the block, inside the braces; explicit-named (NO free lexical capture — the slice sees ONLY what `in:{}` names). No trailing call.

```scrml
<program lang="ts" db="./flogence.db">
  function dispatchOne(prompt: string, path: string) {
    const out = _={ in: { prompt, path }
      await new Response(
        Bun.spawn(["claude","-p",prompt,"--output-format","text"], { cwd: path }).stdout
      ).text()
    }=
    return out
  }
</program>
```

Emitted (sketch — mirror the `?{}` lowering): codegen-injected `await` at the §13180 boundary, the `in:{}` names become the IIFE params, called with the same-named enclosing locals:
```js
async function dispatchOne(prompt, path) {
  const out = await (async (prompt, path) => {
    return await new Response(Bun.spawn(["claude","-p",prompt,"--output-format","text"],{cwd:path}).stdout).text();
  })(prompt, path);
  return out;
}
```
The slice is OPAQUE to scrml analysis (RI / TS / DG skip it per §23.2.3); only the `in:{}` names cross. (For ts/js the value crosses NATIVELY — same Bun runtime, no marshaling; that's why ts/js is the first cut.)

---

# THE BUILD — Approach B, ts/js + in-app (PHASE 0 survey FIRST, then build incrementally)

## Phase 0 — survey (the depth-of-survey discount; you MAY correct any locus below)
Read + confirm against CURRENT source before building: (a) `emit-logic.ts` `case "sql"` (~L2686, per the artifact C-4 — the await-injecting value-flow MODEL to clone; confirm the exact line); (b) `tokenizer.ts:1166` `BLOCKREF_TYPES` (lacks `"foreign"`); (c) the block-splitter `_{` opener recognition + the S108 markup-only gate (where to extend to logic-parent); (d) the §23.2.2 `ForeignBlock` node shape (SPEC ~L15576); (e) SPEC §23.2.4 (the forbid, ~L15604) + §13180 (the value-flow boundary that already names `_{}`) + §23.2.1 (`lang=` resolution); (f) the `<api>` OUT-typing pattern §60.2/§60.5 + `parseVariant` §41.13 (the model for the OUT side); (g) the server-color machinery (§44/E-SQL-004; `emit-client.ts:2192` strips `?{}` from client). Report a one-paragraph confirmed decomposition before building.

## Components (commit each incrementally — crash-recovery)
1. **Block-splitter / tokenizer recognition.** Recognize `_={ … }=` as a foreign opener in the LOGIC-parent context (today markup-only). Add `"foreign"` to `BLOCKREF_TYPES`. Parse the `in: { name, name }` crossing header + the raw slice. Do NOT mis-read `_={` as `_ = {`.
2. **First `ForeignBlock` AST producer.** Build the §23.2.2 node (it has no producer today): carry `raw` (the opaque slice), the `in:{}` crossing names, the `lang=` (from §23.2.1 ancestor `<program lang=>`), and the OUT annotation if present.
3. **Codegen** (`emit-logic.ts`, a new `case "foreign"` cloned from `case "sql"`). Emit the async-IIFE wrapper: `await (async (<in-names>) => { <slice> })(<in-names>)`. Codegen-injects `await` (§13180); the slice is verbatim ts/js. SERVER-COLORED — reuse the `?{}` color machinery (§44/E-SQL-004): the inline `_{}` is server-only; strip/guard from client output exactly as `?{}` is (emit-client.ts:2192). RI/TS/DG skip the opaque slice (§23.2.3).
4. **OUT-typing — the `<api>`-proven hybrid (ratified S216).** The OUT value defaults to `asIs` (§14.7 honesty; narrow-forced by E-TYPE-030 before use). An optional call-site annotation (`const out: SomeType = _={…}=`) states intent; `parseVariant` §41.13 discharges a tagged-variant decode — MIRROR the annotate-AND-decode the `<api>` unowned boundary ships at §60.2/§60.5. Do NOT infer the type from the slice body (A3 eliminated — it reverses the §23.2.3 opacity contract). §42.9 absence at the boundary applies (a `T?`/`not` nudge per §42.9 — handle as the `?{}`/`<api>` boundary does).
5. **SPEC §23.2.4 amendment** (you author it; PA reviews on landing). RECONCILE the contradiction: §23.2.4 currently FORBIDS all logic-context `_{}` (→ E-FOREIGN-004) while §13180 already names `_{}` as a value-flow boundary source. ADMIT the **inline value-returning `_{}` in a server-function body** (mirror E-SQL-004's server-scope rule); the `in:{}` crossing grammar; keep arbitrary-context `_{}` (non-value-returning, non-server-fn) as still-E-FOREIGN-004. Add **E-FOREIGN-005** ("arbitrary `lang=` inline `_{}` value-flow not yet supported — use `use foreign:` for sidecars"; ts/js only). Update §34 + §23 prose. SPEC is normative (Rule 4) — the amendment lands WITH the code.

## SCOPE BOUNDARIES (do NOT exceed)
- **ts/js ONLY.** Any other `lang=` on an inline value-returning `_{}` → E-FOREIGN-005. Do NOT build arbitrary-lang marshaling (no defined runtime model; that's dpa-009 territory).
- **IN-APP ONLY.** The `_{}` server fn lives in an app that already has `<program db>` context. Do NOT touch library-mode `?{}` db-injection (§44.7.1 W5a/W5b) — the standalone path is a SEPARATE, unbuilt item (dpa OQ-F1, out of scope).
- **Explicit `in:{}` capture ONLY** — never free lexical capture.
- **The §23 sidecar (`use foreign:` §23.4) COEXISTS — do not touch it.**
- by-value-vs-by-ref marshaling (OQ3) is MOOT for ts/js (same runtime, native pass) — don't over-engineer; note it deferred for non-JS (dpa-009).

---

# PHASE 3 — EMPIRICAL R26 VERIFICATION (MANDATORY — end-to-end on real adopter-shaped source)

Build the dispatcher repro (in-app: a `<program lang="ts" db="...">` with a server fn containing the `_={ in:{...} … }=` form). Verify:
1. Compiles exit-0, NO E-CODEGEN-INVALID-JS (the current failure).
2. The emitted server JS has the async-IIFE wrapper with the named crossings + injected await; `node --check` passes.
3. The slice is server-side only — NOT present in client output (grep the client.js).
4. The OUT value types as `asIs` by default; an annotated `const out: T` narrows / decodes (parseVariant) — show both.
5. A non-ts `lang=` inline `_{}` → E-FOREIGN-005. A bare logic `_{}` without the value-returning form → still E-FOREIGN-004 (per the amended §23.2.4).

# S215 ADVERSARIAL GATE (MANDATORY — new primitive; enumerate blast radius)
- The `in:{}` header with 0 / 1 / many crossings; a crossing name that shadows a slice-local.
- `_{}` value used directly (`return _={…}=`) vs bound (`const x = _={…}=`).
- Nested `${}`/`?{}` siblings in the same server fn (no cross-contamination of the color/await machinery).
- A `_{}` in a CLIENT-only function → must be rejected (server-color), not leaked to client.
- Confirm `?{}` / `${}` / `^{}` lowering is UNCHANGED (you cloned `case "sql"` — verify you didn't perturb it).
Run `/code-review` (high) on the diff. Land only if clean.

# WITHIN-NODE + FULL SUITE (S198 — MANDATORY)
Run the FULL `bun run test`. New BS/tokenizer recognition CAN shift within-node fixture ASTs — if any fixture goes OVER-BUDGET (`[within-node] OVER-BUDGET <relpath>: {...}`), rebaseline that allowlist entry's per-class values to the printed `raw` IN-PLACE (preserve key order). Report final pass/skip/fail.

# COMMIT DISCIPLINE
Commit per component (BS-gate · AST producer · codegen · OUT-typing · SPEC amendment + tests). Code + coupled test in one commit. Update `docs/changes/foreign-inline-codegen-logic-context-2026-06-24/progress.md` each step. `git status` clean before DONE.

# FINAL REPORT
WORKTREE_PATH · BRANCH · FINAL_SHA · FILES_TOUCHED · Phase-0 confirmed decomposition · the fix per component · Phase-3 R26 results (the 5 checks + node --check + client-strip grep) · S215 adversarial results · SPEC §23.2.4 amendment summary (what you wrote) · within-node touched? full-suite counts · maps feedback · deferred items.

**This is a NEW PRIMITIVE + a SPEC amendment — if the Phase-0 survey reveals the build is materially larger/different than this decomposition, STOP and report to PA for re-scope rather than improvising. Request a deep-dive if you hit a wall.**
