# R25-Bug-42 — `?{}` SQL in `server function*` SSE generator body not lowered (E-CG-006 misclassified)

You are dispatched to fix known-gaps Bug 42 (gauntlet R25; MED severity; dev-1/dev-2/dev-4 confirmed; SSE generator server-context classification gap).

Change-id: `r25-bug-42-server-fn-star-sql-2026-05-27`

The PA archives this brief to `docs/changes/r25-bug-42-server-fn-star-sql-2026-05-27/BRIEF.md` per pa.md S136 addendum.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (before ANY other tool call)

1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP (S90 CWD-routing).
2. `git rev-parse --show-toplevel` — must equal WORKTREE_ROOT.
3. `git status --short` — clean.
4. `bun install`.
5. `bun run pretest`.

STOP on any failure.

## Startup-merge of main (S112)

```
git -C "$WORKTREE_ROOT" merge main
```

Current main HEAD: `1dd008b3` (post-push-prep). Includes the full R25 HIGH cluster fixes (Bug 36/37/38/40/41/49) + within-node bulk rebump + ast.test.js skip. **Critical: Bug 49 (`076d53e5`) modified `compiler/src/tokenizer.ts` with `tryEmitSyntheticErrorEffectBlock` helper.** Your work on Bug 42 should NOT touch tokenizer.ts; the server-context classification is in codegen / context-determination passes.

## Echo-pwd-in-first-commit (S99 — counter is 20)

First commit message: `WIP(r25-bug-42): start at $(pwd)`.

## Path discipline

**S126: all compiler-source edits via BASH (perl/python/sed/heredoc), NOT Edit/Write.** Echo target path before each write; verify via `git diff`. **NEVER `cd` into the main repo.** Use `git -C "$WORKTREE_ROOT"` + worktree-absolute paths exclusively.

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full. §"Task-Shape Routing" names additional maps. This task is a **compiler-source bug fix** (codegen + context classification).

