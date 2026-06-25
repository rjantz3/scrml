# SCOPE — Library-mode SQL: module-with-db-context (W5a + W5b)

**Status:** build-candidate scoped S220 (2026-06-25), not yet dispatched. **Grounding (SPEC normative):** §44.7.1 "Module-with-db-context (F-AUTH-002)" · §21.5.1 "Modifier-Carrying Exports" · §44.7 error table (E-SQL-004 / E-SQL-009). **Prior work:** S145 `library-mode-suppress-body-escalated-server-js-2026-05-30` (emission shaping). **Banked as:** dpa OQ-F1 ("`_{}` standalone / library-mode-db") — this SCOPE sharpens that stub. **First consumer:** flogence (scrml-authored tooling that wants to author its dispatch/store logic in scrml and run SQL).

## The gap (what's blocked)

A `.scrml` file compiled as a **library / pure-fn module** (§21.5 — it `export`s functions, has **no `<program>`**) cannot run `?{}` SQL today. A `?{}` needs a db-connection resolution scope; in program mode that's a `<program db="...">` ancestor; a library file has none. §44.7.1 ratifies the fix — the library declares its **own** top-level `<db src="...">` and becomes a *module-with-db-context* (the module owns its connection) — but the lowering is **staged and unbuilt**. Today a library-file `?{}` hits:
- **E-SQL-004** — `?{}` with no `db=` ancestor AND the file is not a module-with-db-context, OR
- **E-SQL-009** — `export server function` containing `?{}` in a pure-fn file without a `<db src>`, OR
- (per §44.7.1 impl-note / S145) it "does not yet emit cleanly as a plain library export."

So flogence stays on TS (bridge/digest) for its mechanical/SQL layer and its standalone `dispatch.scrml` is gated. **This is a build, not a design question — §44.7.1 is ratified.**

## Already built (do NOT re-do)
- **`--mode library`** + emission shaping (S145): a body-content-escalated fn (server-only via `?{}`/server-only-import — `escalationReasons` all `kind:"server-only-resource"`) emits as a plain server-side export, NO `.server.js` route wrapper / client fetch-stub; an explicit `export server function`/`route=` RETAINS the wrapper. Loci: `codegen/index.ts` + `emit-server.ts` + `route-inference.ts` (escalation classification).
- **§21.5.1 export-modifier parsing** (`export server function` / `export pure function`). Loci: `emit-server.ts` + `gauntlet-phase1-checks.js`.
- **`<db src>` block infra** for `<program db>` — driver classification (§44.2), connection emission (`codegen/db-driver.ts`), `?{}` resolution against an ancestor `<db>` (`route-inference.ts`). **W5b EXTENDS this to a file's OWN `<db>` — not new infra.**

## W5a — auto-detect-library
**Today:** library mode requires the explicit `--mode library` flag. **Goal:** auto-classify a `.scrml` file as a library/pure-fn module (no `<program>`, exports functions) so it compiles in library mode without the flag (and so an importing page treats it as a module-with-its-own-context). Surface: `api.js` / `codegen/index.ts` mode-determination + `module-resolver` (cross-file import classification). **Estimate ~3-6h** (a classification + threading the flag; the emission shaping it gates already exists).

## W5b — cross-file-?{}-resolve (the meat)
**Goal:** a `?{}` inside a library file resolves its db connection against the **file's own top-level `<db src>`** (module-with-db-context, §44.7.1), instead of requiring a `<program db>` ancestor. Normative requirements (§44.7.1):
- at most one top-level `<db src>` per pure-fn file; `?{}` inside resolves against its `src` (per §44.2 driver classification);
- a `<program db=>` ancestor in the **importing page SHALL NOT override** the module's own `<db>` context (the module owns its connection) — **cross-file**: when a page imports the library, the library's db context travels with the emitted server export;
- a pure-fn file with `?{}` and NO `<db>` block stays **E-SQL-009** (narrow, don't retire).

Surface: `route-inference.ts` (the db-resolution decision + E-SQL-004/009 fire — extend to recognize the file's own `<db src>` as a valid resolution scope) + `codegen/db-driver.ts` / `emit-server.ts` (emit the connection from the file's `<db>`, not an ancestor program's) + `module-resolver` (cross-file: the imported library's `<db>` context reaches its server export + the importing-page wiring). **Estimate ~10-18h** — an EXTENSION of the existing `<program db>` resolution to a file-own `<db>`, plus the cross-file travel.

## Dependencies / risk
- **No blocking dependency** — the `<db>` block parsing + driver classification + escalation infra all exist; W5b reuses them.
- **Depth-of-survey caveat (per doctrine):** mandate an implementation-time survey-first phase. The existing `<program db>` `?{}`-resolution may already be near-generic over the db-source; if so, W5b's "resolve against file-own `<db>`" is a localized extension (smaller than the estimate). Survey before accepting ~15-25h.
- **R26 + S138:** codegen-adjacent (SQL emission) → empirical R26 reproducer (a library `.scrml` with `<db src>` + `?{}`, imported by a page) mandatory before claim-closed.

## Build sub-steps (suggested dispatch shape)
1. **Survey** (1-2h): confirm the exact `?{}`-db-resolution locus + how generic it is over db-source; confirm where program-vs-library mode is determined; locate the E-SQL-004/009 fire conditions. Correct this estimate.
2. **W5a** — auto-detect-library classification + thread.
3. **W5b** — file-own `<db>` resolution + cross-file db-context travel + connection emission; narrow E-SQL-009 to the no-`<db>` case.
4. **Tests + R26** — unit (resolution) + integration (cross-file import) + a flogence-shaped `dispatch.scrml`-style R26 reproducer; full suite.
5. (Optional) notify flogence (the consumer) that scrml-authored SQL libraries are unblocked.

**Total estimate: ~15-25h (survey-first; likely less). Severity MED** (real capability gap, workaround exists [TS / app-mode]). Gap: `g-library-mode-sql-no-db-context`.
