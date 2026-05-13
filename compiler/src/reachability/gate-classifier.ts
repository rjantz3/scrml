/**
 * @module reachability/gate-classifier
 *
 * Per-gate classifier for Component 1 of the Stage 7.6 Reachability
 * Solver (SPEC §40.9.2).
 *
 * S89 wave A-2.2.c — for a markup child whose render is gated by an
 * `if=` attribute, a `<match for=Type on=@cell/>` block, an
 * `<auth role=...>` boundary, or a `<details>` disclosure container,
 * classify the gate's contribution to the initially-rendered component
 * set as one of:
 *
 *   - "in"            — gate is closed-form and admits the child.
 *   - "out"           — gate is closed-form and excludes the child.
 *   - "worst-case"    — gate is runtime-only (or out-of-subset);
 *                       Component 1 admits ALL branches per §40.9.2's
 *                       worst-case-union rule.
 *
 * The classifier is **stateless** and **conservative**: it consumes a
 * single markup node + an `ExprNode`-folding environment and returns
 * one terminal classification. Worst-case is always a legal answer.
 *
 * ## Gate types covered in this wave
 *
 *   - `if=expr` attribute on any markup node (§17.5).
 *   - `<details>` markup (always WORST-CASE-UNION per §40.9.9 worked
 *     example).
 *   - `<match for=Type on=expr>` block (Tier 1, §18.8) — when `on=` is
 *     a foldable cell, the matched value drives in/out per match arm;
 *     when not, WORST-CASE-UNION.
 *
 * ## Gate types deferred
 *
 *   - `<auth role=>` per-role classification — A-2.5 Component 4
 *     surfaces the AuthGraph for this. This wave returns
 *     "worst-case" for any `<auth>` gate (over-includes for now;
 *     refined by A-2.5).
 *
 * Cross-references:
 *   - SPEC.md §40.9.2 — Component 1 normative classification rules.
 *   - SPEC.md §40.9.9 — Worked example: `<details>` admits worst-case.
 *   - SPEC.md §17.5 — `if=` / `else-if=` chain semantics.
 *   - SPEC.md §18.8 — Tier-1 `<match>` block.
 *   - compiler/src/codegen/constant-folder.ts — the underlying primitive.
 */

import type { ASTNode, AttrNode, ExprNode, MarkupNode } from "../types/ast.ts";
import {
  type ConstFoldEnv,
  type ConstResult,
  partiallyEvaluateExpr,
} from "../codegen/constant-folder.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Terminal classification of a single gate.
 *
 * "in" / "out" are closed-form determinations; "worst-case" admits ALL
 * branches and is the conservative fallback when the gate's condition
 * is runtime, missing, or out-of-subset.
 */
export type GateClassification = "in" | "out" | "worst-case";

/**
 * The kinds of gate this classifier handles.
 *
 * `"none"` is the "no gate present" answer — the child is unconditional
 * and should be admitted as IN with no further analysis.
 */
export type GateKind =
  | { kind: "none" }
  | { kind: "if"; cond: ExprNode | null }
  | { kind: "details" }
  | { kind: "match"; onExpr: ExprNode | null }
  | { kind: "auth"; /* deferred to A-2.5 */ };

// ---------------------------------------------------------------------------
// Gate detection
// ---------------------------------------------------------------------------

/**
 * Detect which gate (if any) applies to a markup child.
 *
 * Three signal sources:
 *
 *   1. The node's tag — `<details>`, `<match>`, `<auth>` carry their
 *      own gate semantics regardless of attribute decoration.
 *   2. An `if=` attribute on a regular markup node — gates the
 *      child's render conditionally per §17.5.
 *   3. None of the above — `{ kind: "none" }`.
 *
 * Order: tag-level gates checked first (tag-defined semantics take
 * precedence). `if=` is checked only when the tag itself is not gating.
 */
export function detectGate(node: ASTNode): GateKind {
  if (!node || typeof node !== "object" || node.kind !== "markup") {
    return { kind: "none" };
  }
  const m = node as MarkupNode;
  if (m.tag === "details") return { kind: "details" };
  if (m.tag === "auth") return { kind: "auth" };
  if (m.tag === "match") {
    const onAttr = m.attrs.find(a => a.name === "on");
    const onExpr = extractAttrExprNode(onAttr);
    return { kind: "match", onExpr };
  }
  // Regular markup — check for if= attribute.
  const ifAttr = m.attrs.find(a => a.name === "if");
  if (ifAttr) {
    const cond = extractAttrExprNode(ifAttr);
    return { kind: "if", cond };
  }
  return { kind: "none" };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Classify a gate under a constant-folding environment.
 *
 * Decision table (gate.kind → classification):
 *
 *   "none"     → IN (no gate; unconditional)
 *   "details"  → WORST-CASE (per §40.9.9 — runtime disclosure)
 *   "auth"     → WORST-CASE (placeholder; A-2.5 refines per-role)
 *   "if"       → fold cond; constant truthy → IN, constant falsy → OUT,
 *                runtime / missing → WORST-CASE
 *   "match"    → fold on-expr; constant value → IN (the matched arm
 *                is admitted as if it were a regular IN child — full
 *                arm-discrimination is a §18.8 follow-up); runtime /
 *                missing → WORST-CASE
 *
 * Pure: does not mutate `gate` or `env`.
 */
export function classifyGate(gate: GateKind, env: ConstFoldEnv): GateClassification {
  switch (gate.kind) {
    case "none":
      return "in";
    case "details":
      // Runtime-only disclosure — §40.9.9 admits worst-case-union.
      return "worst-case";
    case "auth":
      // A-2.5 will refine per role. Conservative placeholder: admit.
      return "worst-case";
    case "if": {
      if (gate.cond === null) return "worst-case";
      const r: ConstResult = partiallyEvaluateExpr(gate.cond, env);
      if (r.kind === "runtime") return "worst-case";
      return r.value ? "in" : "out";
    }
    case "match": {
      if (gate.onExpr === null) return "worst-case";
      const r: ConstResult = partiallyEvaluateExpr(gate.onExpr, env);
      if (r.kind === "runtime") return "worst-case";
      // Constant on-expr — admit the match block (per-arm discrimination
      // is deferred to §18.8 follow-up; admitting "in" without per-arm
      // refinement matches §40.9.2 IN semantics for the block as a whole).
      return "in";
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a structured ExprNode from an attribute value.
 *
 * Today the ast-builder populates `exprNode` on `expr`-kind attrs,
 * `variable-ref` attrs, and `call-ref` attr args. For string-literal
 * attrs the value is the raw string — not a foldable expression — so
 * we return null (the classifier will treat it as worst-case).
 *
 * Returns null for:
 *   - Absent attrs.
 *   - Attrs whose value is a string literal (the gate consumer would
 *     interpret a literal as a runtime string, not a foldable
 *     boolean — `if="false"` is therefore worst-case, not OUT).
 *   - `props-block` attrs.
 */
function extractAttrExprNode(attr: AttrNode | undefined): ExprNode | null {
  if (!attr) return null;
  const v = attr.value;
  if (v.kind === "expr" && v.exprNode) return v.exprNode;
  if (v.kind === "variable-ref" && v.exprNode) return v.exprNode;
  // call-ref / props-block / string-literal / absent — not directly foldable.
  return null;
}