Map watermark `27e14c66` (S135); main `1dd008b3` (~28 commits ahead). Post-map landings affecting this dispatch:
- Bug 49 `076d53e5` modified `tokenizer.ts` (don't touch)
- Bug 38 `933d1ad3` modified `emit-logic.ts` (different concern; don't touch)
- Bug 40 `50d38095` modified `block-splitter.js` + `ast-builder.js` + `emit-each.ts` (different concern)

PA pre-recon: `server-function` / server-context references appear in `compiler/src/codegen/emit-server.ts`, `compiler/src/codegen/emit-functions.ts`, `compiler/src/ast-builder.js`. The `function*` (generator) form is likely treated differently in ONE of these places.

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>".

# REQUIRED FIRST READS (canon)

1. `.claude/maps/primary.map.md`
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
3. `docs/articles/llm-kickstarter-v2-2026-05-04.md`
4. **SPEC.md §37 SSE / `server function*`** — what generator semantics SHOULD be
5. **SPEC.md §13 `?{}` query expressions** — what SQL lowering expects of context
6. **`docs/known-gaps.md` Bug 42 entry** — full context

# THE BUG

## Symptom (R25 dev-1 + dev-2 + dev-4 confirmed)

The compiler treats `server function*` (SSE generator) body as **client-side context** for `?{}` lowering. Three R25 devs hit different symptom shapes:

- **dev-1 + dev-2:** emit raw `? { \`SELECT...\` } . all ( )` tokens (tokenized but never lowered → raw tokens in JS → invalid)
- **dev-4:** emits `null` with the comment `// SQL-init for x — client cannot evaluate _scrml_sql (E-CG-006); use a server function`

Both shapes are wrong — the SSE generator body IS a `server function*`, runs server-side, and `?{}` should lower per server-fn semantics. E-CG-006 ("client cannot evaluate _scrml_sql") is misclassified for this context.

## Reproducer

```scrml
<program title="repro">

    <schema>
        <db activity>
            id integer primary key
            kind text not null
            ts integer not null
        </>
    </schema>

    <state>
        <cursor> = 0
    </state>

    <page>
        <p>Activity log</p>
    </page>

    server function* watchActivity() {
        while (true) {
            yield ?{`SELECT * FROM activity WHERE id > ${@cursor}`}.all()
            sleep(5000)
        }
    }

</program>
```

(Verify against current SPEC for `<state>` + `<schema>` syntax; adjust if drift.)

Compile + inspect emitted server.js. Confirm:
- `?{...}` body either emits raw tokens OR emits `null` with E-CG-006 in errors

Compare to normal `server function`:
```scrml
server function getActivity() {
    return ?{`SELECT * FROM activity`}.all()
}
```

This MUST lower correctly (canonical canon path). Identify the divergence.

## Locus hypothesis (verify, don't trust)

PA HYPOTHESIS: somewhere in context classification, `server function*` is being routed differently from `server function`. The classification table (or function) recognizes `server function` as a server-context but misses the `*` generator variant. Likely sites:

- `compiler/src/codegen/emit-server.ts` — what counts as a server-function for emit purposes
- `compiler/src/codegen/emit-functions.ts` — function-decl classification
- `compiler/src/ast-builder.js` — where the AST records `isServer` / `isGenerator` flags

Or alternatively: the `function*` form is correctly classified as server but the codegen pass that lowers `?{}` doesn't traverse generator bodies. Check this too.

**S136/S137 grep-driven-triage methodology — PA hypothesis track record this session is mixed (Bug 38 ✅ / Bug 41 over-broad / Bug 40 upstream / Bug 37 downstream / Bug 49 downstream).** Trust your grep + reproducer + trace.

**Investigation order:**
1. Grep `?{` lowering — find the codegen pass + the context check that decides "this is server, lower" vs "this is client, error"
2. Grep `function*` / `isGenerator` / `generator` in compiler source — find the recognition + flags
3. Grep `E-CG-006` — find the fire site; what context does it check?
4. Compare `server function` AST flags vs `server function*` AST flags — what differs?

# WHAT YOU MUST DO

## Phase 0 — diagnose

1. **Build the minimal reproducer.** Compile + inspect emitted server.js. Confirm symptom (raw tokens OR E-CG-006 + null).
2. **Compare to normal `server function`.** Same body, no `*`. Lowering works.
3. **Trace** the difference. Where does classification diverge?
4. **Report root-cause** in `docs/changes/r25-bug-42-server-fn-star-sql-2026-05-27/progress.md` BEFORE writing fix code. Surface disagreement with brief.

## Phase 1 — fix

Apply the minimal fix that includes `server function*` in the server-context set for `?{}` lowering. Compose correctly with:
- Normal `server function` (must STILL lower correctly; regression-guard)
- Pure `function*` (non-server generator) — must STILL be client-context if that's the existing semantic (verify SPEC says so)
- `?{}` in `<state>` blocks (SQL initializer; different context) — must STILL work
- `?{}` in markup expressions (W-DB-SQL-CLIENT or similar warnings) — unchanged

## Phase 2 — regression tests

NEW: `compiler/tests/unit/server-fn-star-sql-r25-bug-42.test.js`. Test sites:

1. **Minimal repro** — `server function* watch() { while (true) { yield ?{...}.all() } }` — `?{...}` lowers; emit has `_scrml_sql(...)` call
2. **Regression-guard** — normal `server function getX() { return ?{...}.all() }` — still lowers
3. **`?{}` with bound param** — `?{...${@x}...}` — params bind correctly inside generator
4. **Multi-yield** — generator with multiple `?{...}` yields
5. **Generator with normal expressions** — `yield 1; yield ?{...}.all(); yield 2` — mixed sequence
6. **`?{}` followed by `.run()` vs `.get()` vs `.all()`** — all chain shapes work
7. **Positive control — bare client `function*`** — if SPEC says client `function*` is supported at all, verify `?{...}` STILL fires the canonical client-context warning/error (don't accidentally upgrade non-server generator)
8. **`server function*` without any `?{}` body** — sanity check generator structure emits

Aim for 8-12 tests.

## Phase 3 — verify (R26 EMPIRICAL DOCTRINE)

1. `node --check` on emitted server.js: parse clean.
2. **EMPIRICAL R26-style verification — per Bug 49's surfacing methodology lesson:**
   ```
   for dev in dev-1-react dev-2-elixir dev-4-pascal; do
     bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile \
       /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/$dev.scrml \
       --output-dir /tmp/r26-bug42-verify/$dev > /tmp/r26-bug42-verify/$dev.log 2>&1
     echo "$dev: E-CG-006 count: $(grep -c 'E-CG-006' /tmp/r26-bug42-verify/$dev.log)"
     echo "$dev: raw '? {' tokens in server.js:"
     grep -c '? {' /tmp/r26-bug42-verify/$dev/$dev.server.js 2>/dev/null
     echo "$dev: _scrml_sql calls in server.js:"
     grep -c '_scrml_sql' /tmp/r26-bug42-verify/$dev/$dev.server.js 2>/dev/null
   done
   ```
   **Expected after fix:**
   - dev-1, dev-2 E-CG-006 should drop (where it fired due to `server function*` SSE bodies)
   - Raw `? {` tokens in server.js should drop on `server function*` bodies
   - `_scrml_sql` calls should appear in server function* generator bodies
3. Full suite: `bun run test` must pass. Baseline at HEAD `1dd008b3`: ~21,865 pass / 0 fail / 219 skip / 1 todo (per push-gate output).

# COMMIT DISCIPLINE (S83 + S113)

Coupled code + test = ONE commit per S113. WIP commits OK for crash-recovery.

# `--no-verify` PROHIBITION (S136 absolute)

NEVER. Pretest race → STOP, wait, retry, STOP-and-report. Session precedent: all 5 cluster dispatches clean.

# REPORTING

1. WORKTREE_PATH (literal `pwd`)
2. BRANCH
3. FINAL_SHA
4. FILES_TOUCHED
5. TEST_DELTA
6. ROOT-CAUSE FINDING (1-2 paragraphs)
7. REPRODUCER VERIFICATION (regression-tests AND R26 empirical — both required)
8. MAPS CONSULTED + load-bearing finding
9. DEFERRED ITEMS
10. PROCESS VIOLATIONS

# OUT OF SCOPE

- Bug 38/40/41/37/49 — all RESOLVED this session; don't re-touch their files
- Bug 31 / R24-BUG-5 `let _result = if(cond){...}` codegen — separate
- `is`-lowering-not-in-arrow-body (dev-2 R25 line 337) — separate
- SPEC changes (unless §37 SSE has a real gap to surface) — codegen-only fix
- Refactor beyond what fix requires

# IF YOU GET STUCK

After 60-90 min: STOP, report partial. WIP commit each step. Append progress.md.

GO.
