// parse-stmt.js — JS-host shadow of parse-stmt.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-stmt.scrml's header — see that file.
//
// SCOPE — M3.1 (the FIRST sub-step of M3, the JS statement parser).
//   M3.1: STATEMENT SUBSTRATE + DECLARATIONS + BLOCK/EXPRESSION STATEMENTS
//   + BlockStub RE-ENTRY. Parses, per S98 DD §D5's MUST-PARSE list:
//     - variable declarations `let` / `const` / `var`, INCLUDING object +
//       array destructuring patterns (real binding patterns — see ast-stmt's
//       binding catalog; §D5: "`collectBindingIdentifiers` walks these");
//     - expression statements `expr ;` (with ASI);
//     - block statements `{ stmt* }`;
//     - the empty statement `;`.
//   M3.1 also builds the BlockStub re-entry mechanism (parseBlockStubBody) —
//   M2.3 left function/arrow block bodies, and M2.4 left match-arm block
//   bodies, as `BlockStub` Expr nodes capturing a token range. M3.1 re-parses
//   any BlockStub's captured tokens into a real Stmt list.
//
//   NOT M3.1 (forward seams — see parse-stmt.scrml's header for the named
//   sub-step that owns each):
//     - control-flow statements (`if`/`while`/`for`/`return`/`break`/
//       `continue`/labels) — M3.2;
//     - function/class declarations + in-line bodies + `import`/`export` +
//       `try`/`throw` — M3.3;
//     - error-recovery engine integration + full conformance — M3.4.
//   A token at statement position that begins a NOT-YET-IMPLEMENTED form is
//   parsed as an expression statement where the grammar allows (e.g. an
//   `async`-lead arrow), and otherwise records a forward-seam diagnostic; a
//   statement form outside the D5 subset (`switch`, `with`, decorators)
//   records E-PARSER-OUT-OF-SUBSET (D5/OQ6 — the subset bound).
//
// The expression sub-grammar is M2's. parse-stmt shares ONE parser context
// object with parse-expr — same `{ cursor, currentParseMode, errors }` shape
// makeParseExprContext produces — so parseExpression(ctx) runs directly on
// the statement parser's ctx with no token-range copy (R1 one-cursor
// discipline, applied within the JS layer).

import {
    makeTokenCursor, current, currentKind, advance, atEnd,
} from "./token-cursor.js";
import { TokenKind, makeEof } from "./token.js";
import { makeSpan } from "./span.js";
import {
    ParseMode, initialParseMode, setParseMode, enterMode, exitMode,
} from "./parse-mode.js";
import { parseExpression, parseAssignmentExpr } from "./parse-expr.js";
import {
    VarDeclKind,
    makeBlock, makeExprStmt, makeEmpty, makeVarDecl, makeVarDeclarator,
    makeBindingIdent, makeObjectPattern, makeArrayPattern,
    makeAssignmentPattern,
    makeBindingPropertyKeyValue, makeBindingPropertyShorthand,
    makeBindingPropertyRest,
    makeBindingElementItem, makeBindingElementHole, makeBindingElementRest,
} from "./ast-stmt.js";

// --- makeParseStmtContext — statement-parser context constructor ---
// Identical SHAPE to makeParseExprContext (parse-expr.js) — `cursor` +
// `currentParseMode` + `errors`. The shared shape lets parseExpression(ctx)
// run directly on this ctx; the cursor is the one cursor both layers walk.
export function makeParseStmtContext(tokens) {
    return {
        cursor:           makeTokenCursor(tokens),
        currentParseMode: initialParseMode(),
        errors:           [],
    };
}

// recordError — push a structured diagnostic. Mirrors parse-expr.js's
// recordError exactly (the diagnostic stream is { code, message, span }).
export function recordError(ctx, code, message, span) {
    ctx.errors.push({ code, message, span });
}

// spanHere — the span of the token at the cursor, or a safe zero span past
// EOF. Used for diagnostics where no node span is available.
function spanHere(ctx) {
    const here = current(ctx.cursor);
    if (here === undefined || here === null) {
        return makeSpan(0, 0, 1, 1);
    }
    return here.span;
}

