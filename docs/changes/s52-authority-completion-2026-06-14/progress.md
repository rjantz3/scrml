# Progress — s52-authority-completion-2026-06-14

Two coupled §52 completions: (1) the §52↔§38 P1 bridge SPEC subsection; (2) the
Tier-1 read-authority codegen follow-on (gated on a Phase-0 parse-gap survey).

## 2026-06-14 — Startup
- WORKTREE_ROOT = /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a5e714318cd1350b2
- Base HEAD fdcd7fcc (G1 landing) verified; tree clean; bun install + pretest OK.
- Maps read (primary.map.md). Watermark 0cafe665 (PRE-G1) — stale on my files; verified against current source.

## 2026-06-14 — PHASE 0: Tier-1 colon-field parse-gap survey → VERDICT: BOUNDED
Empirically probed the parse path (splitBlocks + buildAST) for three Tier-1 shapes:

| Shape | Block-splitter | AST builder | W-AUTH-002 |
|---|---|---|---|
| `< Card authority= table=> id: number ... </>` (colon body, CANONICAL §52.3.5) | `type="state"` block, body = ONE `text` child (raw `id: number\ntitle: string`) | `kind="state"` (instantiation!) + `text` child | does NOT fire |
| `< Card authority= table=> id(int) ... </>` (paren body) | same `type="state"` + `text` child | `kind="state"` + `text` child | does NOT fire |
| `< Card authority= table= id(int) title(string)>` (opener-attr contrivance) | `type="state"` + typed opener attrs | `kind="state-constructor-def"` (typedAttrs) | FIRES |

Root cause: `state-constructor-def` is produced ONLY when `hasTypedDecls===true`, and
`hasTypedDecls` comes from `parseTypedAttributes(attrTokens)` where `attrTokens =
tokenizeAttributes(block.raw, "state")` — i.e. the OPENER attrs only. The BODY field-list
(captured as a single raw `text` child by the block-splitter) is never inspected for typed
declarations. Even a PLAIN (non-authority) `< Card> id: number </>` parses as `kind="state"`,
not a constructor-def. So the §52.3.5 canonical colon-body shape has NEVER produced a
constructor-def node — W-AUTH-002 (which keys off `authority=`/`table=` in opener `attrs`,
present on all three shapes) can only fire when the node IS a constructor-def, which only the
opener-attr contrivance achieves.

### Sizing → BOUNDED (localized ast-builder recognition extension)
- Block-splitter ALREADY classifies `< Card ...>` correctly as `type="state"` and captures
  the body field-list as raw `text` child(ren). No BS change needed.
- Tokenizer untouched (no new token kinds).
- Fix locus: `ast-builder.js` `case "state"` (~line 14256). When the state block's children are
  a body-field-list (text matching `ident : type` / `ident ( type )` per line, no real
  markup/logic children), parse them into `typedAttrs` (reuse `parsePropsBlock` colon-form +
  add paren-form), set `hasTypedDecls=true`, merge with opener typedAttrs → emits
  `state-constructor-def`. Reusable `parsePropsBlock(raw, span, errors)` already parses the
  colon `name: type` form.
- → Proceed with FULL Phase 2 (parse-gap fix + SELECT* auto-load + SSR + W-AUTH-002 coverage).

## 2026-06-14 — PHASE 1: §52↔§38 P1 bridge SPEC subsection — DONE
- Added `#### 52.6.7 Interaction with §38 Channels — Server-Initiated Fan-Out` (SPEC.md, placed at the
  END of the §52.6 sync-infrastructure family, before §52.7). Chose §52.6.7 over a new §52.7-level
  subsection to avoid renumbering §52.7-§52.14 (59 cross-refs). Documents the P1 composition: server fn
  writes the §52 store via `?{}` (Q1=C dev-owned persist) AND explicitly calls `broadcast()` (§38.6).
  §52 does NOT auto-fan-out; NO `broadcast=` attribute; NO server-held reactive-store runtime in v1.
  Canonical worked example = the MMORPG DD's Approach W-A `worldTick()` (per-tick `?{}` UPDATE loop +
  ONE batched `broadcast()` — Colyseus patchRate). P2/P3 rejection + the 3 reconsideration conditions
  recorded as an in-subsection note (from the design-insight verbatim).
- Reciprocal §38.6 cross-ref bullet added (after "broadcast(data) SHALL publish ...").
- SPEC-INDEX regenerated (bun scripts/regen-spec-index.ts) — §52 row 28641-29421→28642-29516 (875);
  22 downstream offset rows shifted. Clean.
