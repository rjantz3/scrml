// scrml:compiler/pa — runtime shim (DEFERRED)
//
// Per-stage sibling of compiler/runtime/stdlib/compiler.js (the umbrella).
// Mirrors stdlib/compiler/pa.scrml's export surface; every export is a thunk
// that throws at call time so an adopter who imports + invokes the shim sees
// loud-failure attribution instead of silent breakage.
//
// The scrml:compiler family is KNOWN-DEFERRED — see the survey memo at
// docs/changes/bug-8-followup/scrml-compiler-shim-survey-s121-2026-05-22.md
// for the rationale (Option (d), formalized as W-STDLIB-COMPILER-DEFERRED).

function _unavailable(name) {
  throw new Error(
    `[scrml:compiler/pa] ${name}() is not available at runtime via the scrml:compiler/pa shim. `
      + `The scrml:compiler family is currently DEFERRED — see W-STDLIB-COMPILER-DEFERRED `
      + `+ docs/changes/bug-8-followup/scrml-compiler-shim-survey-s121-2026-05-22.md. `
      + `For now, invoke the compiler via the CLI (\`scrml compile\`) or import directly from `
      + `the compiler-source path: import { runPA } from "<...>/compiler/src/protect-analyzer.ts".`,
  );
}

export const runPA = (...args) => _unavailable("runPA");
export const PAError = (...args) => _unavailable("PAError");
