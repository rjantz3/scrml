// native-const-at-derived-decl.test.js — FIX 2 (leaf-gap Group P, SPEC §6.6).
//
// change-id: native-parser-leaf-gaps-2026-06-06
//
// THE GAP. `const @name = expr` (and `const @name: T = expr`) — the LEGACY
// expression-form DERIVED reactive value (ADR Option A FOLD, ratified S60).
// `@name` lexes as a SINGLE `TokenKind.ScrmlAt` token (`.name="name"`); the
// native generic var-decl path's `parseBindingIdent` (parse-expr.js) only
// accepts `TokenKind.Ident` binding targets, so before this fix `const @gate
// = ...` fired E-STMT-BINDING-NAME + E-STMT-MISSING-SEMICOLON and bailed the
// enclosing `${...}` logic block (~40 corpus files + cascade — `const @name`
// is the dominant derived-decl shape).
//
// NAME-SHAPE FINDING (brief §FIX-2 verify). The LIVE oracle
// (ast-builder.js:5498-5508) does NOT produce a plain `const-decl` — it builds
// a `state-decl{ name: <@ stripped>, shape:"derived", isConst:true,
// structuralForm:false }`. The brief's suggested `parseBindingIdent` ScrmlAt
// branch would have been WRONG (a plain const-decl with name "gate"). The fix
// routes `const @name` to a dedicated parseConstAtStateDecl producing the
// derived state-decl, mirroring live exactly. The name is stored WITHOUT `@`.
//
// THE FIX (parse-stmt.js parseStatement arm + parseConstAtStateDecl). The
// recognition arm matches `const` + a DECLARABLE `@`-cell and routes into the
// derived-state-decl helper; translate-stmt's makeStateDeclNode maps
// `shape:"derived"`+`isConst:true` to the live `_scrml_derived_declare` node.
//
// DRIVER: source -> `lex` -> `parseProgram` -> `translateStmtList`.

import { describe, test, expect } from "bun:test";

import { lex } from "../../native-parser/lex.js";
import { parseProgram } from "../../native-parser/parse-stmt.js";
import { translateStmtList } from "../../native-parser/translate-stmt.js";

function run(source) {
    const program = parseProgram(lex(source));
    return { errors: program.errors || [], out: translateStmtList(program.body) };
}

describe("FIX 2 — `const @name` derived state-decl native parsing", () => {

    test("`const @gate = expr` -> state-decl{shape:derived,isConst,!structuralForm}", () => {
        const { errors, out } = run("const @gate = @base > 5");
        // The native-only symptom (E-STMT-BINDING-NAME + E-STMT-MISSING-SEMICOLON)
        // is gone.
        expect(errors).toEqual([]);
        expect(out.length).toBe(1);
        const node = out[0];
        expect(node.kind).toBe("state-decl");
        expect(node.name).toBe("gate");        // name stored WITHOUT `@`
        expect(node.shape).toBe("derived");
        expect(node.isConst).toBe(true);
        expect(node.structuralForm).toBe(false); // legacy @-form, not <name>
        expect(node.initExpr).toBeDefined();
        expect(node.initExpr).not.toBeNull();
    });

    test("`const @name: T = expr` carries the typeAnnotation", () => {
        const { errors, out } = run("const @doubled: number = @base * 2");
        expect(errors).toEqual([]);
        expect(out.length).toBe(1);
        const node = out[0];
        expect(node.kind).toBe("state-decl");
        expect(node.name).toBe("doubled");
        expect(node.shape).toBe("derived");
        expect(node.isConst).toBe(true);
        expect(node.typeAnnotation).toBe("number");
    });

    test("a plain `const name = expr` (Ident target) stays a const-decl", () => {
        // No regression — the generic var-decl path owns plain identifiers.
        const { errors, out } = run("const plain = 5");
        expect(errors).toEqual([]);
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("const-decl");
        expect(out[0].name).toBe("plain");
    });

    test("`const @x` with no initializer records E-STMT-STATE-DECL-INIT", () => {
        const { errors } = run("const @x");
        const codes = errors.map((e) => e.code);
        expect(codes).toContain("E-STMT-STATE-DECL-INIT");
    });

    test("a bare `@order = S.A` write (no const, no `:`) is unaffected", () => {
        // The bare `@`-cell write (V-kill, §6.1.2) stays an expression statement.
        const { errors, out } = run("@order = 5");
        expect(errors).toEqual([]);
        expect(out.length).toBe(1);
        // Not a state-decl — a bare reactive write bare-expr.
        expect(out[0].kind).not.toBe("state-decl");
    });
});