// nodeStart / nodeEnd / nodeLine / nodeCol — defensive node-span reads (a
// malformed parse can yield a null child). Mirror parse-expr.js's
// startOf / endOf / lineOf / colOf.
function nodeStart(node) {
    if (node === undefined || node === null || node.span === undefined || node.span === null) {
        return 0;
    }
    return node.span.start;
}
function nodeEnd(node) {
    if (node === undefined || node === null || node.span === undefined || node.span === null) {
        return 0;
    }
    return node.span.end;
}
function nodeLine(node) {
    if (node === undefined || node === null || node.span === undefined || node.span === null) {
        return 1;
    }
    return node.span.line;
}
function nodeCol(node) {
    if (node === undefined || node === null || node.span === undefined || node.span === null) {
        return 1;
    }
    return node.span.col;
}

// =============================================================================
// ASI — automatic semicolon insertion.
//
// The M1 lexer does NOT emit Newline / Whitespace tokens (it filters them) —
// so a parser cannot see a newline as a token. ECMAScript ASI inserts a `;`
// at the end of a statement when the next token (a) is on a LATER source line
// than the just-consumed token, (b) is `}`, or (c) is EOF. The lexer keeps a
// `.span.line` on every token, which is the line signal ASI needs.
//
// consumeSemicolon consumes an explicit `;` if present; otherwise it accepts
// the statement boundary when an ASI condition holds, and records a
// diagnostic only when neither an explicit `;` nor an ASI condition is met.
// =============================================================================

// lineOfToken — the 1-based source line of a token (1 if absent).
function lineOfToken(tok) {
    if (tok === undefined || tok === null || tok.span === undefined || tok.span === null) {
        return 1;
    }
    return tok.span.line;
}

// canInsertSemicolon — is an ASI condition satisfied at the cursor, given the
// last token of the statement just parsed (`prevTok`)? True when the next
// token is `}`, is EOF, or sits on a later line than `prevTok`.
export function canInsertSemicolon(ctx, prevTok) {
    const cursor = ctx.cursor;
    if (atEnd(cursor)) {
        return true;
    }
    const kind = currentKind(cursor);
    if (kind === TokenKind.RBrace) {
        return true;
    }
    const here = current(cursor);
    if (here === undefined || here === null) {
        return true;
    }
    return lineOfToken(here) > lineOfToken(prevTok);
}

// consumeSemicolon — consume the statement terminator. An explicit `;` is
// consumed. Otherwise, if an ASI condition holds the boundary is accepted
// silently. If neither, a missing-terminator diagnostic is recorded (the
// parser does NOT throw — diagnostics are structured, per the stage contract)
// and the parser continues. `prevTok` is the last token of the statement.
export function consumeSemicolon(ctx, prevTok) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) === TokenKind.Semicolon) {
        advance(cursor);   // consume the explicit ;
        return;
    }
    if (canInsertSemicolon(ctx, prevTok)) {
        return;            // ASI — boundary accepted
    }
    recordError(ctx, "E-STMT-MISSING-SEMICOLON",
        "expected ';' or a newline to end the statement", spanHere(ctx));
}

// lastTokenBefore — the token immediately before the cursor (the last token
// the parse consumed). Used as the `prevTok` argument to consumeSemicolon.
function lastTokenBefore(ctx) {
    const cursor = ctx.cursor;
    if (cursor.idx <= 0) {
        return current(cursor);
    }
    return cursor.tokens[cursor.idx - 1];
}

// =============================================================================
// Statement-list parsing — the trampoline.
// =============================================================================

// parseStatementList — parse a run of statements until the cursor reaches a
// terminator token kind (RBrace for a block body) or EOF. Returns a Stmt
// array. A statement that parses to `not` (null) is skipped after one forced
// advance so a malformed token cannot spin the loop (M3.4 replaces this with
// the ErrorRecovery engine's panic-mode re-synchronization).
export function parseStatementList(ctx, terminatorKind) {
    const cursor = ctx.cursor;
    const body = [];

    while (atEnd(cursor) === false) {
        if (terminatorKind !== undefined && terminatorKind !== null
            && currentKind(cursor) === terminatorKind) {
            break;
        }
        const before = cursor.idx;
        const stmt = parseStatement(ctx);
        if (stmt !== undefined && stmt !== null) {
            body.push(stmt);
        }
        // Forward-progress guard — if parseStatement consumed nothing, force
        // one advance so a stuck token cannot loop forever. (M3.4: the
        // ErrorRecovery engine owns proper re-synchronization.)
        if (cursor.idx === before) {
            advance(cursor);
        }
    }
    return body;
}

