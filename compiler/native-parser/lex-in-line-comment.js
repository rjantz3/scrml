// lex-in-line-comment.js — JS-host shadow of lex-in-line-comment.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors lex-in-line-comment.scrml's header.

import { peekCharCode, advance, isEof } from "./cursor.js";
import { LexMode, setMode } from "./lex-mode.js";

// --- isLineTerminatorCode — ECMA-262 §11.3 LineTerminator predicate ---
export function isLineTerminatorCode(c) {
    return c === 10 || c === 13 || c === 0x2028 || c === 0x2029;
}

// --- scanLineCommentBody — consume `//` + body up to (but not including)
// the terminating LineTerminator. EOF terminates as well. ---
export function scanLineCommentBody(cursor) {
    advance(cursor, 2); // consume opening //
    while (!isEof(cursor) && !isLineTerminatorCode(peekCharCode(cursor, 0))) {
        advance(cursor, 1);
    }
}

// --- dispatchInLineComment — state-aware wrapper. Scans the body,
// transitions LexMode back to InCode, emits no token (comments are
// non-emitted per token-catalog policy). ---
export function dispatchInLineComment(cursor, ctx) {
    scanLineCommentBody(cursor);
    setMode(ctx, LexMode.InCode);
}
