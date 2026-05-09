/**
 * @module codegen/ir
 *
 * CG Intermediate Representation (IR) — plain-object data types that sit
 * between AST analysis and string emission. Emitters receive IR slices
 * rather than raw AST nodes, making the contract explicit and testable.
 *
 * Factory functions (not classes) — each returns a typed shape:
 *   - createHtmlIR()   → HtmlIR
 *   - createCssIR()    → CssIR
 *   - createServerIR() → ServerIR
 *   - createClientIR() → ClientIR
 *   - createFileIR(filePath) → FileIR  (top-level container)
 *   - createTestIR()   → TestIR
 */

// ---------------------------------------------------------------------------
// IR interfaces
// ---------------------------------------------------------------------------

/** HTML output container: string fragments joined with "". */
export interface HtmlIR {
  parts: string[];
}

/** CSS output container: user-authored CSS plus Tailwind utilities. */
export interface CssIR {
  userCss: string;
  tailwindCss: string;
}

/** Server JS output container: lines joined with "\n". */
export interface ServerIR {
  lines: string[];
}

/** Client JS output container: lines joined with "\n". */
export interface ClientIR {
  lines: string[];
}

/** Top-level IR for a single compiled .scrml file. */
export interface FileIR {
  filePath: string;
  html: HtmlIR;
  css: CssIR;
  server: ServerIR;
  client: ClientIR;
}

// ---------------------------------------------------------------------------
// HtmlIR
// ---------------------------------------------------------------------------

/**
 * Create an HtmlIR container.
 * parts[] are string fragments to be joined with "".
 */
export function createHtmlIR(): HtmlIR {
  return { parts: [] };
}

// ---------------------------------------------------------------------------
// CssIR
// ---------------------------------------------------------------------------

/**
 * Create a CssIR container.
 */
export function createCssIR(): CssIR {
  return { userCss: "", tailwindCss: "" };
}

// ---------------------------------------------------------------------------
// ServerIR
// ---------------------------------------------------------------------------

/**
 * Create a ServerIR container.
 * lines[] are the emitted JS lines for the server module.
 */
export function createServerIR(): ServerIR {
  return { lines: [] };
}

// ---------------------------------------------------------------------------
// ClientIR
// ---------------------------------------------------------------------------

/**
 * Create a ClientIR container.
 * lines[] are the emitted JS lines for the client module.
 */
export function createClientIR(): ClientIR {
  return { lines: [] };
}

// ---------------------------------------------------------------------------
// FileIR
// ---------------------------------------------------------------------------

/**
 * Create a FileIR — the top-level IR for a single compiled file.
 *
 * @param filePath — the source .scrml file path
 */
export function createFileIR(filePath: string): FileIR {
  return {
    filePath,
    html: createHtmlIR(),
    css: createCssIR(),
    server: createServerIR(),
    client: createClientIR(),
  };
}

// ---------------------------------------------------------------------------
// TestIR — ~{} inline test context IR types
// ---------------------------------------------------------------------------

/**
 * A single assertion in a test case.
 *
 * The assert statement `assert a == b` is split into:
 *   - raw: "a == b"
 *   - op: "=="
 *   - lhs: "a"
 *   - rhs: "b"
 *
 * For `assert expr` (no comparison), op/lhs/rhs are null and raw is the full expr.
 */
export interface AssertStmt {
  /** Full raw expression string after `assert` keyword. */
  raw: string;
  /** Comparison operator: "==", "===", "!=", "!==", ">", ">=", "<", "<=" or null. */
  op: string | null;
  /** LHS expression string (when op is present). */
  lhs: string | null;
  /** RHS expression string (when op is present). */
  rhs: string | null;
}

/**
 * A single test case inside a ~{} block.
 *
 * Produced by `test "name" { body }` syntax.
 */
export interface TestCase {
  /** Test name from `test "name" { }` syntax. */
  name: string;
  /** Source line number of the `test` keyword. */
  line: number;
  /** Raw statement strings collected from the test body (before rewrite). */
  body: string[];
  /** Extracted assert statements from the test body. */
  asserts: AssertStmt[];
}

