// ast-stmt.js — JS-host shadow of ast-stmt.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors ast-stmt.scrml's header — see that file.

// =============================================================================
// StmtKind — string-tag registry for the native Stmt AST. Order mirrors the
// canonical `type Stmt:enum` declaration in ast-stmt.scrml. Per S98 DD §D3
// the Stmt enum is one struct per node-kind under a single enum discriminator.
//
// M3.1 EMITS: Block, ExprStmt, Empty, VarDecl. M3.2 EMITS the control-flow
// kinds (If / While / DoWhile / For / ForIn / ForOf / Return / Break /
// Continue / Labeled). The remaining kinds are declared HERE (the catalog is
// whole — a reviewer can name every statement kind the M3 chain produces)
// but their constructors land at M3.3:
//   - FunctionDecl / ClassDecl / Import / Export / Try / Throw — M3.3.
// =============================================================================
export const StmtKind = Object.freeze({
    // --- M3.1 — statement substrate ---
    Block:    "Block",     // `{ stmt* }`            block statement
    ExprStmt: "ExprStmt",  // `expr ;`               expression statement
    Empty:    "Empty",     // `;`                    the empty statement
    VarDecl:  "VarDecl",   // `let`/`const`/`var` declaration

    // --- M3.2 — control-flow statements ---
    If:       "If",        // `if (test) cons else alt`
    While:    "While",     // `while (test) body`
    DoWhile:  "DoWhile",   // `do body while (test)`
    For:      "For",       // `for (init; test; update) body`
    ForIn:    "ForIn",     // `for (left in right) body`
    ForOf:    "ForOf",     // `for (left of right) body`
    Return:   "Return",    // `return arg?`
    Break:    "Break",     // `break label?`
    Continue: "Continue",  // `continue label?`
    Labeled:  "Labeled",   // `label: body`

    // --- M3.3 — declarations + module syntax + legacy error flow ---
    FunctionDecl: "FunctionDecl",  // `function name(params) { body }`
    ClassDecl:    "ClassDecl",     // `class Name extends Base { ... }`
    Import:       "Import",        // `import ... from "..."`
    Export:       "Export",        // `export ...`
    Try:          "Try",           // `try { } catch { } finally { }`
    Throw:        "Throw",         // `throw arg`
});

// VarDeclKind — the `let` / `const` / `var` declaration keyword (M3.1).
export const VarDeclKind = Object.freeze({
    Let:   "let",
    Const: "const",
    Var:   "var",
});

// BindingKind — the discriminator for a variable-declaration binding TARGET
// (the left side of one declarator). M3.1 parses real binding patterns for
// declaration targets per S98 DD §D5 ("destructuring patterns ...
// `collectBindingIdentifiers` walks these"):
//   Ident      — a plain identifier binding `let x`
//   ObjectPat  — an object-destructuring pattern `let {a, b} = ...`
//   ArrayPat   — an array-destructuring pattern `let [a, b] = ...`
// (Patterns nest: an ObjectPat property value or an ArrayPat element can be
// another pattern, an AssignmentPattern default, or a RestElement.)
export const BindingKind = Object.freeze({
    Ident:     "Ident",
    ObjectPat: "ObjectPat",
    ArrayPat:  "ArrayPat",
});

// BindingPropertyKind — one property of an object-destructuring pattern.
//   KeyValue  — `{ key: target }`  (target is a binding element)
//   Shorthand — `{ name }`         (name is both key and binding identifier)
//   Rest      — `{ ...rest }`      (collects the remaining own properties)
export const BindingPropertyKind = Object.freeze({
    KeyValue:  "KeyValue",
    Shorthand: "Shorthand",
    Rest:      "Rest",
});

// BindingElementKind — one element of an array-destructuring pattern.
//   Item — a binding element (an identifier / nested pattern / defaulted)
//   Hole — an elision slot `[ , x ]` (skips one array position)
//   Rest — `[ ...rest ]` (collects the remaining elements)
export const BindingElementKind = Object.freeze({
    Item: "Item",
    Hole: "Hole",
    Rest: "Rest",
});

// =============================================================================
// Statement node constructors — M3.1.
//
// Every Stmt node is a plain JS object: a `kind` string tag (a StmtKind value)
// + per-variant payload fields + a `span: Span`. Same string-tag concession as
// ast-expr.js / token.js (the canonical scrml-source form is a tagged-variant
// enum — see ast-stmt.scrml; the M5 swap-in lights it up).
// =============================================================================

