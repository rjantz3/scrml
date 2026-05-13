/**
 * W-TRY-CATCH-IN-SCRML-SOURCE — Phase 3a regression guard lint.
 *
 * Fires a warning on every `try-stmt` AST node found in scrml source. scrml's
 * error model (§19) is values-not-exceptions: there is no try/catch, there
 * are no exceptions. Errors are values that flow through the type system and
 * are checked at compile time.
 *
 * For containing native JS-host throws at the boundary, use `safeCall` /
 * `safeCallAsync` from `scrml:host` (stdlib/host) — these wrap the throwing
 * call in a thunk and produce a failable result that the adopter pattern-
 * matches with `!{ ... }` arms.
 *
 * **Phase 3a context:** stdlib migration from try/catch to safeCall is in
 * progress. 4 of 4 sync sites migrated (S87+S88+earlier); 2 of 4 async sites
 * migrated (verifyPassword S88; verifyJwt S89); 2 async sites in stdlib/http
 * remain pending (lines 65 + 264 — Phase 3c gate). This lint surfaces those
 * pending sites so they are not forgotten regression-wise.
 *
 * **Walker:** uses the shared `walkFileAst` helper (`./ast-walk.ts`) which
 * recurses into `try-stmt.body`, `catch.body`, and `finally.body`. The
 * walker reaches try/catch nodes at any depth — top-level logic blocks,
 * function bodies, server-function bodies, component bodies, nested
 * if/for/match bodies, etc.
 *
 * **Pipeline placement:** runs post-TAB (after Gauntlet checks) — no
 * dependency on NR / SYM / TS. Diagnostics are pushed onto the TAB result's
 * `errors[]` array; `api.js` filters W-* codes into `result.warnings`.
 *
 * **SPEC anchors:** §19.1 (error model — "There is NO try/catch. There are
 * NO exceptions."); §34 (diagnostic catalog row).
 *
 * @module lint-try-catch
 */
import { walkFileAst } from "./ast-walk.ts";
import type { FileAST, Span } from "../types/ast.ts";

export interface TryCatchLintDiagnostic {
  code: "W-TRY-CATCH-IN-SCRML-SOURCE";
  message: string;
  span: Span;
  severity: "warning";
}

/**
 * Walk a FileAST collecting W-TRY-CATCH-IN-SCRML-SOURCE diagnostics — one
 * per `try-stmt` node encountered. The walker descends into try / catch /
 * finally bodies so a nested try inside an outer try produces two
 * diagnostics (one per node).
 */
export function runTryCatchLint(ast: FileAST | null | undefined): TryCatchLintDiagnostic[] {
  const diagnostics: TryCatchLintDiagnostic[] = [];
  if (!ast) return diagnostics;

  const filePath = ast.filePath ?? "";

  walkFileAst(ast, (node) => {
    if (!node || typeof node !== "object") return;
    const n = node as { kind?: string; span?: Span };
    if (n.kind !== "try-stmt") return;
    const span: Span = n.span ?? {
      file: filePath, start: 0, end: 0, line: 1, col: 1,
    };
    diagnostics.push({
      code: "W-TRY-CATCH-IN-SCRML-SOURCE",
      severity: "warning",
      span,
      message:
        `W-TRY-CATCH-IN-SCRML-SOURCE: try/catch detected in scrml source. ` +
        `scrml's error model (§19.1) is values-not-exceptions — there is NO try/catch ` +
        `and there are NO exceptions; errors are values that flow through the type system. ` +
        `To contain a JS-host throw at the boundary, use \`safeCall\` (sync) or ` +
        `\`safeCallAsync\` (async) from \`scrml:host\` and pattern-match the failable ` +
        `result with \`!{ ... }\` arms: ` +
        `\`let result = safeCall(() => thrower()) !{ | ::Thrown(message, name) -> ... }\`. ` +
        `For domain errors, use the \`!\` failable-function signature modifier (§19.4), ` +
        `the \`fail\` keyword (§19.3) to produce error variants, and the \`?\` propagation ` +
        `operator (§19.5) or \`<errorBoundary>\` state type (§19.6) to surface them. ` +
        `(Phase 3a regression guard — see master-list §0.)`,
    });
  });

  return diagnostics;
}
