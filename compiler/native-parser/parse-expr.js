// parse-expr.js — JS-host shadow of parse-expr.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-expr.scrml's header — see that file.
//
// SCOPE — M2.1 + M2.2.
//   M2.1: PRIMARY EXPRESSIONS. M2.2: OPERATOR EXPRESSIONS — binary
//   (precedence-climbing core), logical, unary prefix, update (++/--),
//   assignment, conditional ?:, sequence ,.
//
//   parseExpression is the single recursion seam (full sequence-level).
//   parseAssignmentExpr is the no-comma entry used by element positions
//   (array elements, object values, spread args). Call/member/optional-
//   chain/new/arrow/function are M2.3 — parsePostfix is the M2.3 seam
//   (== parsePrimary at M2.2). scrml-extension expression forms are M2.4.

import { makeTokenCursor, current, currentKind, peek, peekKind, advance, atEnd, snapshot, restore } from "./token-cursor.js";
import { TokenKind } from "./token.js";
import { makeSpan } from "./span.js";
import { ParseMode, initialParseMode, getParseMode, setParseMode, enterMode, exitMode } from "./parse-mode.js";
import {
    makeIdent, makeNumberLit, makeStringLit, makeBoolLit, makeRegexLit,
    makeTemplateLit, makeTemplateQuasi, makeAtCell, makeBareVariant,
    makeArray, makeArrayItem, makeArraySpread, makeArrayHole,
    makeObject, makeObjectKeyValue, makeObjectShorthand, makeObjectSpread,
    makeParen,
    makeUnary, makeUpdate, makeBinary, makeLogical, makeAssignment,
    makeConditional, makeSequence,
} from "./ast-expr.js";

// --- makeParseExprContext — parser state constructor ---
export function makeParseExprContext(tokens) {
    return {
        cursor:           makeTokenCursor(tokens),
        currentParseMode: initialParseMode(),
        errors:           [],
    };
}

export function recordError(ctx, code, message, span) {
    ctx.errors.push({ code, message, span });
}

// =============================================================================
// M2.2 operator tables — classification data for the precedence-climbing core.
// These are calculation-shape lookup tables: a token kind maps to its operator
// role + (for binary operators) its binding precedence. JS precedence + assoc
// are reproduced here EXACTLY (the conformance check vs Acorn is the proof).
// =============================================================================

// BINARY_PRECEDENCE — non-logical binary operators, keyed by TokenKind, valued
// by binding precedence. HIGHER binds tighter. Logical operators (&& || ??)
// are NOT here — ESTree models them as a separate LogicalExpression node, so
// they live in LOGICAL_PRECEDENCE below.
//
// The ECMA-262 binding order, tight -> loose:
//   ** > {* / %} > {+ -} > {<< >> >>>} > {< <= > >= instanceof in}
//      > {== != === !==} > & > ^ > | > && > || > ??
// BINARY_PRECEDENCE covers ** down through |; LOGICAL_PRECEDENCE covers && || ??.
const BINARY_PRECEDENCE = Object.freeze({
    [TokenKind.BitOr]:                 4,
    [TokenKind.BitXor]:                5,
    [TokenKind.BitAnd]:                6,
    [TokenKind.Equal]:                 7,
    [TokenKind.NotEqual]:              7,
    [TokenKind.StrictEqual]:           7,
    [TokenKind.StrictNotEqual]:        7,
    [TokenKind.LessThan]:              8,
    [TokenKind.LessEqual]:             8,
    [TokenKind.GreaterThan]:           8,
    [TokenKind.GreaterEqual]:          8,
    [TokenKind.KwInstanceof]:          8,
    [TokenKind.KwIn]:                  8,
    [TokenKind.BitShiftLeft]:          9,
    [TokenKind.BitShiftRight]:         9,
    [TokenKind.BitShiftRightUnsigned]: 9,
    [TokenKind.Plus]:                  10,
    [TokenKind.Minus]:                 10,
    [TokenKind.Star]:                  11,
    [TokenKind.Slash]:                 11,
    [TokenKind.Percent]:               11,
    [TokenKind.StarStar]:              12,
});

// LOGICAL_PRECEDENCE — the three short-circuit operators. ESTree node-kind:
// LogicalExpression (NOT BinaryExpression). ?? binds loosest; then ||; then &&.
// JS forbids mixing ?? with && / || without parentheses — enforced in
// parseBinary's climb loop.
const LOGICAL_PRECEDENCE = Object.freeze({
    [TokenKind.NullishCoalesce]: 1,
    [TokenKind.LogicalOr]:       2,
    [TokenKind.LogicalAnd]:      3,
});