// makeBlock — a block statement `{ stmt* }`. `body` is a Stmt array. The span
// covers the opening `{` to the closing `}`.
export function makeBlock(body, span) {
    return { kind: StmtKind.Block, body, span };
}

// makeExprStmt — an expression statement `expr ;`. `expression` is an Expr
// node (from ast-expr). The trailing `;` is consumed by the parser but is not
// retained on the node (matching ESTree's ExpressionStatement).
export function makeExprStmt(expression, span) {
    return { kind: StmtKind.ExprStmt, expression, span };
}

// makeEmpty — the empty statement `;`. Carries only a span (matching ESTree's
// EmptyStatement). A lone `;` is a legal no-op statement.
export function makeEmpty(span) {
    return { kind: StmtKind.Empty, span };
}

// makeVarDecl — a variable declaration `let`/`const`/`var` decl0, decl1, ...`.
// `declKind` is a VarDeclKind value. `declarations` is an array of declarator
// objects (see makeVarDeclarator). The trailing `;` is consumed by the parser.
export function makeVarDecl(declKind, declarations, span) {
    return { kind: StmtKind.VarDecl, declKind, declarations, span };
}

// makeVarDeclarator — one declarator of a variable declaration: a binding
// `target` and an optional `init` Expr. `init` is `not` for an
// initializer-free declarator (`let x;`). `target` is a binding node from
// makeBindingIdent / makeObjectPattern / makeArrayPattern.
export function makeVarDeclarator(target, init, span) {
    return { target, init, span };
}

// =============================================================================
// Control-flow statement node constructors — M3.2 (DD §D3 / §D5).
//
// Each is a plain JS object: a `kind` string tag (a StmtKind value) +
// per-variant payload fields + a `span: Span`. Statement-position children
// (`consequent` / `body` / loop bodies) are Stmt nodes; condition / argument
// children are Expr nodes from ast-expr.
// =============================================================================

// makeIf — an `if (test) consequent else alternate` statement. `test` is an
// Expr, `consequent` a Stmt. `alternate` is a Stmt or `null` (no `else`); an
// `else if` chain is an If nested as the alternate — Acorn's IfStatement shape.
export function makeIf(test, consequent, alternate, span) {
    return { kind: StmtKind.If, test, consequent, alternate, span };
}

// makeWhile — a `while (test) body` loop. `test` is an Expr; `body` a Stmt.
export function makeWhile(test, body, span) {
    return { kind: StmtKind.While, test, body, span };
}

// makeDoWhile — a `do body while (test)` loop. The body runs once before the
// first test. `body` is a Stmt; `test` an Expr.
export function makeDoWhile(body, test, span) {
    return { kind: StmtKind.DoWhile, body, test, span };
}

// makeFor — a C-style three-clause `for (init; test; update) body` loop. Each
// of `init` / `test` / `update` is `null` when its clause is empty. `init` is
// a VarDecl Stmt or an Expr; `test` / `update` are Exprs; `body` is a Stmt.
export function makeFor(init, test, update, body, span) {
    return { kind: StmtKind.For, init, test, update, body, span };
}

// makeForIn — a `for (left in right) body` loop. `left` is a VarDecl Stmt
// (`for (let k in o)`) or an assignment-target Expr (`for (k in o)`); `right`
// is the iterated-object Expr; `body` is a Stmt.
export function makeForIn(left, right, body, span) {
    return { kind: StmtKind.ForIn, left, right, body, span };
}

// makeForOf — a `for (left of right) body` loop. `left` / `right` / `body` as
// for ForIn. `isAwait` is true for `for await (left of right)` — an M3.2
// extension of the DD §D3 ForOf shape, mirroring Acorn's ForOfStatement
// `await: boolean`. The body's `async` context itself is M3.3's territory;
// M3.2 only recognizes the `await` keyword in the `for` head.
export function makeForOf(left, right, body, isAwait, span) {
    return { kind: StmtKind.ForOf, left, right, body, isAwait, span };
}

// makeReturn — a `return argument` statement. `argument` is an Expr, or
// `null` for a bare `return` (a `return` followed by `;` / a newline / `}`).
export function makeReturn(argument, span) {
    return { kind: StmtKind.Return, argument, span };
}

// makeBreak — a `break` statement, optionally `break label`. `label` is the
// label identifier text, or `null` for an unlabeled break.
export function makeBreak(label, span) {
    return { kind: StmtKind.Break, label, span };
}

// makeContinue — a `continue` statement, optionally `continue label`. `label`
// is the label identifier text, or `null` for an unlabeled continue.
export function makeContinue(label, span) {
    return { kind: StmtKind.Continue, label, span };
}

