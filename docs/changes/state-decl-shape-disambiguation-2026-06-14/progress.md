# progress — state-decl-shape-disambiguation-2026-06-14 / g-tier1-read-authority-codegen

## 2026-06-15T04:32:35Z — Phase 0 SURVEY (startup at /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a12e4fa7a628ef192)

### Startup
- Worktree base was `fdcd7fcc` (PARENT of briefed base `fff841ca` — S112 worktree-base-staleness).
  ff-merged main → now at `fff841ca` (has the §52.6.7 bridge). bun install + pretest OK.

### Recognition sizing: BOUNDED (proceed)
Empirical probe (splitBlocks+buildAST) on the canonical reproducer:
- **Locus 1 (in-`${}`, the canonical SPEC §52.3.5 shape, THE blocker):** `< Card authority="server"
  table="cards"> id: number ... </>` → `html-fragment` (swallowed). Also `< Card> @cards` instance →
  `html-fragment`. Root: `scanStructuralDeclLookahead` DECLINES — its validator loop pushes `authority`
  as a bareword validator then hits `=` (not `>`/`>=`) → `return null` → falls to html-fragment.
- **Locus 2 (bare markup-level):** `< Card authority="server" table="cards"> fields </>` → `kind:"state"`
  with `attrs=[authority,table]` + fields in a `text` child. WITHOUT authority → `kind:"state"` empty attrs
  (the §54.2 substate-test shape, LOCKED). Discriminator at markup-level = an `attrs` entry
  `authority="server"`.

**Gate (per disambiguation SCOPING §3/§4):** `authority="server"` opener attr. SPEC §52.3.3-mandated +
table= required; unique to §52.3.5 (zero §54.2 substates / §35.2 constructors carry it). Substates /
local states / constructors fall through UNTOUCHED.

**Decision: BOUNDED scanner/recognition extension. Proceed.** Locus 1 = a new gated branch in
`tryParseStructuralDecl` recognizing the authority-opener + colon-body + `/` closer. Locus 2 = a gated
flip of the markup `kind:"state"` node (attrs carry authority="server") to the server-authority type-decl.

### Codegen surface mapped (mirror Tier-2)
- collect.ts `collectServerVarDecls` (Tier-2) → add `collectServerAuthorityTypes` sibling.
- emit-sync.ts `emitInitialLoad` (IIFE → `_scrml_reactive_set`) → mirror as a SELECT* IIFE.
- emit-server.ts mount-hydrate route (`_scrml_route___mountHydrate`, :1540) + emission gate (:526) →
  the gate must fire on server-authority type instances (G1 §7 finding #2).
- W-AUTH-002 (type-system.ts:7970) fires on `state-constructor-def` w/ authority="server" — today only the
  opener-attr (non-canonical) shape produces that node; needs to fire on the recognized canonical node, and
  narrow once read-authority lands.

SPEC read in full: §52.3 (.1 EBNF / .3 table= / .5 worked example), §52.6.1 (SELECT* on mount), §52.8 (SSR),
§52.11 (E-AUTH codes; W-AUTH-002 is NOT spec — interim type-system warning), §54.2 (locked substate shape).

## 2026-06-15T05:01:44Z — Phases 1-4 COMPLETE

### Phase 1 — Recognition gate (committed 4fc495f9 / cb-)
- ast-builder `tryParseServerAuthorityDecl` (gated on `authority="server"`):
  sub-shape T (type-decl → state-constructor-def w/ attrs+typedAttrs) +
  sub-shape I (instance `<Card> @var` → state-decl isServer+stateType+serverAuthorityTable).
  `_serverAuthorityTypes` block-local map ties instance → table.
- HARD GATE green: substate-tagging/registry/match-exhaustiveness/match-e2e (27) +
  p1e-uniform-opener/transition-decl-ast/registry + fn-constraints + p1e-name-resolver (133).
  §54.2 substates + §35.2 constructors UNTOUCHED.

### Phase 2 — Read-authority codegen (committed 16b9b469; pre-commit 24272 pass / 0 fail)
- collect.ts `collectServerAuthorityTypes` (Tier-2 collector excludes Tier-1 → disjoint).
- emit-sync `emitServerAuthorityLoad` (client SELECT* load IIFE → /__serverLoad/<var>).
- emit-reactive-wiring: per-instance Tier-1 load wired.
- emit-server: /__serverLoad/<var> route (`_scrml_sql\`SELECT * FROM <table>\``) +
  emission gate fires on server-authority cells (G1 §7 finding #2).
- type-system: W-AUTH-001 suppressed for Tier-1 instances; W-AUTH-002 NARROWED to SSR residual.
- Tests coupled (S113): tier1-authority-interim-warning rewritten (canonical body-field shape +
  SSR-residual message, 8 tests); state-authority-codegen §9 upgraded scaffold → real codegen (33 tests).

### SSR split decision
SSR pre-render (§52.8) has NO existing path to mirror (route-splitter "v1.0 polish target") —
substantial new subsystem. SPLIT to follow-on `g-tier1-ssr-prerender` (MED) per STOP/SPLIT gate.
W-AUTH-002 tracks it. The SELECT*-load core is the landed half.

### Phase 3 — R26 empirical verify (CLI, exact brief reproducer) — PASS
- decl RECOGNIZED (not html-fragment): client.js has the load.
- SELECT * FROM cards mount-load: client fetch /__serverLoad/cards + reactive_set("cards");
  server `_scrml_sql\`SELECT * FROM cards\``.
- node --check exit 0 (client + server). W-AUTH-002 narrows. No raw @./@cards sigil leak.
- each loop reads reactive_get("cards") — load populates it, effect re-renders.

### Phase 4 — gap + state
- g-tier1-read-authority-codegen NARROWED to SSR residual (S196 resolution block added).
- g-tier1-ssr-prerender NEW (MED, open) — the §52.8 SSR follow-on.
- bun scripts/state.ts --write + --check PASS (gap counts regenerated).

### Recognition sizing (Phase 0 gate answer): BOUNDED — landed in full. SSR correctly split.
