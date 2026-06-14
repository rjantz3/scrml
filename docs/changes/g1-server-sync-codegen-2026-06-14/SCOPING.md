# SCOPING — G1: §52 server-sync codegen (the no-op write-back)

**Change-id:** `g1-server-sync-codegen-2026-06-14`
**Gap:** `g-server-sync-codegen-noop` (HIGH) — `docs/known-gaps.md`
**Status:** SCOPING (not dispatch-ready — see §6 Decisions-needed)
**Author:** PA, S194. Surveyed against ground-truth source + SPEC §52 (normative, read in full).
**Authority:** SPEC §52 (§52.6 sync-infra contract); MMORPG DD `scrml-support/docs/deep-dives/flux-mmorpg-architecture-2026-06-14.md` (G1/G2).

---

## 1. The gap, precisely (source-cited)

§52.6.2 normatively requires: on assignment to a server-authoritative cell, the compiler generates
"(1) immediate local update; (2) **a generated server route receives the new value and persists it**;
(3) optimistic UI." Today:

| §52.6 piece | Status | Where |
|---|---|---|
| §52.6.1 Initial Load (read) | **WORKS** | `emit-sync.ts:emitInitialLoad` + `emitUnifiedMountHydrate`; the `/__mountHydrate` synthetic server route (`emit-server.ts:1540-1580`) |
| §52.6.2 client-side optimistic local set | **WORKS** | `emit-sync.ts:emitOptimisticUpdate` (reactive subscriber) |
| §52.6.2 **the server write route + persist** | **NO-OP** | `emit-sync.ts:145-156 emitServerSyncStub` → `console.warn`; the `POST /_scrml/sync/<var>` route + handler are **never generated** |
| §52.6.3 client-side rollback | **WORKS** | `emit-sync.ts:emitOptimisticUpdate` try/catch restore |
| §52.6.4 re-fetch on success | not done (spec says MAY — optional) | — |
| **Tier-1 (`<Type authority="server" table=>`) sync codegen — ENTIRELY** | **ABSENT** | `collect.ts` has only `collectServerVarDecls` (Tier-2 `<x server>`); no Tier-1 collector. emit-sync.ts header: *"Only Tier 2 ... implemented here. Tier 1 ... requires server route generation and is a follow-up task."* |

**Net:** reads hydrate; client-side optimistic + rollback work; **writes never reach the server.** Tier-1
type-authority has its E-AUTH validation (E-AUTH-001..004 fire) but **zero sync codegen**.

## 2. The depth-of-survey discount — the plumbing is proven

The DD framed G1 as "Tier-1 server-route generation **unstarted**," which reads as new infrastructure.
It is not: the **synthetic-route machinery already exists and is proven**. `/__mountHydrate` is a
compiler-generated `export const _scrml_route___mountHydrate = { path, method:"POST", handler }` whose
handler awaits loaders and returns keyed JSON (`emit-server.ts:1545-1580`). The write-back route is the
**symmetric write-side** of that exact pattern: `export const _scrml_route___sync_<var> = { path:
"/_scrml/sync/<var>", method:"POST", handler }` whose handler reads the request body and runs a `?{}`
persist. Server functions already do client-POST → handler → `?{}` → SQLite end-to-end. **The plumbing
is a symmetric extension, not new infrastructure.** What is genuinely hard is the **semantics** (§3), not
the wiring.

## 3. The spec-design forks — why this is NOT dispatch-ready as a pure impl task (Rule 4)

