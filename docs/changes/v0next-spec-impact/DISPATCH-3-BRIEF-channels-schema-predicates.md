# Stage 0b — Dispatch 3 Brief: Channels + Schema + Predicates + `not` keyword

**Target agent:** `scrml-dev-pipeline` (T3 tier, worktree-isolated)
**Scope:** Tiers 6-7 of `IMPACT-ASSESSMENT.md` §6 — SPEC.md §38 + §39 + §53 + §42 + relevant §34 error codes
**Output:** rewritten SPEC.md sections + updated SPEC-INDEX.md
**Authorization:** scoped to this brief; "no holds barred" carries forward from S56 deliberation phase per user re-confirmation.
**Date drafted:** 2026-05-04 (S56)
**Drafted by:** PA (this conversation)
**Depends on:** Dispatches 1 and 2 — MUST be committed and pushed before this dispatch starts. §38 channel body uses V5-strict from Dispatch 1; §39 schema additive vocabulary cross-refs §55 (Dispatch 2); §53 cross-refs §55.

---

## CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

Your worktree path is: `<ABSOLUTE-WORKTREE-PATH-FILL-AT-DISPATCH-TIME>`

### Startup verification (do this BEFORE any other tool call)

1. Run `pwd` via Bash. Output MUST equal the worktree path above. Save the
   output as your WORKTREE_ROOT for the rest of the dispatch.
2. Run `git rev-parse --show-toplevel` via Bash. Output MUST equal WORKTREE_ROOT.
3. Run `git status --short` via Bash. Confirm tree is clean.
4. Verify Dispatches 1 AND 2 have landed: run `git log --oneline | head -30` and
   confirm both spec-foundation + spec-engines-match-validators commits exist.
   If either is missing, DO NOT proceed — report and exit.

If ANY check fails: DO NOT proceed. Report the mismatch and exit.

### Path discipline (enforce on EVERY Read/Write/Edit call)

Standard pa.md F4 path discipline. See Dispatch 1/2 brief for full text.

---

## §1 What this dispatch is

Third of the 4 staged dispatches that rewrite `compiler/SPEC.md`. This dispatch covers **Channels + Schema + Predicates + `not` keyword** — the v0.next changes that finalize the secondary surfaces beyond the core state/engine/match work.

