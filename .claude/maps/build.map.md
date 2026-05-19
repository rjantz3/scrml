# build.map.md
# project: scrmlts
# updated: 2026-05-18T18:37:27-06:00  commit: 84c736e

## Development Commands (root package.json > scripts)

| Command | What it does |
|---------|--------------|
| `bun run compile` | Compile a .scrml file or directory using CLI |
| `bun run watch` | Compile + watch mode via `--watch` flag |
| `bun run test` | Run full test suite; pretest runs scripts/compile-test-samples.sh first |
| `bun run test:coverage` | Test suite with coverage reporting |
| `bun run pretest` | (auto) Compile all samples/compilation-tests/ fixtures to dist/ before tests |
| `bun run bench` | Compile samples/compilation-tests/ with --timing flag for performance measurement |
| `bun run security` | Compile test samples, then run `node --check` on all client JS output |
| `bun run lsp` | Start the LSP server |
| `bun run docs:build` | Build the documentation site |
| `bun run e2e` | Run Playwright e2e suite (3-browser: Chromium/Firefox/WebKit) |
| `bun run e2e:ui` | Run Playwright e2e suite with UI mode |
| `bun run e2e:install` | Install Playwright browsers (chromium, firefox, webkit) |

## Build & Release

| Command | What it does |
|---------|--------------|
| `bun run compiler/src/cli.js build <dir>` | Build production server bundle |
| `bun run scripts/rebuild-tab-dist.ts` | Regenerate all TAB dist artifacts |
| `bun run scripts/rebuild-self-host-dist.ts` | Regenerate all self-host dist files (STRICT GATE — exits 1 on host-compiler errors) |
| `bun run scripts/rebuild-bs-dist.ts` | Regenerate block-splitter dist artifacts |
| `scripts/assemble-spec.sh` | Assemble SPEC.md from section files |
| `bun run scripts/regen-spec-index.ts` | Regenerate SPEC-INDEX.md line ranges + sizes in-place (idempotent) |
| `scripts/compile-test-samples.sh` | Batch compile all samples/compilation-tests/ |
| `bun run scripts/measure-markup-read-edges.ts` | Measure markup-read node ceiling (A-1.7 tool) |
| `bun run scripts/benchmark-perf-baseline.ts` | Capture per-stage perf baseline → benchmarks/perf-baseline.json (PGO P1.4; S102) |
| `bun run scripts/perf-regression-check.ts` | Diff current perf vs baseline; exit 1 on regression >TOLERANCE% (default 10%; S102) |
| `node scripts/extract-readme-scrml.js` | Compile-gate for `scrml` fenced blocks in README.md (S102; called by pre-push hook on release-tag push) |

## CLI Subcommands

| Subcommand | What it does |
|------------|--------------|
| `scrml compile <file\|dir>` | Compile .scrml to HTML + client JS + server JS; `--emit-reachability` emits Stage 7.6 JSON; `--emit-per-route` emits per-(EP, role, tier) JS chunks + chunks.json (default-on at v0.3.0); `--chunk-size-budget=N` sets soft byte threshold for W-CG-CHUNK-LARGE lint [NEW S92 Q-OPEN-5] |
| `scrml dev <file\|dir>` | Dev server with hot-reload |
| `scrml build <dir>` | Production build |
| `scrml serve <dir>` | Serve compiled output |
| `scrml migrate <file\|dir>` | Migrate pre-v0.3 .scrml structure; `--program-shape` flag for v0.3 container migration |
| `scrml promote <file\|dir>` | Promote patterns (e.g. `i-match` → `match`); `--match` flag |
| `scrml init` | Scaffold a new scrml project |
| `scrml generate auth` | Scaffold adopter-owned login page (writes stdlib/auth/templates/login.scrml to project) |
| `scrml lsp --stdio` | Start LSP server |

## `--chunk-size-budget` Flag  [compiler/src/commands/compile.js]

Q-OPEN-5. Both forms accepted:
- `--chunk-size-budget=150000` (equals form)
- `--chunk-size-budget 150000` (space form)

Rejects non-positive / non-numeric values with non-zero exit. Default when absent: `CHUNK_LARGE_SOFT_BUDGET_BYTES` = 100,000 bytes. Propagates through `compileScrml({ chunkSizeBudgetBytes })` → `runCG` → `emitPerRouteChunks`.

## Pre-commit Hook (scripts/git-hooks/pre-commit)

Activated per-machine via: `git config core.hooksPath scripts/git-hooks`

Steps:
1. Warn if committing directly to `main` branch
2. Run: `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail`
3. Exit 1 on test failure

## Pre-push Hook (scripts/git-hooks/pre-push — NEW S102)

Source-controlled baseline. Install via `bash scripts/git-hooks/install.sh`.

Steps:
1. Parse push payload (one line per ref: `<local-ref> <local-sha> <remote-ref> <remote-sha>`)
2. Detect any release-tag push (`refs/tags/v*`) in the payload
3. On release-tag push: run `node scripts/extract-readme-scrml.js` — compile-gate for all ` ```scrml ` fenced blocks in README.md
4. Regular (non-release-tag) pushes: skip README gate

README gate behavior: default-gated (opt-OUT via `// gate: skip` marker in first non-blank line of block). Compile + lint-clean check; ghost-pattern lint W-LINT-* failures fail the gate.

## Bun Test Config (bunfig.toml)

```toml
[test]
root = "compiler/tests/"
timeout = 10000
```

Run subsets:
- `bun test compiler/tests/unit`           — unit tests only
- `bun test compiler/tests/integration`    — integration tests only
- `bun test compiler/tests/conformance`    — conformance tests only
- `bun test compiler/tests/unit/<name>.test.js`  — single test file

## No CI/CD Pipeline

No `.github/workflows/`, `.gitlab-ci.yml`, or `Jenkinsfile` detected. CI is via local pre-commit and pre-push hooks.

## Docker

No Dockerfile or docker-compose.yml detected. The dev server (`scrml dev`) runs via Bun directly.

## Self-Host Dist Artifacts

Gitignored; must be built locally on each machine:
- `compiler/dist/self-host/*.js`
- `compiler/self-host/dist/tab.js`

Rebuild: `bun run scripts/rebuild-self-host-dist.ts` and `bun run scripts/rebuild-tab-dist.ts`

## PGO Performance Tooling (S102)

| File | Purpose |
|------|---------|
| scripts/benchmark-perf-baseline.ts | Capture per-stage baseline (trucking-dispatch + contact-book + todomvc corpora). Output: benchmarks/perf-baseline.json |
| scripts/perf-regression-check.ts | Re-run harness, diff vs baseline per stage, flag >TOLERANCE% slower (exit 1) |
| benchmarks/perf-baseline.json | Versioned baseline JSON. Reference: docs/changes/perf-characterization/CLOSURE-ANALYSIS-COST.md (S94) |

## Tags
#scrmlts #map #build #scripts #bun #pre-commit #pre-push #self-host #playwright #e2e #s103 #v0.3.3 #generate-auth #emit-per-route #chunk-size-budget #q-open-5 #pgo-tooling #perf-baseline #readme-gate

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [config.map.md](./config.map.md)
- [test.map.md](./test.map.md)
