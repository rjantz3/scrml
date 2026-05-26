# Q6 — `reset(@cell)` × lifecycle annotation symmetric reset

**Status:** Phase-0 STOP — empirical gap surfaced
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a587bef3011558e9f`
**Branch:** main (worktree-local)
**Base:** `b719a3d2` (post-A4, after `git merge main`)

---

## 2026-05-26 — Startup verification (PASS)

- `pwd` → `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a587bef3011558e9f`
- `git rev-parse --show-toplevel` → matches WORKTREE_ROOT
- `git status --short` → clean
- Worktree base initially `8fffdeed` (per S112 stale-base rule — session-start commit predates the A4 landing at `b719a3d2`).
- Fast-forward merged main to bring in A4 — now at `b719a3d2`.
- `bun install` → 204 packages, clean.
- `bun run pretest` → 13 test samples compiled, no errors.

## 2026-05-26 — Phase 0 mandatory reading (DONE)

### HU + DD (brief-mandated)

1. `docs/heads-up/const-deep-freeze-2026-05-26.md` — read in full. Q6 ratification: PA lean (a) symmetric reset. The §6.8 + §14.12 amendments are normative regardless of A1-A5 outcomes.
2. `scrml-support/docs/deep-dives/const-deep-freeze-2026-05-26.md` Q6 §8.6 — read. DD agrees with (a). ~10-20h estimate.

### SPEC reads (brief-mandated full reads)

1. **§6.8** (`compiler/SPEC.md` lines 5113-5177) — `default=` attribute + `reset(@cell)` keyword + §6.8.2 normative statements. Cancel-then-apply precedent at line 5168 (debounced/throttled interaction).
2. **§14.12** (lines 7874-8161) — Lifecycle annotation `(A to B)`. Read §14.12.1 through §14.12.10 in full.
   - §14.12.3 — extension scope table includes Shape 1 plain reactive cells.
   - §14.12.6 — fn-return position hybrid mechanism (presence-progression = discrimination IS transition; variant-progression = explicit `transition()`).
   - §14.12.10 — normative statements; 1st bullet specifies per-access tracker for all positions including Shape 1.
3. **§34** — confirmed: NO existing `E-RESET-LIFECYCLE-*` or `E-LIFECYCLE-RESET-*` code. No new error code expected for Q6 (it's normative behavior, no fire condition).

### Empirical reads (brief-mandated)

1. `compiler/src/type-system.ts`:
   - `buildLifecycleRegistry` at line 2107 — per-struct field registry. Confirmed: ONLY indexes struct-typed declarations.
   - `checkLifecycleOnEngineCells` at line 2323 — carve-out for engine cells per §14.12.4. Walks `state-decl` nodes; fires E-TYPE-LIFECYCLE-ON-ENGINE-CELL.
   - `checkLifecycleFieldAccess` at line 13447 (NOT 1444 — file grew; the historic citation in §14.12 line 7876 is stale). Text-regex on `binding.field` patterns; operates on `let u: User = ...` style bindings in fn bodies / top-level scopes via `runLifecycleAccessCheck` at 13650.
   - `checkLifecycleBindingAccess` at line 14032 — S131 HU-2 fn-return tracker. Per-binding presence/variant state. `transition()` advances; discrimination forms advance; field reads pre-transition fire.
2. Reset codegen: `compiler/src/codegen/emit-expr.ts:182-217` emits `_scrml_reset(name)` for any of the three `reset(@target)` shapes. Runtime helper at `compiler/src/runtime-template.js:720-786` does: cancel pending debounced/throttled timer → default thunk if registered → init thunk if registered → compound prefix-walk → silent no-op.

---

## 2026-05-26 — Phase 0 EMPIRICAL FINDING (STOP)

### The gap surfaced

§14.12.3 + §14.12.10 normatively specify per-access lifecycle tracking for Shape 1 plain reactive cells (`<state>: (not to User) = not`). The S130 HU-1 Q1=c ratification explicitly listed Shape 1 in the extension scope. But empirically:

**The Shape 1 reactive cell per-access lifecycle access tracker DOES NOT EXIST.**

What IS implemented:
- Landing 1 (S128): struct-field tracker — operates on `let u: User = ...` bindings in fn bodies / top-level scopes. Text-regex on `binding.field`. WORKS for the struct-field case.
- Landing 2 (S130): registry-build resolution + `resolveTypeExpr` accepts lifecycle annotation in Shape 1 / fn-param / schema-field / channel-cell positions + engine-cell carve-out. The TYPE RESOLUTION side landed.
- S131 (HU-2): fn-return per-binding tracker — operates on `const u = loadUser(); u.field` style bindings. Discrimination + `transition()` advance state. WORKS for the fn-return case.

What is NOT implemented:
- No tracker walks `<state>: (not to User) = not` declarations.
- No per-cell transition state is maintained for Shape 1 reactive cells.
- `@state.name` reads against a pre-transition cell DO NOT fire E-TYPE-001 today.

### Empirical verification

Reproducer (compiled cleanly today — NO E-TYPE-001 fire):

```scrml
type User:struct = {
    id: number,
    name: string
}

