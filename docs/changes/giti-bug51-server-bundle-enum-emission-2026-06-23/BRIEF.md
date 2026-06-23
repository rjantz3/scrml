# Dispatch BRIEF — giti Bug-51 (server-bundle enum emission) — S216 2026-06-23

Agent: scrml-js-codegen-engineer · isolation: worktree · model: opus · run_in_background: true
Change-id: giti-bug51-server-bundle-enum-emission-2026-06-23

> Verbatim prompt: text below is the prompt: parameter sent to the Agent() call (S136 archival).

---

# MAPS — REQUIRED FIRST READ
Read `.claude/maps/primary.map.md` in full; follow its Task-Shape Routing for a compiler-source codegen fix. Maps reflect HEAD `1ff06eae`; live HEAD `a2137214` (~8 commits behind) — treat as starting hypothesis, verify via grep/Read. Report maps-load-bearing line.

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE (S99 leak history)
pwd MUST start with /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent- (else STOP — S90); save as WORKTREE_ROOT. git rev-parse --show-toplevel == WORKTREE_ROOT. git status clean. bun install. bun run pretest.
ALL edits via Bash (perl/python3/heredoc) on WORKTREE_ROOT-absolute paths (NOT Edit/Write — S126 leak class). NEVER cd into main; use git -C "$WORKTREE_ROOT" / bun --cwd. First commit msg includes verbatim pwd: WIP(bug51): start at $(pwd).

# THE BUG (giti P0 Bug-51, CONFIRMED reproducing @ a2137214)
Page-local `type X:enum` referenced in a `server function` body → enum def `const X = Object.freeze({...})` emitted to *.client.js ONLY, never *.server.js → server handler refs X.Ok/X.Loaded(...) as free identifiers → runtime ReferenceError. Compile exit-0; node --check passes. Repro at /tmp/bug51/repro-27.scrml (probeBare returns Load.Ok/Load.Bad; probePayload returns Load.Loaded({count:n})). grep -c 'const Load = Object.freeze' out/repro-27.server.js → 0 (should be >=1).

# THE SEAM (trace — verify against source)
- emitEnumVariantObjects(fileAST): emit-client.ts ~:2516/2532, invoked ONLY ~:1408 (generateClientJs) → client bundle only. Confirm exported.
- generateServerJs (emit-server.ts) has ZERO enum/type-def emission; server defs = collectFunctions ~:580 + DB consts ~:2231-2248.
- rewrite.ts ~:1644/:1682-1688 leaves member-access Load.Ok AS-IS, expecting the frozen const to exist at runtime.

# THE FIX
Emit page-local enum-variant-object defs into the SERVER bundle. Reuse the exported emitEnumVariantObjects (NO divergent second emitter; byte-identical Object.freeze shape REQUIRED). Add to generateServerJs def-hoisting region (~:2231). Baseline = mirror the client (emit-all; correct + byte-identical) — correctness (no ReferenceError) is the bar, not minimal bundle size. Optional: reachability-gate (emit only enums referenced by emitted server fns) IF cheap/low-risk, else skip. Touchpoint correction authorized. Cross-file imported enums: cover if same path, else note deferred (no scope creep).

# S215 ADVERSARIAL GATE — MANDATORY (P0 codegen; confirmatory-green insufficient)
Enumerate blast radius; construct+compile repros: (a) enum only in server fn; (b) enum in client AND server (no collision); (c) enum in NO server fn (state emit-all vs gated); (d) payload constructor in server fn; (e) enum in server function* (SSE); (f) enum in CPS-split server fn (call in if/match arm); (g) 2+ page-local enums; (h) server fn returning T|not of an enum (§57 envelope). For each: grep server bundle for the def (>=1 when referenced) + node --check exit 0. Run /code-review HIGH on the diff; land only if clean.

# R26 EMPIRICAL — MANDATORY (S138); DO NOT mark DONE without it passing
Post-fix recompile repro + adversarial repros: grep 'const <Enum> = Object.freeze' out/*.server.js >=1 per referenced enum; node --check exit 0; confirm no free-identifier ReferenceError shape remains (defining const above the ref in the same server file).

# FULL-SUITE + WITHIN-NODE (S198)
bun run test (full, NOT subset — within-node canary + browser/lsp full-only). 0 fail. Emitting enum defs into server bundles shifts server-bundle bytes → if M6.5.b.0 within-node parity prints OVER-BUDGET <relpath>: {CLASS:{raw,allow,residual}}, re-baseline that fixture's allowlist in-place (per-class = printed raw, preserve key order) SAME LANDING. Report re-baselined fixtures.

# COMMIT DISCIPLINE (S83 + coupled code+test)
Commit per unit; code+coupled-test = one commit. progress.md after each step (append-only). git status clean before DONE. Incremental commits = crash recovery.

# FINAL REPORT
WORKTREE_PATH, FINAL_SHA, BRANCH, FILES_TOUCHED (abs), fix seam + emit-all/gated, R26 results, ADVERSARIAL (a)-(h) + /code-review verdict, full-suite result + re-baselined fixtures, deferred items, maps feedback, any path-discipline incident.

---

# FOLLOW-UP DISPATCH (S216) — collision guard + import-prune ordering

Agent: scrml-js-codegen-engineer · isolation:worktree · opus · bg. FF-merges worktree-agent-a4a3a37e414671a02 (c16b0fdc partial fix) then adds:
- COLLISION GUARD: before injecting `const <EnumName> = Object.freeze`, check finalEmitted doesn't already declare <EnumName> (const/let/var/function/class/import). Genuine collision (e.g. page-local `type SQL:enum` in a `<db>` file vs injected `import { SQL } from "bun"`) → CLEAR compile diagnostic (NOT silent-skip → that reintroduces a runtime ReferenceError, strictly worse; NOT the cryptic duplicate-decl SyntaxError). New §34 row if a code is minted.
- IMPORT-PRUNE ORDERING: inject enum block AFTER the import-prune pass (~:2324) so injected consts don't spuriously keep dead imports (finder3 #2).
- Tests: collision case (SQL-enum-in-db compiles, no dup-decl) + non-colliding still emits + prune-ordering.
- VERIFY: existing Bug-51 adversarial repros STILL PASS + new collision adversarial + R26 + full suite.
Rationale: the `/code-review` finder fan-out (S216, 3 angles) found the base fix introduces a duplicate-decl SyntaxError on the contrived `SQL`-named-enum-in-`<db>` case (fails-closed, but on valid scrml). The scary "half-fixed `.variants`/`toEnum`" headline (finder1 C1) was EMPIRICALLY REFUTED (`.variants` works via the frozen const's `variants:` property; `toEnum`-server is a SEPARATE pre-existing bug, filed independently). Disposition (a): guard-then-land.
