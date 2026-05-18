// lex-in-block-comment.js — JS-host shadow of lex-in-block-comment.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors lex-in-block-comment.scrml's header.

import { peekChar, advance, isEof } from "./cursor.js";
import { LexMode, setMode } from "./lex-mode.js";

// --- scanBlockCommentBody — consume `/*` + body + `*/` (or to EOF on
// unterminated). Cursor lands one past the closing `/` (or at EOF). ---
export function scanBlockCommentBody(cursor) {
    advance(cursor, 2); // consume opening /*
    while (!isEof(cursor)) {
        if (peekChar(cursor, 0) === "*" && peekChar(cursor, 1) === "/") {
            advance(cursor, 2); // consume closing */
            break;
        }
        advance(cursor, 1);
    }
}

// --- dispatchInBlockComment — state-aware wrapper. Scans the body,
// transitions LexMode back to InCode, emits no token. ---
export function dispatchInBlockComment(cursor, ctx) {
    scanBlockCommentBody(cursor);
    setMode(ctx, LexMode.InCode);
}
