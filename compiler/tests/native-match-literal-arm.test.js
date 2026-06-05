// native-match-literal-arm.test.js — F2-match swap-family conformance.
//
// The native expression parser (compiler/native-parser/parse-expr.js) could
// parse VARIANT / wildcard / is arm patterns but NOT string-LITERAL arm
// patterns:
//
//   match role { "admin" -> handleAdmin() "editor" -> handleEditor() else -> 0 }
//
// fired E-EXPR-MATCH-PATTERN (`parseMatchArmPattern` had no StringLit branch —
// a `"..."` arm pattern fell to the catch-all `recordError`, losing parser sync
// and cascading). SPEC §18.16 normatively defines
// `literal-arm-pattern ::= string-literal | number-literal | boolean-literal`;
// the legacy BS+Acorn path parses string-literal arms fine, so native was the
// drifted enforcer. The F2-match fix (change-id native-f2match-literal-arm-
// 2026-06-05) adds:
//   1. ast-expr.js — `MatchArmPatternKind.Literal` + `makeLiteralPattern`
//   2. parse-expr.js parseMatchArmPattern — a `StringLit` branch before the
//      catch-all that builds a Literal pattern (carrying the verbatim `raw`)
//   3. translate-expr.js reconstructArmPattern — a `Literal` case that
//      re-serializes the arm's `raw` source so the live emitter's re-parse
//      (emit-control-flow.ts parseMatchArm Forms 3/4) recognizes it.
//
// SCOPE: STRING literals only. SPEC §18.16's number- and boolean-literal arms
// are a SEPARATE dual-front-end backlog item — the LIVE emitter has no
// number/boolean arm form (both silently drop on the DEFAULT path too), so
// native deliberately recognizes ONLY the string form (recognizing boolean
// would route it into the live silent-drop, making native worse not better).
// These tests assert string-literal arms parse to a structured Literal pattern,
// build the same AST as their newline form, and that the variant / wildcard /
// is / payload controls do NOT regress.

import { describe, test, expect } from "bun:test";

import { lex as scrmlNativeLex } from "../native-parser/lex.js";
import { parseExpr as scrmlNativeParseExpr } from "../native-parser/parse-expr.js";

// --- helpers -----------------------------------------------------------------

function parse(src) {
    return scrmlNativeParseExpr(scrmlNativeLex(src));
}

function findMatch(node, depth = 0) {
    if (node === null || node === undefined || typeof node !== "object" || depth > 12) {
        return null;
    }
    if (node.kind === "Match") {
        return node;
    }
    for (const key of Object.keys(node)) {
        const value = node[key];
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = findMatch(item, depth + 1);
                if (found !== null) return found;
            }
        } else if (value !== null && typeof value === "object") {
            const found = findMatch(value, depth + 1);
            if (found !== null) return found;
        }
    }
    return null;
}

function stripSpans(node) {
    if (Array.isArray(node)) {
        return node.map(stripSpans);
    }
    if (node !== null && typeof node === "object") {
        const out = {};
        for (const key of Object.keys(node)) {
            if (key === "span") continue;
            out[key] = stripSpans(node[key]);
        }
        return out;
    }
    return node;
}

function structurallyEqual(srcA, srcB) {
    const a = stripSpans(parse(srcA).ast);
    const b = stripSpans(parse(srcB).ast);
    return JSON.stringify(a) === JSON.stringify(b);
}

// --- string-literal arms now parse (was the F2-match failure) ----------------

