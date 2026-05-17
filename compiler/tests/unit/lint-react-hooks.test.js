/**
 * S97 — W-LINT-016 React-hook pattern lint
 *
 * Adopter reaches for React hooks (useState, useEffect, useRef, useMemo,
 * useCallback, useContext, useReducer, useLayoutEffect, useTransition,
 * useDeferredValue, useId, useSyncExternalStore, useInsertionEffect)
 * inside a scrml logic block. Pre-fix `${ const x = useState(0) }`
 * fired generic `E-SCOPE-001` ("undefined identifier `useState`") —
 * caught but adopter-unhelpful (no hint about scrml's state primitive).
 *
 * Post-fix: `W-LINT-016` fires with a framework-specific correction
 * pointing at the scrml equivalents:
 *   useState   → `<x> = init` (read `@x`, write `@x = expr`)
 *   useEffect  → reactive `${...}` blocks + `<onMount>` / `<onCleanup>`
 *   useRef     → `<x> = init` OR `bind:this=@el` for DOM refs
 *   useMemo    → `const <x> = expr` (derived cell, deps auto-tracked)
 *   useCallback→ just declare fn (no re-render model → no memoization)
 *   useContext → component prop-passing / stdlib
 *   useReducer → `<engine for=Type>` with `rule=` contracts
 *
 * SPEC authority: §6 (state), §6.7 (lifecycle), §51 (engines).
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";

function lintCodes(src) {
  return lintGhostPatterns(src).map((d) => d.code);
}

describe("§1 — W-LINT-016 fires on React hook calls", () => {
  test("§1.1 useState(0) in logic block", () => {
    const src = `<program>\${ const [c, setC] = useState(0) }<div>\${c}</div></program>`;
    expect(lintCodes(src)).toContain("W-LINT-016");
  });

  test("§1.2 useEffect(fn, deps) in logic block", () => {
    const src = `<program>\${ useEffect(() => { log() }, []) }<div>x</div></program>`;
    expect(lintCodes(src)).toContain("W-LINT-016");
  });

  test("§1.3 useRef, useMemo, useCallback all fire", () => {
    const src = `<program>\${
      const r = useRef(null)
      const m = useMemo(() => compute(), [])
      const cb = useCallback(() => doIt(), [])
    }<div>x</div></program>`;
    const codes = lintCodes(src);
    // All three calls should fire the same code
    const w16Count = codes.filter((c) => c === "W-LINT-016").length;
    expect(w16Count).toBe(3);
  });

  test("§1.4 useReducer fires (suggests engine)", () => {
    const src = `<program>\${ const [s, dispatch] = useReducer(red, init) }<div>x</div></program>`;
    expect(lintCodes(src)).toContain("W-LINT-016");
  });

  test("§1.5 useContext, useLayoutEffect, useTransition all fire", () => {
    const src = `<program>\${
      const v = useContext(Ctx)
      useLayoutEffect(() => sync(), [])
      const [isPending, start] = useTransition()
    }<div>x</div></program>`;
    const codes = lintCodes(src);
    const w16Count = codes.filter((c) => c === "W-LINT-016").length;
    expect(w16Count).toBe(3);
  });

  test("§1.6 newer React 19 hooks (useId, useDeferredValue, etc.)", () => {
    const src = `<program>\${
      const id = useId()
      const deferred = useDeferredValue(value)
      const v = useSyncExternalStore(sub, get)
      useInsertionEffect(() => {}, [])
    }<div>x</div></program>`;
    const codes = lintCodes(src);
    const w16Count = codes.filter((c) => c === "W-LINT-016").length;
    expect(w16Count).toBe(4);
  });
});

describe("§2 — correction message names scrml equivalents", () => {
  test("§2.1 diagnostic includes scrml-primitive guidance", () => {
    const src = `<program>\${ const x = useState(0) }<div>x</div></program>`;
    const diags = lintGhostPatterns(src);
    const w16 = diags.find((d) => d.code === "W-LINT-016");
    expect(w16).toBeDefined();
    // The correction should name scrml-primitive forms so adopter knows where to look
    const msg = w16.message ?? "";
    expect(msg).toMatch(/<x>\s*=/);            // state-decl shape mentioned
    expect(msg).toMatch(/\$\{\.\.\.\}|reactive/i); // reactive block mentioned
    expect(msg).toMatch(/engine/i);             // engine mentioned (reducer mapping)
  });
});

describe("§3 — anti-cases: don't false-fire", () => {
  test("§3.1 useState in a `//` comment skipped", () => {
    const src = `<program>
    // useState(0) is a React hook — don't use it here
    <x> = 0
    <div>\${@x}</div>
</program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-016");
  });

  test("§3.2 bare `useState` reference without `(` not flagged", () => {
    // The pattern requires `useState(` — a bare reference like
    // `console.log(useState)` (rare/invalid in scrml but defensive)
    // shouldn't fire. The call shape is what signals adopter intent.
    const src = `<program>\${ const ref = useState }<div>x</div></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-016");
  });

  test("§3.3 word containing 'useState' substring (e.g., 'myuseState') not flagged", () => {
    // `\b` word-boundary in the regex prevents partial-word matches.
    const src = `<program>\${ const myuseState = 0 }<div>x</div></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-016");
  });
});
