/**
 * I-ASYNC-USER-SOURCE — Q5 stdlib carve-out info lint (S89 §13.2 Sub-Phase B).
 *
 * Fires an info-level diagnostic on every `function-decl` AST node carrying
 * `isAsync: true` when the file is NOT under the stdlib root (`<repo>/stdlib/`).
 *
 * Per SPEC §13.1 (S89 stdlib carve-out, Q5 ratified), the developer SHALL NOT
 * write `async`, `await`, `Promise`, `Promise.all`, or any other explicit
 * asynchrony construct in scrml USER SOURCE. Stdlib `.scrml` files (under
 * `<repo>/stdlib/`, served via the `scrml:*` namespace per §41.4) MAY declare
 * `async function` as an informational signal that surfaces the `Promise<T>`
 * return shape to the auto-await classifier (§13.2.1).
 *
 * **Why info, not error:** the user-source restriction is a STYLE constraint
 * tied to the values-not-exceptions error model and the §13.2 auto-await
 * regime. The compiler still records `isAsync: true` on the AST regardless of
 * file location so downstream stages have a single shape to consume; this lint
 * tells the adopter to remove the `async` keyword (the compiler will auto-await
 * for them once the callee classifier covers their site).
 *
 * **Pipeline placement:** runs post-TAB / post-Gauntlet, same shelf as
 * `lint-try-catch.ts`. No NR / SYM / TS dependency — the walker only needs
 * `FunctionDeclNode.isAsync` and the file path.
 *
 * **SPEC anchors:** §13.1 stdlib carve-out (S89, Q5 ratified at commit
 * `67a6a81`); §34 catalog row (added S89 §13.2 Sub-Phase B).
 *
 * @module lint-async-user-source
 */
import { walkFileAst } from "./ast-walk.ts";
import type { FileAST, Span } from "../types/ast.ts";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * The stdlib root absolute path — files under this directory are exempt from
 * the I-ASYNC-USER-SOURCE lint per §13.1 stdlib carve-out (Q5 ratified S89).
 *
 * Resolution mirrors `compiler/src/module-resolver.js:558` STDLIB_ROOT so the
 * two definitions track each other:
 *   `<repo>/compiler/src/validators/lint-async-user-source.ts`
 *   → `../..` = `<repo>/compiler`
 *   → `../../..` = `<repo>`
 *   → `../../../stdlib` = `<repo>/stdlib`
 */
const STDLIB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../stdlib");

/** Trailing slash sentinel so `foo/stdlibSidecar/` doesn't false-match `foo/stdlib`. */
const STDLIB_ROOT_PREFIX = STDLIB_ROOT.endsWith("/") ? STDLIB_ROOT : STDLIB_ROOT + "/";

export interface AsyncUserSourceLintDiagnostic {
  code: "I-ASYNC-USER-SOURCE";
  message: string;
  span: Span;
  severity: "warning";
}

/**
 * Test whether a file path is inside the stdlib carve-out region.
 * Exact `STDLIB_ROOT` match counts as inside; child paths also count.
 *
 * Exported for unit testing — callers should use `runAsyncUserSourceLint`.
 */
export function isStdlibFile(filePath: string | null | undefined): boolean {
  if (!filePath) return false;
  // Resolve in case the path is relative; preserves exact-match semantics.
  const resolved = resolve(filePath);
  if (resolved === STDLIB_ROOT) return true;
  return resolved.startsWith(STDLIB_ROOT_PREFIX);
}

/**
 * Walk a FileAST collecting I-ASYNC-USER-SOURCE diagnostics — one per
 * `function-decl` with `isAsync: true` whose enclosing file path is NOT under
 * `<repo>/stdlib/`. The walker descends into logic, function bodies, etc., so
 * `async function` nested inside another function body is also caught.
 *
 * **Severity note:** the diagnostic carries `severity: "warning"` to flow
 * through the same `result.warnings` channel as `W-TRY-CATCH-IN-SCRML-SOURCE`
 * and `W-PROGRAM-SPA-INFERRED`. The `I-` code prefix marks it as info per the
 * §34 catalog convention; `api.js` does not distinguish I- from W- in its
 * collection logic (both flow through warnings, not errors).
 */
export function runAsyncUserSourceLint(
  ast: FileAST | null | undefined,
): AsyncUserSourceLintDiagnostic[] {
  const diagnostics: AsyncUserSourceLintDiagnostic[] = [];
  if (!ast) return diagnostics;

  const filePath = ast.filePath ?? "";

  // Stdlib carve-out: a stdlib file's `async function` declarations are
  // canonical and emit no diagnostic.
  if (isStdlibFile(filePath)) return diagnostics;

  walkFileAst(ast, (node) => {
    if (!node || typeof node !== "object") return;
    const n = node as { kind?: string; isAsync?: boolean; name?: string; span?: Span };
    if (n.kind !== "function-decl") return;
    if (n.isAsync !== true) return;
    const span: Span = n.span ?? {
      file: filePath,
      start: 0,
      end: 0,
      line: 1,
      col: 1,
    };
    const fnName = typeof n.name === "string" && n.name.length > 0 ? n.name : "<anonymous>";
    diagnostics.push({
      code: "I-ASYNC-USER-SOURCE",
      severity: "warning",
      span,
      message:
        `I-ASYNC-USER-SOURCE: \`async function ${fnName}\` declared in user source. ` +
        `Per §13.1, scrml user source SHALL NOT use the \`async\` keyword — ` +
        `the compiler auto-awaits statically-known \`Promise<T>\` callees per §13.2.1 ` +
        `so adopter code reads flat and synchronous. The \`async\` modifier is reserved ` +
        `for stdlib (\`scrml:*\` namespace) declarations as an informational signal to ` +
        `the auto-await classifier. ` +
        `Suppression: remove the \`async\` keyword from \`function ${fnName}\` ` +
        `(the compiler will continue to auto-await call sites where the callee's return ` +
        `shape is statically known). For stdlib-style \`Promise<T>\` boundary wrapping, ` +
        `use \`safeCallAsync\` from \`scrml:host\` and a failable \`!{ ... }\` arm. ` +
        `(Catalog addition S89 §13.2 Sub-Phase B 2026-05-13; emitted at ` +
        `\`compiler/src/validators/lint-async-user-source.ts\` invoked from ` +
        `\`compiler/src/api.js\` Stage 3.008 post-LINT-TRY-CATCH.)`,
    });
  });

  return diagnostics;
}
