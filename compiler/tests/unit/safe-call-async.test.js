/**
 * safe-call-async — unit tests for scrml:host safeCallAsync primitive
 *
 * Tests the runtime shim at compiler/runtime/stdlib/host.js directly.
 * The shim is imported as an ES module so the async try/catch implementation
 * is exercised exactly as it runs in bundled output.
 *
 * Coverage:
 *   SCA-01  Async thunk that resolves returns its value unchanged
 *   SCA-02  Async thunk resolving to null passes null through (falsy-return safety)
 *   SCA-03  Async thunk resolving to undefined passes undefined through
 *   SCA-04  Async thunk resolving to 0 passes 0 through (falsy is not an error)
 *   SCA-05  Async thunk resolving to empty string passes "" through
 *   SCA-06  Async thunk that throws Error → HostError::Thrown with message and name
 *   SCA-07  Async thunk that throws TypeError → name: "TypeError"
 *   SCA-08  Async thunk that rejects with string → name: "UnknownThrow"
 *   SCA-09  Async thunk that rejects with null → message: "null", name: "UnknownThrow"
 *   SCA-10  Async thunk that rejects with undefined → message: "undefined"
 *   SCA-11  Async thunk that rejects with a number → message string-coerced
 *   SCA-12  Promise.reject(new Error(...)) caught — rejection path normalized
 *   SCA-13  Error sentinel shape: __scrml_error: true, type: "HostError", variant: "Thrown"
 *   SCA-14  Successful result does NOT have __scrml_error property
 *   SCA-15  Sync thunk that returns Promise.resolve(value) — resolved value passes through
 *   SCA-16  Sync thunk that throws synchronously (not via Promise.reject) — still caught
 *   SCA-17  Callable from a server function context (simulated async wrapper)
 *   SCA-18  safeCallAsync and safeCall share identical error sentinel shapes
 *   SCA-19  Non-awaited result is a Promise, not an error sentinel (await-discipline reminder)
 *   SCA-20  Nested: inner safeCallAsync error result is a value, not a rejection
 */

import { describe, test, expect } from "bun:test";
import { safeCallAsync, safeCall, HostError } from "../../runtime/stdlib/host.js";

// ---------------------------------------------------------------------------
// SCA-01 through SCA-05: falsy-return safety — success path
// ---------------------------------------------------------------------------

describe("safeCallAsync — success path (resolving thunk)", () => {

    test("SCA-01: async thunk that resolves returns its value", async () => {
        const result = await safeCallAsync(async () => 42);
        expect(result).toBe(42);
    });

    test("SCA-02: async thunk resolving to null passes null through", async () => {
        const result = await safeCallAsync(async () => null);
        // null is a valid return value — not an error
        expect(result).toBeNull();
    });

    test("SCA-03: async thunk resolving to undefined passes undefined through", async () => {
        const result = await safeCallAsync(async () => undefined);
        expect(result).toBeUndefined();
    });

    test("SCA-04: async thunk resolving to 0 passes 0 through (falsy is not an error)", async () => {
        const result = await safeCallAsync(async () => 0);
        expect(result).toBe(0);
    });

    test("SCA-05: async thunk resolving to empty string passes through", async () => {
        const result = await safeCallAsync(async () => "");
        expect(result).toBe("");
    });

    test("SCA-14: successful result does NOT have __scrml_error property", async () => {
        const result = await safeCallAsync(async () => ({ key: "value" }));
        expect(result).toEqual({ key: "value" });
        expect(result.__scrml_error).toBeUndefined();
    });

});

// ---------------------------------------------------------------------------
// SCA-06 through SCA-13: error path — throw / rejection normalization
// ---------------------------------------------------------------------------

describe("safeCallAsync — error path (throw / rejection normalization)", () => {

    test("SCA-06: async thunk that throws Error → HostError::Thrown", async () => {
        const result = await safeCallAsync(async () => {
            throw new Error("async failure");
        });
        expect(result.__scrml_error).toBe(true);
        expect(result.type).toBe("HostError");
        expect(result.variant).toBe("Thrown");
        expect(result.data.message).toBe("async failure");
        expect(result.data.name).toBe("Error");
    });

    test("SCA-07: async thunk throwing TypeError uses the error's .name field", async () => {
        const result = await safeCallAsync(async () => {
            throw new TypeError("type mismatch");
        });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("type mismatch");
        expect(result.data.name).toBe("TypeError");
    });

    test("SCA-08: async thunk rejecting with string → name: UnknownThrow", async () => {
        const result = await safeCallAsync(() => Promise.reject("string rejection"));
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("string rejection");
        expect(result.data.name).toBe("UnknownThrow");
    });

    test("SCA-09: async thunk rejecting with null → message: null, name: UnknownThrow", async () => {
        const result = await safeCallAsync(() => Promise.reject(null));
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("null");
        expect(result.data.name).toBe("UnknownThrow");
    });

    test("SCA-10: async thunk rejecting with undefined → message: undefined", async () => {
        const result = await safeCallAsync(() => Promise.reject(undefined));
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("undefined");
        expect(result.data.name).toBe("UnknownThrow");
    });

    test("SCA-11: async thunk rejecting with number → message is string-coerced", async () => {
        const result = await safeCallAsync(() => Promise.reject(42));
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("42");
        expect(result.data.name).toBe("UnknownThrow");
    });

    test("SCA-12: Promise.reject(new Error(...)) is caught and normalized", async () => {
        const result = await safeCallAsync(() => Promise.reject(new RangeError("out of range")));
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("out of range");
        expect(result.data.name).toBe("RangeError");
    });

    test("SCA-13: error sentinel has __scrml_error: true, type: HostError, variant: Thrown", async () => {
        const result = await safeCallAsync(async () => {
            throw new Error("sentinel check");
        });
        expect(result.__scrml_error).toBe(true);
        expect(result.type).toBe("HostError");
        expect(result.variant).toBe("Thrown");
        // data fields are strings
        expect(typeof result.data.message).toBe("string");
        expect(typeof result.data.name).toBe("string");
    });

});

