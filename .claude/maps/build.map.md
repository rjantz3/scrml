# build.map.md
# project: scrmlts
# updated: 2026-05-10T19:30:00Z  commit: f182f44

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

## Build & Release

| Command | What it does |
|---------|--------------|
| `bun run compiler/src/cli.js build <dir>` | Build production server bundle |
| `bun run scripts/rebuild-tab-dist.ts` | Regenerate all TAB dist artifacts [NEW S78] |
| `bun run scripts/rebuild-self-host-dist.ts` | Regenerate all self-host dist files [NEW S78] |
| `bun run scripts/rebuild-bs-dist.ts` | Regenerate block-splitter dist artifacts |
| `scripts/assemble-spec.sh` | Assemble SPEC.md from section files |
| `scripts/update-spec-index.sh` | Regenerate SPEC-INDEX.md |
| `scripts/compile-test-samples.sh` | Batch compile all samples/compilation-tests/ |

## Pre-commit Hook (scripts/git-hooks/pre-commit)

Activated per-machine via: `git config core.hooksPath scripts/git-hooks`

Steps:
1. Warn if committing directly to `main` branch
2. Run: `bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail`
3. Exit 1 on test failure

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

No `.github/workflows/`, `.gitlab-ci.yml`, or `Jenkinsfile` detected. CI is via local pre-commit hook.

## Docker

No Dockerfile or docker-compose.yml detected. The dev server (`scrml dev`) runs via Bun directly.

## Self-Host Dist Artifacts

Gitignored; must be built locally on each machine:
- `compiler/dist/self-host/*.js`
- `compiler/self-host/dist/tab.js`

Rebuild: `bun run scripts/rebuild-self-host-dist.ts` and `bun run scripts/rebuild-tab-dist.ts`

## Tags
#scrmlts #map #build #scripts #bun #pre-commit #self-host

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [config.map.md](./config.map.md)
- [test.map.md](./test.map.md)