**Smaller scope** than Dispatches 1 and 2 (~5,000-8,000 line net changes vs Dispatch 2's ~14,000-25,000), but contains one MAJOR REWRITE: §38 channels move to file-level + drop `@shared` per M19. The other three sections are partial rewrites or small edits.

This dispatch CANNOT begin until Dispatches 1 and 2 have landed.

**You are NOT changing compiler source code.** Test breakage is EXPECTED.

### Sources you must read in full before any edit

1. `docs/changes/v0next-spec-impact/IMPACT-ASSESSMENT.md` — your master plan. §2 disposition table covers your scope (rows for §38, §39, §42, §53, §34 partial). §6 ordering rules.
2. `docs/changes/v0next-spec-impact/DISPATCH-1-BRIEF-foundation.md` and `DISPATCH-2-BRIEF-engines-match-validators.md` — for shape; mirror their dispatch shape and crash-recovery discipline.
3. `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md` — locks. THE relevant locks: L4 (validator vocabulary unification), L5 (`is some` clarification).
4. `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md` — moves. THE relevant move: M19 (channel shape under v0.next — file-level, drops @shared, V5-strict body).
5. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — particularly §11.3 real-time recipe (channels file-level, `<messages>` declaration, no @shared) and §6 validators (the shared-core vocabulary). Tiebreaker: kickstarter wins.
6. `compiler/SPEC.md` — current spec, AS REWRITTEN BY DISPATCHES 1 AND 2.
7. `compiler/SPEC-INDEX.md` — section table-of-contents (regenerated post-Dispatches-1-2).
8. `pa.md` — repo conventions.

### Anti-patterns brief (mandatory)

- `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- `docs/articles/llm-kickstarter-v2-2026-05-04.md` §7

---

## §2 Crash recovery directives (PERMANENT — pa.md global rules)

Same as Dispatches 1/2:
1. Commit after each meaningful change with WIP messages
2. Update `docs/changes/v0next-spec-impact/progress-dispatch-3.md` after each step
3. WIP commits expected
4. Crash recovery via commits + progress.md

---

## §3 Scope — what to do, in order

The order respects dependencies: §38 is independent (channels stand alone); §39 schema cross-refs §55 (Dispatch 2 must be landed); §53 predicates cross-refs §55; §42 small edit on `is some`/`req` clarification.

### §3.1 §38 WebSocket Channels — MAJOR REWRITE (M19)

Read current §38 (lines 13314-13619 per pre-Dispatch-1 SPEC-INDEX; verify post-Dispatch-2 line numbers). 306 lines covering "<channel>, @shared, broadcast/disconnect."

**M19 changes the channel shape substantially.** Rewrite the section's structural premise:

#### §38.1 Channel as file-level structural element (NEW)

```scrml
<channel name="chat" topic="lobby">
  <messages> = []                            // V5-strict declaration; auto-syncs across clients

  server function postMessage(author, body) {
    @messages = [...@messages, { author, body, ts: Date.now() }]
  }
</>

<program>
  <!-- ... -->
</>
```

Cover:
- **Channels live at file level**, NOT inside `<program>`. They are siblings of `<program>`, not children.
- Channels auto-create a WebSocket endpoint at `/_scrml_ws/<name>`.
- Channels auto-declare their reactive variable from cells declared inside the channel body.
- **`@shared` modifier is DROPPED.** State declared inside a channel body is auto-synced; the synchronization comes from being inside the channel body, not from a modifier.
- The channel body uses **V5-strict** (cross-ref §6 from Dispatch 1): `<messages> = []` to declare; `@messages` to read/write.

#### §38.2 Channel attributes (UPDATE)

Existing attributes mostly preserved:
- `name=` (required, sets WS URL `/_scrml_ws/<name>`)
- `topic=` (pub/sub topic, defaults to `name`)
- `protect=`
- `reconnect=`
- `onserver:open=`, `onserver:message=handler(msg)`, `onserver:close=`
- `onclient:open=`, `onclient:close=`, `onclient:error=`

Update the attribute documentation to reflect file-level placement and V5-strict body semantics. Verify each handler form composes with V5-strict (e.g., `onserver:message=handler(msg)` — `msg` is a parameter, accessed bare).

#### §38.3 Auto-injected functions in channel scope (PRESERVE)

Server functions inside the channel body see `broadcast(data)` and `disconnect()` auto-injected. Preserve existing semantics; update terminology to align with new framing.

#### §38.4 V5-strict body interaction (NEW)

Explicit subsection on how V5-strict applies inside a channel body:
- `<x> = init` declares a channel-scoped reactive variable. It is auto-synced across all subscribed clients.
- `@x` reads/writes — same canonical access as elsewhere.
- Bare names = LOCALS only.
- The auto-synced behavior is BUILT-IN to the channel body — no @shared modifier.

#### §38.5 Reading channel state from `<program>` (NEW or UPDATE)

```scrml
<channel name="chat">
  <messages> = []
</>

<program>
  ${
    function send() {
      // Read channel state via canonical @ access
      const count = @messages.length
      ...
    }
  }
</program>
```

Channel-declared variables are reachable from within `<program>` via canonical access (`@messages`). Cross-scope read; same machinery as engine auto-declared variables visible across the file.

#### §38.6 Migration note for v1 → v0.next (BRIEF)

Brief note for spec readers familiar with v1: v1's channel-inside-program with @shared modifier is REPLACED by file-level channel with V5-strict body. No backward compat — v0.next is scrml.

#### §38.7 Existing §38 content not affected by M19 (PRESERVE)

Authentication, reconnect logic, error handling, broadcast/disconnect semantics — all preserve. Update terminology where needed to align with new framing.

**Estimated section size after rewrite:** 450-600 lines (from 306 current). Net add ~150-300 lines.

### §3.2 §39 Schema and Migrations — PARTIAL REWRITE (L4)

Read current §39 (lines 13620-13895 per pre-Dispatch-1 SPEC-INDEX). 276 lines covering "<schema>, column types, migration diff."

**L4 introduces additive shared-core validator vocabulary.** Schema KEEPS its SQL-mirror identity as the canonical source-level form; the shared-core vocabulary is ADDITIVE.

#### §39.X (NEW) Additive shared-core validator vocabulary

```scrml
<schema>
  users {
    email: text not null unique          // SQL-mirror native — preserved as canonical
    name:  text req length(>=2)          // shared-core additive — req lowers to NOT NULL
    age:   integer min(18) max(120)      // shared-core additive — lower to CHECK constraints
  }
</>
```

Cover:
- The schema block keeps SQL-mirror vocabulary (`not null`, `unique`, `references(table.col)`, `default(literal)`, `primary key`) as the **canonical source-level form**.
- The shared-core validator vocabulary (`req`, `length`, `pattern`, `min`, `max`, `gt`, `lt`, `gte`, `lte`, `eq`, `neq`, `oneOf`, `notIn`) is ADDITIVE — both forms legal.
- Mapping for emit (cross-ref §39.X+1):
  - `req` → `NOT NULL`
  - `length(>=N)` → `CHECK (length(col) >= N)`
  - `pattern(re)` → `CHECK (col REGEXP 're')` (DBMS-dependent; document driver-specific lowering)
  - `min(n)`, `max(n)` → `CHECK (col >= n)` / `CHECK (col <= n)`
  - `gt/lt/gte/lte/eq/neq` → `CHECK` constraints
  - `oneOf([...])` → `CHECK (col IN (...))`
- **Cross-locus consistency note:** the same shared-core word fires in three contexts with three enforcement modes:
  - State validator (§55) — reactive form-validity gating
  - Refinement type (§53) — compile-time + runtime boundary
  - Schema column (here) — DBMS-enforced constraint
  Cross-ref §55.

#### §39.X+1 (NEW) Lowering shared-core to standard SQL DDL

Detailed lowering rules with examples. Verify each predicate's lowering is DBMS-portable (or document driver-specific behavior). The emitted SQL DDL is unchanged in shape — `CREATE TABLE` + standard constraint clauses.

**Inviolable property:** the SQL strings sent to the database are PRESERVED. Vocabulary unification touches scrml source-level only.

#### §39.X+2 (NEW) When to use SQL-mirror vs shared-core

Rule of thumb: if your team thinks in SQL DDL, use the SQL-mirror form (`not null`, `unique`). If your team thinks in scrml validator vocabulary (especially when the same constraint applies in form state and DB), use the shared-core form (`req`, `length`).

Both are legal; mixed is legal (one column SQL-mirror, another column shared-core). Pick per-readability.

**Existing §39 content (DDL syntax, column types, migration diff, generated SQL):** PRESERVE. Update terminology to align with the new additive framing.

### §3.3 §53 Inline Type Predicates — PARTIAL REWRITE (L4)

Read current §53 (lines 19222-20160 per pre-Dispatch-1 SPEC-INDEX). 939 lines covering "Value constraints, SPARK zones, named shapes, bind:value HTML attrs."

**L4 cross-references §55 for the shared-core vocabulary** that refinement types share with state validators and schema constraints.

#### §53.X (NEW) Shared-core vocabulary — refinement-type firing semantics

Brief subsection cross-referencing §55:
- The shared-core vocabulary (`req`, `length`, `pattern`, `min`, `max`, `gt`/`lt`/`gte`/`lte`, `eq`/`neq`, `oneOf`/`notIn`) appears in refinement types as predicates on type annotations.
- Firing semantics: compile-time + runtime boundary check. A value that doesn't satisfy the predicate cannot inhabit the type.
- Stronger than state validators (which are runtime-only-reactive) and schema constraints (DBMS-enforced).

#### §53.X+1 (NEW) Refinement-type composition with state validators

Brief cross-ref to §55.2 (state-cell validators):
```scrml
<email>: string(pattern(/^[^@]+@[^@]+$/)) req = <input type="email"/>
```
Type carries the regex (compile-time + runtime boundary); `req` adds form-validity gating (reactive). Two enforcement layers compose cleanly.

**Existing §53 content (named shapes, SPARK zones, bind:value HTML attrs):** PRESERVE. Update terminology where needed.

### §3.4 §42 `not` Keyword — SMALL EDIT (L5)

Read current §42 (lines 14327-14558 per pre-Dispatch-1 SPEC-INDEX). 232 lines covering "not keyword, is not, is some, (x) =>, T | not, compound exprs."

**L5 clarifies `is some` vs `req` coexistence.** Add a subsection or update existing text.

#### §42.X (NEW or UPDATE existing §42.2.4) `is some` vs `req` — distinct predicates

Cover:
- `is some` — value EXISTS (null/undefined fail). For string cells, `"" is some` is TRUE — the cell holds the empty string, which IS some value.
- `req` — value is NON-EMPTY / MEANINGFUL. For string cells, `"" req` is FALSE — the empty string fails req.
- Both predicates exist; both are needed; they coexist in the validator vocabulary.
- Three loci of "exists/required" semantic across scrml:
  1. Schema SQL-mirror: `not null`
  2. State validator: `req` (form-required) and/or `is some` (existence)
  3. Refinement type: `string.length(>0)` or similar predicate form
  These are three NATIVE forms across three loci, not redundancy. Each fires in its layer's enforcement context.

**Existing §42 content (`not` keyword, `is not`, `(x) =>`, `T | not`, compound exprs):** PRESERVE.

### §3.5 §34 Error Codes — partial rewrite for this dispatch

Add the following error/warning codes (in §34's existing format):

**Channel-related:**
- `E-CHANNEL-INSIDE-PROGRAM` — `<channel>` inside `<program>` rather than at file-level. Reference §38.1.
- `E-CHANNEL-SHARED-MODIFIER` — `@shared` modifier used (deprecated in v0.next). Reference §38.1.

**Schema-related:**
- (None new — `req`/`length`/etc. fail by hitting validator-vocabulary failures already defined in §55)

**Predicate / `not`-keyword:** No new codes from L5 clarification (it's a clarification, not a new feature).

For each: add an entry following the existing §34 format.

---

## §4 Cross-cutting work

### §4.1 SPEC-INDEX.md regeneration

After all the above:
1. Run `bash scripts/update-spec-index.sh`
2. Verify line numbers align
3. Add new Quick Lookup entries:
   - "channel file-level placement" → §38.1
   - "channel V5-strict body" → §38.4
   - "schema additive shared-core" → §39.X
   - "schema lowering to SQL DDL" → §39.X+1
   - "refinement type shared-core" → §53.X
   - "is some vs req coexistence" → §42.X

### §4.2 Cross-reference sweep

Before declaring done, grep SPEC.md for:
- `@shared` references — should be 0 except in the deprecation note in §38.6
- "channel inside program" patterns (any pre-v0.next examples) — flag and update
- `is some` vs `req` references — verify consistency with §42 clarification

---

## §5 What you do NOT do in this dispatch

- **DO NOT** modify §51 (engines), §18 (match), §55 NEW (validators) — Dispatch 2 work, locked.
- **DO NOT** modify §6 (Reactivity), §1 Overview, §3 Context Model — Dispatch 1 work, locked.
- **DO NOT** modify compiler source. Test breakage is EXPECTED.
- **DO NOT** modify tests, kickstarter v2, or PA-only files.
- **DO NOT** rewrite §34's existing error codes — only ADD new ones.

---

## §6 Success criteria

The dispatch is DONE when:

1. **§38 is restructured** per §3.1 above. File-level placement explicit; @shared dropped; V5-strict body documented; auto-injected functions preserved; existing content (auth, reconnect, errors, broadcast/disconnect) preserved.
2. **§39 has the new additive shared-core vocabulary subsections** (§39.X, §39.X+1, §39.X+2). Existing SQL-mirror content preserved as canonical. Lowering rules documented.
3. **§53 has the shared-core cross-ref subsections** (§53.X, §53.X+1). Existing content preserved.
4. **§42 has `is some` vs `req` clarification** (new subsection or update to existing §42.2.4). Existing `not` keyword content preserved.
5. **§34 has the new error codes** (E-CHANNEL-INSIDE-PROGRAM, E-CHANNEL-SHARED-MODIFIER).
6. **SPEC-INDEX.md regenerated** + new Quick Lookup entries.
7. **Cross-reference sweep complete.** No `@shared` outside the deprecation note. `<channel>` inside `<program>` examples updated.
8. **Each subsection committed independently.** Progress.md captures the timeline.
9. **Final commit message:** "spec(dispatch-3): channels + schema + predicates + not keyword rewrite — §38 file-level + drop @shared, §39 additive shared-core, §53 cross-ref, §42 is-some/req clarification, §34 +2 codes" or similar.

---

## §7 Open questions you may need to resolve

These are listed in IMPACT-ASSESSMENT.md §7:

### §7.10 The `<channel>` body under V5-strict
This dispatch implements it. Verify channel handlers (`onserver:message=handler(msg)`) compose with V5-strict — particularly: `msg` is a parameter passed to the handler, accessed bare (it's a local, not a state cell). If you find a contradiction or ambiguity, surface in progress.md.

### Schema lowering portability
DBMS-specific behaviors (regex, CHECK constraint syntax) need driver-specific notes. Cross-ref §44 (multi-database adaptation) where appropriate.

---

## §8 Estimated wall-time

- §38 rewrite: 4-7 hours
- §39 partial rewrite: 2-4 hours
- §53 partial rewrite: 1-3 hours
- §42 small edit: 30-60 min
- §34 error code additions: 30-60 min
- SPEC-INDEX regen + cross-ref sweep: 1-2 hours

**Total: 9-17 hours of focused dispatch work.** Smaller than Dispatch 1; substantially smaller than Dispatch 2.

---

## §9 Dispatch authorization

- Worktree-isolated per pa.md F4.
- Pre-commit hook NOT bypassed without explicit authorization.
- No destructive operations without prompting per S56 user directive.

---

## §10 Cross-references

- **Master plan:** `docs/changes/v0next-spec-impact/IMPACT-ASSESSMENT.md`
- **Dispatch 1 brief:** `docs/changes/v0next-spec-impact/DISPATCH-1-BRIEF-foundation.md`
- **Dispatch 2 brief:** `docs/changes/v0next-spec-impact/DISPATCH-2-BRIEF-engines-match-validators.md`
- **S56 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s56-deliberation-outcomes-2026-05-04.md`
- **S55 outcomes ledger:** `../scrml-support/docs/deep-dives/v0next-s55-deliberation-outcomes-2026-05-04.md`
- **Kickstarter v2:** `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- **Anti-patterns brief:** `../scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- **Repo PA directives:** `pa.md`
- **Progress.md target:** `docs/changes/v0next-spec-impact/progress-dispatch-3.md`

---

## §11 Tags

#stage-0b #dispatch-3 #channels-schema-predicates-not #spec-major-§38 #spec-partial-§39-§53 #spec-small-§42 #§34-error-codes #scrml-dev-pipeline-T3 #worktree-isolated #depends-on-dispatches-1-2
