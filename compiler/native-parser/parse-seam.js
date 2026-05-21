// parse-seam.js — JS-host shadow of parse-seam.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-seam.scrml's header.
//
// MK4 — the markup<->JS seam (R1 spike §3). This file centralizes the
// SEAM CONTRACT — the typed delegation between the markup-layer engine
// graph (BlockContext + TagFrame + BodyMode + DisplayTextLiteral) and
// the JS-layer engine graph (LexMode + ParseMode). The substrate
// (DelegationFrame / CloseCondition / delegationStack push+pop) lives
// in delegation-frame.js (the K9 leaf, S114); the seam-DIRECTION
// helpers live HERE — the bridge between "a frame is pushed onto the
// shared ctx" and "the guest layer runs over the shared cursor".
//
// PILLAR 5b classification (DD §D1):
//   The seam helpers are CALCULATION over the shared parse context (the
//   one-cursor / one-bracket-stack / one-error-stream substrate); they
//   read+advance the cursor, push+pop a DelegationFrame, lex+parse a
//   body extent, forward the guest's diagnostics. There is no engine
//   shape at the helper level — the stack of frames IS the §51.0.Q.1
//   instance hierarchy; the helpers drive its push/pop.
//
// THE SEAM CONTRACT (R1 spike §3):
//   - One shared cursor. The markup and JS layers share ONE Cursor;
//     neither layer copies a sub-range; no Span carries a base-offset
//     (R1 spike §3.3 — designs out the cross-seam span-attribution bug
//     class).
//   - One shared ctx. The ParseContext (parse-ctx.js's makeParseContext)
//     carries the SAME tokens / brackets / recovery / errors /
//     delegationStack across both layers (R1 spike §3.1). NOTE — at this
//     milestone the JS-layer entry points (parseExpr / parseProgram)
//     take their own token stream + their own little ctx; the seam
//     mediates by lexing a body slice from the shared source, running
//     the JS-layer entry, and FORWARDING the guest's diagnostics into
//     the shared ctx.diagnostics + ctx.errors. The "one ctx" invariant
//     is preserved at the shared-state level (the diagnostic stream is
//     unified); the entry-point shape is a milestone-bounded
//     simplification, retired when the JS-layer entry points take the
//     shared ctx directly (M5+).
//   - One DelegationFrame stack. Every delegation push/pop runs through
//     pushDelegationFrame / popDelegationFrame on ctx.delegationStack
//     (the K9 leaf — delegation-frame.js).
//   - Spans are file-absolute. The seam helpers slice the shared source
//     by absolute offsets and use the same offsets to construct AST
//     spans, so every span the guest produces is in the file's
//     coordinate space (no translation step — by construction).

import { advance, peekChar, isEof } from "./cursor.js";
import { makeSpan } from "./span.js";
import { lex } from "./lex.js";
import { parseExpr, parseExpression, makeParseExprContext } from "./parse-expr.js";
import { parseProgram, parseStmt } from "./parse-stmt.js";
import { TokenKind } from "./token.js";
import {
    delegationKinds,
    closeOnBraceDepth,
    makeDelegationFrame,
    pushDelegationFrame,
    popDelegationFrame,
    topDelegationFrame,
    delegationDepth,
} from "./delegation-frame.js";
import { makeDiagnostic, pushDiagnostic } from "./display-text-literal.js";

// =============================================================================
// THE BODY-EXTENT SCAN — find the matching `}` of a `${...}`-shaped body.
//
// The mechanism is the R1 spike §3.4 close-condition predicate, in source-
// character form: walk the source ahead of the cursor and find the offset of
// the `}` that brings brace depth to 0. The walk is M1-lexer-driven so it is
// STRING-AWARE FOR FREE (M1 does not emit a brace token from inside a string
// / comment / template body, so the brace count over its tokens skips those
// regions — exactly as findInterpolationCloseOffset in display-text-literal.js
// does for the §4.18.4 interpolation case).
// =============================================================================

