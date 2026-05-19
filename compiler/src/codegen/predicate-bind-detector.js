// S103 Phase 3 select-row chip-away (Candidate A) — predicate-bind detector.
//
// Initial scope per OQ-RT3-SR-OPEN-2 ratified STRICTEST (S103) — equality only;
// extended S103 to also accept `!=` (Phase 3 follow-on, captures the other half
// of the TodoMVC select-row hot path). The dispatch semantics are IDENTICAL for
// == and != because the runtime fires subscribers on transitions to/from valueKey
// regardless of predicate polarity — the bind function itself recomputes the
// per-row truthiness based on its own expression. No runtime change needed.
//
// Current scope:
//   - == or != operator (NOT === / !==)
//   - one side must be a single @CELL reference (no dotted-path tail)
//   - the OTHER side must be either:
//       (a) a JS primitive literal (string / number / boolean / null /
//           undefined), OR
//       (b) a closure-captured non-reactive identifier or dotted-path
//           (e.g. `todo.id`, `row.entry.id`) — these resolve to a primitive
//           at registration time when the lift factory runs for a given row.
//
//   - REJECT any shape with @-prefixed refs on BOTH sides (would defeat the
//     narrowing — both bind sites would re-fire whenever either cell moves)
//   - REJECT call expressions, arithmetic, indexing, optional chaining,
//     `in`, `.includes`, anything non-trivial — fall back to LEGACY
//     _scrml_reactive_subscribe
//
// Returns:
//   { matched: true, cellName, valueExprJS } — wire into
//       _scrml_reactive_subscribe_when(cellName, <eval(valueExprJS)>, fn)
//   { matched: false } — fall back to LEGACY _scrml_reactive_subscribe
//
// The detector operates on the RAW source-text expression string (the same
// string passed to emitExprField). It does NOT consume the ExprNode AST in
// this initial scope to keep the surface tight + auditable; future extension
// (e.g. `.includes`, `in`) may upgrade to AST.

/**
 * Strip exactly one balanced outer paren wrap if present. Returns the inner
 * expression. e.g. "(a == b)" -> "a == b". Leaves unbalanced or non-wrapping
 * parens alone.
 */
function stripOuterParens(s) {
  s = s.trim();
  while (s.length >= 2 && s.charCodeAt(0) === 40 /* ( */ && s.charCodeAt(s.length - 1) === 41 /* ) */) {
    // Confirm the outer parens are balanced (no early close)
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < s.length - 1; i++) {
      const c = s.charCodeAt(i);
      if (c === 40) depth++;
      else if (c === 41) {
        depth--;
        if (depth === 0) { balanced = false; break; }
      }
    }
    if (!balanced) return s;
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Split s on the top-level equality operator (== OR !=, NOT === / !==) at a
 * paren/bracket depth of zero. Returns [lhs, rhs] when exactly one top-level
 * equality operator is found, or null when there are zero or multiple.
 *
 * Honors string-literal delimiters (single, double, backtick) so a string
 * containing "==" doesn't get split.
 *
 * Note: the polarity (== vs !=) is NOT propagated to the caller. Runtime
 * dispatch is identical for both — value-indexed subscribers fire on
 * transitions to/from valueKey regardless of predicate polarity; the bind
 * function recomputes its own truthiness internally.
 */
function splitOnTopLevelEquality(s) {
  let depth = 0;
  let inStr = null; // null or "'", '"', '`'
  let opIdx = -1;
  let opCount = 0;
  let opSkip = 2; // == and != are both 2-char ops
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr !== null) {
      if (c === "\\") { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { inStr = c; continue; }
    if (c === "(" || c === "[" || c === "{") { depth++; continue; }
    if (c === ")" || c === "]" || c === "}") { depth--; continue; }
    if (depth !== 0) continue;
    // == or != at depth 0
    if (c === "=" && s[i + 1] === "=") {
      // Reject === (third =)
      if (s[i + 2] === "=") return null;
      opIdx = i;
      opCount++;
      if (opCount > 1) return null;
      i++; // skip second =
      continue;
    }
    if (c === "!" && s[i + 1] === "=") {
      // Reject !== (third =)
      if (s[i + 2] === "=") return null;
      opIdx = i;
      opCount++;
      if (opCount > 1) return null;
      i++; // skip the =
      continue;
    }
  }
  if (opCount !== 1) return null;
  return [s.slice(0, opIdx).trim(), s.slice(opIdx + opSkip).trim()];
}

/**
 * Test whether s is a single @CELL reference. Bare @ident only — REJECT
 * dotted paths (`@todo.id`) and computed (`@a[0]`). The narrowing is
 * per-cell-name; dotted paths register on the root cell name in LEGACY but
 * the value-indexed registry needs the full deep value to compare keys, which
 * isn't yet supported.
 */
function asCellRef(s) {
  if (!/^@[A-Za-z_$][A-Za-z0-9_$]*$/.test(s)) return null;
  return s.slice(1);
}

/**
 * Test whether s is a JS primitive literal: string, number, boolean, or null.
 * Returns the source text (for re-emission as valueKey expression) when
 * matched, null otherwise.
 */
function asLiteral(s) {
  // String literal — single or double quoted, with escapes preserved.
  // Template literal (backtick) excluded: may contain ${interpolation} which
  // means the value isn't a static primitive.
  if (/^"(?:[^"\\]|\\.)*"$/.test(s)) return s;
  if (/^'(?:[^'\\]|\\.)*'$/.test(s)) return s;
  // Number literal — int, float, hex, scientific. No leading sign — sign
  // becomes a UnaryExpression in JS, but we DO allow it as a trivial unary
  // on a numeric literal since the result is still a static primitive.
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) return s;
  if (/^[+-]?0[xX][0-9a-fA-F]+$/.test(s)) return s;
  // Boolean / null. In scrml, `not` is the absence literal; emitLit lowers
  // `not` to `null` at the JS layer, so when the lift fire site receives
  // pre-rewritten JS the source for an absence literal might be `null`. We
  // accept `not` defensively though it's unlikely to reach the detector.
  if (s === "true" || s === "false") return s;
  if (s === "null") return s;
  if (s === "not") return "null"; // scrml absence → JS null at registration
  return null;
}

