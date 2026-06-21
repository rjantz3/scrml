# A2 W4 (codegen) — dispatch brief

**change-id:** `api-primitive-a2-2026-06-20`
**wave:** W4 — codegen (the thin typed fetch callable + `<request api=>` → `parseVariant` decode wiring)
**agent:** scrml-js-codegen-engineer · isolation:worktree · opus · background
**lands:** PA via S67 file-delta on your completion (you are NOT the committer to main).

---

# MAPS — REQUIRED FIRST READ

Before consuming any other context (SPEC sections / source files), read `.claude/maps/primary.map.md` in full (~100 lines). Its §"Task-Shape Routing" tells you which additional maps to consult — this is a **compiler-source codegen** task; follow that routing.

Map currency: maps reflect HEAD **`612f92e6`** as of **2026-06-20** (the W3 typer landing — your base). The maps are ~51 commits behind older watermarks; treat map content as a starting hypothesis to verify via grep/Read against current source, NOT ground truth. In your final report include: "Maps consulted: [list]; load-bearing finding: <one sentence>" OR "Maps consulted but not load-bearing."

---

# CRITICAL — STARTUP VERIFICATION + PATH DISCIPLINE

**S99 leak history: this dispatch class has had path-discipline leaks before — do NOT be the next one.**

## Startup verification (BEFORE any other tool call)

1. `pwd` via Bash. Output MUST start with `/home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-`. If it is under any other repo (e.g. `scrml-support/.claude/worktrees/`), STOP and report — that is the S90 CWD-routing failure. Save the output as `WORKTREE_ROOT`.
2. `git rev-parse --show-toplevel` MUST equal `WORKTREE_ROOT`.
3. `git rev-parse HEAD` — confirm your base is `612f92e6` (the W3 landing) or a descendant.
4. `git status --short` — tree clean.
5. `bun install` — worktrees do NOT inherit `node_modules`; the pre-commit hook's `bun test` fails with "cannot find package 'acorn'" otherwise.
6. `bun run pretest` — populates `samples/compilation-tests/dist/` (gitignored; empty in a fresh worktree → ~130 browser-test ECONNREFUSED failures without it). For baseline use `bun run test`, NOT `bun test`.

If ANY check fails: do NOT proceed. Report and exit.

## Path discipline (EVERY edit)