/**
 * A `test-bind` declaration inside a ~{} test block (SPEC §19.12.6).
 *
 * Produced by `test-bind <identifier> = <expression>` syntax. Body-scope-only
 * inside `~{}` — sibling to `test "..." {...}` cases and `assert.*` statements,
 * not legal inside a test case body, inside `${...}`, or in any non-`~{}` context.
 *
 * Phase A6-2 (parser): produces this node. Phase A6-3 (typer): validates the
 * RHS expression resolves to either a function value assignable to the bound
 * server-fn signature OR a value assignable to the bound server-fn return type
 * (return-stub form). Phase A6-4 (codegen): emits the test-mode dispatch hook.
 */
export interface TestBindDecl {
  /** Bound server-fn identifier (LHS of `=`). */
  identifier: string;
  /** Raw RHS expression source (right of `=`). */
  expression: string;
  /** Source line of the `test-bind` declaration. */
  line: number;
  /**
   * Discrimination annotation populated by SYM PASS 18 (Phase A6-3) per
   * SPEC §19.12.6 RHS-shape discrimination contract:
   *   - `"handler"`     — RHS is a function value (literal or
   *                       resolved identifier-bound function); test-mode
   *                       dispatch (§19.12.7) invokes the binding with
   *                       the call-site arguments.
   *   - `"return-stub"` — RHS is a non-function value; test-mode dispatch
   *                       ignores arguments and returns the value verbatim.
   *
   * Absent until SYM PASS 18 runs. Codegen (A6-4) reads this to choose the
   * dispatch shape per §19.12.7. When the field is undefined (e.g., SYM
   * was bypassed), codegen defaults to `"return-stub"` defensively so the
   * dispatch hook still emits.
   *
   * **Discrimination rule (A6-3 syntactic + scope-lookup heuristic):**
   *   1. RHS source matches a function-literal pattern
   *      (arrow `=>` or `function` expression) → `"handler"`.
   *   2. RHS source is a single identifier resolving to a function-decl in
   *      this file or an import binding → `"handler"`.
   *   3. Otherwise → `"return-stub"`.
   *
   * Strict structural-signature assignability (per §19.12.6 verbatim) is
   * deferred — the type-system's FunctionType is opaque at this revision.
   * SPEC §19.12.7 imposes no compile-time arity/type constraint on the
   * dispatch; mismatch is runtime-observable.
   */
  bindKind?: "handler" | "return-stub";
}

/**
 * A complete ~{} test block — corresponds to one ~{ ... } source block.
 *
 * A test group may contain multiple test cases. If no `test "name" { }` sub-blocks
 * are present, the group's body statements form an implicit single test case.
 */
export interface TestGroup {
  /** Optional group name from the first string literal in ~{}. */
  name: string | null;
  /** Source line number of the ~{ opener. */
  line: number;
  /** Named test cases from `test "name" { body }` sub-blocks. */
  tests: TestCase[];
  /** Raw statement strings from `before { }` block (if present). */
  before: string[] | null;
  /** Raw statement strings from `after { }` block (if present). */
  after: string[] | null;
  /**
   * `test-bind` declarations at the body scope of this `~{}` block (SPEC §19.12.6).
   *
   * Always present; default `[]` for blocks with no test-bind declarations.
   * A second declaration for the same identifier within the same block is a
   * compile error (E-TEST-005) and is dropped from this array (only the first
   * declaration is retained).
   *
   * Scope-local — does NOT leak to sibling `~{}` blocks or to outer scope.
   */
  testBinds: TestBindDecl[];
}

/**
 * TestIR container for a file's test blocks.
 *
 * Collected from all ~{} nodes in the file AST during the analysis pass.
 * Passed to generateTestJs() in emit-test.ts.
 */
export interface TestIR {
  groups: TestGroup[];
}

/**
 * Create a TestIR container.
 */
export function createTestIR(): TestIR {
  return { groups: [] };
}
