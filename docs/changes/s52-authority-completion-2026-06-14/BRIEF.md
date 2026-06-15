change-id: `s52-authority-completion-2026-06-14`. Two coupled §52 completions (one worktree, one landing — avoids a SPEC.md file-delta clobber): (1) the §52↔§38 P1 bridge SPEC subsection [SPEC-text only, fully decided], (2) the Tier-1 read-authority codegen follow-on [`g-tier1-read-authority-codegen` MED, GATED on a Phase-0 parse-gap survey]. You are scrml-js-codegen-engineer. Builds on the S194 G1 landing (`fdcd7fcc`).

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (BEFORE any other tool call)
1. `pwd` — MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. If under `scrml-support/...` or elsewhere → STOP + report (S90). Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT; base is HEAD `fdcd7fcc` (the G1 landing — SPEC §52 ALREADY reflects the auto-persist retraction; do NOT re-retract).
3. `git status --short` clean.
4. `bun install` (worktrees don't inherit node_modules — pre-commit `bun test` fails with "cannot find package 'acorn'" otherwise).
5. `bun run pretest` (populates `samples/compilation-tests/dist/`; full `bun test` ~130 ECONNREFUSED failures without it).
6. **S126 edit discipline:** apply ALL edits via Bash (`perl -0pi`/`python3`/heredoc) on WORKTREE-ABSOLUTE paths (include the `.claude/worktrees/agent-<id>/` segment); echo the path before each write + re-verify via `git diff`/`grep`. Do NOT use Edit/Write tools (they leak to MAIN). NEVER `cd` into main — use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, absolute paths.
STOP + report if any check fails.

# MAPS — REQUIRED FIRST READ
Read `$WORKTREE_ROOT/.claude/maps/primary.map.md` (~100L); follow §"Task-Shape Routing" → "compiler-source bug fix / codegen". **Currency — IMPORTANT:** maps reflect HEAD `0cafe665` (PRE-G1). The G1 landing `fdcd7fcc` just changed `emit-sync.ts` / `emit-reactive-wiring.ts` / `type-system.ts` / SPEC §52 — EXACTLY your surface — so the maps are STALE on your files. Verify against CURRENT source; SPEC §52.6 already carries the Q1=C retraction + §52.6.6 write convention (don't undo it). In your report: "Maps consulted: [...]; load-bearing finding: <one sentence>" or "consulted but not load-bearing".

# READ-ONLY CONTEXT (MAIN absolute paths — committed at HEAD, readable)
- **Q3 debate verdict (the authority for Phase 1):** `~/.claude/design-insights.md` — entry "§52↔§38 server-write fan-out bridge … 2026-06-14" (P1 won 50 vs 38.5).
- **The persist-semantics DD §Q3 + amendment-direction #4(P1):** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/server-state-persist-semantics-2026-06-14.md`.
- **The MMORPG DD (the W-A=P1 world model = the canonical bridge example):** `/home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/flux-mmorpg-architecture-2026-06-14.md` (Approach W-A, Q1).
- **The G1 SCOPING (the Tier-1 follow-on scope + the W-AUTH-002 finding):** `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/g1-server-sync-codegen-2026-06-14/SCOPING.md` §7 + §9.
- **The gap entry:** `docs/known-gaps.md` → `g-tier1-read-authority-codegen` (MED).
- **SPEC (normative, Rule 4):** `$WORKTREE_ROOT/compiler/SPEC.md` — §52.3.5 (Tier-1 type-decl), §52.6.1 (initial load), §52.3.3 (table=), §38.4 (channel `__sync`), §38.6 (`broadcast()`), §52.6 (the retracted model — context).

# PHASE 0 — SURVEY + STOP/SPLIT GATE (do FIRST; commit a survey note)
Size the **Tier-1 colon-field parse gap** — the foundation of the whole Tier-1 follow-on. Today a canonical §52.3.5 state-type-decl `< Card authority="server" table="cards"> id: number  title: string </>` (fields as a BODY field-list) parses as `html-fragment`, NOT a `state-constructor-def` node, so (a) W-AUTH-002 can't fire on it and (b) there's no node to attach Tier-1 read-authority codegen to. (The paren-BODY form `id(int)` and the opener-attr form also need checking — only the opener-attr contrivance currently produces the node.) Determine: is making the canonical body-field-list shape produce a `state-constructor-def` a BOUNDED fix (a localized ast-builder/block-splitter recognition extension) or a LARGE parser change? **If BOUNDED → proceed with full Phase 2. If LARGE → land Phase 1 (the bridge subsection, independent) + report the parse-gap sizing + STOP Phase 2 for a separate dispatch.** Don't force a large parser change into this dispatch. Commit the survey to `$WORKTREE_ROOT/docs/changes/s52-authority-completion-2026-06-14/progress.md`.

# PHASE 1 — §52↔§38 P1 bridge SPEC subsection (SPEC-text only; do this regardless of Phase 0)
Per the Q3 debate (P1 won): add a NEW normative subsection documenting the **canonical server-write→client fan-out as a COMPOSITION** — a server function that (1) writes the §52 store via `?{}` (the dev-owned persist, Q1=C) AND (2) explicitly calls `broadcast(...)` (§38.6) to fan the delta out to the channel topic's subscribers. **§52 does NOT auto-fan-out. There is NO `broadcast=` attribute and NO server-held reactive-store runtime in v1** (P2/P3 were rejected — record the reconsideration conditions from the design-insight as a note). The "bridge" is the developer calling both, in one server fn. Use the MMORPG DD's Approach W-A `worldTick()` as the canonical worked example (server `?{}` UPDATE loop + one batched `broadcast()` per tick — the Colyseus patchRate shape). Place it where it reads best (a new §52.x "Interaction with §38 Channels — Server-Initiated Fan-Out" subsection is the natural home; add a reciprocal §38 cross-ref line). NO new §34 code, NO new attribute, NO codegen — it documents existing primitives. Regen SPEC-INDEX: `bun --cwd "$WORKTREE_ROOT" run scripts/regen-spec-index.ts`.

# PHASE 2 — Tier-1 read-authority codegen (GATED on Phase 0 = BOUNDED)
1. **Parse-gap fix:** make the canonical §52.3.5 body-field-list shape (`< Card …> id: number  title: string </>`, colon AND paren body forms) produce a `state-constructor-def` node (not html-fragment).
2. **`SELECT *` auto-load on mount** for Tier-1 `< Type authority="server" table=>` instances (`< Type> @var`) — mirror the Tier-2 load path (`emit-sync.ts emitInitialLoad` + the `/__mountHydrate` synthetic route shape) against `table=` (§52.6.1: "For Tier 1 types with `table=`, the compiler generates a `SELECT *` from the table").
3. **SSR pre-render** for Tier-1 server-authoritative instances (§52.8).
4. **W-AUTH-002 now fires on canonical body-field shapes** (falls out of #1 — verify it fires on both colon and paren body forms; the warning's residual-gap message may need narrowing once real read-authority lands). The WRITE stays the dev's `?{}` (Q1=C) — emit NO write route.
5. Update `g-tier1-read-authority-codegen` (status → resolved or narrowed, per what lands) + state.ts regen if gap tokens change.
6. Tests coupled (S113) — one logical unit; commit together.

# PHASE 3 — R26 EMPIRICAL VERIFY (MANDATORY — S138; do NOT mark DONE without it)
- Phase 1: SPEC-INDEX regen clean; the new subsection's worked example is well-formed.
- Phase 2 (if landed): compile a canonical Tier-1 reproducer (`< Card authority="server" table="cards"> id: number  title: string </>` + `< Card> @cards`, BODY-field colon form — the exact shape that didn't fire before) via `bun "$WORKTREE_ROOT"/compiler/bin/scrml.js compile`; confirm W-AUTH-002 fires on the colon body form AND the SELECT* load IIFE emits; `node --check` exit 0 on emitted JS. Pre-commit subset `bun test compiler/tests/{unit,integration,conformance}` GREEN.

# Commit discipline (S83)
After EVERY edit: `git -C "$WORKTREE_ROOT" diff`, `git add`, commit IMMEDIATELY (WIP fine; don't batch). Before DONE: `git status` clean. First commit message includes verbatim startup `pwd`: `WIP(s52): start at <pwd>`. Append to progress.md per step.

# Report back
WORKTREE_PATH · FINAL_SHA · FILES_TOUCHED · Phase-0 parse-gap sizing (BOUNDED/LARGE) + whether Phase 2 landed or split · the bridge subsection's § number + placement · R26 results · deferred items · maps feedback line.

---
**Dispatch metadata:** agentId `a5e714318cd1350b2` · isolation:worktree (base `fdcd7fcc`) · model opus · run_in_background · dispatched S194 2026-06-14.