§52 mandates "the route persists it" but **does not define what `persist` means** for the real cases.
Per pa.md Rule 4 (spec silent/ambiguous → surface, don't paper over), these gate a fix brief:

- **F-A — Tier-1 collection-cell persist algorithm (the load-bearing one).** §52.3.3/§52.6.2 say
  "auto-generated INSERT/UPDATE against `table=`" but give **no diff algorithm**. For
  `@cards = [...@cards, newCard]` against `table="cards"`, the write route must choose: **(a)** full-table
  replace (`DELETE *` + bulk INSERT — simple, lossy on concurrent writers), **(b)** row-diff +
  per-row UPSERT/DELETE (needs a PK + a client→server diff), or **(c)** authority-is-read-only-here: the
  auto-route does NOT persist; the dev's own server-fn `?{}` is the write path and §52 only generates the
  load + optimistic-local + rollback. **The spec's own kanban example (§52.4.5) is internally ambiguous**
  on this — `createCard` does the explicit `INSERT`, then `@cards = [...]` is labelled "server write
  (auto-generated)," which would *redundantly* re-persist. Needs a ruling.
- **F-B — Tier-2 scalar persist target.** `<count server> = 0` has no table. Where does "persists it"
  write — a synthetic KV table, or a **required dev-supplied write fn** symmetric to the §52.6.5 load
  convention? Spec-silent (SPEC-ISSUE-026-adjacent). Needs a ruling.
- **F-C — the §52↔§38 bridge (G2), and a topology mismatch the DD glossed.** §52 models
  **client-write → server-persist → optional re-fetch**. The MMORPG shared world is **server-write
  (the per-tick flux re-roll) → push to clients** — that is the §38-channel-broadcast / SSE topology,
  NOT §52 optimistic-update. The DD's Q3 says "targets §52 Tier-1," but its own Q1 Approach W-A is a
  server-held buffer + per-tick `UPDATE` + `broadcast()` — i.e. §38 + a server tick, not §52 client-write.
  **Closing G1 alone does NOT unblock the MMORPG**; the MMORPG needs the **server-write→broadcast bridge
  (G2)**, which §52 does not spec at all. G2 is a spec-design item *before* it is an impl item.

## 4. Corpus reality (low regression risk, near-greenfield)

`<x server>` Tier-2: **2 corpus files.** `authority="server"` Tier-1: **1 corpus file.** Almost nothing to
break or migrate — room to define semantics cleanly. Per Rule 2 the thin corpus is NOT a reason to drop
the feature (the MMORPG + every future server-state app needs it); it IS a reason the persist-semantics
ruling can be made on first principles rather than corpus-compat.

## 5. Candidate decomposition (after the §3 forks are ruled)

- **Phase 0 — design ruling / micro-DD** on F-A + F-B (+ decide whether F-C/G2 is in this arc or its own).
  *This is the gating step; everything below is blocked on it.*
- **Phase 1 — Tier-2 write-back route** (the narrowest spec-defined slice once F-B is ruled): replace
  `emitServerSyncStub` with a real `_scrml_server_sync_<var>` client fetch + a synthetic
  `POST /_scrml/sync/<var>` server route (symmetric to `/__mountHydrate`) that persists per the F-B ruling.
- **Phase 2 — Tier-1 type-authority codegen**: a `collectServerAuthorityTypes` collector + initial-load
  (`SELECT *` from `table=`) + the write route per the F-A ruling. The bigger half.
- **Phase 3 (MMORPG-gating, separate from "close the HIGH") — the §52↔§38 G2 bridge**: spec + emit the
  server-write→`broadcast()` fan-out. Likely its own SPEC amendment + change-id; depends on F-C.
- Each phase: R26 empirical verify on real `.scrml` (S138 doctrine — HIGH codegen fix).

**Two distinct goals to keep separate:** "close the HIGH gap honestly" (Phases 1-2, spec-faithful §52.6)
vs "unblock the Flux MMORPG" (additionally needs Phase 3 / G2, a server-push topology §52 doesn't model).

## 6. Decisions needed before a fix dispatch (the asks)

1. **F-A** — Tier-1 collection persist: full-replace / row-diff-upsert / read-authority-only-dev-writes?
2. **F-B** — Tier-2 scalar persist: synthetic KV table / required dev write-fn convention?
3. **F-C / scope** — Is this arc "close the HIGH (Phases 1-2, spec-faithful §52.6)" OR "drive toward the
   MMORPG (also Phase 3 / G2 server-push bridge)"? G2 needs a SPEC design pass first.
4. **Sequence vs the 2B-vs-2C engine debate** — the MMORPG world-cell shape (one big server cell vs
   per-entity engine instances) interacts with what G1 must persist; ruling F-A in MMORPG terms may
   want the engine-model decided first.

PA recommendation: rule F-A/F-B (or greenlight a focused design-dive on §52.6 persist-semantics + the
§52↔§38 boundary) **before** any fix dispatch — the impl is a symmetric-route extension once the
semantics are fixed, but authoring a brief now would mean inventing the persist algorithm the spec omits.

> **Disposition (S194):** user ruled **(c)** — design-dive the persist semantics first. Commissioned
> `scrml-deep-dive` → `scrml-support/docs/deep-dives/server-state-persist-semantics-2026-06-14.md`
> (Q0 coherent-model + Q1/F-A + Q2/F-B + Q3/F-C). **RULINGS RATIFIED S194 — see §8.** The fix-phase
> decomposition (§5) is RE-SCOPED by the rulings: there is no auto-persist route to build (the stub is
> DELETED, not wired). Q3 routed to `debate-curator` (P1 vs P2).

## 7. Empirical verification (S194 — dog-food against current baseline, S138 verify-before-claim)

Compiled minimal real `.scrml` for both tiers against HEAD `46377508`. The SCOPING claims reproduce, plus
two sharper impl-prep findings:

- **Tier-2 (`<clicks server> = 0`):** emits the literal `console.warn("scrml: server sync stub …")`
  (`tier2.client.js:14-16`) + the optimistic subscriber that `await`s it; W-AUTH-001 fires. **No
  `.server.js` is emitted at all** (no server fns in the file).
- **Tier-1 (`< Task authority="server" table="tasks">` + `< Task> @tasks` + `@tasks = [...]`):**
  compiles **CLEAN** (only the SPA-inferred info lint) and emits **ZERO sync infrastructure** — no load,
  no write route, no optimistic update, no diagnostic. **Tier-1 is a SILENT no-op** — the authority+table
  contract is ignored with no signal, *worse* than Tier-2's stub+W-AUTH-001. (A dev declares server
  authority and silently gets a client-local app.)

**Two impl-prep findings for the fix phase (fold into the post-ruling brief):**
1. **Tier-1 needs an interim honesty diagnostic** (a W-AUTH-class warning that the authority contract is
   not yet honored) — at minimum, BEFORE the full persist codegen lands, so the silent-no-op surfaces.
   Mirrors the Tier-2 W-AUTH-001 + console.warn scaffold pattern.
2. **The server-file emission gate must fire on server-authoritative cells.** Today `generateServerJs`
   early-returns `""` when `serverFns.length === 0 && … && !_needsMountHydrate` (`emit-server.ts:526-533`).
   A Tier-2 server cell with a write but no server fns produces NO server file — so the sync route has
   nowhere to live. The gate must add a `hasServerAuthorityCells` condition.

(Reproducer note, S138/declaration-form: the first Tier-1 attempt used `<Task …>` (no space) → parsed as
a PascalCase component markup tag, BS `E-CTX-001` mismatch — NOT a bug. §52.3.1 EBNF is `"<" ws TypeName`;
the canonical state-type-decl needs the leading space `< Task …>`. Corrected reproducer compiles.)

## 8. RATIFIED disposition (S194) — the model + the re-scoped fix + the SPEC amendments

User ratified **Q1=C / Q2=WF** (user-voice S194: *"ratify C/WF, commission the Q3 debate"*). The axiom:

> **§52 is a read-authority + reactive-wiring layer (load + SSR + E-AUTH leak-guard + optimistic-local +
> rollback). The DEVELOPER owns the persist write (an explicit `?{}` server fn) at BOTH tiers. §52 does
> NOT auto-persist.** Evidence: one-sided — corpus + every spec example + the founding debate + all 9
> prior-art systems already do this; §52's own §52.4.5 flagship double-writes; the one adopter
> (`18-state-authority.scrml`) documents the auto-write doesn't exist.

### Re-scoped fix phases (supersedes §5 for Q1=C/Q2=WF)
- `emitServerSyncStub` (`emit-sync.ts:145`) is **DELETED, not wired** — there is no auto-persist route to
  build. The optimistic subscriber's `_scrml_server_sync_<var>(next)` call is **removed** (the dev's `?{}`
  already persisted; the assignment lands the re-fetched result).