// BINARY_OP_TEXT — the operator string ESTree puts on a BinaryExpression /
// LogicalExpression node. M1's tokens carry `.text`, but keyword operators
// (instanceof / in) carry the keyword text already, and re-composed compound
// tokens need a synthesized string — so this table is the single source.
const BINARY_OP_TEXT = Object.freeze({
    [TokenKind.BitOr]:                 "|",
    [TokenKind.BitXor]:                "^",
    [TokenKind.BitAnd]:                "&",
    [TokenKind.Equal]:                 "==",
    [TokenKind.NotEqual]:              "!=",
    [TokenKind.StrictEqual]:           "===",
    [TokenKind.StrictNotEqual]:        "!==",
    [TokenKind.LessThan]:              "<",
    [TokenKind.LessEqual]:             "<=",
    [TokenKind.GreaterThan]:           ">",
    [TokenKind.GreaterEqual]:          ">=",
    [TokenKind.KwInstanceof]:          "instanceof",
    [TokenKind.KwIn]:                  "in",
    [TokenKind.BitShiftLeft]:          "<<",
    [TokenKind.BitShiftRight]:         ">>",
    [TokenKind.BitShiftRightUnsigned]: ">>>",
    [TokenKind.Plus]:                  "+",
    [TokenKind.Minus]:                 "-",
    [TokenKind.Star]:                  "*",
    [TokenKind.Slash]:                 "/",
    [TokenKind.Percent]:               "%",
    [TokenKind.StarStar]:              "**",
    [TokenKind.NullishCoalesce]:       "??",
    [TokenKind.LogicalOr]:             "||",
    [TokenKind.LogicalAnd]:            "&&",
});

// SIMPLE_ASSIGN_OPS — the four compound-assignment operators M1 lexes as a
// SINGLE token, plus plain `=`. Keyed by TokenKind, valued by the ESTree
// operator string.
const SIMPLE_ASSIGN_OPS = Object.freeze({
    [TokenKind.Assign]:      "=",
    [TokenKind.PlusAssign]:  "+=",
    [TokenKind.MinusAssign]: "-=",
    [TokenKind.StarAssign]:  "*=",
    [TokenKind.SlashAssign]: "/=",
});

// TWO_TOKEN_ASSIGN_OPS — the eleven compound-assignment operators M1's lexer
// (lex-in-code) does NOT munch into one token: it emits the operator token
// then a separate `Assign`. The native parser re-composes them HERE, at the
// parse layer, when the two tokens are SOURCE-ADJACENT (no gap between
// `<op>.span.end` and `<Assign>.span.start`). Adjacency matters: `a %= b` is
// valid but `a % = b` is two separate operators. Keyed by the leading token's
// kind, valued by the ESTree operator string.
//
// (This re-composition is a deliberate M2.2 design choice — M1 is frozen for
// this dispatch per the brief. It is documented as deferred-M1.x cleanup: the
// canonical fix is the lexer doing maximal munch for these eleven. The parse-
// layer re-composition is AST-equivalent to Acorn either way.)
const TWO_TOKEN_ASSIGN_OPS = Object.freeze({
    [TokenKind.Percent]:               "%=",
    [TokenKind.StarStar]:              "**=",
    [TokenKind.BitShiftLeft]:          "<<=",
    [TokenKind.BitShiftRight]:         ">>=",
    [TokenKind.BitShiftRightUnsigned]: ">>>=",
    [TokenKind.BitAnd]:                "&=",
    [TokenKind.BitOr]:                 "|=",
    [TokenKind.BitXor]:                "^=",
    [TokenKind.LogicalAnd]:            "&&=",
    [TokenKind.LogicalOr]:             "||=",
    [TokenKind.NullishCoalesce]:       "??=",
});

// =============================================================================
// The expression-parser ladder. Each level handles one precedence band and
// recurses DOWN to the next. parseExpression is the single recursion seam the
// inner positions (array / object / template / paren) re-enter.
//
//   parseExpression     level 1   sequence ,
//   parseAssignmentExpr level 2   assignment = += ... (right-assoc)
//   parseConditional    level 3   ?: ternary (right-assoc)
//   parseBinary         levels 4-12 + logical — precedence-climbing core
//   parseUnary          prefix ! - + ~ typeof void delete, prefix ++/--
//   parseUpdate         postfix ++/--
//   parsePostfix        M2.3 seam (== parsePrimary at M2.2)
//   parsePrimary        primary expressions (M2.1)
// =============================================================================

