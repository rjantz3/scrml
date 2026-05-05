# Phase A1a Step 11 — Compound + Render-by-tag + Kickstarter v2 §3 smoke — Progress

Branch: `phase-a1a-step-11-smoke`
Parent baseline HEAD: `c9ea831` (a1b-scope draft) on top of `226a2dd` (Step 10 closed).
Test baseline: 8,822 pass / 43 skip / 0 fail / 8,865 across 438 files.

## Survey plan

[startup step-11] Worktree clean. `bun install` + `bun run pretest` complete.
Baseline `bun run test` re-run after first-run flake (2 ECONNREFUSED → 0) →
**confirmed 8,822 pass / 43 skip / 0 fail / 8,865 across 438 files**. Branch
`phase-a1a-step-11-smoke` created off `c9ea831`.

[step-11 sources-located]
  - Kickstarter v2 located at `docs/articles/llm-kickstarter-v2-2026-05-04.md`
    (1283 LOC). §3 spans lines 132-249 — "V5-strict — the access model".
    Within §3.1 (lines 197-247) are the canonical three-RHS-shapes examples.
    Inside §3 proper are also the V5-strict access-form examples (lines 145-164)
    and the compound state Variant C example (lines 172-193).
  - SPEC.md §6.3 (Variant C compound) at lines 1828-1894.
  - SPEC.md §6.4 (Render-by-tag semantics) at lines 1896-1944.
  - PA-SCRML-PRIMER.md §4 (RHS shapes) at lines 59-90, §5 (Variant C) at
    lines 92-116, §11 (anti-patterns) at lines 369-391.
  - AST-CONTRACTS-AND-DECOMPOSITION.md §1.1 (state-decl), §1.2 (render-spec).

[step-11 §3-fixture-extraction] Distilled the testable kickstarter v2 §3
fixtures (those that exercise the parser surface — pure prose excluded):

  K11.1 — V5-strict declaration + read + write + reset cluster (lines 145-164):
    ```
    <count> = 0                     // declaration (structural form)
    function inc()  { @count = @count + 1 }  // read + write canonical
    function reset() { @count = 0 }
    function describe() { let count = "five" }   // ❌ E-NAME-COLLIDES-STATE per spec
    ```
    NOTE: `function reset() {}` triggers E-RESERVED-IDENTIFIER per Step 8 — so
    we test a paraphrased variant `function clear()` to exercise the body without
    that error firing. The expected error E-NAME-COLLIDES-STATE is A1b territory,
    not A1a, so we don't assert on it; we just confirm the parser produces a
    state-decl shape and a let-decl named `count` (since A1b enforcement hasn't
    landed yet, this MUST parse-clean today).

  K11.2 — Compound state Variant C (lines 178-187):
    ```
    <formRes>
      <name>  = ""
      <email> = ""
      <error> = ""
    </>
    ```

  K11.3 — Compound state field-write inside a function (lines 184-187):
    ```
    function setError(msg) {
      @formRes.error = msg
    }
    ```

  K11.4 — Predefined-shape compound positional sugar (lines 190-191):
    ```
    type UserInfo:struct = { name: string, age: number, active: boolean }
    <userInfo>: UserInfo = ("alice", 30, true)
    ```
    NOTE: `type ... :struct = ...` parser-shape support is uncertain. Smoke
    probe needed before asserting beyond compile-clean.

  K11.5 — Three-RHS-shapes triplet (lines 203-220):
    Shape 1 plain   — `<count> = 0` / `<name> = ""` / `<items> = []`
    Shape 2 spec    — `<userName req length(>=2)> = <input type="text"/>`
                       `<agree    req>             = <input type="checkbox"/>`
    Shape 3 derived — `const <doubled>  = @count * 2`
                      `const <greeting> = "Hello, " + @userName`
                      `const <badge>    = <span class="badge">${@userName}</span>`

  K11.6 — `default=` attribute (lines 242-244):
    ```
    <startTime default=null> = Date.now()
    <retries   default=0>    = nextRetryCount()
    ```

  K11.7 — Render-by-tag use site for Shape 2 cell (from §1.2 of BRIEF
  + spec §6.4):
    ```
    ${
      <userName req length(>=2)> = <input type="text"/>
    }
    <form>
      <userName/>
    </form>
    ```