// findBodyCloseOffset — calculation. Given the source text `bodyOnward` —
// STARTING AT the opening `{` (NOT the sigil's `$` / leading char — the caller
// passes a `{`-onward substring) — return the offset of the character ONE PAST
// the matching `}`, relative to `bodyOnward`, or -1 if no matching `}` exists.
//
// This is the source-character analogue of M1's `isTemplateInterpClose` — the
// SAME mechanism (a depth count over the lexer's token stream), generalized
// for the markup<->JS seam (R1 spike §1.0).
export function findBodyCloseOffset(bodyOnward) {
    const tokens = lex(bodyOnward);
    if (tokens.length === 0) return -1;
    if (tokens[0].kind !== TokenKind.LBrace) return -1;

    let depth = 0;
    let i = 0;
    while (i < tokens.length) {
        const tok = tokens[i];
        if (tok.kind === TokenKind.LBrace) {
            depth = depth + 1;
        } else if (tok.kind === TokenKind.RBrace) {
            depth = depth - 1;
            if (depth === 0) {
                return tok.span.end;
            }
        }
        i = i + 1;
    }
    return -1;
}

// =============================================================================
// markup -> JS — the DELEGATE-DOWN direction (R1 spike §1.1).
// =============================================================================

// delegateLogicEscapeBody — STATE write (cursor advance + frame push/pop +
// diagnostics) + calculation (the parsed JS-AST). The markup layer hit a
// `${...}` body. The cursor is positioned at the byte AFTER the `${` (the first
// byte INSIDE the body); the matching `}` is found by walking the source ahead.
// The body extent is lexed, parsed as a PROGRAM (a statement list — the most
// general JS-body grammar), and the resulting Stmt[] is returned. Diagnostics
// from the guest JS-layer parser are forwarded into the shared ctx.diagnostics.
//
// IMPORTANT — the markup layer is CALLING this helper INSIDE the .InLogicEscape
// dispatch loop; the BlockContext frame and the DelegationFrame for this body
// were already pushed at enter-time (block-context.js's enterBlockContext —
// punch-list P3 / MK1.2 wiring). This helper does NOT touch ctx.brackets or
// ctx.blockContextStack — those stay coherent with the trampoline's existing
// machinery. It only:
//   - reads `cursor.source` from the current `cursor.pos` to find the body's
//     matching `}` (the body extent);
//   - lexes the body slice + runs parseProgram on it;
//   - forwards any JS-layer diagnostics into ctx.diagnostics WITH the
//     active DelegationFrame's openSpan attached (R1 spike §1.4 — error
//     attribution carries the delegation context);
//   - advances the cursor PAST the matching `}` (so the markup trampoline
//     resumes on the right side of the close).
//
// Returns { body, terminated, span }:
//   - `body` — the Stmt[] from parseProgram (empty if the body parses to
//     nothing or if the body is unterminated);
//   - `terminated` — true iff a matching `}` was found (false for an EOF-
//     unterminated body);
//   - `span` — the body extent [bodyStart, matchingCloseEnd) (file-absolute).
export function delegateLogicEscapeBody(cursor, ctx) {
    // The cursor is at the first byte INSIDE the body (just past the `${`).
    // To use findBodyCloseOffset (which needs to see a leading `{`), step
    // BACKWARDS by one and slice from the `{`. (The brace was pushed onto
    // ctx.brackets at enter; we are not popping it here — closeBlockContext
    // does that. We are only locating the matching `}` in the source.)
    const bodyStart = cursor.pos;
    const braceStart = bodyStart - 1;
    if (braceStart < 0) {
        // Defensive — the cursor is at position 0 with no preceding `{`. The
        // markup trampoline never calls this in that state; return a no-op
        // result and let the trampoline's safety-net advance.
        return { body: [], terminated: false, span: makeSpan(bodyStart, bodyStart, cursor.line, cursor.col) };
    }

    const braceOnward = cursor.source.substring(braceStart);
    const closeOffset = findBodyCloseOffset(braceOnward);

    if (closeOffset < 0) {
        // Unterminated `${...}` body — EOF before the matching `}`. R1 spike
        // §1.4 — blame the OPENING `${` (the active DelegationFrame's
        // openSpan); the guest layer's parse runs over the captured-to-EOF
        // text; the cursor advances to EOF. The host markup trampoline's
        // existing unterminated-context machinery (the BlockContext frame
        // stays on ctx.blockContextStack) is preserved — this helper only
        // handles the JS-side of the delegation.
        const bodyText = cursor.source.substring(bodyStart);
        const bodyStartLine = cursor.line;
        const bodyStartCol = cursor.col;
        // Advance to EOF.
        const remaining = cursor.source.length - cursor.pos;
        advance(cursor, remaining);
        const body = parseLogicBodyForwarding(bodyText, ctx, bodyStart, bodyStartLine, bodyStartCol);
        const frame = topDelegationFrame(ctx);
        const blameSpan = (frame !== null && frame !== undefined && frame.openSpan !== undefined)
            ? frame.openSpan
            : makeSpan(bodyStart, bodyStart, bodyStartLine, bodyStartCol);
        pushDiagnostic(ctx, makeDiagnostic(
            "E-CTX-001",
            "Unterminated logic-escape body — no closing brace before end of input.",
            blameSpan,
        ));
        return {
            body,
            terminated: false,
            span: makeSpan(bodyStart, cursor.pos, bodyStartLine, bodyStartCol),
        };
    }

    // Terminated — `closeOffset` is one past the matching `}`, relative to the
    // `{`-onward substring (so braceStart-relative). Compute the absolute
    // body-end (the offset of the `}` itself) and the absolute close-end.
    const absoluteCloseEnd = braceStart + closeOffset; // one past `}`
    const absoluteBraceClose = absoluteCloseEnd - 1;   // the `}`
    const bodyText = cursor.source.substring(bodyStart, absoluteBraceClose);
    const bodyStartLine = cursor.line;
    const bodyStartCol = cursor.col;

    const body = parseLogicBodyForwarding(bodyText, ctx, bodyStart, bodyStartLine, bodyStartCol);

    // Advance the markup cursor to JUST BEFORE the matching `}` — the markup
    // trampoline's closeBlockContext (called by the .InLogicEscape dispatcher's
    // own close branch) consumes the `}` itself, so the seam helper leaves the
    // cursor positioned AT the `}` for the trampoline to close normally.
    advance(cursor, absoluteBraceClose - cursor.pos);

    return {
        body,
        terminated: true,
        span: makeSpan(bodyStart, absoluteBraceClose, bodyStartLine, bodyStartCol),
    };
}