- **Phase 1 (Tier-2):** keep `emitInitialLoad` + `emitOptimisticUpdate` (local-set + rollback) MINUS the
  sync-stub call; wire the §52.6.5 **load** convention + the NEW symmetric **write** convention (Q2=WF);
  extend W-AUTH-001 to name a missing write path.
- **Phase 2 (Tier-1):** add a `collectServerAuthorityTypes` collector + initial-load (`SELECT *` from
  `table=`) + optimistic-local + rollback + SSR pre-render. NO write route (dev owns `?{}`).
- **Fold in the §7 honesty findings:** (1) interim Tier-1 warning (currently a SILENT no-op); (2) the
  server-file emission gate must fire on server-authority cells (today early-returns empty w/o server fns).
- Each phase: R26 empirical verify (S138). The fix is INDEPENDENT of the Q3 debate (Q3 = server→client
  push direction; this is the client-write direction) — can proceed in parallel.

### SPEC-amendment directions (ratified S194 — for the SPEC-author dispatch; pa.md amendment-direction rule)
1. **§52.6.2 — RETRACT auto-persist.** Direction: assignment generates immediate-local + optimistic-local
   + rollback ONLY; the persist verb is the dev's explicit `?{}` server fn. Remove "a generated server
   route receives the new value and persists it." **Migration target: ZERO corpus** (the 1 file does C);
   fix the §52.4.5 `// …auto-generated` comment → `// optimistic-local; the write was createCard()'s INSERT`;
   §52.5 summary "Sync Generated" column for server rows → "Load + optimistic-local + rollback".