// parseStatement — parse ONE statement; dispatch on the token kind at the
// cursor. M3.1 dispatches the substrate forms (declarations, block, empty,
// expression statement). Control-flow keyword leads (`if`/`for`/`while`/...)
// are FORWARD SEAMS — M3.2 wires them; M3.1 records E-STMT-FORWARD-M3-2 so a
// corpus file exercising one surfaces the seam rather than mis-parsing it.
export function parseStatement(ctx) {
    const cursor = ctx.cursor;
    const kind = currentKind(ctx.cursor);

    // The empty statement — a lone `;`.
    if (kind === TokenKind.Semicolon) {
        return parseEmptyStatement(ctx);
    }

    // A block statement — `{`. At STATEMENT position a `{` always opens a
    // block (an object literal is an expression-position `{` — the ParseMode
    // engine carries this distinction). No expression statement may begin
    // with `{` (ECMAScript's lookahead restriction); so a `{` here is
    // unambiguously a block.
    if (kind === TokenKind.LBrace) {
        return parseBlock(ctx);
    }

    // A variable declaration — `let` / `const` / `var`.
    if (kind === TokenKind.KwLet || kind === TokenKind.KwConst || kind === TokenKind.KwVar) {
        return parseVarDecl(ctx);
    }

    // --- M3.2 forward seam — control-flow keyword leads ---
    if (kind === TokenKind.KwIf || kind === TokenKind.KwElse
        || kind === TokenKind.KwFor || kind === TokenKind.KwWhile
        || kind === TokenKind.KwDoWhile || kind === TokenKind.KwReturn
        || kind === TokenKind.KwBreak || kind === TokenKind.KwContinue) {
        recordError(ctx, "E-STMT-FORWARD-M3-2",
            "control-flow statements are parsed by M3.2 (not yet implemented)",
            spanHere(ctx));
        return null;
    }

    // --- M3.3 forward seam — declaration / module / legacy-error leads ---
    if (kind === TokenKind.KwFunction || kind === TokenKind.KwClass
        || kind === TokenKind.KwImport || kind === TokenKind.KwExport
        || kind === TokenKind.KwTry || kind === TokenKind.KwThrow) {
        recordError(ctx, "E-STMT-FORWARD-M3-3",
            "function/class declarations, import/export and try/throw are parsed by M3.3 (not yet implemented)",
            spanHere(ctx));
        return null;
    }

    // Everything else is an expression statement.
    return parseExprStatement(ctx);
}

// --- parseEmptyStatement — a lone `;` ---
export function parseEmptyStatement(ctx) {
    const semi = advance(ctx.cursor);   // consume ;
    return makeEmpty(semi.span);
}

// --- parseBlock — a block statement `{ stmt* }` ---
// Enters .InBlock for the body, parses the statement list to the matching
// `}`, restores the prior ParseMode. The `}` is consumed; a missing `}`
// records a diagnostic (the parser does not throw).
export function parseBlock(ctx) {
    const cursor = ctx.cursor;
    const open = advance(cursor);   // consume {

    const prior = enterMode(ctx, ParseMode.InBlock);
    const body = parseStatementList(ctx, TokenKind.RBrace);
    exitMode(ctx, prior);

    let endSpan = open.span;
    if (currentKind(cursor) === TokenKind.RBrace) {
        const close = advance(cursor);   // consume }
        endSpan = close.span;
    } else {
        recordError(ctx, "E-STMT-UNCLOSED-BLOCK",
            "expected '}' to close a block statement", open.span);
    }

    const span = makeSpan(open.span.start, endSpan.end, open.span.line, open.span.col);
    return makeBlock(body, span);
}

// --- parseExprStatement — an expression statement `expr ;` ---
// Parses a full (sequence-level) expression in expression context, then the
// statement terminator (explicit `;` or ASI).
export function parseExprStatement(ctx) {
    const prior = enterMode(ctx, ParseMode.InExpression);
    const expr = parseExpression(ctx);
    exitMode(ctx, prior);

    const prevTok = lastTokenBefore(ctx);
    consumeSemicolon(ctx, prevTok);

    const startS = nodeStart(expr);
    const endTok = prevTok;
    const endE = (endTok === undefined || endTok === null) ? nodeEnd(expr) : endTok.span.end;
    const span = makeSpan(startS, Math.max(endE, nodeEnd(expr)), nodeLine(expr), nodeCol(expr));
    return makeExprStmt(expr, span);
}

