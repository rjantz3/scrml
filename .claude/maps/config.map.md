# config.map.md
# project: scrmlts
# updated: 2026-05-28T00:00:00Z  commit: 1fed5588

## Environment Variables

`SCRML_PORT` — optional — compiler dev/serve server port (default: 3100); read in `compiler/src/commands/serve.js` and `compiler/src/serve-client.js`
`PORT` — optional — production server port (default: 3000); emitted into generated server output by `compiler/src/commands/build.js`
`NODE_ENV` — optional — `"production"` disables MCP boot in generated output; also used by PGO dev-assertions path in `compute-program-config.ts`
`SCRML_MCP_WATCH` — optional — `"1"` enables MCP watch mode in generated server output; emitted by `compiler/src/commands/build.js`

No `.env.example` or `.env.template` file exists in this repo. The compiler reads minimal env vars; adopter apps use `<program>` attributes for configuration.

## Config Files

### bunfig.toml (root)
`[test].root`: `"compiler/tests/"` — Bun test root
`[test].timeout`: `10000` — per-test timeout ms

### compiler/package.json
`name`: `"compiler"`, `version`: `"0.2.0"` — compiler sub-package identity
Dependencies: `acorn@^8.16.0`, `astring@^1.9.0`

### package.json (root)
`name`: `"scrmlts"`, `version`: `"0.6.6"` — current release
`engines.bun`: `">=1.3.13"` — minimum Bun version
`bin.scrml`: `"compiler/bin/scrml.js"` — CLI entry
`workspaces`: `["compiler"]` — monorepo workspace

## compileScrml() Options (programmatic config)

Key options passed to `compileScrml(options)` in `compiler/src/api.js`:
`inputFiles` — array of .scrml file paths
`outputDir` — output directory
`verbose` — boolean; per-stage timing to log
`testMode` — boolean; emit `<base>.test.js` from `~{}` blocks (SPEC §19.12.7; dead-code-eliminated in production)
`parser` — `"scrml-native"` to opt-in to native parser (M5 flag; default null = BS+Acorn path)
`embedRuntime` — boolean; inline runtime vs separate file
`emitBatchPlan` — boolean; emit Stage 7.5 BatchPlan as JSON
`emitReachability` — boolean; emit `<base>.reachability.json`
`emitMachineTests` — boolean; emit `<base>.machine.test.js` per source
`debugPerf` — boolean; sub-stage timing for CG/RS/DG
`selfHostModules` — object; overrides for individual pipeline stages (splitBlocks, buildAST, runDG, runMetaChecker, bpp, tokenizer) for self-host integration testing

## Feature Flags

`lintTailwindUnrecognizedClass` — in compilerSettings; default `"warn"`; `"off"` suppresses W-TAILWIND-UNRECOGNIZED-CLASS
`lint.lifecycle-candidate`, `lint.match-rule-inert`, `lint.engine-initial-missing`, `lint.deprecated-machine` — per-project lint suppression configs (SPEC §28)

## Tags
#scrmlts #map #config #environment #compiler-options

## Links
- [primary.map.md](./primary.map.md)
- [build.map.md](./build.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
