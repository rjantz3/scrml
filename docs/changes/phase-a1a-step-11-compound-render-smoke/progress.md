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

