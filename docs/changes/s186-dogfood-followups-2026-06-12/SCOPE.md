# SCOPE — S186 dog-food follow-up fixes (the 4 findings NOT in `channel-codegen-fixes-2026-06-12`)

**Session:** S186. **Source:** S186 channels §38 + schema §39 + components §15/16 dog-food sweep.
**In-flight separately:** `channel-codegen-fixes-2026-06-12` covers `g-channel-reconnect-bare-int` (LOW) + `g-channel-handler-wiring` (MED). This SCOPE covers the OTHER 4.

**Status:** SCOPED (Tier-2 prep, S180); NOT yet dispatched or authorized. Per-dispatch BRIEF + change-dir authored when each fires (after the channel fix lands + user picks next).

---

## Recommended decomposition (3 work items)

| # | Fix | Gap | Sev | Shape | Dispatch grouping |
|---|---|---|---|---|---|
| 1 | schemaFor → PA table-source recognition | `g-schemafor-pa-unrecognized` | MED | compiler (protect-analyzer) | **Dispatch A** (standalone — distinct stage + clear locus) |
| 2 | channel `topic=@var` forward-ref hoist | `g-channel-topic-forward-ref` | LOW | compiler (type-system visitAttr) | **Dispatch B** (cell-registration pair — Phase-0 confirms 1-root-or-2) |
| 3 | markup-const consumes following cell decl | `g-markup-const-consumes-cell-decl` | LOW | compiler (ast-builder parse) | **Dispatch B** (same pair) |
| 4 | SPEC §38.9 stale error-code table | `g-channel-spec-38-9-stale` | LOW | SPEC doc only | **PA-direct** (no dispatch; fold into a landing) |

Rationale for grouping #2+#3: both produce the identical `"@@cell" misleading-E-SCOPE-001` tell — the same family as the S185-resolved validator-inline-colon cascade ("cell registration silently corrupted → wrong E-SCOPE-001 on the cell"). A Phase-0 survey should determine whether they share a single cell-registration/scope-resolution root (one fix) or are two distinct seams (TS-pass ordering vs ast-builder parse). Don't pre-couple the fix; do co-investigate.

---

## Fix 1 — `g-schemafor-pa-unrecognized` (MED) — Dispatch A

**Locus pinned:** `compiler/src/protect-analyzer.ts` `extractSchemaCreateTableStatements` (line ~471) + its `collectSchemaBodyText` (line ~474). PA harvests table-definition sources from three places (live DB file > `?{}` CREATE TABLE > literal `<schema>` DDL). `collectSchemaBodyText` collects ONLY `kind:"text"` children of the `<schema>` node and runs `parseSchemaBlock(body)`. A `${ schemaFor(Driver) }` is an INTERPOLATION/logic node, not a `text` child → `body` is empty → `parseSchemaBlock` yields no tables → the schemaFor table is never harvested → E-PA-002 fires (line ~585). (The comment at line ~505 already anticipates "schemaFor-style synthesized tables" but the interpolation is never reached.)

**Fix direction:** in `extractSchemaCreateTableStatements`, ALSO detect a `${ schemaFor(StructType) }` interpolation child of the `<schema>` node; resolve the struct's `type X:struct` decl from the AST `nodes` (the type-decl IS an AST node — no need for the resolved type registry); compute the §41.15.2 pluralized table name + columns from the struct fields; synthesize a CREATE TABLE for the harvest map (key = lowercased table name).

**De-risk (Phase-0):**
- (a) Is the struct field info usable at PA stage? PA runs early (pre-TS). The `type X:struct` decl is an AST node, so its fields are readable WITHOUT resolved types — but field-TYPE→SQL-column lowering (the `schemaFor` column rules, §41.15) lives in `compiler/src/codegen/emit-schema-for.ts`. **The likely refactor:** extract emit-schema-for's struct-field→ColumnDef mapping into a shared helper callable from PA (so PA + codegen agree on the generated DDL). Confirm this is feasible without dragging codegen deps into the PA stage.
- (b) `pluralizeStructName` (`emit-schema-for.ts:180`) is the canonical table-name rule — reuse it, don't re-derive.
- (c) `pick=`/`omit=` field-set transforms on `schemaFor` (§41.15) — handle or explicitly defer (the PA harvest only needs the table to EXIST; column-exactness matters less for E-PA-002 than presence — but a wrong column set would mis-type rows downstream; decide scope).

**Repros:** `/tmp/df-schema/schemafor.scrml` + `sf2.scrml` (E-PA-002, no db file) vs `schema2.scrml` (literal `<schema>`, clean). **Verify:** `<schema> ${ schemaFor(Driver) } </>` with no db file compiles clean (no E-PA-002); a `?{}` query against the schemaFor table types correctly; literal `<schema>` path unchanged.

---

## Fix 2 — `g-channel-topic-forward-ref` (LOW) — Dispatch B