// ---------------------------------------------------------------------------
// SCA-15, SCA-16: sync thunk variants handled by async wrapper
// ---------------------------------------------------------------------------

describe("safeCallAsync — sync thunks that return Promises or throw synchronously", () => {

    test("SCA-15: sync thunk returning Promise.resolve(value) — resolved value passes through", async () => {
        // The thunk itself is not declared async but returns a Promise.
        // safeCallAsync uses `await thunk()` so it correctly awaits the Promise.
        const result = await safeCallAsync(() => Promise.resolve("sync-returns-promise"));
        expect(result).toBe("sync-returns-promise");
    });

    test("SCA-16: sync thunk that throws synchronously is caught by safeCallAsync", async () => {
        // Even though the thunk is not async, safeCallAsync's try/catch runs
        // before the await, so synchronous throws inside the thunk are caught.
        const result = await safeCallAsync(() => {
            throw new SyntaxError("sync throw inside async wrapper");
        });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.name).toBe("SyntaxError");
        expect(result.data.message).toBe("sync throw inside async wrapper");
    });

});

// ---------------------------------------------------------------------------
// SCA-17: callable from a server function context
// ---------------------------------------------------------------------------

describe("safeCallAsync — callable from server function context", () => {

    test("SCA-17: safeCallAsync works inside a simulated async server function", async () => {
        // Simulates the pattern a scrml server function body would use:
        //   const rawResult = await safeCallAsync(() => hostApiCall())
        //   const value = rawResult !{ | ::Thrown(message, name) -> fallback }
        //
        // Here we simulate the !{} handler inline in JS.
        async function simulatedServerFn(input) {
            const rawResult = await safeCallAsync(async () => {
                if (input === "bad") {
                    throw new Error("host API failure");
                }
                return "processed: " + input;
            });

            // Simulate !{} error unwrapping (what the compiler emits for guarded-expr)
            if (rawResult && rawResult.__scrml_error) {
                return "fallback:" + rawResult.data.message;
            }
            return rawResult;
        }

        const good = await simulatedServerFn("hello");
        expect(good).toBe("processed: hello");

        const bad = await simulatedServerFn("bad");
        expect(bad).toBe("fallback:host API failure");
    });

});

// ---------------------------------------------------------------------------
// SCA-18: error sentinel shape matches safeCall exactly
// ---------------------------------------------------------------------------

describe("safeCallAsync — error sentinel shape matches safeCall", () => {

    test("SCA-18: safeCallAsync and safeCall produce identical sentinel shapes on throw", async () => {
        const syncResult = safeCall(() => { throw new TypeError("shape check"); });
        const asyncResult = await safeCallAsync(async () => { throw new TypeError("shape check"); });

        // Both must have the same structural fields
        expect(asyncResult.__scrml_error).toBe(syncResult.__scrml_error);
        expect(asyncResult.type).toBe(syncResult.type);
        expect(asyncResult.variant).toBe(syncResult.variant);
        expect(asyncResult.data.message).toBe(syncResult.data.message);
        expect(asyncResult.data.name).toBe(syncResult.data.name);
    });

});

// ---------------------------------------------------------------------------
// SCA-19: non-awaited result is a Promise (await-discipline reminder)
// ---------------------------------------------------------------------------

describe("safeCallAsync — await discipline", () => {

    test("SCA-19: non-awaited result is a Promise, not an error sentinel or resolved value", () => {
        // safeCallAsync returns a Promise. If the caller does NOT await it,
        // the !{} guard in emit-logic.ts sees a Promise object. The Promise
        // does not have __scrml_error, so the guard passes — the caller receives
        // the Promise itself, not the resolved/error value.
        //
        // This test documents that behavior so migration authors know they MUST
        // await safeCallAsync before applying !{} handling.
        const notAwaited = safeCallAsync(async () => "awaiting needed");
        expect(notAwaited).toBeInstanceOf(Promise);
    });

});

// ---------------------------------------------------------------------------
// SCA-20: nested safeCallAsync — inner error is a value, not a rejection
// ---------------------------------------------------------------------------

describe("safeCallAsync — nesting behavior", () => {

    test("SCA-20: inner safeCallAsync error result is returned as a value, not rethrown", async () => {
        // The inner safeCallAsync catches the rejection and resolves to an error sentinel.
        // The outer safeCallAsync sees the sentinel as a normal resolved value (not a rejection).
        // This verifies that safeCallAsync does not confuse sentinel objects with rejections.
        const result = await safeCallAsync(async () => {
            const inner = await safeCallAsync(async () => {
                throw new Error("inner async error");
            });
            // inner is the error sentinel — it IS a resolved value, not a rejection
            return inner;
        });

        // The outer safeCallAsync succeeded (it resolved with the inner sentinel)
        expect(result.__scrml_error).toBe(true);
        expect(result.variant).toBe("Thrown");
        expect(result.data.message).toBe("inner async error");
    });

});
