// m65-b2-1-statedecl-boundary.test.js — M6.5.b.2.1 unit tests.
//
// FIX-NATIVE follow-on to M6.5.b.2. The native parser recognized structural
// state-decls (`<x> = expr`, `const <x> = expr`) at M6.5.b.2, BUT the
// INITIALIZER is parsed by the pure-JS precedence-climbing core
// (parseBinary). `<` is TokenKind.LessThan at BINARY_PRECEDENCE 8, so for
// consecutive BARE state-decls separated only by a NEWLINE:
//     <x> = 0
//     <y> = 1
// parsing `<x>`'s init consumed `0`, then saw the next-line `<` and ate it as
// a relational `<` operator, greedily swallowing `<y>` (and beyond) into
// `<x>`'s init expression — ONE state-decl with a garbage init instead of two.
//
// THE FIX (mirrors the live ast-builder collectExpr Step 11.0b,
// ast-builder.js:2689-2725): a ctx flag `atStateDeclStmtPos` is set by
// parse-stmt around (1) a state-decl initializer parse and (2) a bare
// expression-statement parse — the two statement-collector positions. The
// parseBinary `<` guard (isAtStateDeclBoundary, parse-expr.js) STOPS the climb
// when: the flag is set AND a newline crossed AND the upcoming sequence is a
// `<NAME ...> =` / `<NAME>= ` / `<NAME ...> :` state-decl opener shape. The
// opener-shape lookahead (peekStartsStructuralStateDecl) mirrors parse-stmt's
// structuralStateDeclLeadFollows exactly (including the fused-`>=` scanIdx===2
// carve-out), so the disambiguation cases stay comparisons.
//
// DRIVER: source -> `lex` -> `parseProgram` -> native Stmt[].

import { describe, test, expect } from "bun:test";

import { lex } from "../../native-parser/lex.js";
import { StmtKind } from "../../native-parser/ast-stmt.js";
import { parseProgram } from "../../native-parser/parse-stmt.js";

// parse — source -> native Stmt[] (+ errors).
function parse(source) {
    return parseProgram(lex(source));
}

// names — pull the cell names from a body of StateDecl nodes.
function stateDeclNames(body) {
    return body.filter((n) => n.kind === StmtKind.StateDecl).map((n) => n.name);
}

// =============================================================================
describe("M6.5.b.2.1 §1 — consecutive bare state-decls (the bug)", () => {
    test("two newline-separated bare state-decls -> two nodes, no error", () => {
        const { body, errors } = parse("<x> = 0\n<y> = 1");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(body.every((n) => n.kind === StmtKind.StateDecl)).toBe(true);
        expect(stateDeclNames(body)).toEqual(["x", "y"]);
        // The first decl's init must be `0`, NOT a greedy `0 < y ...` blob.
        expect(body[0].isConst).toBe(false);
        expect(body[1].isConst).toBe(false);
    });

    test("three newline-separated bare state-decls -> three nodes (Mario shape)", () => {
        // examples/14-mario-state-machine.scrml lines 43-45.
        const { body, errors } = parse("<coins> = 0\n<lives> = 3\n<gameOver> = false");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(3);
        expect(stateDeclNames(body)).toEqual(["coins", "lives", "gameOver"]);
    });

    test("N=5 newline-separated bare state-decls -> five nodes", () => {
        const { body, errors } = parse("<a>=0\n<b>=1\n<c>=2\n<d>=3\n<e>=4");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(5);
        expect(stateDeclNames(body)).toEqual(["a", "b", "c", "d", "e"]);
    });

    test("fused-`>=` opener then newline sibling -> two nodes", () => {
        const { body, errors } = parse("<count>=0\n<lives>=3");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(stateDeclNames(body)).toEqual(["count", "lives"]);
    });

    test("attr-region opener then newline sibling -> two nodes", () => {
        const { body, errors } = parse("<count pinned> = 0\n<lives> = 3");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(stateDeclNames(body)).toEqual(["count", "lives"]);
        expect(body[0].pinned).toBe(true);
    });

    test("semicolon-separated control still parses to two nodes", () => {
        // The `;` path always worked — regression guard.
        const { body, errors } = parse("<x> = 0; <y> = 1");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(stateDeclNames(body)).toEqual(["x", "y"]);
    });
});

