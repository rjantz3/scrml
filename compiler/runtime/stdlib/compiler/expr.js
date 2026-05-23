// scrml:compiler/expr — runtime shim (DEFERRED)
//
// Per-stage sibling of compiler/runtime/stdlib/compiler.js (the umbrella).
// Mirrors stdlib/compiler/expr.scrml's export surface; every export is a thunk
// that throws at call time so an adopter who imports + invokes the shim sees
// loud-failure attribution instead of silent breakage.
//
// The scrml:compiler family is KNOWN-DEFERRED — see the survey memo at
// docs/changes/bug-8-followup/scrml-compiler-shim-survey-s121-2026-05-22.md
// for the rationale (Option (d), formalized as W-STDLIB-COMPILER-DEFERRED).

function _unavailable(name) {
  throw new Error(
    `[scrml:compiler/expr] ${name}() is not available at runtime via the scrml:compiler/expr shim. `
      + `The scrml:compiler family is currently DEFERRED — see W-STDLIB-COMPILER-DEFERRED `
      + `+ docs/changes/bug-8-followup/scrml-compiler-shim-survey-s121-2026-05-22.md. `
      + `For now, invoke the compiler via the CLI (\`scrml compile\`) or import directly from `
      + `the compiler-source path: import { parseExpression } from "<...>/compiler/src/expression-parser.ts".`,
  );
}

export const parseExpression = (...args) => _unavailable("parseExpression");
export const parseStatements = (...args) => _unavailable("parseStatements");
export const walk = (...args) => _unavailable("walk");
export const extractIdentifiersFromAST = (...args) => _unavailable("extractIdentifiersFromAST");
export const extractReactiveDepsFromAST = (...args) => _unavailable("extractReactiveDepsFromAST");
export const astToJs = (...args) => _unavailable("astToJs");
export const rewriteReactiveRefsAST = (...args) => _unavailable("rewriteReactiveRefsAST");
export const rewriteServerReactiveRefsAST = (...args) => _unavailable("rewriteServerReactiveRefsAST");