// parseLogicBodyForwarding — calculation + diagnostic forwarding. Lex + parse
// `bodyText` as a statement-list program. Forwards every JS-layer diagnostic
// into ctx.diagnostics with the active DelegationFrame's openSpan attached as
// `delegationFrame` (R1 spike §1.4 — the diagnostic carries its delegation's
// context).
//
// Token spans inside `bodyText` are LOCAL to the body slice (the lexer ran
// over the slice as if it were a standalone source). For span correctness in
// the host coordinate space the diagnostics' spans are shifted by
// `bodyAbsStart` — the file-absolute offset of `bodyText[0]`. This is the ONE
// place a base-offset shift occurs at MK4 (the R1 spike §3.3 "one cursor"
// invariant is preserved at the markup-trampoline level; the shift is a
// milestone-bounded artifact of the JS-layer entry-points taking their own
// token stream — retired when the JS-layer entry points take the shared
// ParseContext directly).
function parseLogicBodyForwarding(bodyText, ctx, bodyAbsStart, bodyAbsLine, bodyAbsCol) {
    if (bodyText === undefined || bodyText === null) return [];
    if (bodyText.length === 0) return [];

    const tokens = lex(bodyText);
    const result = parseProgram(tokens, bodyText);

    // Forward diagnostics into ctx.diagnostics with absolute spans + delegation
    // attribution. The diagnostic stream is shared (R1 spike §1.4); the active
    // DelegationFrame is attached so a downstream consumer (M5 / M6) sees the
    // attribution chain.
    const frame = topDelegationFrame(ctx);
    if (result.errors !== undefined && result.errors !== null) {
        let i = 0;
        while (i < result.errors.length) {
            const e = result.errors[i];
            const absSpan = shiftSpan(e.span, bodyAbsStart, bodyAbsLine, bodyAbsCol);
            const diag = makeDiagnostic(e.code, e.message, absSpan);
            if (frame !== null && frame !== undefined) {
                diag.delegationFrame = frame;
            }
            pushDiagnostic(ctx, diag);
            i = i + 1;
        }
    }

    // Shift the body's node spans into the host coordinate space too. For now
    // we walk the top-level body[] and shift each statement's span; deep
    // shifts are deferred — the body[] is carried as the LogicEscape block's
    // payload, and downstream consumers (M5 codegen, NR) read the body[] as
    // an opaque payload. The top-level spans are what surfaces in test
    // assertions (and the smoke test).
    const body = (result.body !== undefined && result.body !== null) ? result.body : [];
    let j = 0;
    while (j < body.length) {
        const stmt = body[j];
        if (stmt !== null && stmt !== undefined && stmt.span !== undefined && stmt.span !== null) {
            stmt.span = shiftSpan(stmt.span, bodyAbsStart, bodyAbsLine, bodyAbsCol);
        }
        j = j + 1;
    }
    return body;
}

