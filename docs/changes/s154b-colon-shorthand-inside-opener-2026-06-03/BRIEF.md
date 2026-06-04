# BRIEF — s154b-colon-shorthand-inside-opener (S160 dispatch, prompt: per S136)

> To dispatch (after the (c) impl lands) to `scrml-js-codegen-engineer`, `isolation: "worktree"`, model opus, background. Combined SPEC amendment + compiler impl + tests. Worktree base = main after (c) impl lands. ZERO adopter corpus migration (after-`>` is SPEC-examples-only). This file IS the verbatim dispatch prompt.

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full. Task-Shape Routing → parser maps (block-splitter / ast-builder / statechild-parsers) + error map. Maps reflect HEAD `f9d4b0f1`; your base is further ahead (S160 (c) impl + docs). Feedback in final report.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`. Save WORKTREE_ROOT. (S90)
2. `git rev-parse --show-toplevel` == WORKTREE_ROOT.
3. `git merge main` (ff; S112).
4. `git status --short` clean.
5. `bun install`; 6. `bun run pretest`; 7. baseline `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance`.
- ABSOLUTE worktree paths only; edits via Bash (perl/python/heredoc), never Edit/Write tool (S126); never `cd` into main; `git -C "$WORKTREE_ROOT"`, bun `--cwd "$WORKTREE_ROOT"`. First commit: `WIP(s154b): start at $(pwd)`.

# TASK: implement S154 ruling (b) — inside-opener `:`-shorthand canonical EVERYWHERE (deprecate after-`>`)

## Authoritative spec + reviewer findings (READ IN FULL FIRST)
- `/home/bryan-maclee/scrmlMaster/scrml-support/archive/spec-drafts/colon-shorthand-inside-opener-S160-DRAFT.md` (rev 2 — the complete amendment; esp. the "Rev 2 deltas" section).
- `/home/bryan-maclee/scrmlMaster/scrml-support/archive/spec-drafts/colon-shorthand-inside-opener-S160-REVIEW.md` (the exact findings + line list — RE-DERIVE current line numbers; they shifted from the S160(c) SPEC landing).

## SPEC.md amendments (land in your worktree)
1. **§4.14** (inside-opener is ALREADY the §4.14 normative form, lines ~975/979): ADD (a) whitespace-AFTER-`:`-is-OPTIONAL normative statement (`<span :@thing>` legal; only BEFORE-`:` ws is required, the `bind:`/`class:` disambiguation); (b) an after-`>` deprecation note (`<Variant> : expr` placement DEPRECATED → W-COLON-SHORTHAND-LEGACY-PLACEMENT, parses during the window, inside-opener canonical); (c) one-sentence doc note "prefer bare-body for multi-element markup arms; `:`-shorthand inside-opener is for terse single-expression bodies."
2. **§51.0.I + §51.0.B**: REWRITE the normative-DEFINITION lines (the "MAY use `<tag attrs> : expr`" def + table row + prose) to inside-opener `<tag attrs : expr>` + cross-ref §4.14 + deprecation note. MIGRATE the §51.0.B Mario worked example to inside-opener.
3. **§18.0.1**: REWRITE the after-`>` bullet to inside-opener + cross-ref §4.14 + deprecation. Add the bare-body-for-markup-arms note.
4. **§34**: ADD `W-COLON-SHORTHAND-LEGACY-PLACEMENT` (Info; arm/state-child-scoped; mirror W-MATCH-ARROW-LEGACY at ~16522; reserved `E-COLON-SHORTHAND-LEGACY-PLACEMENT` at end-of-window). Row text per the draft §7.
5. **MIGRATE the ~57 after-`>` shorthand-arm worked-example lines** to inside-opener, PER-LINE BY HAND. CRITICAL: distinguish a shorthand arm (`<Variant rule=.X>: expr` / `<Variant rule=.X> : expr`) from a TYPE-ANNOTATION colon (`<name>: T` / `<x>: int`) — NEVER touch a type-annotation colon. Both the SPACE (`> :`) and NO-SPACE (`>:`) shorthand forms migrate; the reviewer enumerated the no-space ones (re-derive). EXCEPTION: do NOT migrate markup-as-value-BODY lines to the `</p>>`/`</ul>>` tail — leave those BARE-BODY (the `<Ready(rows)> : <ul>...` / `<Failed(msg)> : <p>...` shapes).
6. **SPEC-INDEX**: `bun run scripts/regen-spec-index.ts` + footer (Total lines + a concise S160(b) note prepended; S160(c) as PRIOR).

## Compiler-source impl
1. **Legacy-TS parsers** `engine-statechild-parser.ts` (~968-970) + `match-statechild-parser.ts` (~410-417): ADD inside-opener `:`-shorthand recognition (post-attribute `:` inside the opener, body to the FINAL `>` via angleDepth — STRING-AWARE so a `>` inside a `"..."` literal or nested markup is opaque). RETAIN after-`>` (deprecation window). EMIT `W-COLON-SHORTHAND-LEGACY-PLACEMENT` at after-`>` sites. The NATIVE parser (`compiler/native-parser/tag-frame.scrml` ~748-900) already does inside-opener-with-angleDepth — confirm it covers engine/match; only the legacy-TS path needs new code.
2. RELAX the after-`:` whitespace requirement wherever the parser demands it (`:@thing` must parse).
3. `migrate.js`: ADD an AST-driven after-`>`→inside-opener `--fix` rule, mirroring the S147 arm-separator rule at `migrate.js:194` (AST-driven, NOT text-replace).
4. ZERO codegen change — all placements build identical AST + emit identical JS. Confirm via AST-identity tests.

## VERIFY-NOT-ASSERT before editing (R26 reverse; STOP + report if wrong):
- The legacy-TS statechild-parser structure + that they recognize ONLY after-`>` today (the reviewer's line numbers).
- The native parser already does inside-opener for engine/match (or only HTML?).
- The after-`:` ws requirement's exact location.
- W-MATCH-ARROW-LEGACY emission pattern (mirror it); migrate.js:194 (mirror it).

## Tests (coupled with code):
- inside-opener parses in engine state-children + match arms, AST-identical to after-`>`.
- after-`>` still parses + emits W-COLON-SHORTHAND-LEGACY-PLACEMENT.
- after-`:` ws optional (`<span :@thing>`).
- worst-case string-awareness: `<LengthFailed("(>=2)") : "Name must be at least 2 characters">` parses (the `>` in the string is opaque; angleDepth finds the FINAL `>`).
- payload-binding + multi-target-rule before `:` (`<Done count : "...">`, `<Big rule=(.Fire|.Cape) : "...">`).
- `/>` + `:`-shorthand stays E-CLOSER-001.
- migrate --fix rewrites after-`>` → inside-opener.

## Phase 3 — R26 EMPIRICAL VERIFICATION (mandatory)
Compile a real engine/match `.scrml` with inside-opener `:`-shorthand arms; verify emitted JS BYTE-IDENTICAL to the after-`>` form (compile both forms, diff output); `node --check` exit 0. DO NOT mark DONE without R26.

## Commit discipline
Incremental; coupled code+test ONE commit; never --no-verify. Before DONE: git status clean. Report WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, baseline-vs-final counts, R26 (byte-identity), deferred items. Write `docs/changes/s154b-colon-shorthand-inside-opener-2026-06-03/progress.md` each step.

---
## Dispatched S160 — agent `a2fe1059bbcb9c033` (isolation:worktree, opus, base d0d66d3e = main after (c) impl landed)
The dispatched prompt is substantively this file + two additions: (1) a tool-cache-quirk path-discipline note (the recovery agent observed the Read tool serving stale content after cross-worktree ops → prefer Bash disk-reads for verification); (2) an explicit "COMBINED dispatch — land SPEC + impl + tests in worktree; PA file-deltas + reviews the full diff" framing. Substance identical.
