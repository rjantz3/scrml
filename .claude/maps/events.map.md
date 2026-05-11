# events.map.md
# project: scrmlts
# updated: 2026-05-10T19:30:00Z  commit: f182f44

## Status

No external event bus, EventEmitter, Kafka, RabbitMQ, or pubsub infrastructure detected in the compiler source. The compiler is a pure transformation tool (scrml → HTML/JS/CSS) without runtime event brokering in the compiler process itself.

## Runtime Pub/Sub (in compiled output)

The compiler EMITS WebSocket pub/sub code into compiled server output. This is output of the compiler, not the compiler's own architecture.

### WebSocket Topics (compiler/src/codegen/emit-channel.ts, emit-server.ts)

| Mechanism | Where emitted | Pattern |
|-----------|---------------|---------|
| ws.subscribe(ws.data.__topic) | emit-channel.ts:476 | Server subscribes the WebSocket to a topic on connect |
| ws.publish(ws.data.__topic, raw) | emit-channel.ts:501 | Server broadcasts to all subscribers of a topic |
| _scrml_srv.publish(topicExpr, msg) | emit-server.ts:141 | Server function publishes data to a channel topic |

### meta.emit() Runtime Placement (compiler/src/runtime-template.js:1029)

The runtime has a `meta.emit()` mechanism for compile-time-controlled DOM injection at ^{} block positions. This is a one-way compiler-to-DOM event, not pub/sub.

### _scrml_effect / _scrml_reactive_subscribe (runtime-template.js)

The compiled client runtime has reactive subscriptions via:
- `_scrml_reactive_subscribe(name, fn)` — subscribe to a named reactive cell; fires on set
- `_scrml_effect(fn)` — run fn reactively; subscribes to all cells accessed during execution

These are the reactive wiring primitives used by event-wiring emitters. They are in compiled output, not in the compiler itself.

## Bus Type

None in the compiler process. Compiled outputs use Bun's WebSocket pub/sub API (topic-based) for channel features.

## Tags
#scrmlts #map #events #websocket #pubsub #reactive #channels

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
