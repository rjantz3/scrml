// scrml:compiler/mc — runtime shim (DEFERRED)
//
// Per-stage sibling of compiler/runtime/stdlib/compiler.js (the umbrella).
// Mirrors stdlib/compiler/mc.scrml's export surface; every export is a thunk
// that throws at call time so an adopter who imports + invokes the shim sees
// loud-failure attribution instead of silent breakage.
//
// The scrml:compiler family is KNOWN-DEFERRED — see the survey memo at
// docs/changes/bug-8-followup/scrml-compiler-shim-survey-s121-2026-05-22.md
// for the rationale (Option (d), formalized as W-STDLIB-COMPILER-DEFERRED).

function _unavailable(name) {
  throw new Error(
    `[scrml:compiler/mc] ${name}() is not available at runtime via the scrml:compiler/mc shim. `
      + `The scrml:compiler family is currently DEFERRED — see W-STDLIB-COMPILER-DEFERRED `
      + `+ docs/changes/bug-8-followup/scrml-compiler-shim-survey-s121-2026-05-22.md. `
      + `For now, invoke the compiler via the CLI (\`scrml compile\`) or import directly from `
      + `the compiler-source path: import { runMetaChecker } from "<...>/compiler/src/meta-checker.ts".`,
  );
}

export const runMetaChecker = (...args) => _unavailable("runMetaChecker");
export const MetaError = (...args) => _unavailable("MetaError");
export const buildFileTypeRegistry = (...args) => _unavailable("buildFileTypeRegistry");
export const createReflect = (...args) => _unavailable("createReflect");
export const bodyUsesCompileTimeApis = (...args) => _unavailable("bodyUsesCompileTimeApis");
