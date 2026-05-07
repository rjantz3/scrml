# config.map.md
# project: scrmlTS
# updated: 2026-05-06T23:50:00Z  commit: 7334fb0

## Environment Variables

(Read from `process.env.*`, `Bun.env.*`, and `env?.<X>` references in compiler/src + lsp + scripts. No `.env.example` exists in this repo; values are provided ad-hoc by user / dispatch shells.)

PORT                       — optional — dev server port (alternative to SCRML_PORT).
SCRML_PORT                 — optional — preferred dev server port (overrides PORT).
SCRML_DEBUG                — optional — debug-mode toggle inside compiler passes; truthy enables extra logging in TS / DG / CG diagnostics.
SCRML_NO_ELIDE             — optional — when set to `1`, disables §51.5 validation elision (S28 env gate). Used in tests to force unelided output paths.
SCRML_STRICT_BOUNDARY      — optional — strict server/client boundary enforcement gate (used by emit-client / emit-server boundary tests).
SCRML_RUNTIME              — optional — opt-in runtime variant selector (read inside runtime-template emission).
SCRML_KEYWORDS             — optional — overrides the keyword set (test-only hook).
SCRML_MODULES              — optional — overrides registered modules (test-only hook).
SCRML_ATTRIBUTES           — optional — overrides attribute-registry contents (test-only hook).
SCRML_BATCH_IN__           — optional — internal toggle inside batch-planner.ts (double-underscore suffix indicates internal/test).
SCRML_PLACEHOLDER_PREFIX   — optional — overrides the placeholder prefix used by the rewriter / mangler.

## User-program env (only referenced syntactically inside compiled `.scrml` examples — NOT compiler config)

Bun.env.API_KEY, Bun.env.SECRET, Bun.env.X — appear only in test fixtures / examples. Not consumed by the compiler itself.

## Feature Flags
The compiler does not implement runtime feature flags. All gating is via env vars (above) or compiler settings (§28 `<program>` blocks inside .scrml files).

## Config Files

### `bunfig.toml` (repo root)
[test]
  root: "compiler/tests/"
  timeout: 10000

### `package.json` (repo root)
- `type: "module"` — ESM throughout.
- `workspaces: ["compiler"]`.
- `engines.bun: ">=1.3.13"`.
- `bin.scrml: "compiler/bin/scrml.js"` — installed CLI entry.
- `scripts.{compile,pretest,test,test:coverage,watch,bench,security,lsp}` — see build.map.md.

### `compiler/package.json`
Workspace child for the compiler itself (programmatic API, codegen, validators).

### `editors/vscode/package.json`
VSCode extension manifest (separate from compiler).

### `.gitignore`
Excludes: node_modules/, dist/, .claude/, *.log, .env, .env.local, editors/vscode/out/, editors/vscode/bun.lock, docs/SEO-LAUNCH.md (uncommitted local SEO draft), .tmp/ (per-dispatch agent scratchpad).

### CI / Deployment
NONE — no `.github/workflows/`, no `.gitlab-ci.yml`, no `Dockerfile`, no Terraform.

## Per-program scrml-level config (in-file, NOT environment)

`<program>` blocks inside `.scrml` files declare per-file compiler settings (§28 / §43); these are AST-level, not OS env. They flow through TAB → CG and configure routing, auth, middleware, title, etc.

## Security Note
NEVER commit `.env` / `.env.local`. `.gitignore` enforces this. The compiler does not load `.env` files itself; user programs use `Bun.env.*` directly which Bun reads from the process environment.

## Tags
#scrmlTS #map #config #env-vars #bun #s65

## Links
- [primary.map.md](./primary.map.md)
- [build.map.md](./build.map.md)
- [structure.map.md](./structure.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
