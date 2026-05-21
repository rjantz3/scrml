# progress — M5-swap (v0.6 native-parser pipeline swap)

Append-only, timestamped. Authority: BRIEF-M5-SWAP.md.

---

## 2026-05-21 — startup verification

- worktree: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ae15b3aca96bb4b32`
- `git rev-parse --show-toplevel` == worktree root. OK.
- `git merge main --no-edit` — fast-forward `67a17dc5` → `8c9d855b` (maps + docs only). Clean.
- `bun install` OK. `bun run pretest` OK (13 test samples compiled).
- Baseline `bun run test`: first run after install showed a transient 2-fail
  (dist/timing race in pretest-dependent tests); 3 consecutive re-runs all
  clean at **18,102 pass / 0 fail / 169 skip / 1 todo / 738 files** — the
  brief's expected baseline. Flake noted, not blocking.

## 2026-05-21 — Phase 0 — bridge-divergence re-survey

Read in full: BRIEF, primary.map, domain.map, SCOPE-v0.6, M5-ast-bridge-scoping,
M5-divergence-ledger, DD #27 (m5-m6-scope-revision). Surveyed native-parser
source against the divergence inventory.

**Findings (load-bearing):**

1. F1 (`a915ad19`) landed: `block.attrs` + `block.tokenizedAttrs` on every
   Markup block (parse-markup.js:1108-1109), `block.tagKind` + state-block
   shaping (1115-1121). The attribute surface is genuinely native — no
   translation layer needed.
2. F7 (`68a805ac`) landed: `parse-state-body`, `parse-sql-body`,
   `parse-css-body` modules. Sql blocks carry `query` + `chainedCalls`; Css
   blocks carry `rules`; state openers shaped with `stateNodeKind`/`stateType`/
   `typedAttrs` (parse-markup.js:300-368). Rich body payloads present.
3. F8 (`200737e1`) landed: `parse-error-body`; ErrorEffect blocks carry
   `arms[]`, Meta blocks carry a native-Stmt[] `body` (parse-markup.js:370-399).
4. F3 (`3c21c885`) landed `collect-hoisted.{scrml,js}` — but its v0.5-vintage
   header is explicit: `typeDecls`/`components`/`machineDecls` are **always
   empty** because "there is NO native kind for engine/type/component/state
   declarations." F7 added state/sql/css **body** parsers, NOT new top-level
   declaration kinds — the hoist gap is NOT closed.
5. **No `nativeParseFile` / FileAST assembler exists** anywhere in
   `compiler/src/` or `compiler/native-parser/`. Phase 2's adapter is genuine
   new work, as the brief anticipates.
6. **The decisive divergence:** the native `LogicEscape.body` is a native
   `Stmt[]` (PascalCase ESTree-ish catalog: `VarDecl`/`If`/`For`/`ExprStmt`/
   `FunctionDecl`...). The live `logic` node's `body` is a `LogicStatement[]`
   (scrml-specific lowercase union: `let-decl`/`if-stmt`/`for-stmt`/
   `match-stmt`...). **37 downstream files** walk `logic.body` / the
   `LogicStatement` union by lowercase kind string. DD #27's F2-RETIRE verdict
   covered *expression*-level ESTree retirement (emit-expr.ts) — it did NOT
   cover the *statement*-level `LogicStatement` catalog. That catalog
   translation is unbridged.

**Verdict: Phase 0 STOP GATE TRIPPED.** See M5-divergence-ledger.md (refreshed)
and the residual-work decomposition below. Residual swap work exceeds the ~14h
budget — a statement-catalog bridge (native Stmt[] → LogicStatement[]) plus the
hoist-gap (typeDecls/components/machineDecls) remain. Escalated to PA; awaiting
ratified decision.