2. **§52.6.5 — ADD a symmetric WRITE convention** (mirror of the existing Pattern A/B load convention) for
   Tier-2. Migration target: ZERO corpus; the §52.4.3 `<count server>=0` example gains a paired write fn.
3. **§52.12 SPEC-ISSUE-026 — RESOLVE** as a consequence: partial-authority assignments always get
   optimistic-local; persist is whatever `?{}` the dev's fn ran. No special compiler handling.
4. **NEW §52↔§38 bridge subsection — DEFERRED to the Q3 debate** (P1 = document the composition / P2 =
   `broadcast=` attribute + server-reactive-store runtime). §52 is SILENT on server-push today.

### Q3 status — RESOLVED S194
Debate ran (`debate-curator` → `debate-judge`): **P1 wins 50 vs 38.5** — explicit `broadcast()` composition; keep §52/§38 sharp; NO `broadcast=` attribute / server-reactive-store for v1. Insight recorded to `~/.claude/design-insights.md`. The §52↔§38 bridge subsection (document the composition as canonical) is a SEPARATE, later amendment — NOT in the G1 landing.

## 9. LANDING (S194) — what shipped
Dispatch `scrml-js-codegen-engineer` (worktree base `46377508`, FINAL_SHA `0f8316e9`) → PA file-delta landed S194.
- **Shipped + PA-verified:** SPEC retraction (§52.6.2/.3/.4 reworded + NEW §52.6.6 dev-write-fn convention + SPEC-ISSUE-026 resolved + cross-refs §2088/§5440/§8.10/§8.11/§52.1/.3/.5/.7/.9/.10 reconciled, Rule-4-coherent) · codegen deletion of `emitServerSyncStub` + `emitOptimisticUpdate` (PA-independent R26: 0 files with stub / `_scrml_server_sync_` / rollback; `node --check` clean) · inverted tests (S113 coupled) · `g-server-sync-codegen-noop` RESOLVED (reframed via Q1=C — no auto-persist route to build).
- **Phase-0 disposition: (i)** — `emitOptimisticUpdate` DELETED entirely (source-derived: the subscriber only ever wrapped the deleted sync route; §52 = load + SSR + E-AUTH).
- **Split to follow-on `g-tier1-read-authority-codegen` (MED):** Tier-1 `SELECT *` auto-load + SSR (an ergonomic, not a blocker — dev `on mount` works) + the **W-AUTH-002 canonical-shape coverage gap PA-R26 caught**: the interim warning fires only on the non-canonical opener-attr shape, NOT on canonical §52.3.5 body-field forms (the colon-field-parses-as-html-fragment parse gap = the follow-on's first task). W-AUTH-002 kept as the documented scaffold per user ruling S194.