// --- parseExpression — the single recursion seam (M2.2: sequence-level) ---
export function parseExpression(ctx) {
    return parseSequence(ctx);
}

// --- parseSequence — comma operator: a, b, c -> SequenceExpression ---
// A bare comma is the loosest-binding operator. The element positions
// (array / object / arguments) do NOT call this — they call
// parseAssignmentExpr — so a comma there separates rather than sequences.
export function parseSequence(ctx) {
    const cursor = ctx.cursor;
    const first = parseAssignmentExpr(ctx);

    if (currentKind(cursor) !== TokenKind.Comma) {
        return first;
    }

    const expressions = [first];
    while (currentKind(cursor) === TokenKind.Comma) {
        advance(cursor);   // consume the ,
        const next = parseAssignmentExpr(ctx);
        expressions.push(next);
    }

    const span = spanOf(first, expressions[expressions.length - 1]);
    return makeSequence(expressions, span);
}

// --- parseAssignmentExpr — = and every compound-assignment form ---
// Assignment is RIGHT-associative: a = b = c parses as a = (b = c). The
// left side is parsed at conditional level; if an assignment operator
// follows, the right side recurses back into parseAssignmentExpr.
//
// This is the no-comma entry point — element positions call it directly so
// a separating comma is not swallowed as a sequence.
export function parseAssignmentExpr(ctx) {
    const cursor = ctx.cursor;
    const left = parseConditional(ctx);

    const assignInfo = matchAssignmentOperator(ctx);
    if (assignInfo === null) {
        return left;
    }

    // Consume the operator token(s). A two-token compound (`%=` etc.) is two
    // adjacent tokens; a simple operator is one.
    advance(cursor);
    if (assignInfo.twoToken) {
        advance(cursor);   // consume the trailing Assign
    }

    const value = parseAssignmentExpr(ctx);   // right-assoc recursion
    const span = spanOf(left, value);
    return makeAssignment(assignInfo.op, left, value, span);
}

// --- isTwoTokenAssignLead — is the cursor at the leading half of a `%=` etc.? ---
// True iff the current token is a TWO_TOKEN_ASSIGN_OPS key AND the immediately
// following token is a SOURCE-ADJACENT `Assign` (no gap between the operator's
// `span.end` and the `Assign`'s `span.start`). `a %= b` (adjacent) -> true;
// `a % = b` (gap) -> false (that is `%` then `=`, two distinct operators).
//
// parseBinary calls this so it does NOT consume `%` / `**` / `<<` / ... as a
// binary operator when the token is actually the head of `%=` / `**=` / `<<=` /
// ... — that compound operator belongs to parseAssignmentExpr's layer.
export function isTwoTokenAssignLead(ctx) {
    const cursor = ctx.cursor;
    const kind = currentKind(cursor);

    if (TWO_TOKEN_ASSIGN_OPS[kind] === undefined) {
        return false;
    }
    if (peekKind(cursor, 1) !== TokenKind.Assign) {
        return false;
    }
    const here = current(cursor);
    const next = peek(cursor, 1);
    if (here === undefined || here === null || next === undefined || next === null) {
        return false;
    }
    if (here.span === undefined || next.span === undefined) {
        return false;
    }
    return here.span.end === next.span.start;
}

// --- matchAssignmentOperator — recognize an assignment operator at cursor ---
// Returns { op, twoToken } or null. The four compound operators M1 munches
// into one token (`+= -= *= /=`) plus `=` are SIMPLE_ASSIGN_OPS; the eleven
// M1 does NOT munch are re-composed from two adjacent tokens (see
// isTwoTokenAssignLead).
export function matchAssignmentOperator(ctx) {
    const kind = currentKind(ctx.cursor);

    const simple = SIMPLE_ASSIGN_OPS[kind];
    if (simple !== undefined) {
        return { op: simple, twoToken: false };
    }

    if (isTwoTokenAssignLead(ctx)) {
        return { op: TWO_TOKEN_ASSIGN_OPS[kind], twoToken: true };
    }

    return null;
}

