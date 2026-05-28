# R25-Bug-49 — BS-level statement-boundary detection silently drops `const X = call() !{...}` arm content (UPSTREAM of Bug 38 codegen fix)

You are dispatched to fix known-gaps Bug 49 (R26 verification round surfaced; HIGH severity; 6 R25 instances across dev-1-react + dev-2-elixir; both used canon-shown shape per PRIMER §6 + kickstarter).

Change-id: `r25-bug-49-bs-const-bind-error-handler-2026-05-27`

The PA archives this brief to `docs/changes/r25-bug-49-bs-const-bind-error-handler-2026-05-27/BRIEF.md` per pa.md S136 addendum.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

## Startup verification (before ANY other tool call)

1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under any other repo, STOP (S90 CWD-routing).
2. `git rev-parse --show-toplevel` — must equal WORKTREE_ROOT.
3. `git status --short` — clean.
4. `bun install`. (Worktrees don't inherit node_modules.)
5. `bun run pretest`. (Populates browser-test fixtures.)

STOP on any failure.

## Startup-merge of main (S112)

```
git -C "$WORKTREE_ROOT" merge main
```

Current main HEAD: `0d7f6413` (R26 verification round + Bug 49 filing, S137). Includes:
- Bug 38 codegen fix `933d1ad3` — `emit-logic.ts` `emitArmAssign` extension. DOWNSTREAM of your work; don't touch.
- Bug 40 fix `50d38095` — `block-splitter.js` `scanAttributes` `:`-shorthand recognition. SIBLING BS-level work; understand the pattern but don't touch the colon-shorthand path.
- Bug 36 fix `e1269844` — `ast-builder.js` + `native-parser/parse-stmt.js` function-decl-head bare-form `! ErrorType`. SIBLING parser-side work in the `!` token territory.

Read all three diffs before changing anything in BS / expression-parser:
```
git -C "$WORKTREE_ROOT" log --stat 0d7f6413 -- compiler/src/block-splitter.js compiler/src/expression-parser.ts compiler/src/ast-builder.js compiler/native-parser/parse-stmt.js
```

## Echo-pwd-in-first-commit (S99 — counter is 20)

First commit message: `WIP(r25-bug-49): start at $(pwd)`.

## Path discipline

**S126 mitigation: all compiler-source edits via BASH (`perl`/`python`/`sed -i`/heredoc), NOT Edit/Write.** Echo target absolute path before each write; re-verify via `git diff`/`grep` after. **NEVER `cd` into the main repo.** Use `git -C "$WORKTREE_ROOT"` + worktree-absolute paths exclusively.

# MAPS — REQUIRED FIRST READ

Read `.claude/maps/primary.map.md` in full. §"Task-Shape Routing" names additional maps. This task is a **compiler-source bug fix** in the BS layer + expression-parser (NOT codegen; the codegen path was already closed by Bug 38).

Map watermark `27e14c66` (S135); main is `0d7f6413` (27+ commits ahead). **POST-MAP LANDINGS RELEVANT to this dispatch:**
- Bug 40 `50d38095` (S137) modified `block-splitter.js` `scanAttributes` (bracketDepth + `:`-shorthand recognition)
- Bug 36 `e1269844` (S136) modified `ast-builder.js` `!` handler + `parse-stmt.js` for bare-form ErrorType
- Bug 38 `933d1ad3` (S137) modified `emit-logic.ts` (downstream of your work)
- Bug 37 `1ce963d0` (S137) modified `ast-builder.js` `_findEachOpenerEnd` (different sibling finder in same file)

Map will route correctly to expression-parser.ts + block-splitter.js if listed in Key Codegen Modules; verify.

Feedback in final report: "Maps consulted: [list]; load-bearing finding: <one sentence>".

# REQUIRED FIRST READS (canon)

1. `.claude/maps/primary.map.md`
2. `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
3. `docs/articles/llm-kickstarter-v2-2026-05-04.md` (kickstarter §error-handling shows the `const X = call() !{...}` shape as canonical)
4. **`docs/PA-SCRML-PRIMER.md` §6 (error model)** — explicitly shows: `const rows = fetchItems() !{ | ::Network msg -> { ... } | ::Empty -> { ... } }`. The value-binding form is canon-shown.
5. **SPEC.md §19.5 (call-site `!{}`)** — what the binding form SHOULD parse as
6. **`docs/known-gaps.md` Bug 49 entry** — full R26 reproducer context, dev-1 + dev-2 6-instance counts, methodology lesson
7. **R26 verification context in PA's S137 known-gaps refresh commit `0d7f6413`** — git log to see the full reasoning

# THE BUG

## Symptom (R26 verification S137; 6 instances dev-1 + dev-2)

When `!{...}` follows a `const X = ... call()` initializer, the BS layer (statement-boundary detector, fired from `compiler/src/expression-parser.ts:2010`) emits:

```
[scrml] warning: statement boundary not detected — trailing content would be silently dropped: "! {
| . DbError ( msg ) - > { @searchTerm = msg }
| . Valida..."
```

and the `!{...}` arm bodies are SILENTLY DROPPED — they never reach the AST, never reach codegen. The emitted JS contains just the bare call assignment with NO error handlers:

```js
const created = _scrml_fetch_createCard_20(values.title, values.description, values.priority);
// arm bodies dropped — no error handlers emitted
```

The Bug 38 codegen fix (`933d1ad3`) was correct on its scope — when the AST reaches codegen, arm bodies emit correctly. But for the `const X = ...` shape, BS drops the content BEFORE the AST is constructed, so codegen never sees it.

## Three R26 reproducer shapes (all FAIL post-S137 baseline)

```scrml
function handleCreate(values) {
    const created = createCard(values.title, values.description, values.priority) !{
        | ::DbError(msg) -> { @searchTerm = msg }
        | ::Validation   -> { @searchTerm = "validation" }
    }
    @cards = [...@cards, created]
}

function moveForward(cardId, toStatus) {
    const moved = moveCard(cardId, toStatus) !{
        | ::NotAllowed        -> { @searchTerm = "not allowed" }
        | ::InvalidTransition -> { @searchTerm = "invalid" }
        | ::NotFound          -> { @searchTerm = "not found" }
    }
    @cards = @cards.map(c => c.id == cardId ? moved : c)
}

function dropOnDone(cardId) {
    const r = moveCard(cardId, .Done) !{
        | ::Forbidden        -> { @lastError = "forbidden" }
        | ::InvalidTransition -> { @lastError = "invalid" }
        | ::NotFound         -> { @lastError = "not found" }
        | ::DbFailure msg    -> { @lastError = msg }
    }
}
```

All three: BS warns + drops; emitted JS has no arm handlers; runtime broken.

## Workaround currently used

Bare-call form WITHOUT `const X =` binding works (Bug 38 fix `933d1ad3` handles it correctly):

```scrml
riskyCall() !{
    | ::Variant -> { @x = "ok" }
}
```

But the `const X = ...` form is canon-shown in PRIMER §6 + kickstarter; it's not just an adopter reach.

## Canon citation

PRIMER §6 verbatim:
```scrml
function load() {
    const rows = fetchItems() !{
        | ::Network msg -> { @phase = .Error(msg); return }
        | ::Empty       -> { @phase = .Empty;       return }
    }
    @phase = .Success(rows.length)
}
```

dev-2-elixir R25 report line 347: *"primer §6 shows `let result = call() !{ | ::E -> ... }` — kickstarter shows `const rows = call() !{ ... }` — both BIND the result."* Both R25 devs reached for this shape from canon.

## Locus hypothesis (verify, don't trust)

The "statement boundary not detected" warning fires from `compiler/src/expression-parser.ts:2010` (PA pre-recon confirmed; ONLY fire-site for that literal in compiler source). So the bug is most likely in the expression-parser's logic for "what extends an expression vs what terminates it."

PA HYPOTHESIS: when the expression parser sees `const X = call()`, it takes `call()` as a complete expression. When it then encounters `!{...}`, it does NOT recognize `!{` as part of the expression's continuation — the `!{...}` is a call-site error-handler attachment per SPEC §19.5; it MUST be parsed as part of the right-hand-side expression of the const-binding.

**Compare:** the bare-call form `riskyCall() !{...}` works because there's no `const X =` initializer context — the expression parser sees the call + `!{...}` as a top-level statement. The `const X =` context is what changes parsing behavior.

**S136/S137 grep-driven-triage methodology:** PA hypotheses have a 50% track record this session (Bug 38 ✅ / Bug 41 over-broad / Bug 40 upstream of actual / Bug 37 downstream of actual). Trust your grep + reproducer + trace over my hypothesis.

**Investigation order:**
1. Grep `expression-parser.ts:2010` context — read the "statement boundary not detected" fire site + surrounding function. What state is the parser in when it fires?
2. Grep `!{` token handling in expression-parser.ts. Find where `!{...}` is recognized as a call-site error handler. Is it only recognized at certain statement positions?
3. Compare: how does `expression-parser.ts` handle `riskyCall() !{...}` (bare, works) vs `const X = riskyCall() !{...}` (binding, fails)? What's the divergence point?
4. The bare-form is handled by Bug 38 fix and works downstream — trace where the bare-form AST node gets constructed and see whether the const-binding case takes a different path.

# WHAT YOU MUST DO

## Phase 0 — diagnose

1. **Construct minimal reproducer:**
   ```scrml
   <program title="repro">

       <state>
           <msg> = ""
       </state>

       <page>
           <button onclick=run()>Run</button>
       </page>

       type ErrType:enum = { NetworkError, Validation }

       server function risky() ! ErrType {
           fail ErrType::NetworkError
       }

       function run() {
           const r = risky() !{
               | ::NetworkError -> { @msg = "net" }
               | ::Validation   -> { @msg = "val" }
           }
       }

   </program>
   ```
   Verify against current PRIMER + SPEC for state-decl syntax. Adjust if drift.

2. **Compile** + inspect emitted JS. Confirm:
   - BS warns `statement boundary not detected`
   - Emitted `function _scrml_run_N()` body has `const r = _scrml_fetch_risky_N();` with NO arm handlers (no `@msg` writes, no `_scrml_reactive_set("msg", ...)` calls)

3. **Compare** to bare-call form (the workaround):
   ```scrml
   function run() {
       risky() !{
           | ::NetworkError -> { @msg = "net" }
           | ::Validation   -> { @msg = "val" }
       }
   }
   ```
   Compile this. Confirm no BS warning + arm bodies emit. Trace the AST path.

4. **Trace** the divergence — start at expression-parser.ts:2010 (warning fire) + walk upstream. Find where the const-binding shape takes a different path than the bare-call shape.

5. **Compare** to other expression continuations: `const X = call().then(...)` (method chain) — works? `const X = call() + 1` (binary op) — works? If those work, the question is "why does `!{...}` after a call() NOT extend the expression?"

6. **Report root-cause hypothesis** in `docs/changes/r25-bug-49-bs-const-bind-error-handler-2026-05-27/progress.md` BEFORE writing fix code. Surface disagreement with brief.

## Phase 1 — fix

Apply the minimal fix that makes `!{...}` extend an expression when it follows a call/expression on the RHS of `const X = ...`. Likely shape (verify):
- Extend expression-parser to recognize `!{` as continuing the expression when it appears after a complete call/expression in an initializer context.
- This may involve modifying the expression-parser's "what tokens extend an expression" set to include `!{`.
- OR: routing the const-binding's RHS through the same expression parser that bare-call form uses (avoiding a path divergence).

**Compose correctly with:**
- Bare-call `!{...}` form (Bug 38 fix path) — must STILL work; regression-guard.
- `let X = call() !{...}` form (semantically identical to const; same path).
- Multi-line + single-line + with-payload arms (all Bug 38 reproducer shapes — verify they continue to flow through codegen correctly after BS sees them).
- Function-decl-head bare-`! ErrorType` (Bug 36 path) — different `!` context; don't break.
- `:`-shorthand recognition (Bug 40 path) — different `!` context; don't break.

## Phase 2 — regression tests

NEW test file: `compiler/tests/unit/error-handler-const-bind-r25-bug-49.test.js`. Required sites:

1. **Minimal repro — `const r = call() !{...}` with multi-line arms** — assert arm bodies appear in emitted JS (look for `_scrml_reactive_set("msg", "net")` etc.)
2. **`let X = call() !{...}`** — let-binding form
3. **Multi-arm + payload (`::Variant arg ->`)** — `const r = call() !{ | ::Err(msg) -> { @x = msg } }`
4. **Single-line collapsed `const r = call() !{ | ::X -> @y = 1 }`** — both binding + collapsed arm
5. **Nested handler `const r = a() !{ | ::X -> b() !{ | ::Y -> @z = 1 } }`** — composition
6. **`if` / branch in arm body** — `const r = a() !{ | ::X -> if (@cond) { return } else { @y = 1 } }` (regression-guard for Bug 31 / R24-BUG-5 separation; that bug is OUT OF SCOPE, do NOT chase)
7. **Bare-call `risky() !{...}` (no const)** — regression-guard Bug 38 fix path STILL WORKS
8. **Empty arm body `{ }`** — should emit
9. **Positive control — `const r = call()` (no `!{...}`)** — bare const-binding without error handler still works
10. **Trailing usage** — `const r = call() !{...}; @cards = [...@cards, r]` — verify `r` is bound + downstream statement emits

Aim for 10-15 tests.

## Phase 3 — verify (THE R26 EMPIRICAL DOCTRINE)

1. `node --check` on emitted JS for reproducer: parse clean.
2. **EMPIRICAL R26-style verification — mandatory per Bug 49's surfacing methodology lesson.** Run:
   ```
   for dev in dev-1-react dev-2-elixir; do
     bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile \
       /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r25/$dev.scrml \
       --output-dir /tmp/r26-bug49-verify/$dev > /tmp/r26-bug49-verify/$dev.log 2>&1
     echo "$dev: stmt-boundary warnings: $(grep -c 'statement boundary not detected' /tmp/r26-bug49-verify/$dev.log)"
     echo "$dev: createCard/moveCard/archiveCard handlers in client.js:"
     grep -B1 -A6 'function _scrml_handleCreate\|function _scrml_moveForward\|function _scrml_archiveOne\|function _scrml_archiveAndBroadcast' /tmp/r26-bug49-verify/$dev/$dev.client.js | head -40
   done
   ```
   **Expected after fix:**
   - dev-1-react stmt-boundary warnings: was 3 source-side + 1 stdlib = 4 total; should now be 0 source-side + ~1 stdlib = 1 total (stdlib unrelated)
   - dev-2-elixir stmt-boundary warnings: was 3; should now be 0
   - Emitted handler bodies (`_scrml_handleCreate_24` etc.) contain `_scrml_reactive_set("searchTerm", ...)` arm-body emissions
3. Full suite: `bun run test` must pass. Baseline at PA HEAD `0d7f6413`: **21,902 pass / 0 fail / 170 skip / 1 todo / 807 files** (approx; verify on landing).
4. **DO NOT mark "DONE" without empirical R26 verification passing.** Regression-tests-passing ≠ empirical-passing — this is exactly the bug class R26 surfaced.

# COMMIT DISCIPLINE (S83 + S113)

Coupled code + test = ONE commit per S113. WIP commits OK for crash-recovery.

# `--no-verify` PROHIBITION (S136 absolute)

NEVER. Pretest race → STOP, wait, retry, STOP-and-report if still failing. NO bypass. Session precedent: R25-Bug-36/38/40/41/37 all clean (Bug 37 agent self-corrected one violation via `git reset --soft`).

# REPORTING

1. **WORKTREE_PATH** (literal `pwd`)
2. **BRANCH**
3. **FINAL_SHA**
4. **FILES_TOUCHED**
5. **TEST_DELTA** (subset + R26 verification numbers)
6. **ROOT-CAUSE FINDING** (1-2 paragraphs)
7. **REPRODUCER VERIFICATION (BOTH regression-tests AND R26 empirical)** — split clearly; R26 empirical is mandatory
8. **MAPS CONSULTED + load-bearing finding**
9. **DEFERRED ITEMS** (especially the `is`-lowering-not-in-arrow-body issue dev-2 reported at R25 line 337 — DO NOT chase; separate bug)
10. **PROCESS VIOLATIONS** (honest declaration)

# OUT OF SCOPE

- Bug 38 codegen fix `933d1ad3` is STABLE; don't re-touch `emit-logic.ts`
- Bug 36 / 40 / 37 / 41 — all RESOLVED earlier this session
- Bug 31 / R24-BUG-5 `let _result = if(cond){...}` codegen — separate bug, deferred
- The `is`-lowering-not-in-arrow-body bug (dev-2 R25 report line 337) — separate bug, don't chase
- SPEC changes — codegen-and-parser-only fix
- Any refactor beyond what fix requires

# IF YOU GET STUCK

After 60-90 min: STOP, report partial. WIP commit each step. Append progress.md.

GO.
