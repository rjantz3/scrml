/**
 * Phase A1c Step C7 — Per-cell validator runner emission.
 *
 * For every state-decl carrying a non-empty `validators[]` array (B9-shaped
 * `ValidatorEntry` objects), emit a derived computation that walks the
 * validator entries in declaration order, calls C6's `_scrml_validator_fire`
 * per entry, accumulates a list of `ValidationError`-shaped objects with the
 * §55.12 short-circuit rule (req/is some fail on empty cell → skip remaining),
 * and produces TWO derived outputs:
 *
 *   - `<qualifiedField>.errors`  — array of ValidationError objects
 *   - `<qualifiedField>.isValid` — boolean (errors.length === 0)
 *
 * Both are wired into the per-field synth-cell registry B12 already
 * registered. The COMPOUND-LEVEL rollup (`@compound.errors` /
 * `@compound.isValid`) is C8's territory — C7 emits per-field outputs only.
 *
 * Cross-references:
 *   - SPEC §55.2 (lines 24996-25028) — firing semantics + req short-circuit
 *   - SPEC §55.6 (lines 25122-25143) — per-field synth surface
 *   - SPEC §55.7 (lines 25144-25157) — synth property semantics
 *   - SPEC §55.12 (lines 25331-25347) — short-circuit + composition
 *   - PA-SCRML-PRIMER §8 (validators + auto-synth)
 *   - PA-SCRML-PRIMER §13.7 B11/B12 (synth-cell registry)
 *   - compiler/src/runtime-validators.js — C6 runtime catalog
 *   - compiler/src/validator-catalog.ts — compile-time signature catalog
 *   - docs/changes/phase-a1c-step-c6-validator-runtime-catalog/progress.md
 *     — C6 hookpoints (per-validator dispatch shape, thunk-arg unwrapping,
 *       short-circuit-as-C7's-responsibility)
 *
 * # Skip rules
 *
 * Returns `null` (no emission) when any of the following are true:
 *   1. `node.validators` is null/undefined or empty array.
 *   2. `opts.boundary === "server"` — validator runner is client-only.
 *   3. `opts.insideFunctionBody` — reassignments don't re-register the runner.
 *   4. `node.shape === "derived" && node.isConst === true` —
 *      E-DERIVED-WITH-VALIDATORS already fired by B13; defensive skip.
 *   5. `node._cellKind === "compound-parent"` or `Array.isArray(node.children)`
 *      — compound parents don't run validators directly; their fields do
 *      (recursion handles those).
 *   6. `node._cellKind === "markup-typed"` — same as derived
 *      (E-DERIVED-WITH-VALIDATORS).
 *   7. `compoundPathPrefix` is empty/null — top-level non-compound cells with
 *      validators DO NOT synthesize a per-field surface per SPEC §55.5 L11
 *      Edge A line 25115-25120. The validator's failure is tracked via the
 *      type-system path (refinement type) — not a runtime synth surface.
 *
 * # Arg-kind dispatch
 *
 * Each validator's args are lowered per the predicate's compile-time arg-kind
 * (compiler/src/validator-catalog.ts):
 *
 *   - `relational-predicate` (length(>=N)) → emit `{op: "<op>", value: <expr>}`
 *     object literal. The inner ExprNode is lowered via emitExpr.
 *   - `comparable-with-cell` / `any-equatable-with-cell` (eq, neq, gt, lt, gte,
 *     lte) — when the arg references a cross-field `@cell`, emit
 *     `() => <emittedExpr>` (thunk; matches C6's _unwrapArg contract).
 *     Otherwise emit literal expression.
 *   - `array-of-cell-type` (oneOf, notIn) — emit array literal; if any inner
 *     element references `@cell`, that element gets a thunk; if the whole
 *     array is itself a `@cell` reference, the entire array becomes a thunk.
 *   - `numeric` / `regex` — emit literal expression.
 *   - `inline-message-override` — STRIPPED at emission time (B13 already
 *     extracted onto `validator.inlineOverride`); C10 consumes that field.
 *
 * # Short-circuit (§55.12)
 *
 * When the validator's name is `"req"` or `"is some"` AND the fire returns
 * non-null (i.e., the predicate failed), the runner does an early `return errors;`
 * so subsequent validators aren't run. Per SPEC §55.12 lines 25337-25339:
 *
 *   "Short-circuit rule: when `req` (or `is some`) FAILS on an empty / null
 *    cell, the remaining validators are SKIPPED. Only `.Required` (or
 *    `.NotSome`) is reported."
 */

