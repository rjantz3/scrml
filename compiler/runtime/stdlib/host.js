// scrml:host — runtime shim
//
// Hand-written ES module implementing safeCall and safeCallAsync — the
// JS-host-throw containment primitives declared in stdlib/host/index.scrml.
//
// Used by the compiler's stdlib bundler (bundleStdlibForRun in api.js) to
// make `import { safeCall, safeCallAsync, HostError } from "scrml:host"`
// resolvable at runtime. The shim is copied to <outputDir>/_scrml/host.js.
//
// Design: approach (α) — see stdlib/host/index.scrml header for rationale.
// The try/catch lives here and nowhere else. scrml source never sees it.
//
// Surface (must match stdlib/host/index.scrml exports):
//   - HostError                     — variant constructor object (mirrors enum)
//   - safeCall(thunk)               → success value | scrml-error-shape
//   - safeCallAsync(thunk)          → Promise<success value | scrml-error-shape>

// ---------------------------------------------------------------------------
// HostError — mirrors the scrml enum declared in stdlib/host/index.scrml
//
// Variant constructor: HostError.Thrown(message, name)
//   → { variant: "Thrown", data: { message, name } }
//
// This is the same shape the scrml compiler emits for enum variants used in
// compiled client code (see emit-control-flow.ts emitVariantBindingPrelude).
// ---------------------------------------------------------------------------

export const HostError = Object.freeze({
  Thrown: function(message, name) {
    return { variant: "Thrown", data: { message, name } };
  },
  variants: ["Thrown"],
});

// ---------------------------------------------------------------------------
// normalizeThrown(thrown) — shared normalization for caught values.
//
// Converts any thrown value (Error, string, null, undefined, number, object)
// into the { message, name } pair used by the scrml error sentinel.
//
// Rules:
//   Error instance (or object with string .message):
//     message = thrown.message
//     name    = thrown.name (if a non-empty string), else "Error"
//   Everything else (null, undefined, string, number, boolean, plain object):
//     message = String(thrown)  — with special cases for null/undefined
//     name    = "UnknownThrow"
// ---------------------------------------------------------------------------

function normalizeThrown(thrown) {
  var message;
  var name;

  if (thrown !== null && thrown !== undefined && typeof thrown.message === "string") {
    // Covers Error instances and any object with a string .message property.
    message = thrown.message;
    name = (typeof thrown.name === "string" && thrown.name.length > 0)
      ? thrown.name
      : "Error";
  } else {
    // Non-Error throw: null, undefined, string, number, boolean, plain object.
    message = thrown === null
      ? "null"
      : thrown === undefined
        ? "undefined"
        : String(thrown);
    name = "UnknownThrow";
  }

  return { message: message, name: name };
}

// ---------------------------------------------------------------------------
// buildErrorSentinel({ message, name }) — produce the scrml failable-error
// sentinel shape.
//
// This is the exact shape that the scrml compiler's !{} handler tests for
// (emit-logic.ts "guarded-expr" case):
//   if (result && result.__scrml_error) { /* arm dispatch on result.variant */ }
// ---------------------------------------------------------------------------

function buildErrorSentinel(normalized) {
  return {
    __scrml_error: true,
    type: "HostError",
    variant: "Thrown",
    data: { message: normalized.message, name: normalized.name },
  };
}

// ---------------------------------------------------------------------------
// safeCall(thunk) — call a zero-arg thunk, catching any synchronous JS exception.
//
// Returns the thunk's return value on success.
// Returns the scrml failable-error sentinel on any throw.
//
// Use this for synchronous thunks. For thunks that return Promises and may
// reject, use safeCallAsync instead.
//
// Argument normalization for non-Error throws:
//   throw new Error("msg")       → message: "msg",            name: "Error"
//   throw "string value"         → message: "string value",   name: "UnknownThrow"
//   throw { message: "obj" }     → message: "[object Object]", name: "UnknownThrow"
//   throw null                   → message: "null",            name: "UnknownThrow"
//   throw undefined              → message: "undefined",       name: "UnknownThrow"
//   throw 42                     → message: "42",              name: "UnknownThrow"
// ---------------------------------------------------------------------------

export function safeCall(thunk) {
  try {
    return thunk();
  } catch (thrown) {
    return buildErrorSentinel(normalizeThrown(thrown));
  }
}

// ---------------------------------------------------------------------------
// safeCallAsync(thunk) — call a zero-arg async thunk, catching any rejection.
//
// Returns a Promise that resolves to the thunk's resolved value on success,
// or to the scrml failable-error sentinel if the thunk throws or its
// Promise rejects.
//
// IMPORTANT — await at call site:
//   safeCallAsync returns a Promise. The caller must await the Promise before
//   applying !{} error handling. In a scrml server function body:
//
//       const rawResult = await safeCallAsync(() => Bun.password.verify(pw, hash))
//       const ok = rawResult !{ | ::Thrown(message, name) -> handleErr(message) }
//
//   If the Promise is not awaited, the !{} guard sees a Promise object (not
//   an error sentinel) and the error arm is never entered.
//
// Normalization rules for the caught value are identical to safeCall.
// ---------------------------------------------------------------------------

export async function safeCallAsync(thunk) {
  try {
    return await thunk();
  } catch (thrown) {
    return buildErrorSentinel(normalizeThrown(thrown));
  }
}
