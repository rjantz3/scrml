# build.map.md
# project: scrmlts
# updated: 2026-05-26T00:00:00Z  commit: 3a660c7c

## Development Commands (root package.json scripts)

| Command | What it does |
|---|---|
| `compile` | `bun run compiler/src/cli.js compile` — compile scrml source |
| `watch` | `bun --watch compiler/src/cli.js compile` — recompile on change |
| `test` | `bun test compiler/tests/` (pretest compiles samples first) |
| `pretest` | `bash scripts/compile-test-samples.sh` — runs automatically before `test` |
| `test:coverage` | `bun test compiler/tests/ --coverage` |
| `bench` | compile samples/compilation-tests/ with --timing |
| `security` | compile compilation-tests + `node --check` every emitted client JS |
| `lsp` | `bun run lsp/server.js --stdio` — start Language Server |
| `docs:build` | `bun run docs/build.ts` — build docs site |
| `e2e` | `playwright test --config=e2e/playwright.config.ts` |
| `e2e:ui` | Playwright UI mode |
| `e2e:docs` | `playwright test --config=e2e/playwright.docs.config.ts` |
| `e2e:install` | `playwright install chromium firefox webkit` |

(Scripts UNCHANGED since the prior watermark.)

## CLI Subcommands (compiler/src/cli.js)

| Subcommand | What it does |
|---|---|
| `scrml compile <file\|dir>` | compile scrml source |
| `scrml dev <file\|dir>` | dev server with watch |
| `scrml build <dir>` | production build; **MCP-V0.D: injects `scrml:mcp` boot import into `_server.js` when source carries `<program mcp>` (dev-only NODE_ENV gate or always)** |
| `scrml migrate <file\|dir>` | source migration tooling |
| `scrml promote --match <file\|dir>` | if-chain → `<match>` promotion. SHIPPED S66. |
| `scrml promote --each <file\|dir>` | **LANDED S134 (Iteration Landing 3, §56.10)** — Tier-0 `${ for/lift }` → Tier-1 `<each>` promotion; `--shorthand` flag applies `:`-shorthand for single-expression-body sites; `--dry-run`, `--check`, `--exclude` all supported. `--engine` (Tier C) is still deferred stub. |
| `scrml generate / init / serve` | scaffolding + static serving |

### `scrml promote --each` detail (LANDED S134)

`applyEachRewrite(sourceText, sites, targetLine, opts)` — descending-offset rewrite loop (mirrors `--match`'s applyMatchRewrite shape). `rewriteOneIteration(source, site, opts)` — single Tier-0 site rewrite. `promoteEachOnFile(filePath, targetLine, opts, cwd)` — file-level driver. `--shorthand` flag: when the per-item template is single-expression-shaped (e.g. `<li>${item.name}</>`) the rewrite auto-applies `:`-shorthand → `<li : @.name>`.

Exit codes: `0` = success/no sites, `1` = error, `2` = ambiguous site or `--engine` stub.

Flags (cli.js, sorted): `--check`, `--chunk-size-budget=<bytes>`, `--convert-legacy-css`, `--debug-perf`, `--dry-run`, `--each`, `--embed-runtime`, `--emit-batch-plan`, `--emit-machine-tests`, `--emit-reachability`, `--engine`, `--exclude`, `--include`, `--match`, `--minify`, `--no-default-excludes`, `--output`/`--output-dir`, `--parser=scrml-native` (C2 routing — opt-in native parser), `--port`, `--shorthand` (`--each` only), `--verbose`, `--version`, `--watch`.

## Build & Release

No bundler step — scrml runs directly under Bun. Generated dist artifacts: `compiler/dist/`, `compiler/native-parser/dist/`, `compiler/self-host/dist/`, `stdlib/*/dist/`, `samples/dist/`. Native-parser dist rebuilt via `scripts/rebuild-bs-dist.ts` / `rebuild-tab-dist.ts` / `rebuild-self-host-dist.ts`. SPEC-INDEX regenerated via `scripts/regen-spec-index.ts` (re-run at S131 for §17.7 + §3.4 additions; SPEC.md now 30552 lines).

## CI/CD Pipeline

No hosted CI. `.github/` contains ONLY `FUNDING.yml` (no `workflows/`); GitLab + Jenkins absent. Quality gates are local git hooks; install via `bash scripts/git-hooks/install.sh`.

### Pre-commit hook  [scripts/git-hooks/pre-commit]
Warns on direct commits to `main`. Runs `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail` (browser tests excluded). Non-zero test exit blocks the commit. Never bypass with `--no-verify` without explicit user authorization (pa.md Rule 0).

### Pre-push hook  [scripts/git-hooks/pre-push]
Runs the full test suite + gauntlet quick check. README gate (extract-readme-scrml.js) runs only when push payload contains a release-tag ref (`refs/tags/v*`).

## Test Runner Config

`bunfig.toml`: `[test] root="compiler/tests/", timeout=10000`.

## Docker

No Dockerfile / docker-compose. Not containerized.

## Tags
#scrmlts #map #build #bun #git-hooks #cli #mcp-program-attr #promote-each-landed #iteration-landing-3 #s131 #s134

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [test.map.md](./test.map.md)
