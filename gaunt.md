# gaunt.md — R24 gauntlet runner (fresh-Claude entry point)

**You are a FRESH Claude instance in the scrmlTS repo. You have just been told
"read gaunt.md."** You are the **gauntlet-r24 runner** — an orchestrator that
spawns dev-agent personas in parallel, overseers their output, and writes a
round report.

**DO NOT execute the scrmlTS PA session-start protocol** (no pa.md read, no
hand-off rotation, no spec-index read, no master-list read, no user-voice
read, no inbox check, no maps refresh). That protocol is for the project's
primary agent. You are a gauntlet-runner — a different role with a narrow
scope.

**DO read these (in order) to know what to do:**

1. This file (`gaunt.md`) — your runbook.
2. `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/BRIEF.md`
   — the shared dev brief. You will reference its path in dispatch prompts; you do
   NOT need to read it in full yourself (the devs read it). You SHOULD skim its
   top section so you understand what the round is testing — but not in full.

That's it. ~2 reads.

---

## Round identity

- **Round:** R24
- **Date initiated:** 2026-05-27 (or whatever today is — date the report from the
  current real-world date)
- **Purpose:** DD Rec #15 — empirically test whether adopter dev agents reading
  the post-S130 canon (Phase-1c cluster clear) write correct scrml on a substantive
  app (Help-Desk Ticketing).
- **Personas:** 4 — React, Go, Svelte, Pascal/multi-language pragmatist.
- **Dispatch shape:** 4 devs in PARALLEL (single message, 4 Agent calls),
  then 4 overseers in PARALLEL after all devs complete.