- Well-formedness check: the worked example uses the CANONICAL §52.3.5 body-field shape, so it currently
  hits the Phase-0 parse gap (E-CTX-001/003 — `< World> idx: int` parses as html-fragment). It is
  well-formed scrml per the grammar; it compiles clean AFTER the Phase-2 parse-gap fix. Re-verified post-Phase-2.

## 2026-06-14 — PHASE 2 RE-SIZED TO LARGE → STOP/SPLIT (Phase 0 verdict CORRECTED)
The initial Phase-0 BOUNDED verdict held ONLY for the markup-context shape. Deeper empirical probing
during Phase 2 implementation revealed the FULL parse-gap fix is LARGE, for TWO compounding reasons:

1. **Two distinct loci; the canonical one is LARGE.** A localized `ast-builder.js` `case "state"`
   body-field-list recognizer DID work for state-type-decls in PROGRAM-MARKUP context (direct `<program>`
   child) — colon + paren body forms produced `state-constructor-def` + fired W-AUTH-002 (probe-verified).
   BUT the CANONICAL SPEC §52.3.5 shape wraps the type-decl in `${...}` alongside functions. Inside a
   `${...}` logic block the state-type-decl is captured by BS as a raw `text` child, then re-parsed by
   `parseLogicBody` into an `html-fragment` for ALL field forms (colon, paren, AND the opener-attr
   contrivance — even `< Card ... id(int) title(string)>` inside `${...}` yields html-fragment, never a
   constructor-def). Recognizing a state-TYPE-decl in-logic requires extending `scanStructuralDeclLookahead`
   (560-line lookahead scanner, today reactive-decl/Variant-C-compound ONLY) with a new state-type-decl
   production. That is a LARGE parser change.

2. **Syntax collision with §54.2 substates (the real blocker).** `< Name> field: type </>` is ALSO the
   §54.2 nested-substate shape. `compiler/tests/unit/substate-tagging.test.js` has LOCKED tests asserting a
   body-field-bearing state block stays `kind:"state"` (a substate), NOT `state-constructor-def`. The naive
   `case "state"` recognizer regressed ALL 4 substate tests (`< Submission> id: string </>` MUST stay
   `kind:state` per §54.2; my fix made it a constructor-def). The same `< Name> field: type </>` surface is
   shared by §52.3.5 type-decls, §54.2 substates, AND §35.2 state-constructors — disambiguating them needs a
   DESIGN ruling (authority=/table= presence? nesting? a keyword?), not a localized recognizer.

DECISION (STOP/SPLIT gate + Rule 3): Phase 2 ast-builder change REVERTED (it broke §54.2; never committed).
Phase 1 (the §52.6.7 bridge subsection — independent) LANDED. Phase 2 (the parse-gap fix + SELECT*/SSR
codegen) STOPPED for a separate dispatch, gated on the §52/§54/§35.2 disambiguation design ruling.
Gap entry `g-tier1-read-authority-codegen` updated with the LARGE sizing + the §54.2 collision (known-gaps.md).
substate-tagging suite RE-VERIFIED GREEN post-revert (24266 pass / 0 fail).

## 2026-06-14 — PHASE 1 worked-example refinement (post-Phase-0 finding)
Reworked the §52.6.7 worked example to documentary parity with §52.3.5:
- Wrapped the type-decl + instance + `worldTick()` in `${...}` (matches §52.3.5 canonical layout; bare
  `function` in markup context fires E-CTX).
- `worldTick()` body → a single batched server-direct `?{}` UPDATE (`... WHERE locked_by = 0`) — the
  Colyseus-patchRate shape (batch the write, broadcast once) AND server-correct (a server fn operates on
  the DB, not the client-held @cells cell, per §38.4). Avoids the E-SCOPE-001 a client-cell read would trip.
- `topic="world"` static literal (was `topic=@region`, an undeclared cell → E-SCOPE-001); a comment notes
  per-region sharding (topic=@region) is the real interest-management shape.
- VERIFIED: the example compiles CLEAN exit-0 (only W-PROGRAM-SPA-INFERRED info), same documentary status
  as §52.3.5 (whose `< Card>` type-decl is ALSO swallowed-as-html-fragment today — the silent-no-op the
  SCOPING §7 documented). The example is well-formed scrml per the grammar; it lights up fully once the
  LARGE parse-gap + Tier-1 codegen land.