// =============================================================================
// Variable declarations — `let` / `const` / `var`.
// =============================================================================

// --- parseVarDecl — a variable declaration ---
//   var-decl ::= ('let' | 'const' | 'var') declarator (',' declarator)* ';'
// Parses the declaration keyword, a comma-separated declarator list, and the
// statement terminator (explicit `;` or ASI).
export function parseVarDecl(ctx) {
    const cursor = ctx.cursor;
    const kwTok = advance(cursor);   // consume let / const / var
    const declKind = varDeclKindOf(kwTok.kind);

    const declarations = [];
    while (atEnd(cursor) === false) {
        const declarator = parseVarDeclarator(ctx);
        if (declarator === undefined || declarator === null) {
            break;
        }
        declarations.push(declarator);

        if (currentKind(cursor) === TokenKind.Comma) {
            advance(cursor);   // consume the separator ,
            continue;
        }
        break;
    }

    const prevTok = lastTokenBefore(ctx);
    consumeSemicolon(ctx, prevTok);

    let endE = kwTok.span.end;
    if (declarations.length > 0) {
        endE = nodeEnd(declarations[declarations.length - 1]);
    }
    const span = makeSpan(kwTok.span.start, endE, kwTok.span.line, kwTok.span.col);
    return makeVarDecl(declKind, declarations, span);
}

// varDeclKindOf — the VarDeclKind for a declaration-keyword TokenKind.
function varDeclKindOf(tokenKind) {
    if (tokenKind === TokenKind.KwConst) {
        return VarDeclKind.Const;
    }
    if (tokenKind === TokenKind.KwVar) {
        return VarDeclKind.Var;
    }
    return VarDeclKind.Let;
}

// --- parseVarDeclarator — one declarator: a binding target + optional init ---
//   declarator ::= binding ('=' assignment-expr)?
// A `const` declarator without an initializer is a use-site error (a later
// stage owns E-CONST-NO-INIT); M3.1 parses the shape and records a parse-level
// note for the obviously-missing initializer only.
export function parseVarDeclarator(ctx) {
    const cursor = ctx.cursor;
    const target = parseBinding(ctx);

    let init = null;
    if (currentKind(cursor) === TokenKind.Assign) {
        advance(cursor);   // consume =
        const prior = enterMode(ctx, ParseMode.InExpression);
        init = parseAssignmentLevelExpr(ctx);
        exitMode(ctx, prior);
    }

    const endE = (init === undefined || init === null) ? nodeEnd(target) : nodeEnd(init);
    const span = makeSpan(nodeStart(target), endE, nodeLine(target), nodeCol(target));
    return makeVarDeclarator(target, init, span);
}

// parseAssignmentLevelExpr — parse a NON-comma expression (a declarator
// initializer stops at a `,` because the comma is the declarator separator).
// parse-expr exports parseExpression (sequence-level, includes commas); a
// declarator initializer needs assignment-level. parse-expr's
// parseAssignmentExpr is the element-position entry (it stops at a `,`) —
// imported at the file head and reused here.
function parseAssignmentLevelExpr(ctx) {
    return parseAssignmentExpr(ctx);
}

// =============================================================================
// Binding patterns — declaration-target destructuring (S98 DD §D5).
//
// A declaration TARGET is an identifier or a destructuring pattern; patterns
// nest. These produce ast-stmt's binding nodes (BindingIdent / ObjectPattern
// / ArrayPattern / AssignmentPattern / RestElement) — NOT ast-expr's
// Object/Array literal nodes (a binding pattern is the left-of-`=` shape).
// =============================================================================

// --- parseBinding — a binding TARGET (identifier or destructuring pattern) ---
export function parseBinding(ctx) {
    const cursor = ctx.cursor;
    const kind = currentKind(cursor);

    if (kind === TokenKind.LBrace) {
        return parseObjectPattern(ctx);
    }
    if (kind === TokenKind.LBracket) {
        return parseArrayPattern(ctx);
    }
    return parseBindingIdent(ctx);
}

// --- parseBindingIdent — a plain identifier binding ---
// The leaf of every binding pattern. A non-identifier here is a malformed
// target; a diagnostic is recorded and an empty-name BindingIdent returned so
// the caller still gets a node.
export function parseBindingIdent(ctx) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) !== TokenKind.Ident) {
        recordError(ctx, "E-STMT-BINDING-NAME",
            "expected an identifier in a binding position", spanHere(ctx));
        return makeBindingIdent("", spanHere(ctx));
    }
    const tok = advance(cursor);
    return makeBindingIdent(tok.name, tok.span);
}