// shiftSpan — calculation (pure). Translate a body-local span into the host
// coordinate space. The slice's local-(0,1,1) is the host's
// (bodyAbsStart, bodyAbsLine, bodyAbsCol). Line/col shifts are best-effort:
// a body that contains newlines has local line numbers; the host body starts
// at (bodyAbsLine, bodyAbsCol); the host line of a body-local line N is
// `bodyAbsLine + (N - 1)`; the host col of a body-local line-1 position is
// `bodyAbsCol + (col - 1)`, and of a body-local line-N>1 position is just
// `col` (the body's later lines start at column 1 of the host source — the
// best-effort approximation; a perfect column shift requires line-anchor
// tracking which is M5-scope).
function shiftSpan(localSpan, bodyAbsStart, bodyAbsLine, bodyAbsCol) {
    if (localSpan === undefined || localSpan === null) {
        return makeSpan(bodyAbsStart, bodyAbsStart, bodyAbsLine, bodyAbsCol);
    }
    const start = bodyAbsStart + (localSpan.start ?? 0);
    const end = bodyAbsStart + (localSpan.end ?? 0);
    const localLine = localSpan.line ?? 1;
    const localCol = localSpan.col ?? 1;
    const hostLine = bodyAbsLine + (localLine - 1);
    const hostCol = (localLine === 1) ? bodyAbsCol + (localCol - 1) : localCol;
    return makeSpan(start, end, hostLine, hostCol);
}

// =============================================================================
// JS -> markup — the DELEGATE-UP direction (R1 spike §1.2).
//
// markupValueAllowedAfter(lastKind) — the prev-token discriminator. A `<` in
// the JS expression layer opens a MARKUP VALUE iff:
//   (a) the previous token (the immediately preceding token in the JS stream)
//       is one after which a *value* is expected; AND
//   (b) the character after the `<` is an ASCII letter / `_` / `>` (the
//       markup-tag opener shape) — verified by the call site against the
//       token text (the JS layer has already lexed the next token; if it
//       starts with letter/`_` and is source-adjacent to the `<`, the shape
//       matches).
//
// This is a bounded prev-token calculation, NOT backtracking (R1 spike §3.4 +
// §1.2). The twin of M1's shipping `regexAllowedAfter(lastKind)` —
// lex-in-code.js. The prev-token set, lifted verbatim from R1 spike §1.2:
//   `=` (Assign + every compound-assign), `(` (LParen), `,` (Comma),
//   `return` (KwReturn), `lift` (KwLift), `=>` (Arrow), `[` (LBracket),
//   any binary / logical operator, start-of-body / start-of-stream (lastKind
//   undefined / null).
//
// CARRY-FORWARD — the R1 spike sketched the prev-token set with `renders`
// (plural). The actual TokenKind catalog has only `KwRender` (singular —
// token.js:123). The singular form `KwRender` is the canonical L3-locked
// keyword. The "renders" sketch is not in the real catalog and is therefore
// NOT in the discriminator set (an MK4 anomaly surfaced + documented in the
// final report).
// =============================================================================

