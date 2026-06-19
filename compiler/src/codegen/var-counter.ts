// Variable naming — counter + generator
//
// Mangling convention: user identifiers become `_scrml_<safe>_<N>` where N
// is a per-compile counter. The trailing `_<digit>` suffix is the marker
// that distinguishes mangled user code from compiler-internal runtime
// helpers (which emit bare words like `_scrml_effect`, `_scrml_lift`,
// `_scrml_reactive_set` with no counter suffix).
//
// Test harnesses that invoke user functions by their mangled form MUST
// use this `_<digit>` marker to distinguish user code from internals —
// see `compiler/tests/helpers/extract-user-fns.js` for the shared filter.
// Naive prefix matches like `/^_scrml_effect/` will swallow both the
// runtime helper AND any user function named `effect`.

let _varCounter = 0;

export function genVar(baseName: string): string {
  _varCounter++;
  const safe = (baseName || "v").replace(/[^A-Za-z0-9_$]/g, "_");
  return `_scrml_${safe}_${_varCounter}`;
}

export function resetVarCounter(): void {
  _varCounter = 0;
}

// ss1 — save/restore the per-compile counter around an ADDITIVE emit pass that
// must NOT perturb the global mangling sequence. The module value-export block
// (emit-server.ts `emitModuleValueExports`) re-emits already-declared pure
// helpers via `emitFnShortcutBody`, which may advance the counter; snapshotting
// it before and restoring after keeps every OTHER file's `_scrml_handler_*_<N>`
// / mangled-user-fn suffixes byte-stable (the value-export bindings themselves
// are emitted under their public names, so they need no counter value).
export function getVarCounter(): number {
  return _varCounter;
}

export function setVarCounter(n: number): void {
  _varCounter = n;
}