- **Edit via Bash** (`perl`/`python3`/`cp`/heredoc) on **worktree-absolute paths that include the `.claude/worktrees/agent-<id>/` segment** — NOT the Edit/Write tools (S126 interim mitigation: Edit/Write have leaked to PRIMARY MAIN twice). Echo the target path before each write; re-verify via `git diff`/`grep` after.
- **NEVER `cd` into the main repo** (or anywhere outside `WORKTREE_ROOT`). Use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`, and worktree-absolute paths exclusively (S126 — `cd`/`bun add`/compile-run all leak via cwd).
- Translate any main-rooted path you see in this brief (`/home/bryan-maclee/scrmlMaster/scrml/compiler/...`) to `$WORKTREE_ROOT/compiler/...` before writing.

---

# CONTEXT — the A2 arc (where W4 sits)

scrml is shipping **A2**: a thin typed external-API primitive `<api>` for the bring-your-own-backend (BYOB) boundary — a scrml frontend over a foreign backend scrml does NOT own. Ratified S210 (dpa-001). Scope doc: `docs/changes/api-primitive-a2-2026-06-20/SCOPE-AND-DECOMPOSITION.md`. Read it.

**Landed substrate (your base — DO NOT re-do):**
- **W1 (SPEC §60, Nominal/spec-ahead).** `compiler/SPEC.md` §60.1–§60.11. Read **§60.2** (`<api src= base=>` + endpoint grammar `name(reqShape) -> METHOD "path" : ResponseT`), **§60.4** (`<request api="endpointName" args=>` bind mode), **§60.5** (response decode reuses `parseVariant` §41.13), **§60.6** (client-only §12.2 + the SSR-of-external-data gap), **§60.7** (LIMIT-PRIMITIVES). These are NORMATIVE — verify every claim in this brief against them (Rule 4).
- **W2 (parser).** `compiler/src/ast-builder.js:13796` builds the `api-decl` AST node from `<api base= src=>...</api>` (base req / src opt; endpoints `{name,reqShape,method,path,responseType,span}`; `${}` path-params verbatim). NO emission today.
- **W3 (typer).** `compiler/src/type-system.ts:18053` `checkApiDeclarations` — resolves endpoint type-refs (reuses §14.1.2 `E-TYPE-UNKNOWN-NAME`), fires `E-API-{PATH-PARAM-UNBOUND,ENDPOINT-UNKNOWN,REQ-SHAPE-MISMATCH}`. `type-system.ts:18254` recognizes `<request api= args=>` (reads the existing markup `attrs`; the parser already captured `api=` string-lit + `args=` var-ref+exprNode — NO new parse production needed). NO emission today.

**The anchor fact:** today a fully typed-and-checked `<api>` + `<request api=>` app emits **nothing runtime** — no `.server.js`, no fetch, no base-URL in any client artifact (confirmed by W3 compile-verify). W4 is what makes it actually fetch + decode.

---

# W4 SCOPE — what to build (codegen only)

Emit the **client-side** runtime for the `<api>` + `<request api=>` pair:

1. **Per-endpoint typed fetch callable.** For each endpoint in an `api-decl` node, emit a client-side callable that does `fetch(base + path, { method, body? })` — base from the `<api base=>`, path from the endpoint (substituting `${...}` path-params from the request shape / `args`), method from the endpoint, request body from `reqShape` when the method carries one. Co-location (S206): the emitted call should read as a direct use of the declared endpoint, not name-indirected machinery pulled away from the call site.
2. **`<request api="endpointName" args=@cell>` wiring.** Bind the request element's existing reactive surface (§6.7.7 — `loading` / `data` / `error` / `stale`, `.data: ResponseT`) to: call the endpoint's fetch callable with `args`, then decode the response via **`parseVariant(response, ResponseT)`** (§41.13 / §60.5) where `ResponseT` is the endpoint's declared `: ResponseT`. The decode is **automatic-but-visible** (driven by the endpoint decl, per F4). The existing `<request>` emit site is `compiler/src/codegen/emit-reactive-wiring.ts` (the `tag === "request"` branch ~line 834; the fetch-init machinery ~715 and ~1072–1108). Extend it to handle the `api=` attribute mode (vs the existing body-expression `${ @data = serverFn() }` form).
3. **parseVariant reuse.** Use the existing `compiler/src/codegen/emit-parse-variant.ts` for the response decode — do NOT write a new decode surface (§60.5). The `<db>` driver `compiler/src/codegen/db-driver.ts` is the request-side-dual pattern to study (it emits a typed query callable; `<api>` is its HTTP analog).

---

# CONSTRAINTS (the build MUST satisfy — verify against §60)

1. **LIMIT-PRIMITIVES (§60.7, S174).** A thin typed callable. **NO retry, NO cache, NO pagination, NO interceptors.** If you find yourself adding any of these, STOP — that is the gravity well the ratification explicitly refuses.
2. **Client-only (§60.6, §12.2).** `<api>`/`<request api=>` is a PURE-CLIENT SPA path. CONFIRM the emitted code does not make the enclosing function a §12.2 server-escalation trigger (no `.server.js` should appear for an `<api>`-only app). The base URL DOES now go into the client bundle (correct — it's a client fetch); that is the intended W4 change vs W3's zero-emission.
3. **Co-location (§60.3, S206).** The contract reads with the use site.
4. **§60 Nominal banner — LEAVE IT.** W4 is codegen; the §60 banner flip to Implemented is **W5's** job (after the worked example + B-docs prove it end-to-end). Do NOT flip the §60 banner. If you believe W4 fully completes the functional surface such that Nominal is wrong, SURFACE THAT to the PA in your report — do not flip unilaterally.
5. **§34 codes — none new expected.** W4 is emission; if a codegen-layer diagnostic is genuinely needed, add the §34 row in the SAME landing (Rule 4) and flag it loudly in your report.

---

# PHASE 3 — MANDATORY R26 EMPIRICAL VERIFICATION (S138 — this IS codegen)

Regression tests that synthesize AST and run codegen are necessary but NOT sufficient. Before reporting DONE, you MUST empirically verify on a real `.scrml` source compiled end-to-end:

```
mkdir -p /tmp/w4-r26
cat > /tmp/w4-r26/app.scrml <<'SCRML'
<!-- a real <api> + <request api=> app: base URL + one typed endpoint + a request bind -->
SCRML
bun "$WORKTREE_ROOT"/compiler/src/cli.js compile /tmp/w4-r26/app.scrml -o /tmp/w4-r26/out > /tmp/w4-r26/log 2>&1
echo "exit=$?"
```

Then assert (grep the emitted artifacts, not just exit code — a codegen miscompile is silent):
- the client artifact contains a real `fetch(` to `base + path` with the right method (NOT an empty URL, NOT raw `${...}`);
- the response is decoded via the `parseVariant` runtime helper into the `<request>` `.data` surface;
- **NO `.server.js`** is emitted (client-only) and the function did not escalate to §12.2;
- `node --check` exit 0 on every emitted `.js`.

Author a real `.scrml` reproducer per the canonical decl shape (PRIMER §3 — V5-strict `<x> = …` top-level, `@x` in expressions). The Phase-3 block ends with: **DO NOT mark DONE without empirical R26 verification passing.**

---

# TEST + COMMIT MANDATE

- **Full `bun run test`** before DONE (NOT just the pre-commit subset — the within-node parity canary + browser/lsp live only in the full suite). Baseline at start; zero new failures at end.
- **Within-node re-baseline (S198):** if your codegen shifts any `examples/`+`samples/` fixture AST and the within-node parity test prints `[within-node] OVER-BUDGET <relpath>: {CLASS:{raw,allow,residual}}`, re-baseline the `M6.5.b.0` allowlist entry IN THE SAME LANDING (set the printed `raw` values in-place, preserving key order — NOT a whole-file re-dump).
- **Commit discipline (S83):** after EVERY edit `git diff` to verify → `git add` → commit IMMEDIATELY per sub-bucket (don't batch). Your FIRST commit message MUST include `start at $(pwd)` (echo-pwd discipline, S99). Before reporting DONE, `git status` MUST be clean (no uncommitted changes). "work in worktree, no commits" is NOT an acceptable terminal report. Do NOT use `--no-verify`.

---

# REPORTING CONTRACT (final message)

```
WORKTREE_PATH: <your pwd>
FINAL_SHA: <branch tip>
BRANCH: <branch name>
FILES_TOUCHED: <path: one-line what + why, each>
§34 codes added: <none expected; list + justify if any>
compile-verify (R26): <cmds + the grep assertions above + pass/fail>
TESTS_BEFORE / TESTS_AFTER: <full bun run test counts>
within-node: <clean / re-baselined which fixtures>
DEFERRED → W5: <tests + example + B-docs + §60 banner flip>
coherence: main...HEAD divergence; confirm main checkout shows NO modification to your files (no leak)
NOTES / maps finding
```

PA lands the listed files via S67 file-delta. **W5 (tests + worked `examples/NN-external-api` + B-docs BYOB guide + §60 banner flip) is the next wave — NOT yours.** Crash-recovery: commit incrementally; update `docs/changes/api-primitive-a2-2026-06-20/progress.md` per step.
