# Bug-51 — page-local enum-variant objects missing from server bundle

Change-id: giti-bug51-server-bundle-enum-emission-2026-06-23
Agent worktree: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a4a3a37e414671a02
Branch: worktree-agent-a4a3a37e414671a02
Base: a2137214 (merged main at startup; original base 9cd5ae81 was 4 docs-only commits behind)

## 2026-06-23 — startup
- pwd verified under .claude/worktrees/agent-; git toplevel matches; tree clean.
- merged main (a2137214) — 4 docs/handoff commits, no codegen conflicts.
- bun install + bun run pretest OK.
- Reproduced bug at a2137214: server bundle `grep -c 'const Load = Object.freeze'` = 0 (client = 1); server body has `Load.Ok`/`Load.Bad`/`Load.Loaded({count:n})` free refs.

## 2026-06-23 — fix landed (emit-server.ts)
- Seam: generateServerJs post-assembly injection region (~:2263), mirroring the DB-scope-const reachability scan.
- Approach: REACHABILITY-GATED emit (not emit-all). Reuse exported emitEnumVariantObjects(fileAST) from emit-client.js (byte-identical Object.freeze shape). Filter each returned `const <Name> = ...` line by localServerImportNameUsed(finalEmitted, <Name>) word-boundary check; inject only referenced enums after the header `\n\n` so they hoist above route handlers.
- Why gated not emit-all: cheap signal already present (the existing usedIdents/import-pruning pattern), keeps server bundle minimal (output discipline), low-risk (soundness errs toward keep). A string-inlined `.Member`/client-only enum never appears server-side.
- R26 base repro (newline-variant form): server grep = 1, all 4 variants present, server def BYTE-IDENTICAL to client; node --check server + client EXIT 0.
- PRE-EXISTING (out of scope): single-line space-separated `{ A B C }` enum-decl form truncates to first variant in BOTH client and server (parser issue, not Bug-51, not introduced here). Newline form is correct.

## Next
- Build adversarial repros (a)-(h); /code-review; full suite.

## 2026-06-23 — adversarial + regression test
- Adversarial repros (a)-(h) all pass: (a) server-only enum present; (b) both bundles, byte-identical, no double-def; (c) reachability gate — client-only `Other` ABSENT from server, server-used `Load` present (server bundle minimal); (d) payload-variant ctor `Load.Loaded({count:n})` resolves; (e) SSE `server function*` — const precedes yields; (f) cross-server-fn call `inner()` in outer handler, enum refs resolve; (g) two enums (Load+Mode) both emitted; (h) `:Load | not` wire-envelope — `not`→null, _scrml_wire_encode wraps, Load.Ok resolves. All `node --check` EXIT 0.
- Regression test: compiler/tests/integration/bug-51-server-bundle-enum-emission.test.js (5 describe, 31 expects). VERIFIED genuine guard: 5 fail against HEAD~1 (pre-fix), 5 pass against the fix. acorn-parse-clean server bundles + byte-identical server/client defs + reachability gate.
- Pre-commit full gate on the fix commit: 17617 pass / 0 fail / 68 skip.

## Next
- /code-review HIGH on diff; full `bun run test`.

## 2026-06-23 — FOLLOW-UP dispatch (collision guard + import-prune ordering)
Agent worktree: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a7ac7714d185bbd70
Inherited via `git merge --ff-only worktree-agent-a4a3a37e414671a02` (c16b0fdc).

- /code-review on the prior fix found ONE real failure the enum-emit block INTRODUCES:
  a duplicate top-level declaration collision. The injected `const <Enum>` shares the
  header `\n\n` injection point with other injected top-level bindings (most notably
  `import { SQL } from "bun"`). A `<program db=>` + `?{}` + `type SQL:enum` + a server fn
  using `SQL.Ok` → `import { SQL }` AND `const SQL = Object.freeze(...)` both at top level
  → acorn rejects "Identifier 'SQL' has already been declared" (E-CODEGEN-INVALID-JS) on
  otherwise-valid scrml.
- Reproduced at c16b0fdc: server bundle had `import { SQL } from "bun"` (line 4) +
  `const SQL = Object.freeze(...)` (line 7); acorn parse FAIL "Identifier 'SQL' has already
  been declared (7:6)".

### Fix (emit-server.ts generateServerJs)
- NEW helper `topLevelBindingExists(body, name)` (~:58): line-anchored scan for a top-level
  binding of `name` — const/let/var/function/function*/class, `import name`, `import * as name`,
  named-import locals (incl. `x as name`). Conservative: substring / member-access / object-key
  do NOT match (17/17 adversarial helper cases green).
- GUARD: before injecting `const <Enum> = Object.freeze`, if the enum is reachable
  (localServerImportNameUsed) AND topLevelBindingExists(finalEmitted, enumName) → push a clear
  `E-CG-016` CGError (severity error) naming the enum + the collision + the fix (rename the enum),
  and SKIP that enum's injection. Fails-closed with a clear diagnostic instead of the cryptic
  SyntaxError. Disposition = DIAGNOSTIC (not rename-the-symbol): a textual rename of every
  `<Enum>.Member` in finalEmitted is risk-prone (the name can recur in strings/comments);
  the diagnostic is the lowest-risk correct option per the brief's "safe floor."
- ORDERING: moved the enum-emit block to AFTER the server-import tree-shaking prune pass
  (was BEFORE). emitEnumVariantObjects(fileAST) reads only fileAST.typeDecls (verified — no
  dependence on the rewriter variant-fields registry), so it is safe after
  setVariantFieldsForRewriter(null,null) and after the prune. The reachability gate scans the
  route-handler body (present before the prune either way) so the gate is unaffected; the consts
  still hoist above route handlers via the header `\n\n` injection point.

### §34 (Rule 4 — landed same change)
- NEW code E-CG-016 (§47): §34 catalog row (after E-CG-013) + §47.7 summary table row.
  Sibling of E-CG-012 (author-id vs `_`-prefix) in the server-bundle-injected-binding direction.

### Tests (compiler/tests/integration/bug-51-server-bundle-enum-emission.test.js)
- §6 collision: `<db>`+`?{}`+`type SQL:enum`+server-fn → E-CG-016 fires (names SQL, severity error)
  + NO duplicate `const SQL` injected + `import { SQL }` retained + acorn parse clean.
- §7 regression: `type Load:enum` (no clash) on a `<db>` page still emits `const Load` + no E-CG-016.
- §8 prune-ordering: server-used enum emits + no leftover sentinel + parse clean.
- 9 pass / 0 fail / 46 expects. Existing §1-§5 adversarial cases STILL PASS (guard does not break them).

### Verify
- Adversarial (guard-targeted): SQL-import-collision → E-CG-016 + parse OK; payload + no-db variants →
  no dup-decl, no false E-CG-016, parse OK. topLevelBindingExists 17/17.
- R26: collision repro + normal repro recompiled; server bundles acorn-parse-clean; normal enum still
  has `const <Enum> = Object.freeze` server-side.