// --- parseBindingTargetWithDefault — a binding target, optionally defaulted ---
// `target = default` -> an AssignmentPattern; a bare target -> the target.
// Used inside object/array patterns where each element may carry a default.
function parseBindingTargetWithDefault(ctx) {
    const cursor = ctx.cursor;
    const target = parseBinding(ctx);

    if (currentKind(cursor) === TokenKind.Assign) {
        advance(cursor);   // consume =
        const prior = enterMode(ctx, ParseMode.InExpression);
        const dflt = parseAssignmentLevelExpr(ctx);
        exitMode(ctx, prior);
        const span = makeSpan(nodeStart(target), nodeEnd(dflt), nodeLine(target), nodeCol(target));
        return makeAssignmentPattern(target, dflt, span);
    }
    return target;
}

// --- parseObjectPattern — `{ a, b: c, d = 1, ...rest }` ---
export function parseObjectPattern(ctx) {
    const cursor = ctx.cursor;
    const open = advance(cursor);   // consume {
    const properties = [];

    while (atEnd(cursor) === false && currentKind(cursor) !== TokenKind.RBrace) {
        // `...rest` — an object-pattern rest property (must be last; M3.1
        // parses it wherever it appears and lets a later stage flag a
        // non-final rest).
        if (currentKind(cursor) === TokenKind.Ellipsis) {
            advance(cursor);   // consume ...
            const restTarget = parseBinding(ctx);
            properties.push(makeBindingPropertyRest(restTarget));
        } else {
            properties.push(parseObjectPatternProperty(ctx));
        }

        if (currentKind(cursor) === TokenKind.Comma) {
            advance(cursor);   // consume the separator ,
            continue;
        }
        break;
    }

    let endSpan = open.span;
    if (currentKind(cursor) === TokenKind.RBrace) {
        endSpan = advance(cursor).span;   // consume }
    } else {
        recordError(ctx, "E-STMT-UNCLOSED-PATTERN",
            "expected '}' to close an object-destructuring pattern", open.span);
    }

    const span = makeSpan(open.span.start, endSpan.end, open.span.line, open.span.col);
    return makeObjectPattern(properties, span);
}

// --- parseObjectPatternProperty — one `{ ... }` pattern property ---
// Forms: `{ name }` / `{ name = default }` shorthand;
//        `{ key: target }` / `{ "k": target }` / `{ [expr]: target }` keyed.
export function parseObjectPatternProperty(ctx) {
    const cursor = ctx.cursor;
    const kind = currentKind(cursor);

    // Computed key — `[ expr ]: target`. A computed key is always keyed
    // (never shorthand).
    if (kind === TokenKind.LBracket) {
        advance(cursor);   // consume [
        const prior = enterMode(ctx, ParseMode.InExpression);
        const keyExpr = parseAssignmentLevelExpr(ctx);
        exitMode(ctx, prior);
        if (currentKind(cursor) === TokenKind.RBracket) {
            advance(cursor);   // consume ]
        } else {
            recordError(ctx, "E-STMT-UNCLOSED-COMPUTED-KEY",
                "expected ']' to close a computed pattern key", spanHere(ctx));
        }
        expectColon(ctx);
        const valueTarget = parseBindingTargetWithDefault(ctx);
        return makeBindingPropertyKeyValue(keyExpr, valueTarget, true);
    }

    // String / number literal key — always keyed.
    if (kind === TokenKind.StringLit || kind === TokenKind.NumberLit) {
        const keyTok = advance(cursor);
        const keyExpr = literalKeyExpr(keyTok);
        expectColon(ctx);
        const valueTarget = parseBindingTargetWithDefault(ctx);
        return makeBindingPropertyKeyValue(keyExpr, valueTarget, false);
    }

    // Identifier key. `name :` -> keyed; otherwise shorthand (`name` /
    // `name = default`).
    if (kind === TokenKind.Ident) {
        const nameTok = advance(cursor);
        if (currentKind(cursor) === TokenKind.Colon) {
            advance(cursor);   // consume :
            const valueTarget = parseBindingTargetWithDefault(ctx);
            const keyExpr = identKeyExpr(nameTok);
            return makeBindingPropertyKeyValue(keyExpr, valueTarget, false);
        }
        // Shorthand — `{ name }` or `{ name = default }`.
        let valueTarget = makeBindingIdent(nameTok.name, nameTok.span);
        if (currentKind(cursor) === TokenKind.Assign) {
            advance(cursor);   // consume =
            const prior = enterMode(ctx, ParseMode.InExpression);
            const dflt = parseAssignmentLevelExpr(ctx);
            exitMode(ctx, prior);
            const apSpan = makeSpan(nameTok.span.start, nodeEnd(dflt), nameTok.span.line, nameTok.span.col);
            valueTarget = makeAssignmentPattern(valueTarget, dflt, apSpan);
        }
        return makeBindingPropertyShorthand(nameTok.name, valueTarget);
    }

    // Malformed — record a diagnostic and emit a placeholder shorthand so the
    // caller's property list still gets an entry.
    recordError(ctx, "E-STMT-PATTERN-PROPERTY",
        "expected a property name in an object-destructuring pattern", spanHere(ctx));
    const placeholder = makeBindingIdent("", spanHere(ctx));
    return makeBindingPropertyShorthand("", placeholder);
}