import { emitExpr, type EmitExprContext } from "./emit-expr.ts";
import { extractReactiveDepsFromExprNode } from "./reactive-deps.ts";
import { forEachIdentInValidators, forEachIdentInValidatorArg } from "../validator-arg-parser.ts";
import type { EncodingContext } from "./type-encoding.ts";

// ---------------------------------------------------------------------------
// Local types — minimal shape needed for emission. The full ValidatorEntry /
// RelationalPredicateNode / ExprNode types live in compiler/src/types/ast.ts;
// emit-validators consumes them structurally.
// ---------------------------------------------------------------------------

interface EmitValidatorOpts {
  /** Boundary (client/server). Server boundary skips emission. */
  boundary: "server" | "client";
  /** Inside-fn-body suppresses emission (mirrors C5 init-thunk skip). */
  insideFunctionBody?: boolean;
  /** Compound qualified-path prefix; non-empty for compound children. */
  compoundPathPrefix?: string | null;
  /** Encoding context for storage-key encoding (mirrors C5/C1). */
  encodingCtx?: EncodingContext | null;
  /** Derived names — passed to emitExpr so cross-field reads to derived cells
   *  use _scrml_derived_get. */
  derivedNames?: Set<string> | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emit the per-cell validator runner sidecar for a state-decl, OR `null` if
 * the cell does not satisfy the emission preconditions.
 *
 * The returned string is one or more newline-separated JS statements (no
 * trailing newline). Caller (`_appendSidecar` in emit-logic.ts) joins it
 * after the cell's primary `_scrml_reactive_set` registration.
 *
 * @param node — the state-decl AST node (must have `name`; `validators` array
 *               may be present)
 * @param qualifiedName — the cell's storage key (`compound.field` for compound
 *                        children; bare name for top-level — but top-level
 *                        skips per skip rule 7)
 * @param opts — emission options
 */