// =============================================================================
describe("M6.5.b.2.1 §2 — const + mixed consecutive forms", () => {
    test("two newline-separated `const <x>` decls -> two nodes", () => {
        const { body, errors } = parse("const <a> = 1\nconst <b> = 2");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(stateDeclNames(body)).toEqual(["a", "b"]);
        expect(body[0].isConst).toBe(true);
        expect(body[1].isConst).toBe(true);
    });

    test("mixed plain then const -> two nodes", () => {
        const { body, errors } = parse("<a> = 1\nconst <b> = 2");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(body[0].isConst).toBe(false);
        expect(body[1].isConst).toBe(true);
    });

    test("mixed const then plain -> two nodes", () => {
        const { body, errors } = parse("const <a> = 1\n<b> = 2");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(body[0].isConst).toBe(true);
        expect(body[1].isConst).toBe(false);
    });
});

// =============================================================================
describe("M6.5.b.2.1 §3 — bare-expr statement boundary (case 2)", () => {
    test("bare call statement then newline state-decl -> two nodes", () => {
        const { body, errors } = parse("foo()\n<y> = 1");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(body[0].kind).toBe(StmtKind.ExprStmt);
        expect(body[1].kind).toBe(StmtKind.StateDecl);
        expect(body[1].name).toBe("y");
    });

    test("bare member-access statement then newline state-decl -> two nodes", () => {
        const { body, errors } = parse("a.b\n<y> = 1");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(body[0].kind).toBe(StmtKind.ExprStmt);
        expect(body[1].kind).toBe(StmtKind.StateDecl);
    });
});

// =============================================================================
describe("M6.5.b.2.1 §4 — disambiguation: `<` that must stay a comparison", () => {
    test("same-line comparison init `<x> = a < b ? 1 : 2` is ONE state-decl", () => {
        // No newline -> the newline gate suppresses the boundary; `<` is a
        // relational operator inside the conditional init.
        const { body, errors } = parse("<x> = a < b ? 1 : 2");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(1);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("x");
    });

    test("`+`-continued multi-line init does NOT break", () => {
        // `+` does not end a value -> the binary climb continues across the
        // newline; the init is the full `@a + @b` expression.
        const { body, errors } = parse("<x> = @a +\n@b");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(1);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("x");
    });

    test("same-line fused `>=` edge `<x> = a < b >= c` stays ONE comparison init", () => {
        // The `>=`-fused edge: in JS `a < b >= c` is `(a < b) >= c`. Same line,
        // no newline -> no boundary. ONE state-decl whose init is the chained
        // comparison.
        const { body, errors } = parse("<x> = a < b >= c");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(1);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("x");
    });

    test("newline-then-non-opener `<` stays a comparison (`<x> = a\\n< b`)", () => {
        // `< b` after a newline: peek(1) is IDENT `b`, but there is no closing
        // `>` + `=`/`:` decl signal -> peekStartsStructuralStateDecl declines
        // -> the `<` is consumed as a relational operator -> ONE state-decl.
        const { body, errors } = parse("<x> = a\n< b");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(1);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("x");
    });

    test("nested `<` inside parens with newline stays a comparison", () => {
        // withInAllowedSubExpr clears the flag inside `(...)` -> a `<` at
        // nesting depth > 0 is never a statement boundary.
        const { body, errors } = parse("<x> = (a\n< b)");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(1);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("x");
    });

    test("nested `<` inside array with newline stays a comparison", () => {
        const { body, errors } = parse("<x> = [a\n< b]");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(1);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("x");
    });
});