/**
 * Test whether s is a non-reactive closure-captured identifier or dotted
 * path. Must NOT contain @ (reactive ref) and must NOT contain any of
 * (, [, ?, ! (call / index / optional / not-op).
 *
 * Returns the source text (for re-emission as a JS expression that evaluates
 * at registration time to the per-row valueKey) when matched, null otherwise.
 *
 * Example accepts: `todo.id`, `row.entry.key`, `item`
 * Example rejects: `todo.id()`, `arr[0]`, `?todo`, `todo?.id`, `@todo.id`
 */
function asClosureExpr(s) {
  if (!s) return null;
  if (s.indexOf("@") !== -1) return null;
  // Strict allowlist: ident (ident-dotted)* — no parens, no brackets, no operators
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(s)) return null;
  // Reject reserved words that would emit JS evaluation surprises. The list
  // is short: true/false/null are already literals; this/super/new are
  // unsafe; arguments/eval are also unsafe. (Caller wouldn't usually pass
  // these as closure-captured values, but defensive.)
  if (
    s === "this" || s === "super" || s === "new" ||
    s === "arguments" || s === "eval" ||
    s === "true" || s === "false" || s === "null" ||
    s === "undefined" || s === "void" || s === "delete" || s === "typeof"
  ) return null;
  return s;
}

/**
 * The detector. Returns {matched, cellName, valueExprJS} or {matched:false}.
 *
 * @param {string} rawExpr — the raw source-text bind expression (the same
 *   string that emit-lift.js passes to emitExprField)
 * @returns {{matched: true, cellName: string, valueExprJS: string} | {matched: false}}
 */
export function detectPredicateShapeBind(rawExpr) {
  if (typeof rawExpr !== "string") return { matched: false };
  const stripped = stripOuterParens(rawExpr);
  if (!stripped) return { matched: false };
  const split = splitOnTopLevelEquality(stripped);
  if (!split) return { matched: false };
  const [lhsRaw, rhsRaw] = split;
  const lhs = stripOuterParens(lhsRaw);
  const rhs = stripOuterParens(rhsRaw);

  // Classify each side.
  const lhsCell = asCellRef(lhs);
  const rhsCell = asCellRef(rhs);
  // Reject reactive-on-both-sides shapes — would defeat narrowing.
  if (lhsCell !== null && rhsCell !== null) return { matched: false };
  // Reject reactive-with-tail (e.g. @cell.field) by ensuring that if one
  // side starts with @, it must be a single-cell ref. asCellRef enforces.
  if (lhsCell === null && lhs.charCodeAt(0) === 64 /* @ */) return { matched: false };
  if (rhsCell === null && rhs.charCodeAt(0) === 64 /* @ */) return { matched: false };

  let cellName = null;
  let valueSide = null;
  if (lhsCell !== null) { cellName = lhsCell; valueSide = rhs; }
  else if (rhsCell !== null) { cellName = rhsCell; valueSide = lhs; }
  else return { matched: false };

  const lit = asLiteral(valueSide);
  if (lit !== null) return { matched: true, cellName, valueExprJS: lit };
  const closureExpr = asClosureExpr(valueSide);
  if (closureExpr !== null) return { matched: true, cellName, valueExprJS: closureExpr };

  return { matched: false };
}
