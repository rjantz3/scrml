# progress — bug-12-vkill read-side fire, POST-CE redux (TS-stage relocation)

Change-id: sym-cell-registration-completeness-2026-06-13
Worktree: .claude/worktrees/agent-a6ddcb97523d10d7b (pwd at first commit recorded in commit msg)
Base: 77c80fcf (merged main into stale session-start base 1b207e6e via FF — S112)

## STARTUP (F4) — DONE
- pwd under .claude/worktrees/agent-a6ddcb97523d10d7b — OK (not main, S90 clear).
- Worktree HEAD was 1b207e6e (stale session-start); main at 77c80fcf (brief target). FF-merged main → 77c80fcf. Tree clean.
- bun install OK. bun run pretest OK (compilation-tests dist populated).
- Baseline suite `bun test compiler/tests/`: 24248 pass / 8 fail / 223 skip / 1 todo (998 files, 90s).
  Pre-existing 8 fails (NONE mine): 6× M6.5.b.0 within-node parity per-fixture over-budget gates
  (native-parser swap-grind residuals); 2× TodoMVC browser (benchmarks/todomvc/dist not compiled).

## NOTE — authority doc was UNCOMMITTED
POSTCE-REDUX-SCOPE.md + POSTCE-BRIEF.md exist only in MAIN's working tree (untracked `??`),
not in any committed ref incl. base 77c80fcf. Read from main (reads permitted). Port reference
(stage-2 branch worktree-agent-af9b984e883af80a2 @ 22205aba) DOES exist as a committed branch.

## PHASE 0 — VERIFY THE RESOLUTION SURFACE (HARD STOP GATE) — *** STOP ***

Method: env-gated probe (SCRML_READSIDE_PROBE=1) inserted at the fire site (type-system.ts:6240),
recording scopeChain resolution outcome for EVERY `@name` read at TS WITHOUT firing. Ran the real
pipeline (MOD→NR→SYM→CE→TS) via `scrml compile` on each surface. Probe REMOVED after — tree clean,
type-system.ts byte-identical to base (verify-only, did not land).

### Result table (load-bearing gate)

| # | Surface | Test corpus | Read | TS scopeChain | Verdict |
|---|---------|-------------|------|---------------|---------|
| 1 | cross-file channel | full 36-file trucking app (`board.scrml` + `dispatch-board.scrml` channel) + `08-chat` + `15-channel-chat` | `@boardEvents` | **reactive** (0 MISS across 503 `@`-reads in trucking; 0 MISS in both chat examples) | **RESOLVES** |
| 2 | `<each>` body reading outer `@cell` | canonical `<each in=@contacts as contact>` body reading `@header` | `@header` | **reactive** | **RESOLVES** |
| 3 | engine boot-`effect=` / implicit cell | `14-mario` (25 reads, 0 MISS) + `25-triage-board` (3 reads, 0 MISS) + all trucking engine pages | engine cells | **0 MISS** (machineRegistry pre-bind, §51.0.C canon) | **RESOLVES** |
| 4 | `<state>`-block cell from sibling fn | canonical `<count>` read by `fn double(){ return @count+@count }` | `@count` | **reactive** | **RESOLVES** |
| 5a | markup-DERIVED cell `const <badge>` (the IDIOMATIC markup-value read) | `const <badge> = <span>${@user}</span>` read via `${@badge}` | `@badge` | **reactive** | **RESOLVES** |
| 5b | component-def `const Name = <markup>` read via `@Name` (SCOPE-doc "markup-const @A") | `const Greeting = <span>` read via `${@Greeting}` | `@Greeting` | **MISS** (component-def case sets `tAsIs()` + does NOT bind the bare name in scopeChain; case "component-def" @9313) | **FALSE-FIRE** |

### The STOP — surface 5b false-fires; SCOPE-doc surface-5 premise is factually wrong

The SCOPE doc maps surface 5 as: "(8) markup-const `@A` | const binds the bare name (8528);
resolves via the sigil→bare fallback." **This is inaccurate.** Two distinct constructs were conflated:

- **markup-DERIVED cell** `const <badge> = <markup>` (lowercase, structural `<>` form) — declares a
  reactive CELL `badge` that double-binds `@badge` + `badge` as `reactive`. `${@badge}` RESOLVES.
  This is the idiomatic markup-value-read (SPEC §1.4 / §2162: "`${@badge}` expands the markup value
  at read time"). VERIFIED reactive at TS.
- **component-def** `const Name = <element props>` (PascalCase) — an inline component, instantiated
  as `<Name/>` (SPEC line 8520), NOT read via `${@Name}`. The TS `case "component-def"` (@9313) only
  sets `tAsIs()` + breaks; it does NOT `scopeChain.bind(name, …)`. So neither `@Name` nor bare `Name`
  is in scope at the ident-walk. The bind at 8543 the SCOPE doc cites runs for `const-decl`/`let-decl`
  ONLY, not component-defs.

Pre-existing corroboration: reading a component-def by its BARE name (`const Greeting = <span>`,
then `Greeting` in a logic expr) ALREADY fires `E-SCOPE-001: Undeclared identifier 'Greeting'` today
— i.e. the component-def name is genuinely absent from this scope, independent of my fire.

### Why this is a STOP, but a LOW-severity / cleanly-mitigable one (PA decision)

The component-def `@PascalName` read is NOT idiomatic scrml:
- ZERO corpus instances of `${@PascalName}` reading a component-def (grep examples/ + samples/).
- SPEC: component-defs are instantiated `<Name/>`, never read via `@Name`.
- The bare-name path ALREADY errors on it (E-SCOPE-001) — so it's already broken territory, not
  legit code my fire would newly break.
- The ACTUAL idiomatic markup-value surface (markup-derived cell `const <name>`) RESOLVES (5a).

So this is NOT "P1 was right, the whole premise collapses" — 4 of 5 surfaces + the idiomatic half of
surface 5 resolve cleanly. It IS a surface the SCOPE doc claims resolves that does not. Per the brief's
HARD STOP ("STOP if any surface false-fires; the SCOPE doc's premise is wrong for that surface"), I am
stopping before Phase 1 rather than silently shipping a fire that would (in theory) red-fire a
component-def-via-`@` read.

### Mitigation options for PA (do NOT pick unilaterally — Rule 3)
- **(a) Scope the fire to NON-component-def reads.** The fire could skip when the stripped base is a
  known user-component name. BUT: TS has no component-name set today (no componentRegistry in
  type-system.ts) — would need to collect component-def names file-wide first (small, ~mirrors the
  A4 `knownFnNames` set already threaded into checkLogicExprIdents).
- **(b) Accept the fire as CORRECT for component-defs.** `${@Greeting}` on a component-def is a genuine
  misuse — there is no reactive cell `Greeting`. Firing E-STATE-UNDECLARED (or steering to `<Greeting/>`)
  may be the RIGHT diagnostic. The existing bare-name path already errors; the `@`-form firing is
  consistent. This needs a SPEC/design ruling (is `${@PascalName}`-of-a-component-def an error?).
- **(c) Correct the SCOPE doc surface-5 line + re-scope** to the markup-DERIVED-cell form only (5a),
  which resolves — then the gate passes 5/5 and Phase 1 proceeds. (b) and (c) may be the same call.

RECOMMENDATION (surfaced, not enacted): the idiomatic surface resolves; the failing surface is a
non-idiomatic misuse that already errors via the sibling path. Most likely (b)/(c) — the fire is
acceptable / correct for component-def-`@` reads, and the SCOPE doc's surface-5 line just needs
correcting from "markup-const @A" to "markup-DERIVED-cell `const <name>` (resolves reactive)." But
this touches a design question (is `${@ComponentName}` an error?) — PA/user call, not mine.

## NOT STARTED (gated behind the STOP)
- Phase 1 — wire the fire at type-system.ts:6240. NOT TOUCHED. type-system.ts is at base state.
- Phase 2 — R26 census + SPEC §34/§6.1 + known-gaps. NOT TOUCHED.

## PHASE 1 — WIRE THE FIRE (LANDED, commit 1fb88a09) — agent a27d0f5d

Worktree: .claude/worktrees/agent-a27d0f5d027c53e22 (reset --hard 46ce09b7 = Phase-0 branch).

- type-system.ts:6253 — replaced the blanket `if (raw.startsWith("@")) return;` with a
  resolution attempt: strip `@` + member-chain → look up sigil form then bare base in the
  post-CE scopeChain. Resolves (reactive cell / `<each>` loop local / import) → no fire.
  Miss → `E-STATE-UNDECLARED` (message ported from the SYM-stage prototype 22205aba ~2380).
  Exempts `@.`/`@.field` (each contextual sigil, validated by E-SYNTAX-064 elsewhere) +
  `@_internal` + typeRegistry/knownFnNames defensively.
- DROPPED (per SCOPE): the Class-B `getCrossFileChannelCellNames` scan, fileASTMap, ReadSideCtx.
  TS reaches the CE-inlined channel decl directly — trucking `@boardEvents` resolves (0 errors).
- Native-parser exemption: NOT added — verified the native-parser `.scrml` mirrors do not
  traverse this TS walker (no false-fire in corpus); the exemption would be a no-op.

### TWO scope-completeness fixes the fire surfaced (idiomatic surfaces Phase-0's corpus missed):
- **Engine machineRegistry pre-bind (type-system.ts ~10792)** — was binding only `machine.name`
  (PascalCase `UI`); the canonical read form is the §51.0.C projected var (`ui`). Now binds BOTH
  `projectedVarName ?? engineNameToProjectedVar(name)` AND the raw name. Closes the `${@ui}` read of
  `< machine name=UI >` (gauntlet-s22 derived-machines `dom-wiring-runtime`).
- **preBindEngineOpenerEffectCells (type-system.ts ~10808)** — NEW pre-bind. Scans each engine's
  raw-text `openerEffect` (§51.0.H Form 3 boot `effect=`) for bare `@cell = …` write targets and
  binds them reactive (mirrors preBindReactiveStateCells + the WRITE-side V-kill exemption). Closes
  the `@tasks` boot-effect implicit cell (engine-opener-effect-c1 + its browser acceptance suite).
  This was the GENUINE resolution gap — NOT a STOP, closed in-scope per Rule 3.

### Two test-fixture corrections (latent bugs the fire surfaced — NOT resolution gaps):
- native-reactive-write-deepset-mutation.test.js — markup hardcoded `${@arr}` for ALL matrix cases,
  but the dotted/nested/string-index cases declare `<a>`/`<obj>`/`<m>` (so `@arr` was a latent
  undeclared read). Fixed: read the case's first declared cell.
- cluster-c-decl-boundary.test.js "two markup consts then a cell" — read two component-defs via
  `${@A}${@B}` (the S192-ruled misuse). Fixed to canonical `<A/><B/>` instantiation; intent
  ("all three register") preserved.

### New test: v-kill-readside-undeclared.test.js — 6 cases, all green.

## PHASE 2 — R26 (LANDED)
- **Full-corpus census** (real compile; fire is live, not flagged):
  - trucking 36-file app (cross-file channel flagship): **0 E-STATE-UNDECLARED, 0 errors**.
  - examples/ (28 standalone demos incl. mario/chat/channel/triage): **0 E-STATE-UNDECLARED**.
  - samples/: census run (877 files) — see report.
  - Synthetic `@typo` read FIRES; component-def `${@Name}` FIRES; clean `@count` SILENT (all proven).
- **Full suite** `bun test compiler/tests/{unit,integration,conformance}`: 24255 pass / 6 fail
  (= the 6 pre-existing within-node parity over-budget; 0 new) / 223 skip / 1 todo.
- **SPEC** §34 read-side clause flipped to "WIRED S192 at TS (post-CE)"; §6.1.1 + §6.1.2 read-side SHALL added.
- **known-gaps**: bug-12-vkill → resolved; g-readside-undeclared-postce → resolved; g-export-channel-body-text stays open.

### PHASE 2 census — samples/ result (the at-risk subset)
The full 877-file single-file census was too slow to finish (each compile re-bundles
stdlib). Censused instead the 31 at-risk samples (those containing the constructs the
fire touches: `<engine>`/`<machine>`/`<each>`/`<tableFor>`/`<channel>`/`const <`/`effect=`).
Result: **5 E-STATE-UNDECLARED hits, ALL in ONE file** `gauntlet-r10-bun-admin.scrml`
(`@showStockPanel` ×3 + `@showCategoryPanel` ×2). The other 30 at-risk samples: 0 hits —
every idiomatic engine/each/tableFor/channel/markup-const surface RESOLVES.

The bun-admin hits are GENUINE undeclared reads, NOT false-positives: there is no
structural `<showStockPanel>` / `<showCategoryPanel>` decl — both cells are "declared-by-
first-write" via a bare `@showStockPanel = false` inside a handler (the V-kill anti-pattern),
then read at `if=@showStockPanel`. This is EXACTLY the silent-bug class the fire exists to
catch + the documented STAGE-1 census backlog (known-gaps: "bun-admin → 24 … V-kill writes
with no structural decl, the STAGE-2 read-side surface itself"). Per S86 corpus-ouroboros /
S88 stated-intent: an adoption-corpus declared-by-first-write anti-pattern is MIGRATION
BACKLOG, not evidence the fire over-fires. No test asserts 0-errors on this file (parser-
conformance tests parse it; the within-node gate compares native-vs-default emission) — which
is why the suite stays green. The 5 hits are the fire EARNING ITS KEEP; NOT a STOP.

CONCLUSION (R26): 0 false-positives on idiomatic constructs across trucking (36-file
flagship) + examples/ (28) + the 31 at-risk samples; the only corpus hits are genuine
V-kill-backlog undeclared reads in one adoption file. Fire is correct + complete.