// --- parseConditional — ternary test ? consequent : alternate ---
// Right-associative. The test is parsed at binary level; the branches at
// assignment level (so `a ? b : c = d` puts the assignment in the alternate,
// matching JS). A ternary is its own level between assignment and binary.
export function parseConditional(ctx) {
    const cursor = ctx.cursor;
    const test = parseBinary(ctx, 0);

    if (currentKind(cursor) !== TokenKind.Question) {
        return test;
    }

    advance(cursor);   // consume ?
    const consequent = parseAssignmentExpr(ctx);

    if (currentKind(cursor) !== TokenKind.Colon) {
        const here = current(cursor);
        const span = (here === undefined || here === null) ? test.span : here.span;
        recordError(ctx, "E-EXPR-TERNARY-COLON", "expected ':' in conditional expression", span);
        // Return the test so the caller can re-sync; the malformed ternary is
        // not built.
        return test;
    }
    advance(cursor);   // consume :
    const alternate = parseAssignmentExpr(ctx);

    const span = spanOf(test, alternate);
    return makeConditional(test, consequent, alternate, span);
}

// --- isUnparenthesizedLogical — is `node` a Logical node with op in `ops`? ---
// A Paren node is NOT a Logical, so a parenthesized `(a ?? b)` returns false —
// which is exactly the ECMA-262 carve-out: parentheses make the mix legal.
function isUnparenthesizedLogical(node, ops) {
    if (node === undefined || node === null) {
        return false;
    }
    if (node.kind !== "Logical") {
        return false;
    }
    return ops.indexOf(node.op) !== -1;
}

// --- parseBinary — the precedence-climbing core (binary + logical) ---
// minPrec is the minimum binding precedence this call will consume. The loop
// reads an operator, and if it binds at >= minPrec, recurses for the right
// operand at a precedence that enforces left-associativity (for **, right-
// associativity). Logical operators produce a LogicalExpression node; the
// arithmetic/comparison/bitwise operators produce a BinaryExpression node.
//
// JS forbids mixing ?? with && / || without parentheses (ECMA-262: ?? and
// && / || are separate grammar productions). After building a Logical node,
// if a ?? has an un-parenthesized && / || operand — or a && / || has an
// un-parenthesized ?? operand — that is the illegal mix.
export function parseBinary(ctx, minPrec) {
    const cursor = ctx.cursor;
    let left = parseUnary(ctx);

    while (true) {
        const kind = currentKind(cursor);
        const binPrec = BINARY_PRECEDENCE[kind];
        const logPrec = LOGICAL_PRECEDENCE[kind];

        // Not an operator we climb, or it binds looser than the caller wants.
        if (binPrec === undefined && logPrec === undefined) {
            break;
        }
        const prec = binPrec !== undefined ? binPrec : logPrec;
        if (prec < minPrec) {
            break;
        }

        // The operator token is also the LEADING half of a compound-assignment
        // operator (`%` -> `%=`, `**` -> `**=`, `&&` -> `&&=`, ...). When an
        // adjacent `Assign` follows, this is an assignment, NOT a binary op —
        // stop the climb so parseAssignmentExpr's layer re-composes it.
        if (isTwoTokenAssignLead(ctx)) {
            break;
        }

        const opTok = advance(cursor);   // consume the operator
        const opText = BINARY_OP_TEXT[kind];

        // ** is RIGHT-associative — recurse at the SAME precedence so the
        // right operand can itself be a ** chain. All other binary operators
        // are left-associative — recurse at prec+1 so an equal-precedence
        // operator on the right is left for THIS loop's next iteration.
        const rightMinPrec = (kind === TokenKind.StarStar) ? prec : prec + 1;
        const right = parseBinary(ctx, rightMinPrec);

        const span = spanOf(left, right);
        if (logPrec !== undefined) {
            // ?? cannot be combined with && / || without parentheses.
            if (kind === TokenKind.NullishCoalesce) {
                if (isUnparenthesizedLogical(left, ["&&", "||"])
                    || isUnparenthesizedLogical(right, ["&&", "||"])) {
                    recordError(ctx, "E-EXPR-NULLISH-MIX",
                        "'??' cannot be combined with '&&' or '||' without parentheses",
                        opTok.span);
                }
            } else {
                // && / ||
                if (isUnparenthesizedLogical(left, ["??"])
                    || isUnparenthesizedLogical(right, ["??"])) {
                    recordError(ctx, "E-EXPR-NULLISH-MIX",
                        "'&&' / '||' cannot be combined with '??' without parentheses",
                        opTok.span);
                }
            }
            left = makeLogical(opText, left, right, span);
        } else {
            left = makeBinary(opText, left, right, span);
        }
    }

    return left;
}