// makeLabeled — a `label: body` labeled statement. `label` is the label
// identifier text; `body` is the statement the label names (`break label` /
// `continue label` target it).
export function makeLabeled(label, body, span) {
    return { kind: StmtKind.Labeled, label, body, span };
}

// =============================================================================
// Binding-pattern node constructors — M3.1.
//
// The declaration-target grammar per S98 DD §D5. A binding TARGET is an
// identifier or a destructuring pattern; patterns nest. These are SEPARATE
// from ast-expr's Object/Array literal nodes — a binding pattern is the
// left-of-`=` shape, not a value (ESTree splits ObjectPattern/ArrayPattern
// from ObjectExpression/ArrayExpression for the same reason). M2.3's
// `parseParamTarget` still uses literal stand-ins for FUNCTION PARAMS; M4
// unifies the two surfaces (documented in the roadmap K-class report).
// =============================================================================

// makeBindingIdent — a plain identifier binding `x`. `name` is the identifier
// text. The leaf of every binding pattern.
export function makeBindingIdent(name, span) {
    return { bindingKind: BindingKind.Ident, name, span };
}

// makeObjectPattern — an object-destructuring pattern `{ a, b: c, ...rest }`.
// `properties` is an array of binding-property objects (see the
// makeBindingProperty* constructors).
export function makeObjectPattern(properties, span) {
    return { bindingKind: BindingKind.ObjectPat, properties, span };
}

// makeArrayPattern — an array-destructuring pattern `[ a, , b, ...rest ]`.
// `elements` is an array of binding-element objects (see the
// makeBindingElement* constructors).
export function makeArrayPattern(elements, span) {
    return { bindingKind: BindingKind.ArrayPat, elements, span };
}

// makeAssignmentPattern — a defaulted binding `target = default`. Used inside
// object/array patterns ( `{ a = 1 }`, `[ x = 0 ]` ) and at the declarator
// level is NOT needed (the declarator carries its own `init`). `left` is the
// binding target, `right` is the default-value Expr.
export function makeAssignmentPattern(left, right, span) {
    return { bindingKind: "AssignmentPattern", left, right, span };
}

// makeRestElement — a rest binding `...target`. The trailing element of an
// array pattern or the trailing property of an object pattern. `argument` is
// the binding target collecting the remainder.
export function makeRestElement(argument, span) {
    return { bindingKind: "RestElement", argument, span };
}

// --- object-pattern property constructors ---

// makeBindingPropertyKeyValue — `{ key: target }`. `key` is the property-key
// Expr (an Ident, a StringLit, a NumberLit, or — when `computed` — any Expr).
// `value` is the binding target the property destructures into.
export function makeBindingPropertyKeyValue(key, value, computed) {
    return { propertyKind: BindingPropertyKind.KeyValue, key, value, computed };
}

// makeBindingPropertyShorthand — `{ name }` (optionally `{ name = default }`,
// in which case `value` is an AssignmentPattern wrapping the identifier).
// `name` is the binding identifier; `value` is the binding target (a plain
// BindingIdent for `{ name }`, an AssignmentPattern for `{ name = d }`).
export function makeBindingPropertyShorthand(name, value) {
    return { propertyKind: BindingPropertyKind.Shorthand, name, value };
}

// makeBindingPropertyRest — `{ ...rest }`. `argument` is the rest binding
// target. An object-pattern rest collects the own enumerable properties not
// already bound.
export function makeBindingPropertyRest(argument) {
    return { propertyKind: BindingPropertyKind.Rest, argument };
}

// --- array-pattern element constructors ---

// makeBindingElementItem — one positional element of an array pattern. `value`
// is the binding target (a BindingIdent, a nested pattern, or an
// AssignmentPattern when the slot has a default).
export function makeBindingElementItem(value) {
    return { elementKind: BindingElementKind.Item, value };
}

// makeBindingElementHole — an elision slot `[ , x ]`. Carries no payload; it
// skips one array position.
export function makeBindingElementHole() {
    return { elementKind: BindingElementKind.Hole };
}

// makeBindingElementRest — `[ ...rest ]`. `argument` is the rest binding
// target collecting the remaining elements.
export function makeBindingElementRest(argument) {
    return { elementKind: BindingElementKind.Rest, argument };
}

// --- isStmt — predicate ---
export function isStmt(node) {
    if (node === undefined || node === null) {
        return false;
    }
    return StmtKind[node.kind] !== undefined;
}