export function emitValidatorRunnerSidecar(
  node: any,
  qualifiedName: string,
  opts: EmitValidatorOpts,
): string | null {
  // Skip rule 1: no validators or empty array.
  const validators: any[] = Array.isArray(node?.validators) ? node.validators : [];
  if (validators.length === 0) return null;

  // Skip rule 2: server boundary.
  if (opts.boundary === "server") return null;

  // Skip rule 3: inside function body (reassignment, not declaration).
  if (opts.insideFunctionBody) return null;

  // Skip rule 4: derived (E-DERIVED-WITH-VALIDATORS territory).
  if (node?.shape === "derived" && node?.isConst === true) return null;

  // Skip rule 5: compound parent (its fields run validators, not the parent).
  if (node?._cellKind === "compound-parent" || Array.isArray(node?.children)) return null;

  // Skip rule 6: markup-typed derived (same as derived).
  if (node?._cellKind === "markup-typed") return null;

  // Skip rule 7: top-level non-compound cell — no synth surface (SPEC §55.5 L11
  // Edge A). Top-level cells get no per-field synth surface; the runner has no
  // observable write target. Skip until type-system enforcement lands.
  if (!opts.compoundPathPrefix) return null;

  // Compute encoded names for storage keys.
  const ctx = opts.encodingCtx ?? null;
  const encodeKey = (k: string): string => (ctx ? ctx.encode(k) : k);
  const valueKey = encodeKey(qualifiedName);
  const errorsKey = encodeKey(`${qualifiedName}.errors`);
  const isValidKey = encodeKey(`${qualifiedName}.isValid`);

  // Build EmitExprContext for arg lowering. Validator runner is a CLIENT-side
  // emission so mode is fixed to "client".
  const exprCtx: EmitExprContext = {
    mode: "client",
    derivedNames: opts.derivedNames ?? null,
    tildeVar: null,
    dbVar: undefined,
  };

  // Per-validator emission accumulator. Each entry is a JS block-statement
  // string evaluating one validator and (conditionally) short-circuiting.
  const validatorBlocks: string[] = [];
  for (const v of validators) {
    if (!v || typeof v.name !== "string") continue;
    validatorBlocks.push(emitOneValidatorBlock(v, exprCtx));
  }

  // Cross-field reactive deps — collect every `@cell` referenced in any
  // validator arg. Plus the cell's own value (the field itself). The runner
  // re-fires when any of these change.
  const valueDeps = new Set<string>();
  valueDeps.add(qualifiedName);
  forEachIdentInValidators(validators as any, (ident) => {
    if (typeof ident.name === "string" && ident.name.startsWith("@")) {
      valueDeps.add(ident.name.slice(1));
    }
  });

  // The errors derivation reads the field value via _scrml_reactive_get. Thunk
  // args re-read at fire time; their reads happen inside the closure, so the
  // closure has all the dep info statically. We emit one _scrml_derived_subscribe
  // per dep.
  const errorsLines: string[] = [];
  errorsLines.push(`_scrml_derived_declare(${JSON.stringify(errorsKey)}, () => {`);
  errorsLines.push(`  const value = _scrml_reactive_get(${JSON.stringify(valueKey)});`);
  errorsLines.push(`  const errors = [];`);
  for (const blk of validatorBlocks) {
    // Indent the block by 2 spaces for readability inside the closure.
    const indented = blk.split("\n").map(l => l ? `  ${l}` : l).join("\n");
    errorsLines.push(indented);
  }
  errorsLines.push(`  return errors;`);
  errorsLines.push(`});`);
  for (const dep of valueDeps) {
    const encodedDep = encodeKey(dep);
    errorsLines.push(`_scrml_derived_subscribe(${JSON.stringify(errorsKey)}, ${JSON.stringify(encodedDep)});`);
  }

  // The isValid derivation depends only on the errors derivation. Reading
  // `errors` here would trigger lazy-pull through _scrml_derived_get.
  const isValidLines: string[] = [];
  isValidLines.push(`_scrml_derived_declare(${JSON.stringify(isValidKey)}, () => _scrml_derived_get(${JSON.stringify(errorsKey)}).length === 0);`);
  isValidLines.push(`_scrml_derived_subscribe(${JSON.stringify(isValidKey)}, ${JSON.stringify(errorsKey)});`);

  return [...errorsLines, ...isValidLines].join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Emit a single JS block-statement that fires one validator and either:
 *   - pushes the error onto `errors` and continues (composition case), OR
 *   - pushes the error onto `errors` and `return errors;` (short-circuit case
 *     for `req` / `is some`).
 *
 * The block is wrapped in a `{ ... }` so `const error` doesn't shadow across
 * iterations.
 */
function emitOneValidatorBlock(validator: any, exprCtx: EmitExprContext): string {
  const name = validator.name as string;
  const argsExprs = lowerValidatorArgs(validator, exprCtx);

  // §55.12 short-circuit: req / is some failure on empty/null cell terminates.
  // The C6 runtime returns null on pass; non-null on fail. Per SPEC §55.12:
  // "when req (or is some) FAILS on an empty / null cell, the remaining
  //  validators are SKIPPED."
  // The "empty/null cell" condition is enforced by the predicate's fail return —
  // req/is some only fail on empty/null per their semantics (§55.1, §42.2.5),
  // so a non-null fire-result FROM req or is some IS the short-circuit signal.
  const isShortCircuiter = (name === "req" || name === "is some");

  const lines: string[] = [];
  lines.push(`{`);
  if (argsExprs.length === 0) {
    lines.push(`  const error = _scrml_validator_fire(${JSON.stringify(name)}, value);`);
  } else {
    const argList = argsExprs.join(", ");
    lines.push(`  const error = _scrml_validator_fire(${JSON.stringify(name)}, value, ${argList});`);
  }
  if (isShortCircuiter) {
    lines.push(`  if (error !== null) {`);
    lines.push(`    errors.push(error);`);
    lines.push(`    return errors; // §55.12 short-circuit: ${name} fail on empty/null skips remaining`);
    lines.push(`  }`);
  } else {
    lines.push(`  if (error !== null) errors.push(error);`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Lower a validator's args[] to an array of JS expression strings (each one
 * is a positional argument to `_scrml_validator_fire(name, value, ...)`).
 *
 * Returns `[]` for bareword validators (`args: null`) and zero-arg call form
 * (`args: []`).
 *
 * Filters out the trailing `inline-message-override` slot — B13 already
 * extracted it onto `validator.inlineOverride`. We detect that slot by:
 *   - it is a `lit` ExprNode with `litType: "string"`, AND
 *   - it is the LAST positional arg, AND
 *   - the validator has `inlineOverride` set to the same string value.
 */
function lowerValidatorArgs(validator: any, exprCtx: EmitExprContext): string[] {
  const args: any[] = Array.isArray(validator?.args) ? validator.args : [];
  if (args.length === 0) return [];

  // Determine if the last arg is the inline-override slot. The B13 walker
  // populates `validator.inlineOverride` with the trailing string-literal
  // value. We use that as the signal to drop the trailing arg from emission.
  let argsToEmit = args;
  const inlineOverride: string | null | undefined = validator.inlineOverride;
  if (typeof inlineOverride === "string" && args.length > 0) {
    const last = args[args.length - 1];
    if (last && last.kind === "lit" && (last as any).litType === "string") {
      argsToEmit = args.slice(0, -1);
    }
  }

  const out: string[] = [];
  for (const arg of argsToEmit) {
    if (!arg || typeof arg !== "object") continue;
    out.push(lowerOneArg(arg, exprCtx));
  }
  return out;
}

/**
 * Lower a single ValidatorArg to a JS expression string per its kind/shape.
 *
 *   - relational-predicate {op, value} → `{op: "<op>", value: <expr>}` literal
 *   - any other ExprNode → emitExpr; if the expression contains a cross-field
 *     `@cell` reference, wrap as a thunk (`() => <expr>`) so C6's _unwrapArg
 *     re-reads at fire time. Pure literals (no @cell) emit as-is.
 *
 * Array literals (`oneOf([...])`) are passed through emitExpr — each element
 * is itself a sub-expression, and any element referencing `@cell` will lower
 * to `_scrml_reactive_get(...)`. For C6's _unwrapArray to re-read each element
 * lazily, the array would need its elements thunked individually. As a
 * conservative compromise, when ANY element of an array literal references
 * `@cell`, wrap the WHOLE array as a thunk — C6's _unwrapArray then unwraps
 * the resulting array, but each individual element is its current evaluated
 * value (no further thunk). This is correct because the entire validator
 * runner re-fires when any cross-field dep changes (we wire one
 * `_scrml_derived_subscribe` per dep), so each element re-evaluates fresh on
 * every run.
 */
function lowerOneArg(arg: any, exprCtx: EmitExprContext): string {
  // Relational-predicate node — synthesize an object literal {op, value}.
  if (arg.kind === "relational-predicate") {
    const op = (arg as any).op;
    const innerExpr = (arg as any).value;
    const inner = innerExpr ? emitExpr(innerExpr, exprCtx) : "0";
    // The inner expression may reference @cell — wrap as thunk if so, so
    // C6's _unwrapArg re-reads at fire time. (length(>=@minLen) edge case.)
    const innerHasReactive = expressionContainsReactive(innerExpr);
    const valueField = innerHasReactive ? `() => ${inner}` : inner;
    return `{ op: ${JSON.stringify(op)}, value: ${valueField} }`;
  }

  // Standard ExprNode — emitExpr lowers it. Wrap as thunk if it references
  // a cross-field @cell (so the comparison re-reads at fire time).
  const lowered = emitExpr(arg, exprCtx);
  const hasReactive = expressionContainsReactive(arg);
  return hasReactive ? `() => ${lowered}` : lowered;
}

/**
 * Returns true iff the ExprNode tree references any `@cell` identifier.
 * Cross-field args trigger thunk-wrapping so the comparison value re-reads
 * at fire time (per C6's _unwrapArg contract).
 */
function expressionContainsReactive(expr: any): boolean {
  if (!expr || typeof expr !== "object") return false;
  // RelationalPredicateNode — descend into `value`.
  if (expr.kind === "relational-predicate") {
    return expressionContainsReactive(expr.value);
  }
  // ExprNode — use the existing reactive-dep extractor.
  const deps = extractReactiveDepsFromExprNode(expr);
  return deps.size > 0;
}

// ---------------------------------------------------------------------------
// Notes — re-export the validator-arg walker for downstream tooling. Keeps
// the C7 surface area discoverable. Currently unused outside this module but
// future C8/C9 may reuse for cross-field dep wiring.
// ---------------------------------------------------------------------------

export { forEachIdentInValidators, forEachIdentInValidatorArg };
