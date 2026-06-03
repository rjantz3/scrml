# Bug 63 — markup event-handler-attribute `.advance(.Variant)` is NOT bare-variant-type-checked

> **S136 archival.** Verbatim `prompt:` text dispatched to `scrml-js-codegen-engineer`
> (isolation:worktree, bg, model:opus) at S157, 2026-06-02. Worktree base `358581a8`.
> agentId a2a292b84b9f4cc3a. Concurrent with Bug 65 (af38ebab7b2bd4502) — disjoint files
> (Bug 63 = type-system.ts/symbol-table.ts; Bug 65 = emit-*.js codegen).

Change-id: `bug-63-markup-attr-advance-typecheck-2026-06-02`

You are fixing a TYPE-SYSTEM gap in the scrml compiler (TypeScript source). This is a STATIC type-check fix (NOT codegen) — the runtime works; the gap is that a typo'd variant in a markup event-handler attribute is silently accepted. This is the static-check sibling of the resolved Bug 62 / in-flight Bug 65 (which are codegen). **You touch `compiler/src/type-system.ts` (and possibly `symbol-table.ts`) — NOT the `emit-*` codegen files** (a sibling agent is concurrently editing `emit-lift.js` / `emit-each.ts` / `emit-engine.ts` for Bug 65; stay out of those).

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP and report (S90 CWD-routing failure). Save it as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git rev-parse --short HEAD` should be `358581a8` (base includes refreshed `.claude/maps/`). `git status --short` clean.
4. `bun install` (worktrees don't inherit `node_modules`).
5. `bun run pretest` (populates gitignored `samples/compilation-tests/dist/`).

If ANY check fails: STOP and report.

## Path discipline (S99/S126 — leak class, FOUR+ prior incidents)

- **Apply ALL file edits via Bash** (`perl -i` / `python` / heredoc) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment**, NOT Edit/Write tools (they have leaked into MAIN repeatedly while git/pwd stayed in the worktree). Echo the path before each write; re-verify with `git diff`/`grep` after.
- **NEVER `cd` into the main repo** or anywhere outside `WORKTREE_ROOT`. Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, worktree-absolute paths only.
- First commit message embeds your pwd: `WIP(bug63): start at $(pwd)`.
- Commit after every meaningful edit (don't batch); `git status` clean before reporting DONE. Update `docs/changes/bug-63-markup-attr-advance-typecheck-2026-06-02/progress.md` (append-only, timestamped) per step.

---

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full (in your worktree). Follow the **"Task-Shape Routing"** → **"compiler-source bug fix"** block (this is a type-check fix) and the **"parser / grammar fix"** + **"enum-subset refinement work"** blocks for the bare-variant inference context. Key maps: `domain.map.md` (bare-variant / `.advance` two-plane concept), `error.map.md` (E-TYPE-063 / E-VARIANT-AMBIGUOUS / E-ENGINE-MSG-* families + fire-site locations).

Map currency: maps reflect source HEAD `57edc794` (base `358581a8` = maps + hand-off only, no source change). Verify against current source where needed.

Feedback line in your final report: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing".

---

# THE BUG (confirmed reproduced by PA on HEAD 57edc794)

A bare-variant `.advance(.Variant)` in a markup EVENT-HANDLER ATTRIBUTE (`onclick=@phase.advance(.Bogus)`) is NOT statically checked — a typo'd/invalid variant compiles clean. The same expression in a `fn`/`function` body or `${...}` logic block DOES fire `E-TYPE-063`. The check was wired to the logic-block/fn-body path only (#14 batch 2, §51.0.G.1 two-plane resolution).

**Reproducer A — markup-attr is SILENT (the bug):**
```scrml
<program>
${
    type Phase:enum = { Idle, Active }
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Active>"idle"</>
    <Active rule=.Idle>"active"</>
</>

<button onclick=@phase.advance(.Bogus)>go</button>
</program>
```
Compile (`bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile <tmp>/A.scrml -o <tmp>/distA`) → **exit 0, NO error** (the gap; `.Bogus` is not a Phase variant).

**Reproducer B — fn-body fires, markup stays silent (the asymmetry):**
```scrml
<program>
${
    type Phase:enum = { Idle, Active }
    function go() { @phase.advance(.Bogus2) }
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Active>"idle"</>
    <Active rule=.Idle>"active"</>
</>

<button onclick=@phase.advance(.Bogus)>go</button>
</program>
```
→ fires `E-TYPE-063` for `.Bogus2` (fn-body, line 4) ONLY; `.Bogus` (markup-attr, line 11) is NOT reported.

**Reproducer C — `<each>` Tier-1 handler also silent:**
```scrml
<program>
${
    type Phase:enum = { Idle, Active }
    <cols>: string[] = ["a","b"]
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Active>"idle"</>
    <Active rule=.Idle>"active"</>
</>

<ul><each in=@cols as col><li onclick=@phase.advance(.Bogus)>${col}</li></each></ul>
</program>
```
→ exit 0, NO error (gap also present in the `<each>` handler position).

# DIAGNOSIS (PA survey — your starting hypothesis; verify it)

The `.advance` two-plane bare-variant check is `inferReactiveSiteBareVariants(beExprNode, scopeChain, beSpan, errors, cellMessageEnums)` invoked at **`type-system.ts:6116`** — but ONLY in the bare-expr STATEMENT path (function bodies / `${...}` logic blocks). `grep -n 'inferReactiveSiteBareVariants' type-system.ts` shows it has ONE call site (6116). Markup event-handler attribute VALUES are not routed through it.

The fix: find where markup event-handler attribute values are typed (the typer's markup walk — or determine they aren't walked at all), parse the handler value to an ExprNode, and invoke `inferReactiveSiteBareVariants(handlerExpr, scopeChain, span, errors, cellMessageEnums)` — mirroring line 6116 — so the markup-attr position runs the SAME `.advance` two-plane check (state plane → E-TYPE-063 on invalid variant; message plane via `cellMessageEnums` for `accepts=` engines). The `inferReactiveSiteBareVariants` function definition is at `type-system.ts:8111`; read it + its line-6116 call site + the surrounding context (the comment block at 6109-6116 explains the two-plane + cellMessageEnums semantics) before wiring.

Event-handler attribute names follow `/^on[a-z]+$/i` (+ `on:` / `onserver:` / `onclient:` prefixes) — see `compiler/src/multi-statement-scan.ts isEventHandlerAttrName` (the B18 precedent) for the canonical predicate; reuse it rather than re-deriving.

# Coverage required — all THREE handler positions

1. Plain markup-attr (Reproducer A/B `<button onclick=...>`)
2. `<each>` Tier-1 per-item handler (Reproducer C)
3. Engine state-child body handler (`<Idle>: <button onclick=@phase.advance(.Bogus)>`) — symbol-table.ts already walks engine state-child bodies (the `<button onclick=${@phase = .Loading}>` precedent ~symbol-table.ts:2505); check whether that path runs the variant inference and wire it if not.

If a position is genuinely out of reach without disproportionate work, COVER WHAT YOU CAN, file the rest as a deferred sub-item with the precise blocker, and report it — don't silently skip.

# PHASE 0 — SURVEY-FIRST STOP CONDITION (mandatory)

Before implementing, survey where markup event-handler attribute values are processed by the typer. **If the markup-attr handler value is never parsed/walked by the typer at all** (i.e. the fix requires standing up a NEW markup-attribute typing walk rather than adding the `inferReactiveSiteBareVariants` call to an existing walk), that is a LARGER-than-MED scope — **STOP and report your survey findings** (where handler attrs live in the AST, whether/where the typer visits markup, what a minimal hookup would require, estimated scope) before writing the fix. Do NOT silently expand into a major new typer subsystem. If it IS a localized hookup (existing walk visits the attr; you add the call), proceed.

# Verification (this is a STATIC check — compile-level canary, NOT happy-dom)

Do NOT mark DONE without:
1. Re-compile Reproducers A, B, C → each now fires the variant error (E-TYPE-063, or E-VARIANT-AMBIGUOUS if context is ambiguous) for the markup-attr `.Bogus` — naming the variant + enum. Report the exact diagnostic text emitted.
2. **Non-regression:** the SAME files with a VALID variant (`.Active`) compile CLEAN — no false positive. A non-`.advance` handler (`onclick=fn(@.id)`, `onclick=${@plainCell = 5}` for a plain cell) is unaffected.
3. **Message-plane:** an `accepts=MsgType` engine with `onclick=@phase.advance(.UnknownMsg)` fires the message-plane diagnostic (E-ENGINE-MSG-UNKNOWN / E-VARIANT-AMBIGUOUS per §51.0.G.1); a valid message compiles clean.
4. Full suite `bun run test` (chains pretest) — `0 fail`, baseline 22,753 pass. Report the delta. (Watch for any existing sample/example that used an invalid markup-attr variant and now legitimately errors — if so, that's a real latent bug the check surfaced; report it, don't suppress the check.)

# Tests to author
- Unit: `compiler/tests/unit/markup-attr-advance-typecheck-bug63.test.js` — assert the variant error fires on markup-attr `.advance(.Bogus)` (all three positions: plain / `<each>` / engine-state-child), valid-variant clean, message-plane unknown-msg fires, non-`.advance` handler unaffected. Mirror the assertion style of `compiler/tests/unit/each-engine-advance-bug62.test.js` (compile-to-diagnostics, check `errors` for the code).

# Commit discipline
- Code + coupled test in the SAME commit. Pre-commit runs unit+integration+conformance; pre-push runs full+browser. **No `--no-verify`** on commit OR push without authorization (you don't have it). Branch name irrelevant (PA lands via S67 file-delta).

# Final report MUST include
- `WORKTREE_PATH`, `FINAL_SHA`, `FILES_TOUCHED` (exact), deferred-items list (esp. any handler position you couldn't cover + why).
- Phase-0 survey outcome (localized hookup vs. STOP-needed-major-walk).
- Verification results verbatim (the exact diagnostics emitted for A/B/C + valid-variant-clean + message-plane).
- Full-suite pass/fail/skip counts + delta + any sample/example the new check newly-errors.
- Maps feedback line.
- Confirmation `git status` clean + all work committed.