// expectColon — consume a `:` separator; record a diagnostic if absent.
function expectColon(ctx) {
    if (currentKind(ctx.cursor) === TokenKind.Colon) {
        advance(ctx.cursor);
        return;
    }
    recordError(ctx, "E-STMT-PATTERN-COLON",
        "expected ':' after a pattern property key", spanHere(ctx));
}

// identKeyExpr — a property-key node for an identifier-key token. A pattern
// key is modelled as a minimal ast-expr-shaped Ident node (the binding
// catalog reuses the key Expr surface).
function identKeyExpr(tok) {
    return { kind: "Ident", name: tok.name, span: tok.span };
}

// literalKeyExpr — a property-key node for a string / number literal key.
function literalKeyExpr(tok) {
    if (tok.kind === TokenKind.StringLit) {
        return { kind: "StringLit", value: tok.cooked, raw: tok.text, span: tok.span };
    }
    return { kind: "NumberLit", value: tok.value, raw: tok.text, span: tok.span };
}

// --- parseArrayPattern — `[ a, , b, c = 1, ...rest ]` ---
export function parseArrayPattern(ctx) {
    const cursor = ctx.cursor;
    const open = advance(cursor);   // consume [
    const elements = [];

    while (atEnd(cursor) === false && currentKind(cursor) !== TokenKind.RBracket) {
        // Elision — a `,` with no element before it is a hole.
        if (currentKind(cursor) === TokenKind.Comma) {
            elements.push(makeBindingElementHole());
            advance(cursor);   // consume the separator ,
            continue;
        }

        // `...rest` — an array-pattern rest element (must be last; M3.1
        // parses it wherever it appears).
        if (currentKind(cursor) === TokenKind.Ellipsis) {
            advance(cursor);   // consume ...
            const restTarget = parseBinding(ctx);
            elements.push(makeBindingElementRest(restTarget));
            // A rest element is the last element; a trailing `,` after a
            // rest is a syntax error in JS — stop here regardless.
            break;
        }

        // A positional binding element (identifier / nested pattern /
        // defaulted).
        elements.push(makeBindingElementItem(parseBindingTargetWithDefault(ctx)));

        if (currentKind(cursor) === TokenKind.Comma) {
            advance(cursor);   // consume the separator ,
            continue;
        }
        break;
    }

    let endSpan = open.span;
    if (currentKind(cursor) === TokenKind.RBracket) {
        endSpan = advance(cursor).span;   // consume ]
    } else {
        recordError(ctx, "E-STMT-UNCLOSED-PATTERN",
            "expected ']' to close an array-destructuring pattern", open.span);
    }

    const span = makeSpan(open.span.start, endSpan.end, open.span.line, open.span.col);
    return makeArrayPattern(elements, span);
}

// =============================================================================
// BlockStub re-entry — THE load-bearing M3.1 mechanism.
//
// M2.3 left function/arrow block bodies, and M2.4 left match-arm block
// bodies, as `BlockStub` Expr nodes. A BlockStub carries:
//   { kind:"BlockStub", tokens, tokenStart, tokenEnd, span }
// where `tokens` is the body token slice (cursor.tokens.slice(tokenStart,
// tokenEnd)) — half-open, NOT including the closing `}` and NOT including a
// trailing EOF token. parseBlockStubBody re-parses that slice into a real
// Stmt list.
//
// The token-cursor's `advance` clamps at tokens.length-1 and `atEnd` fires
// only on an EOF-kinded token — so the slice MUST get a synthetic EOF
// appended before cursoring, the same shape parseExpr relies on for a full
// lex stream. parseBlockStubBody appends one (the EOF span is pinned to the
// slice's last real token's end, or the stub span when the slice is empty).
// =============================================================================