[step-11 plan-ahead] Survey probes BEFORE writing the test file:
  Probe 1: `parse(<formRes><name>=""<email>=""<error>=""</>)` — confirm
            state-decl parent with state-decl children (Variant C shape).
  Probe 2: `parse(... <userName/> in markup)` — confirm a markup AST node
            with tag matching the cell name appears at the use site.
  Probe 3: spot-check kickstarter v2 §3 multi-line examples for
            parse-clean + state-decl shape per Steps 4/5 contracts.

If probes succeed, this is a zero-source step (depth-of-survey discount #9
candidate). If any probe surfaces divergence (e.g., compound parent missing
`shape:"plain"` or `initExpr:null`, render-by-tag missing the markup node),
document, escalate to PA, do NOT commit source edits without authorization.

## Survey findings — IMPORTANT divergences detected

[step-11 probe-results] Probes against today's parser (HEAD = `c9ea831` over
Step 10 `226a2dd`) reveal **TWO MAJOR divergences** from BRIEF assumptions:

### Divergence #1 — Variant C compound parent + children NOT recognized today

The exact source from kickstarter v2 §3 (`<formRes><name>=""<email>=""</>`)
parses as **html-fragment text** today. This is the deceptive-success pattern.

```
input:  <program>${ <formRes><name>="" <email>="" </> }</program>
errors: 0
state-decl count: 0
html-fragment: 1 → "< formRes > < name >= \"\" < email >= \"\" < / >"
```

**Root cause (per Step 2 progress.md, lines 93-98 + 223-228):** Step 2's
`tryParseStructuralDecl` recognizer matches `>` followed by `=` ONLY. The
`>` followed by `{` (compound block opener) and `>` followed by sibling-`<`
or `</>` (Variant C structural-children body) cases **do NOT match the
recognizer; they fall through to the existing default html-fragment path.
This is acceptable for Step 2 — those forms are deferred to LATER steps.**
The Step 2 dispatch agent specifically labelled compound-block recognition
**"DEFERRED to Step 11"**.

This means Step 11 was scoped on a now-incorrect premise. The BRIEF (drafted
during Step 1-3 era) assumed Step 11 would be verification-only, but the work
to recognize Variant C (single source change, in `tryParseStructuralDecl` to
add a token-after-`>` branch for the structural-children body) was deferred
into Step 11 — which the BRIEF text itself has not absorbed.

### Divergence #2 — Multi-decl using newlines as separators NOT recognized today

The kickstarter v2 §3 corpus uses newline-separated decls extensively
(no semicolons). Today's parser only recognizes the second-and-subsequent
decls when separated by a semicolon `;`. With newline-only separation, the
RHS of the first decl swallows all following decls into its `init` string:

```
input:  <program>${
  <a> = 0
  <b> = 1
}</program>
errors: 0
state-decl count: 1
state-decl[0]: name="a", init="0\n< b > = 1"   ← SECOND DECL EATEN
```

**Reproduced** with `<a>=0;<b>=1` (semicolons) — works. With newlines only — broken.

This means **every kickstarter v2 §3 multi-decl block that uses newline-only
separation will have only ONE state-decl recognized, with subsequent decls
becoming part of the `init` string.** The only way Step 5/6/7's existing
fixtures pass today is because they're single-decl-per-block (per fixture
audit of `parse-shapes-v0next.test.js` lines 100-322).

### Render-by-tag use-site (BRIEF §1.2) — WORKS today

`<userName/>` in markup parses to `kind:"markup", tag:"userName"` correctly:
```
input: <program>${ <userName req length(>=2)> = <input type="text"/> }<form><userName/></form></program>
state-decl: userName(decl-with-spec/struct)
markup: form > userName  ← markup node with tag="userName" present at use site
```
✅ Per BRIEF §1.2: parser produces a markup AST node tagged with the cell name.
The actual render-spec EXPANSION (resolving `<userName/>` to `<input bind:value=...>`)
is A1c work, out-of-scope for Step 11.

## Decision

Per BRIEF §3 + §5 DoD §7: **"NO source-code changes expected. If any are
required, document divergence in progress.md and surface to PA before
committing source edits."** I am NOT committing source edits.

