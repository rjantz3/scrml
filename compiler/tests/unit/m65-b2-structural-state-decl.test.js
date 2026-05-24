// m65-b2-structural-state-decl.test.js — M6.5.b.2 Wave 2 unit tests.
//
// FIX-NATIVE Class E from SCOPING.md: V5-strict structural state-decl LHS
// (`<name> = expr` / `const <name> = expr` per SPEC §6.2 + §6.6). The native
// parser now recognizes the `<ident>` LHS-binding form at statement position
// (parse-stmt.js `parseStructuralStateDecl`) AND translate-stmt produces the
// live `state-decl` LogicStatement shape (ReactiveDeclNode, ast.ts:502).
//
// Three layers under test, end to end:
//   1. parse-stmt parseStatement dispatches `<ident>` and `const <ident>` to
//      parseStructuralStateDecl with the correct isConst flag.
//   2. parseStructuralStateDecl emits native `StateDecl` with the structural
//      attribute payload (pinned, server, default=, debounced=, throttled=,
//      validators).
//   3. translateStmtList maps `StateDecl` -> live `state-decl` with isConst,
//      shape ("plain"|"derived"), structuralForm:true, pinned, isServer,
//      typeAnnotation, initExpr.
//
// DRIVER: source -> `lex` -> `parseProgram` -> `translateStmtList`.

import { describe, test, expect } from "bun:test";

import { lex } from "../../native-parser/lex.js";
import { StmtKind } from "../../native-parser/ast-stmt.js";
import { parseProgram } from "../../native-parser/parse-stmt.js";
import { translateStmtList } from "../../native-parser/translate-stmt.js";

// parse — source -> native Stmt[] (+ errors).
function parse(source) {
    return parseProgram(lex(source));
}

// translate — source -> live LogicStatement[].
function translate(source, idGen) {
    return translateStmtList(parse(source).body, idGen);
}

// =============================================================================
describe("M6.5.b.2 §1 — parse-stmt dispatch", () => {
    test("`<name> = expr` is a structural state-decl (plain)", () => {
        const { body, errors } = parse("<count> = 0");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(1);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("count");
        expect(body[0].isConst).toBe(false);
        expect(body[0].shape).toBe("plain");
        expect(body[0].structuralForm).toBe(true);
    });

    test("`const <name> = expr` is a structural state-decl (derived)", () => {
        const { body, errors } = parse("const <doubled> = a * 2");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(1);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("doubled");
        expect(body[0].isConst).toBe(true);
        expect(body[0].shape).toBe("derived");
        expect(body[0].structuralForm).toBe(true);
    });

    test("`const x = expr` (no `<`) is a plain var-decl, NOT a state-decl", () => {
        // Regression guard: the const<x> dispatch arm must NOT swallow ordinary
        // const declarations.
        const { body, errors } = parse("const x = 5");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(1);
        expect(body[0].kind).toBe(StmtKind.VarDecl);
        expect(body[0].declKind).toBe("const");
    });

    test("`let x = expr` is a plain var-decl, unaffected", () => {
        const { body, errors } = parse("let x = 5");
        expect(errors.length).toBe(0);
        expect(body[0].kind).toBe(StmtKind.VarDecl);
    });

    test("two consecutive structural state-decls both parse", () => {
        // Reproduces the SCOPING fixture m65-fixture-const-derived.scrml
        // shape, modulo the surrounding <program> markup wrapper.
        const { body, errors } = parse("<a> = 1; const <doubled> = a * 2");
        expect(errors.length).toBe(0);
        expect(body.length).toBe(2);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("a");
        expect(body[0].isConst).toBe(false);
        expect(body[1].kind).toBe(StmtKind.StateDecl);
        expect(body[1].name).toBe("doubled");
        expect(body[1].isConst).toBe(true);
    });
});