// parseBlockStubBody — re-parse a BlockStub's captured token range into a
// Stmt array. The single, uniform re-entry point: arrow bodies, function-expr
// bodies, and match-arm block bodies (M2.4) all produce BlockStubs via the
// same parse-expr `parseBlockStub` capture, so one re-entry function serves
// all three. Returns { body, errors } — `body` is the Stmt array, `errors`
// the diagnostics raised while re-parsing the body.
export function parseBlockStubBody(stub) {
    const stubTokens = (stub === undefined || stub === null || stub.tokens === undefined
        || stub.tokens === null) ? [] : stub.tokens;

    // Append a synthetic EOF so the token-cursor terminates cleanly. The EOF
    // span is pinned past the last real token (or to the stub span for an
    // empty body) so node spans stay sane.
    let eofPos = 0;
    let eofLine = 1;
    let eofCol = 1;
    if (stubTokens.length > 0) {
        const last = stubTokens[stubTokens.length - 1];
        if (last !== undefined && last !== null && last.span !== undefined && last.span !== null) {
            eofPos = last.span.end;
            eofLine = last.span.line;
            eofCol = last.span.col;
        }
    } else if (stub !== undefined && stub !== null && stub.span !== undefined && stub.span !== null) {
        eofPos = stub.span.end;
        eofLine = stub.span.line;
        eofCol = stub.span.col;
    }

    const tokensForCursor = stubTokens.concat([makeEof(eofPos, eofLine, eofCol)]);
    const ctx = makeParseStmtContext(tokensForCursor);
    // A function/arrow/match-arm body is a statement list in function-body
    // context — the ParseMode the body re-enters.
    setParseMode(ctx, ParseMode.InFunctionBody);
    const body = parseStatementList(ctx, undefined);
    return { body, errors: ctx.errors };
}

// reenterBlockStubs — walk an Expr tree, re-parse every BlockStub in place,
// and attach the parsed statement list as `.parsedBody` on the BlockStub
// node. This is the deep variant — a parse-expr AST whose arrow / function /
// match bodies are all BlockStubs becomes a fully-parsed tree. The original
// BlockStub fields (tokens / tokenStart / tokenEnd / span) are preserved;
// `.parsedBody` + `.bodyErrors` are added. Returns the count of stubs
// re-entered. Idempotent — a BlockStub already carrying `.parsedBody` is
// skipped.
export function reenterBlockStubs(node) {
    let count = 0;
    if (node === undefined || node === null || typeof node !== "object") {
        return count;
    }

    if (node.kind === "BlockStub") {
        if (node.parsedBody === undefined) {
            const result = parseBlockStubBody(node);
            node.parsedBody = result.body;
            node.bodyErrors = result.errors;
            count = count + 1;
            // A BlockStub body can itself contain nested BlockStubs (an
            // inner arrow inside a function body); re-enter those too.
            for (const stmt of node.parsedBody) {
                count = count + reenterBlockStubs(stmt);
            }
        }
        return count;
    }

    // Generic structural walk — descend into every array / object child.
    for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) {
            for (const el of child) {
                count = count + reenterBlockStubs(el);
            }
        } else if (child !== null && typeof child === "object") {
            count = count + reenterBlockStubs(child);
        }
    }
    return count;
}

// =============================================================================
// Entry points.
// =============================================================================

// parseStmt — parse ONE statement at the head of a token stream. Mirrors
// parse-expr's parseExpr entry shape — returns { ast, errors }.
export function parseStmt(tokens) {
    const ctx = makeParseStmtContext(tokens);
    const ast = parseStatement(ctx);
    return { ast, errors: ctx.errors };
}

// parseProgram — parse a whole token stream as a statement list (a program
// body / a module body). Returns { body, errors } — `body` is the Stmt
// array. This is the M3.1 top-level entry the conformance harness drives.
export function parseProgram(tokens) {
    const ctx = makeParseStmtContext(tokens);
    const body = parseStatementList(ctx, undefined);
    return { body, errors: ctx.errors };
}
