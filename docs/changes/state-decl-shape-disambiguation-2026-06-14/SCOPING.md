# SCOPING — `< Name> field: type </>` shape disambiguation (the Tier-1 read-authority blocker)

**Change-id:** `state-decl-shape-disambiguation-2026-06-14`
**Trigger:** the S194 §52-completion dispatch STOPPED Phase 2 (Tier-1 read-authority codegen) — its naive recognizer regressed the §54.2 substate locked tests; it flagged a "design ruling needed."
**Status:** SCOPING. **Finding: NOT a deep design ruling — a clean recognition gate (see §4).**
**Authority:** SPEC §52.3 (server authority), §54.2 (nested substates), §35.2 (state-constructor); `ast-builder.js` buildBlock `case "state"` + `scanStructuralDeclLookahead`.

---

## 1. The collision (precise)

The surface `< Name [attrs]> body... </>` is shared by THREE constructs:

| Locus | Shape | Current parser gate → node kind |
|---|---|---|
| **§35.2 state-constructor** | `< name id(int) title(string)>` — **paren-typed attrs in the OPENER** | `hasTypedDecls` → `kind:"state-constructor-def"` |
| **§54.2 nested substate** | `< Draft> body: string </>` — **colon field-list in the BODY**, declared INSIDE a parent state | `parentStateName` (nesting) → `kind:"state"` + `{isSubstate, parentState}` (LOCKED tests: `substate-tagging.test.js`) |
| **§52.3.5 server-authority type-decl** | `< Card authority="server" table="cards"> id: number … </>` — **colon field-list in the BODY** + `authority=`/`table=` in the opener | **no gate today** → `kind:"state"` at markup level; **`html-fragment` (unrecognized) inside `${…}`** |

**Two faces of the gap (both empirically confirmed S194):**
1. **In-logic (`${…}`) recognition gap.** The canonical §52.3.5 shape wraps the type-decl in `${…}` (per §52.3.5/§52.14 examples). The block-splitter captures `${…}` as raw text → `parseLogicBody` → **`html-fragment`** for ALL field forms (colon/paren). So the `< Card>` decl is **swallowed — no node to attach Tier-1 read-authority codegen to** (the silent no-op SCOPING-G1 §7 documented; W-AUTH-002 can't fire on it).
2. **Markup-level collision.** A `< Card> field: type </>` at program-markup level → `kind:"state"`, the SAME kind as a §54.2 substate (minus the nesting metadata). The agent's recognizer tried to flip the colon-body shape to `state-constructor-def` and **regressed the §54.2 substate tests** (which share the colon-body shape and assert `kind:"state"`).

## 2. Why the agent saw a "design ruling"

Its recognizer keyed on the **colon-body field shape** to produce a constructor node — but that shape is exactly what §54.2 substates ALSO use. Without a discriminator that's UNIQUE to §52.3.5, flipping the shape regresses §54.2. Hence "disambiguating the three is a design ruling." The survey below shows the discriminator already exists.

## 3. The discriminator already exists — `authority="server"` + `table=` (empirically clean)

- **§52.3.3 mandates it:** a state type with `authority="server"` **SHALL** specify `table=`. So a `< Name authority="server" table=…>` opener is, by SPEC, a §52.3.5 server-authority type-decl.
- **Unique to §52.3.5:** grep — 5 corpus files carry `authority="server"`, ALL §52.3.5. **Zero §54.2 substates or §35.2 constructors carry `authority=`/`table=`** (substates are variants of a state type; constructors use paren-opener-typed attrs). The discriminator does not collide.
- **Orthogonal to the existing gates:** `authority="server"` is a string-literal opener attr — distinct from §35.2's paren-typed attrs (`id(int)`) and §54.2's nesting. A new gate on it touches neither.

## 4. Recommendation — a clean recognition gate, NOT a design ruling

**For the Tier-1 read-authority codegen need (the actual blocker), gate §52.3.5 server-authority recognition on `authority="server"` + `table=` in the opener.** Bounded parser-recognition work, §54.2/§35.2 untouched:

1. **Extend the in-`${…}` scanner** (`scanStructuralDeclLookahead`) to recognize `< Name authority="server" table="…"> colon-field-list </>` and produce a server-authority-type-decl node — **gated on `authority="server"`** (so substates / local states / constructors fall through to existing behavior). This closes the html-fragment recognition gap WITHOUT a new collision.
2. **Attach the Tier-1 read-authority codegen** to the produced node (the `g-tier1-read-authority-codegen` "bigger half"): `SELECT *` auto-load on mount from `table=` + SSR pre-render (§52.6.1/§52.8) + W-AUTH-002 now fires on canonical body-field shapes. WRITE stays the dev's `?{}` (Q1=C).

**This is the depth-of-survey-discount outcome:** the "design blocker" is a recognition gate keyed on a SPEC-mandated, shape-intrinsic, corpus-unique discriminator — not a fork needing a ruling.

## 5. The genuine residual (separate, does NOT block Tier-1)

The `< Name> colon-fields </>` surface WITHOUT `authority=` is still shared by **§52.3.5-LOCAL type-decls** (top-level, `authority="local"`/omitted) vs **§54.2 substates** (nested) vs **bare states**. Today nesting (`parentStateName`) separates substates from top-level; a bare top-level `< Name> colon-fields </>` is `kind:"state"`. This broader family disambiguation:
- **Does NOT block Tier-1 read-authority codegen** — that only needs `authority="server"` (§4), which is cleanly gated. Local type-decls need no read-authority sync; substates are nested.
- Is a lower-priority cleanliness question (is a bare top-level `< Name> colon-fields </>` a local state-TYPE-decl or a state instance?) — file as a follow-on only if it surfaces real friction. Not in scope here.

## 6. Decision needed

- **Recommended:** no deep-dive / no design ruling — proceed to a **Tier-1 read-authority follow-on dispatch** (the `authority="server"`+`table=` recognition gate + the SELECT*-load/SSR codegen). This resolves `g-tier1-read-authority-codegen` + makes §52 server-authority live (not documentary).
- Alternative: if the broader `< Name> colon-fields </>` family disambiguation (§5) is wanted now, scope it separately (it's a small ruling, NOT a Tier-1 blocker).