describe("F2-match — string-literal arm patterns parse without error", () => {
    test('`"..." => result` arms parse to a 2-arm Match, no errors', () => {
        const { ast, errors } = parse('match day { "Monday" => "start" "Friday" => "end" }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m).not.toBe(null);
        expect(m.arms.length).toBe(2);
    });

    test('`"..." -> result` legacy-arrow arms parse', () => {
        const { ast, errors } = parse('match role { "admin" -> handleAdmin() "editor" -> handleEditor() }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });

    test('`"..." :> result` colon-arrow arms parse', () => {
        const { ast, errors } = parse('match day { "Mon" :> 1 "Tue" :> 2 }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });

    test("string-literal arms mixed with a wildcard `else` arm parse", () => {
        const { ast, errors } = parse('match day { "Monday" => "start" "Friday" => "end" else => "mid" }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(3);
    });

    test("string-literal arms mixed with a `_` wildcard arm parse", () => {
        const { ast, errors } = parse('match role { "admin" -> 1 "editor" -> 2 _ -> 3 }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(3);
    });

    test("single-quoted string-literal arms parse", () => {
        const { ast, errors } = parse("match s { 'a' => 1 'b' => 2 }");
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });

    test("newline-separated string-literal arms parse", () => {
        const { ast, errors } = parse('match day {\n  "Monday" => "start"\n  "Friday" => "end"\n}');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });
});

// --- arm pattern node shape: a Literal pattern carrying the verbatim raw -----

describe("F2-match — string-literal arm produces a Literal pattern node", () => {
    test('arm pattern is MatchArmPatternKind.Literal with litKind "string" and raw incl. quotes', () => {
        const { ast } = parse('match day { "Monday" => "start" else => "mid" }');
        const m = findMatch(ast);
        const pat = m.arms[0].pattern;
        expect(pat.patternKind).toBe("Literal");
        expect(pat.litKind).toBe("string");
        // raw retains the verbatim source INCLUDING quote delimiters so the
        // bridge can re-serialize for the live emitter's re-parse.
        expect(pat.raw).toBe('"Monday"');
        expect(pat.value).toBe("Monday");
    });

    test("single-quoted arm raw retains single quotes verbatim", () => {
        const { ast } = parse("match s { 'admin' => 1 }");
        const pat = findMatch(ast).arms[0].pattern;
        expect(pat.patternKind).toBe("Literal");
        expect(pat.raw).toBe("'admin'");
        expect(pat.value).toBe("admin");
    });

    test("the wildcard arm alongside literal arms is still a Wildcard pattern", () => {
        const { ast } = parse('match day { "Monday" => 1 else => 0 }');
        const m = findMatch(ast);
        expect(m.arms[1].pattern.patternKind).toBe("Wildcard");
    });
});

// --- AST parity: same-line === newline (spans aside) -------------------------
// Structurally-identical AST => identical downstream codegen / emitted JS.

describe("F2-match — same-line literal-arm AST is structurally identical to the newline form", () => {
    test('`=>` string arms', () => {
        expect(structurallyEqual(
            'match day { "Monday" => "start" "Friday" => "end" }',
            'match day {\n  "Monday" => "start"\n  "Friday" => "end"\n}',
        )).toBe(true);
    });

    test('`->` string arms with call bodies', () => {
        expect(structurallyEqual(
            'match role { "admin" -> handleAdmin() "editor" -> handleEditor() }',
            'match role {\n  "admin" -> handleAdmin()\n  "editor" -> handleEditor()\n}',
        )).toBe(true);
    });

    test("string arms followed by a wildcard arm", () => {
        expect(structurallyEqual(
            'match day { "Monday" => "start" else => "mid" }',
            'match day {\n  "Monday" => "start"\n  else => "mid"\n}',
        )).toBe(true);
    });
});

// --- controls: variant / is / payload arms must NOT regress ------------------

describe("F2-match — non-literal arm controls do not regress", () => {
    test("variant arms still parse to Variant patterns", () => {
        const { ast, errors } = parse('match @p { .A => 1 .B => 2 }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m.arms[0].pattern.patternKind).toBe("Variant");
        expect(m.arms[1].pattern.patternKind).toBe("Variant");
    });

    test("qualified-variant arms still parse", () => {
        const { ast, errors } = parse('match @p { Color.Red => 1 Color.Blue => 2 }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });

    test("payload-binding variant arms still parse", () => {
        const { ast, errors } = parse('match @p { .Ok(v) => v .Err(e) => 0 }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });

    test("a literal arm followed by a variant arm both parse (mixed)", () => {
        const { ast, errors } = parse('match @p { "x" => 1 .A => 2 }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m.arms.length).toBe(2);
        expect(m.arms[0].pattern.patternKind).toBe("Literal");
        expect(m.arms[1].pattern.patternKind).toBe("Variant");
    });
});