- **Output dir:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/`
- **Report dir:** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/`
  (gauntlet-r24-report.md lands here, sibling to BRIEF.md's containing dir)

---

## Step 1 — Verify environment

Run these checks (one Bash batch). If anything fails, STOP and report to user:

```bash
cd /home/bryan-maclee/scrmlMaster/scrmlTS
pwd
ls -la .claude/agents/scrml-dev-{react,go,svelte,pascal}.md
ls /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/BRIEF.md
ls /home/bryan-maclee/scrmlMaster/scrmlTS/docs/articles/llm-kickstarter-v2-2026-05-04.md
ls /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md
bun --version
mkdir -p /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dist
```

All 4 persona files must exist. BRIEF.md must exist. Both required-read files
must exist. `bun` must be available.

**Also verify persona auto-resolution at YOUR session start.** Claude Code's
harness caches `.claude/agents/` definitions when a session opens. The 4
personas (`scrml-dev-react`, `scrml-dev-go`, `scrml-dev-svelte`, `scrml-dev-pascal`)
MUST appear in your available-agents list. If they don't, the personas were
added AFTER your session started — STOP and tell the user to restart their
Claude session in this directory. The gauntlet cannot proceed without
persona resolution.

You can verify by trying a 1-shot resolution ping (no work, just check the
agent type resolves) BEFORE the full 4-dev parallel dispatch. If
`subagent_type: "scrml-dev-react"` returns "Agent type not found," you have
the stale-session problem.

---

## Step 2 — Dispatch 4 devs in PARALLEL (one message, 4 Agent calls)

**CRITICAL:** put all 4 Agent calls in a SINGLE message so they run concurrently.
Use `run_in_background: true` on each so they don't block. Do NOT use
`isolation: "worktree"` — gauntlet devs write into a sandbox dir under
scrml-support, not into scrmlTS source, so no worktree isolation is needed.

The dispatch prompt for each dev is the same shape — only the persona-specific
fields change:

```
You are dev-<N>-<persona> in gauntlet R24.

Your single shared assignment brief is at:
  /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/BRIEF.md

Read it IN FULL. Then read the required-reads it lists IN FULL, IN ORDER:
  1. /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md
  2. /home/bryan-maclee/scrmlMaster/scrmlTS/docs/articles/llm-kickstarter-v2-2026-05-04.md
  3. /home/bryan-maclee/scrmlMaster/scrmlTS/docs/PA-SCRML-PRIMER.md (§6.2 + §6.3)

Then write your output file:
  /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dev-<N>-<persona>.scrml

Compile per the brief's compile command. Iterate until it compiles OR the friction
report explicitly explains the failure with the compiler diagnostic.

Append the friction-report HTML comment block at the END of your .scrml file
per the format in BRIEF.md.

Your final report back to the runner should include:
  - FINAL_PATH: <abspath to your .scrml>
  - COMPILE_STATUS: PASS | FAIL <error-code>
  - ITERATIONS_TO_PASS: <N>
  - FRICTION_ITEM_COUNT: <N>
  - ANTI_PATTERN_TRAPS_HIT: <count of forbidden-construct reaches caught by canon vs caught by compiler>
  - SELF_RATED_SCORE: <1-100, your honest estimate per the brief's rubric>
  - WOULD_USE_IT_SCORE: <1-10>

Per the persona's authoring rule: NEVER invent scrml syntax. When uncertain, re-read
the canon. The canon is the only authority.
```

For each dispatch, substitute:
- `<N>` = 1, 2, 3, or 4
- `<persona>` = react | go | svelte | pascal
- `subagent_type` = scrml-dev-react | scrml-dev-go | scrml-dev-svelte | scrml-dev-pascal

Agent call shape (one example — replicate 4 times with above substitutions):

```
Agent({
  subagent_type: "scrml-dev-react",
  description: "R24 dev-1 React",
  prompt: <the prompt above with N=1 / persona=react>,
  run_in_background: true
})
```

**4 Agent calls, ONE message.** The runtime parallelizes them.

---

## Step 3 — Monitor + wait for completion

You will receive notifications as each background dev completes. Do not poll. When
all 4 have completed, proceed to Step 4. If any dev crashes (API error / OOM /
timeout):

- Read the partial output dir to see what they wrote.
- If a partial .scrml exists with substantive content, treat it as their final
  output (note the crash in the report).
- If nothing usable exists, re-dispatch ONCE with the same prompt. If the second
  attempt also crashes, mark that dev FAILED and continue with the other 3.

---

## Step 4 — Dispatch 4 overseers in PARALLEL (one message, 4 Agent calls)

For each dev that produced a final .scrml file, dispatch a gauntlet-overseer.
The overseer compiles independently and classifies — its verdict supersedes
the dev's self-report.

Overseer dispatch prompt shape:

```
Verify dev-<N>-<persona>'s gauntlet R24 result.

Source: /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dev-<N>-<persona>.scrml
Dev's self-reported verdict: <COMPILE_STATUS the dev returned>

Run the canonical compile command:
  cd /home/bryan-maclee/scrmlMaster/scrmlTS
  bun run compiler/src/cli.js compile \
      /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dev-<N>-<persona>.scrml \
      -o /home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24/dist/

Then classify per your standard protocol:
  - PASS: source uses valid scrml; compiler produces clean output.
  - DEV ERROR: source uses invalid scrml (React-style JSX, retired syntax,
    invented constructs); compiler correctly rejected it.
  - COMPILER BUG: source uses valid scrml per current canon (kickstarter v2 +
    SPEC); compiler crashed or produced bad output. File reproducer evidence.
  - PARTIAL: compiled but emitted JS has issues (mangled names, missing wiring,
    bare function references). Inspect dist/ output.

Report back:
  - OVERSEER_VERDICT: PASS | DEV-ERROR | COMPILER-BUG | PARTIAL
  - COMPILE_OUTPUT: <full output of the compile command, tail -50>
  - DIST_FILES: <ls of dist/ files produced for this dev>
  - DISAGREEMENT_WITH_DEV: <yes/no — did your verdict differ from the dev's self-report?>
  - SUSPECTED_COMPILER_BUGS: <list any compiler-bug candidates you identified>
  - ANTI-PATTERN_TRAPS_IN_SOURCE: <count of forbidden constructs found in the dev's source>
```

For each overseer dispatch, substitute `<N>` and `<persona>` per dev. 4 Agent
calls in ONE message; `subagent_type: "gauntlet-overseer"` for all 4;
`run_in_background: true`.

---

## Step 5 — Aggregate + write the round report

After all 4 overseers complete, write the report to:

  `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/gauntlet-r24-report.md`

Format (model on prior round reports at `scrml-support/docs/gauntlets/gauntlet-r1{3,4,7,8,9}-report.md`):

```markdown
# Gauntlet R24 — Help-Desk Ticketing — Report

**Date:** YYYY-MM-DD
**Round purpose:** DD Rec #15 — Phase-1c canon clear empirical test.
**Personas:** React / Go / Svelte / Pascal-multi-language-pragmatist
**Task:** Help-Desk Ticketing System (see BRIEF.md in gauntlet-r24/ dir).

## Verdict at a glance

| Dev | Compile | Iterations | Friction items | Anti-pattern traps | Self-score | Overseer verdict | Disagrees? |
|-----|---------|------------|----------------|--------------------|------------|------------------|------------|
| dev-1-react | PASS/FAIL | N | N | N | N/100 | PASS/DEV-ERROR/COMPILER-BUG/PARTIAL | yes/no |
| dev-2-go | ... | ... | ... | ... | ... | ... | ... |
| dev-3-svelte | ... | ... | ... | ... | ... | ... | ... |
| dev-4-pascal | ... | ... | ... | ... | ... | ... | ... |

## Per-dev summary

### dev-1-react
- Output: `scrml-support/docs/gauntlets/gauntlet-r24/dev-1-react.scrml`
- Compile: PASS/FAIL <error-code>
- Iterations to PASS: N
- 3 most severe friction items:
  - <quote from friction report>
- Overseer notes: <quote from overseer's analysis>
- Would-use-it: N/10
- Critical canon gap surfaced (if any): <description>

(Repeat for dev-2, dev-3, dev-4.)

## Aggregated friction themes

Group friction items across all 4 devs by what feature drew them:

| Feature | Hits | Severity distribution | Canon-section gap? |
|---------|------|----------------------|---------------------|
| `<each in=>` iteration | <count> | BLOCKER:N HIGH:N MED:N LOW:N | <yes/no, which section> |
| `(A to B)` lifecycle annotation | ... | ... | ... |
| `schemaFor` / `formFor` / `tableFor` (L22 family) | ... | ... | ... |
| `<engine>` Tier-2 | ... | ... | ... |
| `!{}` + `<errorBoundary>` | ... | ... | ... |
| `<onTimeout>` SLA | ... | ... | ... |
| Validators + `<errors of=>` | ... | ... | ... |
| reset(@cell) × lifecycle | ... | ... | ... |
| Quoted-text model | ... | ... | ... |

## Anti-pattern trap report

How well did the kickstarter + anti-patterns catch each forbidden construct
BEFORE the dev wrote it?

| Forbidden construct | Devs who reached for it | Caught by canon | Caught only by compiler |
|---------------------|-------------------------|------------------|--------------------------|
| `null` / `undefined` | N | N | N |
| `===` / `!==` | N | N | N |
| `try` / `catch` | N | N | N |
| `async` / `await` | N | N | N |
| `::Variant` | N | N | N |
| `for...lift` (when `<each>` was right) | N | N | N |
| `@variable` decl form | N | N | N |
| `<style>` tag | N | N | N |

## Compiler bugs surfaced (if any)

For each `COMPILER-BUG` verdict from an overseer, file a known-gaps candidate:

- **R24-BUG-N:** <description> (dev-<N>; SEVERITY; reproducer at dev-<N>-<persona>.scrml line X)
  - Compile output: <error>
  - Source is valid scrml per <canon section reference>
  - Suggested classification: <category>

## Post-S130 canon-clear health rating

Roll up the per-dev "Post-S130 canon-clear specific feedback" sections:

- **Iteration Landing (PRIMER §6.3 `<each>`):** N/4 clear, N/4 partial, N/4 absent. Themes: <summarize>
- **Lifecycle annotation (PRIMER §6.5 / kickstarter §3.2 `(A to B)`):** N/4 clear, ...
- **L22 type-as-arg family (Cluster H):** N/4 clear, ...
- **Engines as Tier-2:** N/4 clear, ...
- **Error model (`!{}` + `<errorBoundary>`):** N/4 clear, ...
- **Quoted-text model:** N/4 clear, ...

## Overall round verdict + recommendations

- **Canon clear health:** GREEN / YELLOW / RED — <one-paragraph synthesis>
- **Top 3 canon gaps to close before R25:** <list>
- **Top 3 compiler bugs to file (if any):** <list>
- **Persona-specific lessons:** <one bullet per persona>
- **Next-round candidate task shape:** <suggest something to test the remaining
  unexercised surface — e.g., real-time chat for channels/SSE; multi-user
  collaboration for `@shared` retirement etc>

## Tags
#gauntlet-r24 #dd-rec-15 #post-s130-canon-clear-test #help-desk-ticketing
```

Write the report file. That's the deliverable — the user will read it.

---

## Step 6 — Report to user

Send a single text message back to the user:

```
Gauntlet R24 complete.

Report: scrml-support/docs/gauntlets/gauntlet-r24-report.md

Devs: N/4 PASS compile, M/4 FAIL.
Compiler bugs surfaced: K (see report §"Compiler bugs surfaced").
Canon clear health: GREEN/YELLOW/RED.
Anti-pattern traps: X total across devs; Y caught by canon, Z caught only by compiler.

Top 3 canon gaps:
1. ...
2. ...
3. ...

Top 3 compiler bugs to file:
1. ...
2. ...
3. ...
```

That's the runner's end-of-run output. The user will read the full report file
and decide next steps.

---

## Hard rules for the runner (you)

1. **NO session-start protocol.** Do not read pa.md, hand-off.md, master-list.md,
   user-voice. You are not the project PA.
2. **NO `isolation: "worktree"`** on dev or overseer dispatches. Gauntlet devs
   write into sandbox dir; overseers read-and-compile. No worktree needed.
3. **NO commits.** This run produces artifacts in `scrml-support/docs/gauntlets/gauntlet-r24/`
   and a report at `scrml-support/docs/gauntlets/gauntlet-r24-report.md`. Whether
   to commit those is the user's call — the runner does NOT commit (unless the
   user explicitly asks for a commit after they've read the report).
4. **NO writes to compiler source.** If a dev or overseer surfaces a compiler bug,
   the report DOCUMENTS it. Fixing is a separate compiler-source dispatch by the
   project PA, not by this runner.
5. **PARALLEL dispatch is mandatory.** 4 devs in ONE message; 4 overseers in ONE
   message. Sequential dispatch wastes wall-clock time.
6. **Trust the overseer over the dev self-report.** When `DISAGREEMENT_WITH_DEV: yes`,
   the overseer's verdict is the report's verdict.
7. **If 3+ devs FAIL compile**, the round is a CANON-CLEAR HEALTH RED signal.
   Surface this in the report's overall verdict prominently.
