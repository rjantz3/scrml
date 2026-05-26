# config.map.md
# project: scrmlts
# updated: 2026-05-26T00:00:00Z  commit: c2d3f7ae

## Environment Variables

No `.env.example` / `.env.template` in the repo. Env vars referenced in source:

| Key | Required | Description |
|---|---|---|
| `SCRML_PORT` | optional | dev/serve server port (commands/dev.js, serve.js, serve-client.js) |
| `PORT` | optional | fallback server port in build-adapter emit (commands/build.js) |
| `NODE_ENV` | optional | read by the MCP-V0.D generated `_server.js` boot gate — when `<program mcp>` mode is "dev-only", MCP boot is skipped if `NODE_ENV === "production"` (runtime check, not compile-time) |

No secrets, API keys, or credential keys are configured in source.

## Feature Flags (compiler options passed to `compileScrml(options)`)

| Flag | Default | Description |
|---|---|---|
| `parser` | `null` | `"scrml-native"` routes per-file TAB through `nativeParseFile` (C2); any other value uses live BS+TAB path |
| `emitPerRoute` | `false` | per-route artifact splitter (SPEC §40.9.7). **NB: auto-flipped to `true` when `<program mcp>` is present (MCP-V0.D) so the descriptor sidecars + chunks.json emit.** |
| `testMode` | `false` | emit `<base>.test.js` from `~{}` blocks (SPEC §19.12.7) |
| `emitMachineTests` | `false` | emit `.machine.test.js` (SPEC §51.13) |
| `debugPerf` | `false` | `--debug-perf` PGO sub-stage instrumentation |
| `sourceMap` | `false` | emit Source Map v3 .map files |
| `convertLegacyCss` | `false` | pre-process `<style>` blocks to `#{…}` |
| `embedRuntime` | `false` | inline runtime instead of separate file |
| `gather` | `true` | auto-gather transitive .scrml import closure (SPEC §21.7) |
| `gatherLimit` | `5000` | GATHER_LIMIT cap; E-IMPORT-007 fires above |
| `mode` | `"browser"` | `"browser"` \| `"library"` |
| `chunkSizeBudgetBytes` | `100000` | `--chunk-size-budget=<bytes>`; W-CG-CHUNK-LARGE |
| `compilerSettings.lintTailwindUnrecognizedClass` | `"warn"` | `"warn"` \| `"off"` |
| `selfHostModules` | `null` | optional self-hosted pipeline-stage overrides |

### Derived program config (NOT a compileScrml option — extracted from `<program>` markup)

`ProgramConfig` (compute-program-config.ts) carries `authConfig`, `middlewareConfig`, and (NEW S130-S131) **`mcpConfig: McpConfig | null`**:

| Struct | Field | Description |
|---|---|---|
| `McpConfig` | `mode: "dev-only" \| "always"` | MCP-V0.D — present when `<program mcp>` is in the markup. `mcp` bare-present (`<program mcp>` / `<program mcp="">`) → "dev-only" (boolean-attribute idiom); `<program mcp="always">` → "always". When non-null, api.js auto-flips `emitPerRoute:true` and surfaces `mcpAutoActivated`/`mcpMode` on the result; null → zero compile-time effect (zero opt-out cost). |

## Config Files

### bunfig.toml
```
[test] root = "compiler/tests/"
[test] timeout = 10000
```

### package.json (root)
`type: "module"` / `private: true` / `workspaces: ["compiler"]`
`bin.scrml → compiler/bin/scrml.js` / `engines.bun: ">=1.3.13"` / version `0.6.0`

### compiler/package.json
Private sub-package; deps: acorn, astring; devDep: @happy-dom/global-registrator.

## CI / Deployment Config

No `.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`, `Dockerfile`, or `docker-compose.*`. `.github/` holds only `FUNDING.yml`. Quality gates are local git hooks (see build.map.md).

## Tags
#scrmlts #map #config #compiler-options #mcp-program-attr #s131

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