// =============================================================================
describe("M6.5.b.2 §2 — attribute region — bareword modifiers", () => {
    test("`<x pinned> = 0` captures pinned:true (SPEC §6.10)", () => {
        const { body, errors } = parse("<count pinned> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("count");
        expect(body[0].pinned).toBe(true);
        expect(body[0].server).toBe(false);
    });

    test("`<x server> = 0` captures server:true (SPEC §52)", () => {
        const { body, errors } = parse("<count server> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].server).toBe(true);
        expect(body[0].pinned).toBe(false);
    });

    test("`<x pinned server> = 0` captures both flags", () => {
        const { body, errors } = parse("<count pinned server> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].pinned).toBe(true);
        expect(body[0].server).toBe(true);
    });

    test("bareword `req` lands as a validator entry (args:null)", () => {
        const { body, errors } = parse("<email req> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].validators).toEqual([{ name: "req", args: null }]);
    });
});

// =============================================================================
describe("M6.5.b.2 §3 — attribute region — named (`=`) attrs", () => {
    test("`<x default=5> = 0` captures defaultExprRaw='5' (SPEC §6.8)", () => {
        const { body, errors } = parse("<count default=5> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].defaultExprRaw).toBe("5");
    });

    test("`<x default=(a + b)> = 0` captures balanced parens", () => {
        const { body, errors } = parse("<count default=(a + b)> = 0");
        expect(errors.length).toBe(0);
        // Parens are consumed as raw tokens; depth tracking keeps the value
        // intact across the close-paren-with-`>` follow-on.
        expect(body[0].defaultExprRaw).toContain("a");
        expect(body[0].defaultExprRaw).toContain("b");
    });

    test("`<x debounced=300ms> = 0` captures debouncedRaw (SPEC §6.13)", () => {
        const { body, errors } = parse("<input debounced=300ms> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].debouncedRaw).toBeTruthy();
        expect(body[0].debouncedRaw).toContain("300");
        expect(body[0].debouncedRaw).toContain("ms");
    });

    test("`<x throttled=1s> = 0` captures throttledRaw (SPEC §6.13)", () => {
        const { body, errors } = parse("<input throttled=1s> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].throttledRaw).toBeTruthy();
        expect(body[0].throttledRaw).toContain("1");
        expect(body[0].throttledRaw).toContain("s");
    });
});

// =============================================================================
describe("M6.5.b.2 §4 — attribute region — call-form validators", () => {
    test("`<x length(>=2)>` captures validator name + args", () => {
        const { body, errors } = parse("<name length(>=2)> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].validators.length).toBe(1);
        expect(body[0].validators[0].name).toBe("length");
        expect(Array.isArray(body[0].validators[0].args)).toBe(true);
    });

    test("`<x min(0)>` captures call-form validator", () => {
        const { body, errors } = parse("<age min(0)> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].validators[0].name).toBe("min");
    });

    test("multiple validators all captured in order", () => {
        const { body, errors } = parse("<name req length(>=2) pattern(test)> = 0");
        expect(errors.length).toBe(0);
        expect(body[0].validators.length).toBe(3);
        expect(body[0].validators[0].name).toBe("req");
        expect(body[0].validators[0].args).toBeNull();
        expect(body[0].validators[1].name).toBe("length");
        expect(body[0].validators[2].name).toBe("pattern");
    });
});

// =============================================================================
describe("M6.5.b.2 §5 — typed structural state-decl", () => {
    test("`<count>: number = 0` captures typeAnnotation 'number'", () => {
        const { body, errors } = parse("<count>: number = 0");
        expect(errors.length).toBe(0);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("count");
        expect(body[0].typeAnnotation).toContain("number");
    });

    test("`const <doubled>: number = a * 2` captures isConst + typeAnnotation", () => {
        const { body, errors } = parse("const <doubled>: number = a * 2");
        expect(errors.length).toBe(0);
        expect(body[0].isConst).toBe(true);
        expect(body[0].shape).toBe("derived");
        expect(body[0].typeAnnotation).toContain("number");
    });
});

// =============================================================================
describe("M6.5.b.2 §6 — translate-stmt -> live state-decl shape", () => {
    test("plain `<x> = 0` translates to live state-decl with shape:plain", () => {
        const stmts = translate("<count> = 0");
        expect(stmts.length).toBe(1);
        expect(stmts[0].kind).toBe("state-decl");
        expect(stmts[0].name).toBe("count");
        expect(stmts[0].structuralForm).toBe(true);
        expect(stmts[0].isConst).toBe(false);
        expect(stmts[0].shape).toBe("plain");
        expect(stmts[0].pinned).toBe(false);
        expect(stmts[0].defaultExpr).toBe(null);
        expect(stmts[0].initExpr).toBeTruthy();
        expect(stmts[0].initExpr.kind).toBe("lit");
    });

    test("`const <doubled> = a * 2` translates to live state-decl with shape:derived", () => {
        const stmts = translate("const <doubled> = a * 2");
        expect(stmts.length).toBe(1);
        expect(stmts[0].kind).toBe("state-decl");
        expect(stmts[0].name).toBe("doubled");
        expect(stmts[0].isConst).toBe(true);
        expect(stmts[0].shape).toBe("derived");
        expect(stmts[0].structuralForm).toBe(true);
        // initExpr should be a binary expression (* operator).
        expect(stmts[0].initExpr.kind).toBe("binary");
        expect(stmts[0].initExpr.op).toBe("*");
    });

    test("`<x pinned> = 0` translates pinned:true onto live node", () => {
        const stmts = translate("<count pinned> = 0");
        expect(stmts[0].pinned).toBe(true);
    });

    test("`<x server> = 0` translates server -> isServer:true (live field name)", () => {
        const stmts = translate("<count server> = 0");
        expect(stmts[0].isServer).toBe(true);
    });

    test("typed Shape 1 translates with typeAnnotation field", () => {
        const stmts = translate("<count>: number = 0");
        expect(stmts[0].typeAnnotation).toContain("number");
    });

    test("the SCOPING fixture's two-decl shape translates fully", () => {
        // Mirrors `docs/changes/m65-path-b-adapter-scoping/fixtures/
        // m65-fixture-const-derived.scrml` modulo the <program> wrapper.
        const stmts = translate("<a> = 1; const <doubled> = @a * 2");
        expect(stmts.length).toBe(2);
        expect(stmts[0].kind).toBe("state-decl");
        expect(stmts[0].name).toBe("a");
        expect(stmts[0].isConst).toBe(false);
        expect(stmts[0].shape).toBe("plain");
        expect(stmts[1].kind).toBe("state-decl");
        expect(stmts[1].name).toBe("doubled");
        expect(stmts[1].isConst).toBe(true);
        expect(stmts[1].shape).toBe("derived");
    });
});

// =============================================================================
describe("M6.5.b.2 §7 — non-structural-decl regression guards", () => {
    test("`x < y` comparison is NOT a state-decl", () => {
        // structuralStateDeclLeadFollows declines when no `>` is followed by
        // `=` or `:`. `x < y` lacks an opener `>` entirely.
        const { body } = parse("x < y");
        expect(body[0].kind).toBe(StmtKind.ExprStmt);
    });

    test("`<div>...</>` markup is NOT a state-decl", () => {
        // The opener `<div>` is followed by content, not a `=` decl signal.
        // The lead predicate declines; expression-statement / markup arm runs.
        // (At the JS-substrate level, this routes to parseExpression which
        // produces a markup-value expression; not a state-decl.)
        const { body } = parse("<div>hello</div>");
        if (body.length > 0) {
            expect(body[0].kind).not.toBe(StmtKind.StateDecl);
        }
    });

    test("`<Component/>` self-closing tag is NOT a state-decl", () => {
        const { body } = parse("<Component/>");
        if (body.length > 0) {
            expect(body[0].kind).not.toBe(StmtKind.StateDecl);
        }
    });

    test("fused `>=` form `<count>=0` recognised as state-decl", () => {
        const { body, errors } = parse("<count>=0");
        expect(errors.length).toBe(0);
        expect(body[0].kind).toBe(StmtKind.StateDecl);
        expect(body[0].name).toBe("count");
    });
});