// --- parseUnary — prefix unary operators + prefix update operators ---
// Prefix operators: ! - + ~ typeof void delete (UnaryExpression) and prefix
// ++ / -- (UpdateExpression). All recurse into parseUnary so chains like
// `!-x` or `typeof !x` parse. When no prefix operator is present, falls
// through to parseUpdate (which handles postfix ++/--).
//
// JS rule: `**` may not have an un-parenthesized unary operator on its left
// (`-2 ** 2` is a SyntaxError). The check happens AFTER building the unary —
// if a `**` immediately follows, the unary's reach over `**` is illegal.
export function parseUnary(ctx) {
    const cursor = ctx.cursor;
    const kind = currentKind(cursor);

    // Prefix update operators ++ / --
    if (kind === TokenKind.Increment || kind === TokenKind.Decrement) {
        const opTok = advance(cursor);
        const operand = parseUnary(ctx);
        const opText = (kind === TokenKind.Increment) ? "++" : "--";
        const span = makeSpan(opTok.span.start, endOf(operand), opTok.span.line, opTok.span.col);
        return makeUpdate(opText, operand, true, span);
    }

    // Prefix unary operators
    const unaryOpText = prefixUnaryOpText(kind);
    if (unaryOpText !== null) {
        const opTok = advance(cursor);
        const operand = parseUnary(ctx);
        const span = makeSpan(opTok.span.start, endOf(operand), opTok.span.line, opTok.span.col);

        // `-2 ** 2` etc. — an un-parenthesized unary cannot be the left
        // operand of **. ECMA-262 makes this a SyntaxError; Acorn rejects it.
        if (currentKind(cursor) === TokenKind.StarStar) {
            recordError(ctx, "E-EXPR-UNARY-EXPONENT",
                "unary operator '" + unaryOpText + "' cannot directly precede '**'; wrap the operand in parentheses",
                current(cursor).span);
        }
        return makeUnary(unaryOpText, operand, true, span);
    }

    return parseUpdate(ctx);
}

// --- prefixUnaryOpText — the ESTree operator string for a prefix unary op ---
// Returns the operator string, or null when the token is not a prefix unary.
export function prefixUnaryOpText(kind) {
    if (kind === TokenKind.Bang)     { return "!"; }
    if (kind === TokenKind.Minus)    { return "-"; }
    if (kind === TokenKind.Plus)     { return "+"; }
    if (kind === TokenKind.BitNot)   { return "~"; }
    if (kind === TokenKind.KwTypeof) { return "typeof"; }
    if (kind === TokenKind.KwVoid)   { return "void"; }
    if (kind === TokenKind.KwDelete) { return "delete"; }
    return null;
}

// --- parseUpdate — postfix update operators ++ / -- ---
// Parses one postfix-core expression (parsePostfix — the M2.3 seam, == primary
// at M2.2), then consumes a trailing ++ / -- if present. Postfix update binds
// tighter than every prefix operator.
export function parseUpdate(ctx) {
    const cursor = ctx.cursor;
    const operand = parsePostfix(ctx);

    const kind = currentKind(cursor);
    if (kind === TokenKind.Increment || kind === TokenKind.Decrement) {
        const opTok = advance(cursor);
        const opText = (kind === TokenKind.Increment) ? "++" : "--";
        const span = makeSpan(startOf(operand), opTok.span.end, lineOf(operand), colOf(operand));
        return makeUpdate(opText, operand, false, span);
    }

    return operand;
}

// --- parsePostfix — the M2.3 seam (call / member / optional-chain / new) ---
// At M2.2 a postfix-core expression IS a primary expression. M2.3 widens this
// to wrap parsePrimary with member access, calls, and optional chaining.
export function parsePostfix(ctx) {
    return parsePrimary(ctx);
}

// --- spanOf / start / end / line / col helpers — node-span arithmetic ---
// A binary / logical / sequence / conditional node's span covers from the
// start of its first child to the end of its last child. These helpers read
// a node's span defensively (a malformed parse can yield a null child).
export function startOf(node) {
    if (node === undefined || node === null || node.span === undefined || node.span === null) {
        return 0;
    }
    return node.span.start;
}
export function endOf(node) {
    if (node === undefined || node === null || node.span === undefined || node.span === null) {
        return 0;
    }
    return node.span.end;
}
export function lineOf(node) {
    if (node === undefined || node === null || node.span === undefined || node.span === null) {
        return 1;
    }
    return node.span.line;
}
export function colOf(node) {
    if (node === undefined || node === null || node.span === undefined || node.span === null) {
        return 1;
    }
    return node.span.col;
}
export function spanOf(leftNode, rightNode) {
    return makeSpan(startOf(leftNode), endOf(rightNode), lineOf(leftNode), colOf(leftNode));
}