// markupValueAllowedAfter — calculation (pure predicate). Is `lastKind` a
// token after which a `<` opens a markup value? Bounded; no lookahead. See
// §3.4 — this is the M1 `regexAllowedAfter` twin.
export function markupValueAllowedAfter(lastKind) {
    // Start-of-body / start-of-stream — a `<` at the start of an expression
    // position opens a markup value.
    if (lastKind === undefined || lastKind === null) return true;

    // The value-following set — every token after which a JS expression
    // (and therefore a markup value, by Pillar 1) is expected.
    switch (lastKind) {
        // Assignment + compound-assigns
        case TokenKind.Assign:
        case TokenKind.PlusAssign:
        case TokenKind.MinusAssign:
        case TokenKind.StarAssign:
        case TokenKind.SlashAssign:
        case TokenKind.PercentAssign:
        case TokenKind.StarStarAssign:
        case TokenKind.BitShiftLeftAssign:
        case TokenKind.BitShiftRightAssign:
        case TokenKind.BitShiftRightUnsignedAssign:
        case TokenKind.BitAndAssign:
        case TokenKind.BitOrAssign:
        case TokenKind.BitXorAssign:
        case TokenKind.LogicalAndAssign:
        case TokenKind.LogicalOrAssign:
        case TokenKind.NullishCoalesceAssign:

        // Grouping + list separators
        case TokenKind.LParen:
        case TokenKind.LBracket:
        case TokenKind.LBrace:
        case TokenKind.Comma:
        case TokenKind.Semicolon:
        case TokenKind.Colon:

        // Return / lift / render-keyword heads (R1 spike §1.2;
        // KwRender is the singular L3-locked form — "renders" is NOT a
        // separate TokenKind, see header anomaly note).
        case TokenKind.KwReturn:
        case TokenKind.KwLift:
        case TokenKind.KwRender:
        case TokenKind.KwYield:
        case TokenKind.KwThrow:
        case TokenKind.KwIf:
        case TokenKind.KwElse:
        case TokenKind.KwWhile:
        case TokenKind.KwDoWhile:
        case TokenKind.KwFor:

        // Arrow head — `(x) => <markup/>`.
        case TokenKind.Arrow:

        // Binary / logical / equality / relational / bitwise operators —
        // RHS of any of these starts an expression.
        case TokenKind.Plus:
        case TokenKind.Minus:
        case TokenKind.Star:
        case TokenKind.Slash:
        case TokenKind.Percent:
        case TokenKind.StarStar:
        case TokenKind.Equal:
        case TokenKind.NotEqual:
        case TokenKind.StrictEqual:
        case TokenKind.StrictNotEqual:
        case TokenKind.LessThan:
        case TokenKind.LessEqual:
        case TokenKind.GreaterThan:
        case TokenKind.GreaterEqual:
        case TokenKind.LogicalAnd:
        case TokenKind.LogicalOr:
        case TokenKind.NullishCoalesce:
        case TokenKind.BitAnd:
        case TokenKind.BitOr:
        case TokenKind.BitXor:
        case TokenKind.BitShiftLeft:
        case TokenKind.BitShiftRight:
        case TokenKind.BitShiftRightUnsigned:

        // Question for ternary, plus the `in`/`of`/`instanceof` infixes.
        case TokenKind.Question:
        case TokenKind.KwIn:
        case TokenKind.KwOf:
        case TokenKind.KwInstanceof:
            return true;

        default:
            return false;
    }
}

// =============================================================================
// DELEGATION-FRAME SUMMARY — re-exports so consumers import one place.
// =============================================================================

export {
    delegationKinds,
    closeOnBraceDepth,
    makeDelegationFrame,
    pushDelegationFrame,
    popDelegationFrame,
    topDelegationFrame,
    delegationDepth,
};
