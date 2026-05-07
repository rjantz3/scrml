# events.map.md
# project: scrmlTS
# updated: 2026-05-06T23:50:00Z  commit: 7334fb0

## Status
The compiler itself does not use a pub/sub event bus. EventEmitter-style emission appears only in two places:

## Compiler-emitted runtime patterns (in user output, not in the compiler)

`<channel>` block (§38)         — declared in `.scrml` files. Lowered by `compiler/src/codegen/emit-channel.ts` (421 LOC) into a WebSocket-based bidirectional channel between server and client. Channels are typed (TypedAttrDecl) and route messages.

`server function*` SSE (§37)    — declared in `.scrml` files. Lowered to Server-Sent-Events generators that stream from server to client.

`when message` (§38)            — listener inside a `<channel>` body. AST `WhenMessageNode` (`kind: "when-message"`).

`when` effect                    — AST `WhenEffectNode` (`kind: "when-effect"`); generic effect listener.

`reactive-explicit-set`          — explicit reactive store mutation; AST `kind: "reactive-explicit-set"`.

## Compiler-internal pattern

The compiler is a synchronous pipeline with diagnostics returned as data. There is no `EventEmitter` in `compiler/src/`. The runtime template (`compiler/src/runtime-template.js`) contains client-side reactive scheduling and DOM event wiring, but does not expose a user-facing event bus.

## Bus type
- WebSocket channels:    `<channel>` blocks (per-file, §38).
- SSE streams:           `server function*` (§37).
- DOM events:            wired by `compiler/src/codegen/emit-event-wiring.ts` (696 LOC; incl. S34 fix for `${serverFn()}` markup DOM wiring).

There is no Kafka, RabbitMQ, Redis pub/sub, or in-process EventEmitter integration in the compiler or its standard runtime.

## Tags
#scrmlTS #map #events #channel #sse #spec-section-37 #spec-section-38 #s65

## Links
- [primary.map.md](./primary.map.md)
- [domain.map.md](./domain.map.md)
- [SPEC.md §37 §38](../../compiler/SPEC.md)
- [master-list.md](../../master-list.md)