<state>: (not to User) = not

${
    @state = { id: 1, name: "Alice" }
    @state.name              // post-transition (would pass even with tracker)
    reset(@state)
    @state.name              // SHOULD fire E-TYPE-001 per §14.12 (and per Q6 §6.8.3 amendment), but doesn't
}
```

Verified via `bun run compile /tmp/q6_probe.scrml` — compiled with zero E-TYPE-* fires.

Also probed:
- Shape 1 with let-decl init (existing struct-field tracker path): fires only inside `fn`-decl bodies, not at top-level logic. See test cases passing at `compiler/tests/unit/type-system-lifecycle.test.js` (27/27 pass).
- Type-resolution side: `resolveTypeExpr("(not to User)", registry)` succeeds per Landing 2 (S130). Pure type-level recognition works.

### Brief mental model vs empirical state

The brief assumed:
> "Trace what currently happens when a lifecycle-annotated cell is reset:
> Reproducer: `<state>: (not to User) = not` → `@state = <someUser>` (transition) → `reset(@state)` → what's the type-system tracker's state? Does it know? Does it ignore?"
>
> "Identify the existing write-observer in the lifecycle tracker (likely consumes the symbol-table's `_scrml_reactive_set` / direct-write notifications)"

Both assume a Shape 1 tracker exists. Empirically:
- The tracker doesn't observe Shape 1 cells at all.
- There IS no `_scrml_reactive_set` / direct-write notification consumer in the type-system. The tracker is text-regex on AST node `.value` / `.expr` / `.raw` / `.init` / `.text` fields — pre-codegen.
- The brief's "tracker MUST listen for the codegen reset path" presupposes a symbolic write-notification system that doesn't exist; the lifecycle tracker is purely AST-text-driven.

### Why this matters for Q6 scope

Q6's §6.8.3 amendment normatively specifies behavior for Shape 1 reactive cells under reset:
> "If the written value satisfies the pre-type `A`, the per-access transition state SHALL be reverted to `pre`."

But **there is no per-access transition state to revert** for Shape 1 cells today. The amendment is sound, but the impl prerequisite — building the Shape 1 per-access tracker — is what's actually missing. Q6's ~10-20h scope estimate assumed the Shape 1 tracker exists. The true scope is significantly larger:

1. Build the Shape 1 reactive cell per-access lifecycle tracker (currently missing — landed only as a parse/resolve surface in Landing 2, not as a per-access fire path)
2. THEN extend that tracker for reset-awareness per Q6 §6.8.3

Q6 ~10-20h → realistically Q6 + Shape-1-tracker-prerequisite ~30-50h.

### Recommended PA-level decisions

**Option A — Scope-expand Q6 to include the Shape 1 tracker prerequisite.** ~30-50h dispatch. Same agent persona, same single brief, broader impl scope. The brief's §6.8.3 + §14.12.10 amendments still apply; the impl side becomes a two-part landing (Shape 1 tracker + reset-awareness).

**Option B — Split Q6 into prerequisite + Q6-narrow.** Two dispatches:
1. `Lifecycle-S1` — Shape 1 reactive cell per-access tracker landing. ~20-30h. Closes a §14.12.3 / §14.12.10 spec-vs-impl gap that exists today.
2. `Q6-narrow` — once S1 lands, the original Q6 brief applies as written (~10-20h).

**Option C — Q6 spec-only landing today.** Amend §6.8 + §14.12 with the symmetric-reset semantic; defer impl to a future dispatch once Shape 1 tracker exists. This locks in the design now and prevents drift; the §6.8.3 text would be a forward-looking normative statement.

**Option D — Re-examine whether Shape 1 lifecycle tracking is actually needed.** If the adopter pattern is to USE struct-typed Shape 1 cells (`<state>: User = ...` where `User.passwordHash: (not to string)`), the existing struct-field tracker may already cover the use case via `@state.passwordHash` accesses — IF the tracker observes `@state` rather than `state` as a binding. Need to verify; the tracker's text-regex uses `\b<binding>\s*\.\s*<field>\b` which would match `@state.field` if the binding name is `state` (the `@` is its own boundary).

### My recommendation (FYI for PA)

**Option D first** — empirically probe whether the existing struct-field tracker can observe `@state.field` accesses on a Shape-1 cell typed as a lifecycle-bearing struct. If yes, then Q6's "Shape 1 cell" reproducers may already work through the existing path, and the impl is genuinely just reset-awareness. If no, then Option B (split) or Option A (scope-expand) — Option B preserves the brief's bounded scope and surfaces the Shape 1 tracker work as a first-class task instead of bundling it.

### Probe done — Option D result

The existing tracker uses `collectStructBindings` which looks at `let-decl` / `const-decl` / `variable-decl` / `state-instantiation` / `state-init` kinds. It does NOT cover `state-decl` (the AST shape for `<state>: User = ...`). So the existing tracker does NOT observe Shape 1 cells. Option D doesn't work as-is — would require extending `collectStructBindings` to also collect `state-decl` nodes with lifecycle-struct-typed annotations.

That extension might be enough for the SHAPE 1 case where the lifecycle is on a struct field of the cell's type, but doesn't help the brief's primary reproducer where the lifecycle is on the cell VALUE itself (`<state>: (not to User) = not` — the cell's value type is `(not to User)`, not a struct with a lifecycle field).

### Final disposition

**Phase 0 STOP per brief's STOP conditions:**
> "Some other unexpected spec-vs-impl drift surfaces in §6.8 / §14.12"

The drift surfaced is significant: §14.12.3 normatively specifies Shape 1 reactive cell lifecycle tracking; the impl is missing. Q6 as briefed can't be implemented without the prerequisite.

Returning to PA for scope re-decision before any edits.

---

## Files inspected (read-only)

- `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/heads-up/const-deep-freeze-2026-05-26.md` (HU Q6 + Q1-Q5 context)
- `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/const-deep-freeze-2026-05-26.md` (Q6 §8.6 evidence)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md` §6.8 (lines 5113-5177), §14.12 (lines 7874-8161), §34 (E-RESET-* codes)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/type-system.ts` (lifecycle registry, engine carve-out, struct-field tracker, fn-return tracker, runLifecycleAccessCheck wrapper)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/emit-expr.ts` (reset codegen — `_scrml_reset` emission)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/runtime-template.js` (`_scrml_reset` runtime helper, lines 720-786)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/type-system-lifecycle.test.js` (27 passing tests — struct-field path)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/type-system-lifecycle-landing-2.test.js` (Landing 2 type-resolution-only coverage)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/integration/lifecycle-landing-2-pipeline.test.js` (carve-out + Shape 1 parse coverage; NO per-access fire tests for Shape 1)

## No files modified

No SPEC edits, no impl edits, no test edits. Worktree is clean.