// --- parsePrimary — parse one primary expression; dispatch on token kind ---
export function parsePrimary(ctx) {
    const cursor = ctx.cursor;
    const kind = currentKind(cursor);

    // Numeric literal
    if (kind === TokenKind.NumberLit) {
        const tok = advance(cursor);
        return makeNumberLit(tok.value, tok.text, tok.span);
    }

    // String literal
    if (kind === TokenKind.StringLit) {
        const tok = advance(cursor);
        return makeStringLit(tok.cooked, tok.text, tok.span);
    }

    // Boolean literal — true / false
    if (kind === TokenKind.KwTrue) {
        const tok = advance(cursor);
        return makeBoolLit(true, tok.span);
    }
    if (kind === TokenKind.KwFalse) {
        const tok = advance(cursor);
        return makeBoolLit(false, tok.span);
    }

    // Regex literal
    if (kind === TokenKind.RegexLit) {
        const tok = advance(cursor);
        return makeRegexLit(tok.pattern, tok.flags, tok.text, tok.span);
    }

    // Template literal
    if (kind === TokenKind.TemplateChunk) {
        return parseTemplateLiteral(ctx);
    }

    // Identifier
    if (kind === TokenKind.Ident) {
        const tok = advance(cursor);
        return makeIdent(tok.name, tok.span);
    }

    // @-cell
    if (kind === TokenKind.ScrmlAt) {
        const tok = advance(cursor);
        return makeAtCell(tok.name, tok.span);
    }

    // Bare variant .X
    if (kind === TokenKind.BareVariant) {
        const tok = advance(cursor);
        return makeBareVariant(tok.name, tok.span);
    }

    // Parenthesized expression ( expr )
    if (kind === TokenKind.LParen) {
        return parseParenExpression(ctx);
    }

    // Array literal [ ... ]
    if (kind === TokenKind.LBracket) {
        return parseArrayLiteral(ctx);
    }

    // Object literal { ... }
    if (kind === TokenKind.LBrace) {
        return parseObjectLiteral(ctx);
    }

    // Unrecognized
    const here = current(cursor);
    const span = (here === undefined || here === null) ? makeSpan(0, 0, 1, 1) : here.span;
    recordError(ctx, "E-EXPR-UNEXPECTED", "unexpected token in expression position: " + String(kind), span);
    return null;
}

// --- parseParenExpression — ( expr ) ---
// The paren body parses at the FULL expression level (parseExpression — a
// sequence is legal inside parens: `(a, b)`).
export function parseParenExpression(ctx) {
    const cursor = ctx.cursor;
    const open = advance(cursor);   // consume (
    const prior = enterMode(ctx, ParseMode.InExpression);
    const inner = parseExpression(ctx);
    exitMode(ctx, prior);
    const endSpan = expectRParen(ctx, open);
    const span = makeSpan(open.span.start, endSpan.end, open.span.line, open.span.col);
    return makeParen(inner, span);
}

// --- parseArrayLiteral — [ elem, elem, ... ] ---
// Each element parses at ASSIGNMENT level (parseAssignmentExpr) — a comma
// SEPARATES elements; it must not be swallowed as a sequence.
export function parseArrayLiteral(ctx) {
    const cursor = ctx.cursor;
    const open = advance(cursor);   // consume [
    const prior = enterMode(ctx, ParseMode.InArrayLiteral);
    const elements = [];

    while (atEnd(cursor) === false && currentKind(cursor) !== TokenKind.RBracket) {
        // Hole — comma in element position
        if (currentKind(cursor) === TokenKind.Comma) {
            elements.push(makeArrayHole());
            advance(cursor);   // consume the ,
            continue;
        }

        // Spread element ...expr
        if (currentKind(cursor) === TokenKind.Ellipsis) {
            advance(cursor);   // consume ...
            const innerPrior = enterMode(ctx, ParseMode.InExpression);
            const spreadExpr = parseAssignmentExpr(ctx);
            exitMode(ctx, innerPrior);
            elements.push(makeArraySpread(spreadExpr));
        } else {
            // Plain element expression
            const innerPrior = enterMode(ctx, ParseMode.InExpression);
            const itemExpr = parseAssignmentExpr(ctx);
            exitMode(ctx, innerPrior);
            elements.push(makeArrayItem(itemExpr));
        }

        // After an element: either a , separator or the closing ]
        if (currentKind(cursor) === TokenKind.Comma) {
            advance(cursor);   // consume the separator ,
        } else {
            break;
        }
    }

    exitMode(ctx, prior);
    const close = expectRBracket(ctx, open);
    const span = makeSpan(open.span.start, close.end, open.span.line, open.span.col);
    return makeArray(elements, span);
}

