# events.map.md
# project: scrmlts
# updated: 2026-05-14  commit: b28f493

## Status

No external event bus, EventEmitter, Kafka, RabbitMQ, or pubsub infrastructure detected in the compiler source. The compiler is a pure transformation tool (scrml → HTML/JS/CSS) without runtime event brokering in the compiler process itself.

## Runtime Pub/Sub (in compiled output)

The compiler EMITS WebSocket pub/sub code into compiled server output. This is output of the compiler, not the compiler's own architecture.

### WebSocket Topics (compiler/src/codegen/emit-channel.ts, emit-server.ts)

| Mechanism | Where emitted | Pattern |
|-----------|---------------|---------|
| ws.subscribe(ws.data.__topic) | emit-channel.ts | Server subscribes the WebSocket to a topic on connect |
| ws.publish(ws.data.__topic, raw) | emit-channel.ts | Server broadcasts to all subscribers of a topic |
| _scrml_srv.publish(topicExpr, msg) | emit-server.ts | Server function publishes data to a channel topic |

### Channel Placement Rules (v0.3, Insight 30)

Two canonical placements for `<channel>`:
1. **Inside `<program>`** — standard v0.3 placement. Cross-page shared state.
2. **PURE-CHANNEL-FILE** — file-top `<channel>` in a file with NO `<program>`. Module-file dispensation per §38.1 + engine-parity precedent. Does NOT fire `E-CHANNEL-OUTSIDE-PROGRAM`.

Violation shape that fires `E-CHANNEL-OUTSIDE-PROGRAM`: `<channel>` at file-top in a file that ALSO contains `<program>` as a sibling.
Violation shape that fires `E-CHANNEL-INSIDE-PAGE`: `<channel>` inside `<page>`.

Channel placement pre-check enforced by shared AST walker in `compiler/src/validators/ast-walk.ts`.

### §36 Input Device Event Model

`<keyboard id=...>`, `<mouse id=...>`, `<gamepad id=...>` elements compile to input-state capture loops. These are NOT pub/sub channels — they are polled-state mirrors captured via requestAnimationFrame event handlers. Input state is addressed by id and read as reactive cells in scrml source. Duplicate `id=` within a scope fires E-INPUT-005.

### Wire Format Sync Messages (§57 + §16, emit-logic.ts)

The compiler emits sync wire-format messages on every write to a channel-declared cell. The wire format is: `{ __type: "__sync", __key: "<varName>", __val: <value> }`. Receiving end updates the corresponding cell. This is NOT the §57 wire format (which covers server-fn return types `T | not` — absence envelope).

### A-4 Chunk Prefetch Signals (NEW S91 — emitted into client JS / HTML)

The compiler emits client-side JS into compiled browser output that triggers chunk loading. This is output, not compiler pub/sub.

| Signal | Mechanism | Where emitted |
|--------|-----------|---------------|
| Tier-1 idle prefetch | `_scrml_prefetch_tier1(chunkUrl)` call at IIFE tail | route-splitter.ts composeInitialChunk; uses requestIdleCallback + setTimeout(fn,1) Safari fallback |
| Tier-2 hover prefetch | mouseenter + focus once-listeners on `[data-scrml-prefetch]` anchors | composeInitialChunk hover-handler block; `_scrml_prefetch_tier2(routePath, role)` |
| Tier-N on-demand | `_scrml_fetch_chunk(epId, role, tier)` returns Promise<string> | structural-scaffolding only in v0.3; fires in v0.4+ |
| Role detection bootstrap | localStorage > cookie > `<meta name="scrml-role">` > `"_anonymous"` | augmentHtmlForChunks (emit-html.ts) injects `<script>` per route HTML file |
| Chunk manifest | `window._SCRML_CHUNKS = { ... }` | augmentHtmlForChunks injects inline `<script>` |
| Modulepreload hints | `<link rel="modulepreload" href="...">` for non-empty tier-1 | augmentHtmlForChunks per route HTML file |

### meta.emit() Runtime Placement (compiler/src/runtime-template.js)

One-way compiler-to-DOM; not pub/sub. Compile-time-controlled DOM injection at ^{} block positions.

### _scrml_effect / _scrml_reactive_subscribe (runtime-template.js)

Reactive subscriptions in compiled client runtime:
- `_scrml_reactive_subscribe(name, fn)` — subscribe to a named reactive cell; fires on set
- `_scrml_effect(fn)` — run fn reactively; subscribes to all cells accessed during execution

## Bus Type

None in the compiler process. Compiled outputs use Bun's WebSocket pub/sub API (topic-based) for channel features. A-4 chunk-prefetch uses browser fetch() API (tier-N: `_scrml_fetch_chunk`) and requestIdleCallback (tier-1: `_scrml_prefetch_tier1`).

## Tags
#scrmlts #map #events #websocket #pubsub #reactive #channels #s91 #pure-channel-file #wire-format #sync-messages #chunk-prefetch #tier1 #tier2

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