I AM in scope to:
1. ✅ Verify render-by-tag at parse level via tests (uses today's parser as-is).
2. ✅ Add ANTI-tests confirming the deceptive-success-pattern divergences
   above are reproducible (so the test asserting current behavior FAILS once
   compound recognition lands, forcing the test to be updated then).
3. ⚠️ Add tests for forms that work today (Shape 1 + Shape 2 + Shape 3 single
   decl per block, all already exercised by Steps 4-9 tests).
4. ❌ NOT write tests asserting Variant C compound parent + children produce
   correct shapes (those would FAIL — needs source work).
5. ❌ NOT write tests asserting multi-decl-newline-separated works (those
   would FAIL).

Best sane DoD for Step 11 given this divergence:
- Add a smoke test file with the kickstarter v2 §3 examples that DO work today
  (single-decl variants + render-by-tag use site + decl-then-fn mix).
- Anti-test: assert that Variant C compound today produces html-fragment
  (deceptive-success-pattern frozen as a BLOCKED test, with TODO for the
  step that adds the recognizer).
- Anti-test: assert that multi-decl-newline today eats sibling decls into init.
- Surface the divergence to PA via this progress.md and final commit message.

This is **NOT** Discount #9 (zero-source step) — it's a **discovered-blocker
escalation**. Two source changes are needed (extend `tryParseStructuralDecl`
recognizer for compound-block body + introduce newline-as-separator support
inside logic-block decl scanning) and they belong in their own dedicated
sub-step (call it "Step 11.0a — Variant C compound recognizer" + "Step 11.0b
— newline-as-statement-separator for state-decl body parser") OR fold both
into a Step-2-extension pass.

Per BRIEF §3 second paragraph ("If surprises surface … document divergence
and either fix in this step OR queue for A1b") and §5 DoD §7, the tier
classification escalates from T1 (verify-only) to **T2** (existing-tests-only,
plus anti-test memorialization of the divergence) — but **without source
changes**. The actual fix lands in a follow-up step PA owns.

## Implementation log

[step-11 tests-added] `compiler/tests/integration/kickstarter-v2-smoke.test.js`
created with **23 cases** in 8 describe-blocks. All 23 pass first try after
one fix (whitespace-normalized init comparison for §K11.2i-b).

Cases summary:

  **Working-today positive cases (16 cases):**
  - §K11.1: V5-strict cluster — `<count>=0` + 3 functions (semicolon-separated).
  - §K11.2a-c: Shape 1 plain numeric/string/array.
  - §K11.2d-e: Shape 2 with bareword + call-form validators (input + checkbox).
  - §K11.2f-g: Shape 3 numeric and string derived.
  - §K11.2h: Shape 3 markup-typed derived.
  - §K11.2i-a/b: plain JS const vs reactive derived (kickstarter §3 lines 234-237).
  - §K11.3a/b: `default=` attribute (kickstarter §3 lines 242-244 + Step 6).
  - §K11.4a/b: render-by-tag use site — `<userName/>` produces markup node with
    tag matching the cell name (BRIEF §1.2 confirmed).
  - §K11.5: compound field-write inside fn — `@formRes.error = msg` lowers to
    `reactive-nested-assign` per Step 10 contract.

  **Deferred-divergence anti-tests (7 cases) — TODO[step-11.0a/b/c] markers:**
  - §K11.X-D1a/b: Variant C compound `<formRes><name>="" </>` parses as
    html-fragment today (TODO[step-11.0a] — invert when recognizer extension
    lands).
  - §K11.X-D2a: multi-decl newline-separator eats sibling decls into init
    (TODO[step-11.0b] — invert when newline-as-statement-separator lands).
  - §K11.X-D2b: working baseline — semicolons DO work.
  - §K11.X-D2c: working baseline — newline DOES separate decl-from-fn (legacy).
  - §K11.X-D3a/b: typed Shape 1 + Tier 3 typed positional fall through to
    html-fragment (TODO[step-11.0c] — invert when typed-decl recognizer lands).

Every positive test fires `assertNoHtmlFragmentMatching` per BRIEF §5 DoD §5.

[step-11 final-test-run] `bun run test` after smoke battery added:
**8,845 pass / 43 skip / 0 fail / 8,888 across 439 files.** Delta from
baseline 8,822 → 8,845 = **+23 pass** (slightly above BRIEF target of +10
to +15 due to memorial anti-tests). **0 regressions**. Test file count: +1
(`kickstarter-v2-smoke.test.js`).

## Final summary

**Files modified (0):** Step 11 is verification-only.

**Files added (1):**
  - `compiler/tests/integration/kickstarter-v2-smoke.test.js` (+604 LOC,
    23 tests, 139 expect() calls).

**Branch:** `phase-a1a-step-11-smoke`.

**Test delta:** 8,822 → 8,845 (+23) pass; 43 skip stable; 0 fail; 0 regressions.

**Self-host parity:** N/A — Step 11 is parser verification only; no source
change, no codegen change.

**Survey conclusion (per BRIEF §3):**
  - **NOT depth-of-survey discount #9.** Survey revealed three substantive
    divergences from BRIEF assumptions, all rooted in the fact that Step 2
    explicitly DEFERRED Variant C / typed-decl / compound-block recognizers
    to Step 11 (per Step 2 progress.md lines 93-98 + 223-228 + 321), but the
    Step 11 BRIEF (drafted before Step 2 landed) assumed all that work was
    already done.
  - **Render-by-tag (BRIEF §1.2) WORKS at parse level.** `<userName/>` produces
    a markup AST node tagged with the cell name. The actual render-spec
    EXPANSION is A1c work, out of scope.
  - **Working-today positive corpus is broad enough** to ground 16 positive
    smoke tests covering Shape 1 + 2 + 3 + default + plain JS const + render-by-tag
    + compound field-write — every kickstarter v2 §3 example line that DOES
    parse correctly today.
  - **The three divergences are explicit and tracked:**
    1. **TODO[step-11.0a]** — Variant C compound `<x><y>="" </>` recognizer
       extension. Lives in `tryParseStructuralDecl` (`compiler/src/ast-builder.js`
       lines ~3528-3580 area, identifier-after-`>` branch). Current matcher
       only handles `>` followed by `=`; needs `>` followed by `<sib>` or `</>`
       branch for compound-block body.
    2. **TODO[step-11.0b]** — Multi-decl with newline-only separator. Currently
       only `;` is recognized as a statement separator inside `parseLogicBody`
       when the previous statement was a state-decl. Needs newline-after-RHS
       to terminate the init-collection.
    3. **TODO[step-11.0c]** — Typed-decl recognizer. `<x>: T = expr` form.
       Live in `tryParseStructuralDecl` next to the `=`-after-`>` branch.

**Deferred to follow-up sub-steps PA owns:**
  - Step 11.0a (Variant C compound recognizer) — recommend dispatch.
  - Step 11.0b (newline-as-statement-separator) — recommend dispatch.
  - Step 11.0c (typed-decl recognizer) — recommend dispatch.
  - When each lands, the corresponding §K11.X anti-test in
    `kickstarter-v2-smoke.test.js` MUST be inverted to assert positive shape
    per AST-CONTRACTS-AND-DECOMPOSITION §1.1.

**Anomaly check:** Test delta exceeds plan by +8 (23 vs 15 target), all
explained by memorial anti-tests for the three divergences. No unexpected
behavioral changes. Anti-tests are clearly marked with `TODO[step-11.0X]`
markers so they don't drift into permanent assertions.

**Path-discipline near-misses:** None. All Reads/Writes used absolute paths
under WORKTREE_ROOT (`/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a3be37db7f736aa60/...`).
Verified pwd at startup; confirmed git toplevel matches. Probe scripts
written as `_probe*.mjs` files in worktree root, then deleted before
committing — never reached the index.

## Tier classification

**T2** (test-only, no source changes; survey surfaced three divergences
worth memorializing as anti-tests; recognizer extensions deferred to
follow-up sub-steps).

## Tags

#phase-a1a #step-11 #kickstarter-v2-smoke #variant-c #render-by-tag
#deferred-divergence #anti-test-memorialization #ast-shape-verification
#zero-source-changes #not-discount-9 #step-11.0a-deferred
#step-11.0b-deferred #step-11.0c-deferred

## Links

- Brief: `docs/changes/phase-a1a-step-11-compound-render-smoke/BRIEF.md`
- AST contract §1.1, §1.2: `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md`
- Kickstarter v2 §3: `docs/articles/llm-kickstarter-v2-2026-05-04.md` lines 132-249
- SPEC §6.3 Variant C compound: `compiler/SPEC.md` lines 1828-1894
- SPEC §6.4 Render-by-tag: `compiler/SPEC.md` lines 1896-1944
- Step 2 deferral notes: `docs/changes/phase-a1a-step-2-foundational-decl-recognition/progress.md` lines 93-98 + 223-228 + 321
- Step 10 predecessor: commit `226a2dd`
- Tests added: `compiler/tests/integration/kickstarter-v2-smoke.test.js`