**Locus (needs Phase-0 to pin mechanism):** `compiler/src/type-system.ts` `visitAttr` (line ~10393). The channel `topic=@selectedRoom` attribute value parses as a `variable-ref`; the scope-check (`scopeChain.lookup(baseName)`, line ~10437) fails when `@selectedRoom` is declared AFTER the channel in source order (forward-ref). Two unknowns the survey must pin: (i) the `@@selectedRoom` suggestion means `baseName` retains the leading `@` on the failing path — yet a working `@var` attr (declared-before, or cross-file `@onlineCount`) resolves, so there are two code paths or an @-strip that only runs in one; (ii) why a forward `@`-ref doesn't hoist for channel attrs when §6.9 hoisting makes forward `@`-reads legal elsewhere.

**Fix direction:** ensure the channel-attribute `@`-ref scope-check resolves against the FULL file-scope-hoisted cell set (run after all cells register, or route channel-attr `@var` through the same hoisted-reactive-read resolution other `@`-reads use). Likely shares the "channel attrs routed through generic `visitAttr`" theme with Fix 1 of the in-flight dispatch (reconnect) — but a DISTINCT mechanism (@-ref hoisting vs bare-numeric rejection); do NOT assume the reconnect fix touches this.

**Repros:** `/tmp/df-channels/x-topic-A.scrml` (cell after channel → E-SCOPE-001) vs `x-topic-B.scrml` / `x-topic2.scrml` (cell before → clean). **Verify:** `topic=@var` resolves regardless of declaration order; declared-before path unchanged; likely-sibling channel `@`-attrs (verify which) also resolve forward.

---

## Fix 3 — `g-markup-const-consumes-cell-decl` (LOW) — Dispatch B

**Locus (needs Phase-0 to pin):** `compiler/src/ast-builder.js` `parseLogicBody` + the Form-2 `const Name = <markup>` RHS-boundary detection (`isComponentDefHeader` ~line 502 / `liftBareDeclarations` ~842) — and/or `compiler/src/block-splitter.js` markup-block boundary. Inside a `${}` logic block, a markup-typed `const X = <markup>...</markup>` body parse does not terminate at its closing tag before a following V5-strict `<cell> = init` sibling decl — it consumes the cell decl as markup continuation, so the cell never registers → later `@cell` fires E-SCOPE-001 (`@@cell` tell).

**Fix direction:** the markup-typed-const RHS parse must terminate the markup value at its matched closing tag and treat a following `<cell> = init` as a separate sibling structural decl (registering it). Order-dependent: cell-FIRST works; const-FIRST-then-cell breaks.

**Repros:** `/tmp/df-sweep/c5.scrml` (const-then-cell → fails) vs `c6.scrml` (cell-then-const → clean) + `c4.scrml` (bare top-level → clean). **Verify:** `${ const G = <markup>; <name> = init }` registers `@name`; cell-first + bare-top-level paths unchanged; a real markup-const body with nested tags still parses correctly (no premature termination).

---

## Fix 4 — `g-channel-spec-38-9-stale` (LOW) — PA-direct SPEC doc

**Locus:** `compiler/SPEC.md` §38.9 error-code table (+ §38.3.1). NO compiler change.

**Edits:** (a) §38.9 table — retire the `E-CHANNEL-INSIDE-PROGRAM` row (the v0.3 reversal made it canonical, §38.1/§38.4.1), add `E-CHANNEL-OUTSIDE-PROGRAM` + `E-CHANNEL-INSIDE-PAGE` rows. (b) §38.3.1 — make the `channel-reconnect` worked examples consistent with §38.2's bare `reconnect=2000` (bundle with Fix 1-of-the-in-flight-dispatch's reconnect-form disposition: once bare is accepted, show bare or note both-accepted). (c) optional: PRIMER §13.7 B19-specifics note that the pre-v0.3 walker prose is historically-frozen. Regenerate SPEC-INDEX (`bun run scripts/regen-spec-index.ts`) + footer count after the table edit.

**No verify beyond SPEC-INDEX regen** (doc-only). Fold into whichever landing is convenient (e.g. the channel-codegen-fixes landing, since it's the same §38 surface).

---

## Cross-cutting note for Dispatch B (the cell-registration family)

Fixes 2 + 3 (+ the S185-resolved validator-inline-colon) all share the symptom **"a cell that should be registered isn't → a misleading `E-SCOPE-001`/`@@cell` on the cell rather than at the real fault."** Worth the Dispatch-B Phase-0 asking: is there a single cell-registration/scope-resolution seam where a better invariant (every `<cell>=init` registers; an unresolved `@`-ref distinguishes "never declared" from "declared-but-mis-scoped") would close the whole family? If yes, that's the Rule-3 right answer over three point-patches. If the roots are genuinely disjoint (TS ordering vs ast-builder parse), do the two point fixes.