// --- parseObjectLiteral — { prop, prop, ... } ---
export function parseObjectLiteral(ctx) {
    const cursor = ctx.cursor;
    const open = advance(cursor);   // consume {
    const prior = enterMode(ctx, ParseMode.InObjectLiteral);
    const properties = [];

    while (atEnd(cursor) === false && currentKind(cursor) !== TokenKind.RBrace) {
        // Spread property { ...rest }
        if (currentKind(cursor) === TokenKind.Ellipsis) {
            advance(cursor);   // consume ...
            const innerPrior = enterMode(ctx, ParseMode.InExpression);
            const spreadExpr = parseAssignmentExpr(ctx);
            exitMode(ctx, innerPrior);
            properties.push(makeObjectSpread(spreadExpr));
        } else {
            const prop = parseObjectProperty(ctx);
            if (prop === undefined || prop === null) {
                break;
            }
            properties.push(prop);
        }

        // After a property: either a , separator or the closing }
        if (currentKind(cursor) === TokenKind.Comma) {
            advance(cursor);   // consume the separator ,
        } else {
            break;
        }
    }

    exitMode(ctx, prior);
    const close = expectRBrace(ctx, open);
    const span = makeSpan(open.span.start, close.end, open.span.line, open.span.col);
    return makeObject(properties, span);
}

// --- parseObjectProperty — one non-spread object-literal property ---
// A property VALUE parses at ASSIGNMENT level — a comma separates properties.
export function parseObjectProperty(ctx) {
    const cursor = ctx.cursor;
    const startKind = currentKind(cursor);

    // Computed key [ expr ] : value
    if (startKind === TokenKind.LBracket) {
        advance(cursor);   // consume [
        const keyPrior = enterMode(ctx, ParseMode.InExpression);
        const keyExpr = parseAssignmentExpr(ctx);
        exitMode(ctx, keyPrior);
        expectRBracket(ctx, current(cursor));
        if (expectColon(ctx) === false) {
            return null;
        }
        const valuePrior = enterMode(ctx, ParseMode.InExpression);
        const valueExpr = parseAssignmentExpr(ctx);
        exitMode(ctx, valuePrior);
        return makeObjectKeyValue(keyExpr, valueExpr, true);
    }

    // Identifier / string / number key
    let keyNode = null;
    if (startKind === TokenKind.Ident) {
        const tok = advance(cursor);
        keyNode = makeIdent(tok.name, tok.span);
    } else if (startKind === TokenKind.StringLit) {
        const tok = advance(cursor);
        keyNode = makeStringLit(tok.cooked, tok.text, tok.span);
    } else if (startKind === TokenKind.NumberLit) {
        const tok = advance(cursor);
        keyNode = makeNumberLit(tok.value, tok.text, tok.span);
    } else {
        const here = current(cursor);
        const span = (here === undefined || here === null) ? makeSpan(0, 0, 1, 1) : here.span;
        recordError(ctx, "E-EXPR-OBJECT-KEY", "expected an object-literal property key", span);
        return null;
    }

    const afterKind = currentKind(cursor);

    if (afterKind === TokenKind.Colon) {
        advance(cursor);   // consume :
        const valuePrior = enterMode(ctx, ParseMode.InExpression);
        const valueExpr = parseAssignmentExpr(ctx);
        exitMode(ctx, valuePrior);
        return makeObjectKeyValue(keyNode, valueExpr, false);
    }

    if (afterKind === TokenKind.Comma || afterKind === TokenKind.RBrace) {
        // Shorthand — legal only for an identifier key
        if (keyNode.kind !== "Ident") {
            recordError(ctx, "E-EXPR-OBJECT-SHORTHAND", "shorthand object property requires an identifier key", keyNode.span);
            return null;
        }
        return makeObjectShorthand(keyNode.name);
    }

    if (afterKind === TokenKind.LParen) {
        recordError(ctx, "E-EXPR-OBJECT-METHOD-UNSUPPORTED", "object-literal methods are parsed at M2.3 (function-body parser)", keyNode.span);
        return null;
    }

    recordError(ctx, "E-EXPR-OBJECT-PROP", "malformed object-literal property", keyNode.span);
    return null;
}

// --- parseTemplateLiteral — reassemble M1's template token run ---
// Each interpolation body parses at the FULL expression level (parseExpression
// — `` `${a, b}` `` interpolates a sequence, per ECMA-262).
export function parseTemplateLiteral(ctx) {
    const cursor = ctx.cursor;
    const quasis = [];
    const exprs = [];

    const firstChunk = advance(cursor);   // the leading TemplateChunk
    // M1 (lex-in-template.js) absorbs the OPENING backtick before it emits
    // the first TemplateChunk — so the chunk's span starts one char AFTER
    // the backtick. The TemplateLit node's span should cover the whole
    // `...` including both backticks (source-faithful, Acorn-equivalent),
    // so the start backs up one char to the opener. The final chunk's
    // `raw` already includes the closing backtick, so `endPos` covers it.
    const startSpan = firstChunk.span;
    const templateStart = startSpan.start > 0 ? startSpan.start - 1 : 0;
    // The opening backtick sits on the same line as the first chunk, one
    // column earlier.
    const templateCol = startSpan.col > 1 ? startSpan.col - 1 : startSpan.col;
    quasis.push(makeTemplateQuasi(stripTrailingBacktick(firstChunk.raw), firstChunk.cooked));
    let endPos = firstChunk.span.end;

    while (currentKind(cursor) === TokenKind.TemplateInterpStart) {
        advance(cursor);   // consume ${  (TemplateInterpStart)

        const interpPrior = enterMode(ctx, ParseMode.InExpression);
        const interpExpr = parseExpression(ctx);
        exitMode(ctx, interpPrior);
        exprs.push(interpExpr);

        // Consume the closing } (TemplateInterpEnd)
        if (currentKind(cursor) === TokenKind.TemplateInterpEnd) {
            advance(cursor);
        } else {
            const here = current(cursor);
            const span = (here === undefined || here === null) ? startSpan : here.span;
            recordError(ctx, "E-EXPR-TEMPLATE-INTERP", "unterminated template interpolation", span);
            break;
        }

        // The chunk after the interpolation
        if (currentKind(cursor) === TokenKind.TemplateChunk) {
            const chunk = advance(cursor);
            quasis.push(makeTemplateQuasi(stripTrailingBacktick(chunk.raw), chunk.cooked));
            endPos = chunk.span.end;
        } else {
            const here = current(cursor);
            const span = (here === undefined || here === null) ? startSpan : here.span;
            recordError(ctx, "E-EXPR-TEMPLATE-CHUNK", "expected a template chunk after interpolation", span);
            break;
        }
    }

    const span = makeSpan(templateStart, endPos, startSpan.line, templateCol);
    return makeTemplateLit(quasis, exprs, span);
}

// --- stripTrailingBacktick — quasi raw should not include the closing ` ---
export function stripTrailingBacktick(raw) {
    if (raw === undefined || raw === null) {
        return "";
    }
    if (raw.length > 0 && raw.charAt(raw.length - 1) === "`") {
        return raw.substring(0, raw.length - 1);
    }
    return raw;
}

// --- expect* helpers — consume a required closing token ---
export function expectRParen(ctx, opener) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) === TokenKind.RParen) {
        const tok = advance(cursor);
        return tok.span;
    }
    recordError(ctx, "E-EXPR-UNCLOSED-PAREN", "expected ')' to close a parenthesized expression", opener.span);
    return makeSpan(opener.span.end, opener.span.end, opener.span.line, opener.span.col);
}

export function expectRBracket(ctx, opener) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) === TokenKind.RBracket) {
        const tok = advance(cursor);
        return tok.span;
    }
    const oSpan = (opener === undefined || opener === null) ? makeSpan(0, 0, 1, 1) : opener.span;
    recordError(ctx, "E-EXPR-UNCLOSED-BRACKET", "expected ']' to close an array literal", oSpan);
    return makeSpan(oSpan.end, oSpan.end, oSpan.line, oSpan.col);
}

export function expectRBrace(ctx, opener) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) === TokenKind.RBrace) {
        const tok = advance(cursor);
        return tok.span;
    }
    recordError(ctx, "E-EXPR-UNCLOSED-BRACE", "expected '}' to close an object literal", opener.span);
    return makeSpan(opener.span.end, opener.span.end, opener.span.line, opener.span.col);
}

export function expectColon(ctx) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) === TokenKind.Colon) {
        advance(cursor);
        return true;
    }
    const here = current(cursor);
    const span = (here === undefined || here === null) ? makeSpan(0, 0, 1, 1) : here.span;
    recordError(ctx, "E-EXPR-EXPECTED-COLON", "expected ':' in object-literal property", span);
    return false;
}

// --- parseExpr — the M2.1/M2.2 entry point ---
export function parseExpr(tokens) {
    const ctx = makeParseExprContext(tokens);
    const ast = parseExpression(ctx);
    return { ast, errors: ctx.errors };
}
