/**
 * Q6-narrow (S134) — `reset(@cell)` × lifecycle interaction tests (SPEC §6.8.3)
 *
 * Closes the §6.8.3 SPEC-ahead-of-impl gap. The B-prereq tracker (Bug 19) shipped
 * the per-access lifecycle tracker for Shape 1 cells; Q6-narrow adds reset
 * call recognition so reset(@cell) and reset(@cell.field) revert or maintain
 * per-access transition state per the symmetric reset semantic.
 *
 * Three normative cases per §6.8.3:
 *   - Reset value satisfies pre-type → revert per-access state to "pre".
 *     Subsequent reads fire E-TYPE-001.
 *   - Reset value satisfies post-type → set/maintain "post". Reads pass.
 *   - Reset value satisfies neither → existing type error per §14.12; no
 *     new diagnostic from Q6-narrow.
 *
 * Cancel-then-apply ordering (§6.8.2 / §6.8.3): state update applies AFTER
 * the conceptual reset write; subsequent statements observe the post-reset
 * state.
 *
 * Tests use direct AST construction (same pattern as
 * lifecycle-shape1-tracker.test.js) to bypass parser tokenization quirks
 * around lifecycle annotations. End-to-end pipeline verification via
 * compileScrml uses minimal canonical sources.
 */

import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  TSError,
  buildTypeRegistry,
  buildLifecycleRegistry,
  checkLifecycleFieldAccess,
  checkLifecycleBindingAccess,
} from "../../src/type-system.js";

// ---------------------------------------------------------------------------
// Direct-AST helpers — mirror lifecycle-shape1-tracker.test.js
// ---------------------------------------------------------------------------

function span(start = 0, file = "/test/q6.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function makeTypeDecl(name, typeKind, raw, id = 1) {
  return { id, kind: "type-decl", name, typeKind, raw, span: span(0) };
}

function bareExpr(text) {
  return { kind: "bare-expr", value: text, expr: text, span: span(0) };
}

/**
 * Build a bare-expr carrying a structured reset-expr exprNode. This mirrors
 * what expression-parser.ts produces when the parser encounters `reset(<expr>)`.
 * The target is an ExprNode tree; for `reset(@cell)`, target is an IdentExpr
 * (or reactive-ref); for `reset(@cell.field)`, target is a MemberExpr chain.
 */
function bareExprWithResetNode(text, target) {
  return {
    kind: "bare-expr",
    value: text,
    expr: text,
    exprNode: { kind: "reset-expr", target, span: span(0) },
    span: span(0),
  };
}

function identTarget(name) {
  return { kind: "ident", name, span: span(0) };
}

function memberTarget(cellName, fieldName) {
  return {
    kind: "member",
    object: { kind: "ident", name: cellName, span: span(0) },
    property: { kind: "ident", name: fieldName, span: span(0) },
    span: span(0),
  };
}

function reactiveNestedAssign(target, path, value) {
  return {
    kind: "reactive-nested-assign",
    target,
    path,
    value,
    span: span(0),
  };
}

function stateReassign(name, init) {
  return {
    kind: "state-decl",
    name,
    init,
    structuralForm: false,
    span: span(0),
  };
}

function ifStmt(condition, consequent, alternate = []) {
  return {
    kind: "if-stmt",
    condition,
    consequent,
    alternate,
    span: span(0),
  };
}

function givenGuard(variables, body) {
  return { kind: "given-guard", variables, body, span: span(0) };
}

// ---------------------------------------------------------------------------
// Tracker 1 — Cell-value-typed Shape 1 presence-progression reset
// ---------------------------------------------------------------------------

describe("§6.8.3 Q6-narrow — cell-value Shape 1 presence-progression reset", () => {

  function userPresenceBinding() {
    return new Map([
      ["state", {
        kind: "presence",
        preType: { kind: "not" },
        postType: { kind: "struct", name: "User" },
        preVariantName: "",
        postVariantName: "",
      }],
    ]);
  }

  test("Test 1 — reset(@state) after write reverts to pre; subsequent read fires E-TYPE-001", () => {
    // <state>: (not to User) = not
    // @state = newUser           // pre → post
    // @state.name                 // OK
    // reset(@state)               // §6.8.3 — reset writes `not` (re-eval init) → revert to pre
    // @state.name                 // E-TYPE-001 fires (pre)
    const body = [
      stateReassign("state", "newUser"),
      bareExpr("@state.name"),
      bareExpr("reset(@state)"),
      bareExpr("@state.name"),
    ];
    const errors = [];
    // resetValueStates: cell `state` has init "not" → reset value classification = "pre"
    const resetValueStates = new Map([["state", "pre"]]);
    checkLifecycleBindingAccess(
      body, userPresenceBinding(), errors, span(),
      /* initialStates */ undefined,
      /* bindingSourceLabel */ "on a Shape 1 reactive cell",
      /* resetValueStates */ resetValueStates,
    );
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
    const fire = errors.find(e => e.code === "E-TYPE-001");
    expect(fire.message).toMatch(/state/);
    expect(fire.message).toMatch(/Shape 1 reactive cell/);
  });

  test("Test 2 — reset(@state) with default=not classification is `pre` — same revert behavior", () => {
    // <state default=not>: (not to User) = not   (explicit default=not — canonical S89)
    // @state = newUser
    // reset(@state)              // default=not → pre
    // @state.name                // FIRES
    const body = [
      stateReassign("state", "newUser"),
      bareExpr("reset(@state)"),
      bareExpr("@state.name"),
    ];
    const errors = [];
    const resetValueStates = new Map([["state", "pre"]]);
    checkLifecycleBindingAccess(body, userPresenceBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });

  test("Test 3 — reset(@state) with default= matching post-type stays post (§6.8.3 unusual-but-legal)", () => {
    // <state default=existingUser>: (not to User) = not
    // @state = newUser           // post
    // reset(@state)              // default=existingUser (User-shaped) → stays post
    // @state.name                // OK
    const body = [
      stateReassign("state", "newUser"),
      bareExpr("reset(@state)"),
      bareExpr("@state.name"),
    ];
    const errors = [];
    const resetValueStates = new Map([["state", "post"]]);
    checkLifecycleBindingAccess(body, userPresenceBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("Test 4 — reset(@state) at start (state already pre) is idempotent — read still fires", () => {
    // <state>: (not to User) = not
    // reset(@state)              // pre → pre (no-op for state)
    // @state.name                // FIRES (still pre)
    const body = [
      bareExpr("reset(@state)"),
      bareExpr("@state.name"),
    ];
    const errors = [];
    const resetValueStates = new Map([["state", "pre"]]);
    checkLifecycleBindingAccess(body, userPresenceBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });

  test("Test 5 — multiple resets cycle pre/post per write/reset", () => {
    // @state = u1                // post
    // @state.name                // OK
    // reset(@state)              // pre
    // @state.name                // FIRES
    // @state = u2                // post
    // reset(@state)              // pre
    // @state.name                // FIRES
    const body = [
      stateReassign("state", "u1"),
      bareExpr("@state.name"),
      bareExpr("reset(@state)"),
      bareExpr("@state.name"),
      stateReassign("state", "u2"),
      bareExpr("reset(@state)"),
      bareExpr("@state.name"),
    ];
    const errors = [];
    const resetValueStates = new Map([["state", "pre"]]);
    checkLifecycleBindingAccess(body, userPresenceBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(2);
  });

  test("Test 6 — reset suppression: reset(@state) is not a phantom field read", () => {
    // Walker must NOT fire on `reset(@state)` itself — there's no `.field` in
    // this form, so nothing to suppress. Sanity test that the reset Pass 0
    // doesn't accidentally emit anything.
    const body = [
      bareExpr("reset(@state)"),
    ];
    const errors = [];
    const resetValueStates = new Map([["state", "pre"]]);
    checkLifecycleBindingAccess(body, userPresenceBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    expect(errors.length).toBe(0);
  });

  test("Test 7 — reset(@state) inside given-guard body affects inner state", () => {
    // @state = u                  // post
    // given @state => {
    //   @state.name               // OK
    //   reset(@state)             // pre inside the guard
    //   @state.name               // FIRES
    // }
    // @state.name                 // OK (guard doesn't leak out; outer still post)
    const body = [
      stateReassign("state", "u"),
      givenGuard(["state"], [
        bareExpr("@state.name"),
        bareExpr("reset(@state)"),
        bareExpr("@state.name"),
      ]),
      bareExpr("@state.name"),
    ];
    const errors = [];
    const resetValueStates = new Map([["state", "pre"]]);
    checkLifecycleBindingAccess(body, userPresenceBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    // Exactly 1 fire — inside the given-guard, the read after reset.
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });

  test("Test 8 — cancel-then-apply ordering: reset followed by read in NEXT statement", () => {
    // @state = u                  // post
    // reset(@state)               // pre (one statement)
    // @state.name                 // FIRES — next statement observes post-reset state
    const body = [
      stateReassign("state", "u"),
      bareExpr("reset(@state)"),
      bareExpr("@state.name"),
    ];
    const errors = [];
    const resetValueStates = new Map([["state", "pre"]]);
    checkLifecycleBindingAccess(body, userPresenceBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Tracker 1 — Cell-value-typed Shape 1 variant-progression reset
// ---------------------------------------------------------------------------

describe("§6.8.3 Q6-narrow — cell-value Shape 1 variant-progression reset", () => {

  function phaseVariantBinding() {
    return new Map([
      ["phase", {
        kind: "variant",
        preType: { kind: "enum", name: "Article", variants: [] },
        postType: { kind: "enum", name: "Article", variants: [] },
        preVariantName: "Draft",
        postVariantName: "Published",
      }],
    ]);
  }

  test("Test 9 — variant reset to pre-variant reverts state", () => {
    // <phase>: (.Draft to .Published) = .Draft
    // @phase = .Published         // post
    // if (@phase is .Draft) { transition(phase); @phase.publishedAt }  // OK
    //   — actually transitioning .Published needs source-discrim of .Draft, but
    //     transition + write-to-published already transitioned it. Let's
    //     simplify: write@phase = .Published transitions; then reset reverts.
    // reset(@phase)               // value=.Draft → pre
    // @phase.publishedAt          // FIRES — pre, post-shape field
    const body = [
      stateReassign("phase", ".Published"),
      bareExpr("reset(@phase)"),
      bareExpr("@phase.publishedAt"),
    ];
    const errors = [];
    const resetValueStates = new Map([["phase", "pre"]]);
    checkLifecycleBindingAccess(body, phaseVariantBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    // Variant reset to pre-variant + access of post-shape field without
    // discrimination → E-TYPE-001 (pre-transition variant access).
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });

  test("Test 10 — variant reset to post-variant stays post (default=post-variant per §6.8.3)", () => {
    // <phase default=.Published>: (.Draft to .Published) = .Draft
    // @phase = .Published         // post
    // reset(@phase)               // value=.Published → post (stays)
    // — but variant-progression cell-value Shape 1 with post-shape field
    //   access still needs transition() for the source discrimination shape.
    //   Test only that reset-to-post doesn't INTRODUCE a spurious revert.
    //   The walker's state stays post, so a subsequent access from the post
    //   state passes without E-TYPE-001.
    const body = [
      stateReassign("phase", ".Published"),
      bareExpr("reset(@phase)"),
      bareExpr("@phase.publishedAt"),
    ];
    const errors = [];
    const resetValueStates = new Map([["phase", "post"]]);
    checkLifecycleBindingAccess(body, phaseVariantBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
    expect(errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED").length).toBe(0);
  });

  test("Test 11 — variant reset re-fires VARIANT-NOT-TRANSITIONED inside source-discrim", () => {
    // @phase = .Published         // post
    // reset(@phase)               // pre
    // if (@phase is .Draft) {
    //   @phase.publishedAt        // FIRES — source-discrim'd but no transition()
    // }
    const body = [
      stateReassign("phase", ".Published"),
      bareExpr("reset(@phase)"),
      ifStmt("phase is .Draft", [
        bareExpr("@phase.publishedAt"),
      ]),
    ];
    const errors = [];
    const resetValueStates = new Map([["phase", "pre"]]);
    checkLifecycleBindingAccess(body, phaseVariantBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    expect(errors.filter(e => e.code === "E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED").length).toBe(1);
  });

  test("Test 12 — reset suppresses phantom variant field read inside reset(@phase.publishedAt)", () => {
    // reset(@phase.publishedAt) — the `phase.publishedAt` substring inside the
    // reset call must NOT be matched as a phantom read by FIELD_ACCESS_RE.
    // Without the resetSpans suppression, this would FALSELY fire
    // E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED or E-TYPE-001.
    const body = [
      bareExpr("reset(@phase.publishedAt)"),
    ];
    const errors = [];
    const resetValueStates = new Map([["phase", "pre"]]);
    checkLifecycleBindingAccess(body, phaseVariantBinding(), errors, span(),
      undefined, "on a Shape 1 reactive cell", resetValueStates);
    expect(errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tracker 2 — Struct-typed Shape 1 with lifecycle on field — multi-level reset
// ---------------------------------------------------------------------------

describe("§6.8.3 Q6-narrow — struct-typed Shape 1 field reset", () => {

  function userStructFieldLifecycle() {
    const decls = [
      makeTypeDecl("User", "struct",
        "{ id: number, email: string, passwordHash: (not to string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);
    return { lifecycle, errors };
  }

  test("Test 13 — reset(@u.passwordHash) after write reverts field state to initial (structured form)", () => {
    // type User:struct = { passwordHash: (not to string) }
    // <u>: User = { passwordHash: not }
    // @u.passwordHash = "hash"           // pre → post
    // @u.passwordHash                    // OK
    // reset(@u.passwordHash)             // structured reset-expr — field reverts to initial "pre"
    // @u.passwordHash                    // FIRES
    const { lifecycle, errors } = userStructFieldLifecycle();
    const body = [
      reactiveNestedAssign("u", ["passwordHash"], "\"hash\""),
      bareExpr("@u.passwordHash"),
      bareExprWithResetNode("reset(@u.passwordHash)",
        memberTarget("u", "passwordHash")),
      bareExpr("@u.passwordHash"),
    ];
    const structInstances = new Map([["u", "User"]]);
    // Seed: passwordHash starts "pre" per object-literal init `{ passwordHash: not }`.
    const initialFieldStates = new Map([
      ["u", new Map([["passwordHash", "pre"]])],
    ]);
    checkLifecycleFieldAccess(body, structInstances, lifecycle, errors, span(), initialFieldStates);

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
    const fire = errors.find(e => e.code === "E-TYPE-001");
    expect(fire.message).toMatch(/passwordHash/);
  });

  test("Test 14 — reset(@u.passwordHash) text-fallback (no structured exprNode) also reverts", () => {
    // Same shape as Test 13 but without the exprNode — the text-based
    // fallback path inside checkLifecycleFieldAccess must catch this too.
    const { lifecycle, errors } = userStructFieldLifecycle();
    const body = [
      reactiveNestedAssign("u", ["passwordHash"], "\"hash\""),
      bareExpr("@u.passwordHash"),
      bareExpr("reset(@u.passwordHash)"),    // NO exprNode — text-only
      bareExpr("@u.passwordHash"),
    ];
    const structInstances = new Map([["u", "User"]]);
    const initialFieldStates = new Map([
      ["u", new Map([["passwordHash", "pre"]])],
    ]);
    checkLifecycleFieldAccess(body, structInstances, lifecycle, errors, span(), initialFieldStates);

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });

  test("Test 15 — reset(@u) whole-compound reset reverts every lifecycle field", () => {
    // type User:struct = { passwordHash: (not to string), verifiedAt: (not to number) }
    // <u>: User = { passwordHash: not, verifiedAt: not }
    // @u.passwordHash = "h"           // pre → post
    // @u.verifiedAt = 1234            // pre → post
    // reset(@u)                       // whole compound — all fields revert to initial "pre"
    // @u.passwordHash                 // FIRES
    // @u.verifiedAt                   // FIRES
    const decls = [
      makeTypeDecl("User", "struct",
        "{ passwordHash: (not to string), verifiedAt: (not to number) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      reactiveNestedAssign("u", ["passwordHash"], "\"h\""),
      reactiveNestedAssign("u", ["verifiedAt"], "1234"),
      bareExprWithResetNode("reset(@u)", identTarget("u")),
      bareExpr("@u.passwordHash"),
      bareExpr("@u.verifiedAt"),
    ];
    const structInstances = new Map([["u", "User"]]);
    const initialFieldStates = new Map([
      ["u", new Map([["passwordHash", "pre"], ["verifiedAt", "pre"]])],
    ]);
    checkLifecycleFieldAccess(body, structInstances, lifecycle, errors, span(), initialFieldStates);

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(2);
  });

  test("Test 16 — reset with initial 'post' (field initialised to B-shape) stays post", () => {
    // type User:struct = { passwordHash: (not to string) }
    // <u>: User = { passwordHash: "initial-hash" }   // initial state = post (non-not value)
    // @u.passwordHash                                  // OK (starts post)
    // reset(@u.passwordHash)                           // resets to initial = post (stays)
    // @u.passwordHash                                  // OK
    const { lifecycle, errors } = userStructFieldLifecycle();
    const body = [
      bareExpr("@u.passwordHash"),
      bareExprWithResetNode("reset(@u.passwordHash)", memberTarget("u", "passwordHash")),
      bareExpr("@u.passwordHash"),
    ];
    const structInstances = new Map([["u", "User"]]);
    // Seed: passwordHash starts "post" per non-not initial value.
    const initialFieldStates = new Map([
      ["u", new Map([["passwordHash", "post"]])],
    ]);
    checkLifecycleFieldAccess(body, structInstances, lifecycle, errors, span(), initialFieldStates);

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("Test 17 — multi-field struct: reset(@u.f1) reverts only f1, leaving f2 alone", () => {
    // type User:struct = { f1: (not to string), f2: (not to string) }
    // <u>: User = { f1: not, f2: not }
    // @u.f1 = "v1"                    // pre → post
    // @u.f2 = "v2"                    // pre → post
    // reset(@u.f1)                    // ONLY f1 reverts; f2 stays post
    // @u.f1                           // FIRES
    // @u.f2                           // OK
    const decls = [
      makeTypeDecl("User", "struct",
        "{ f1: (not to string), f2: (not to string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      reactiveNestedAssign("u", ["f1"], "\"v1\""),
      reactiveNestedAssign("u", ["f2"], "\"v2\""),
      bareExprWithResetNode("reset(@u.f1)", memberTarget("u", "f1")),
      bareExpr("@u.f1"),
      bareExpr("@u.f2"),
    ];
    const structInstances = new Map([["u", "User"]]);
    const initialFieldStates = new Map([
      ["u", new Map([["f1", "pre"], ["f2", "pre"]])],
    ]);
    checkLifecycleFieldAccess(body, structInstances, lifecycle, errors, span(), initialFieldStates);

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
    const fire = errors.find(e => e.code === "E-TYPE-001");
    expect(fire.message).toMatch(/f1/);
  });

  test("Test 18 — reset suppression: reset(@u.f) text doesn't phantom-fire field read", () => {
    // Sanity: the text inside `reset(@u.passwordHash)` contains the substring
    // `u.passwordHash` which FIELD_REF_RE would match. The excludeSpans
    // mechanism in extractAccesses must suppress this.
    const { lifecycle, errors } = userStructFieldLifecycle();
    const body = [
      bareExpr("reset(@u.passwordHash)"),
    ];
    const structInstances = new Map([["u", "User"]]);
    const initialFieldStates = new Map([
      ["u", new Map([["passwordHash", "pre"]])],
    ]);
    checkLifecycleFieldAccess(body, structInstances, lifecycle, errors, span(), initialFieldStates);
    // Walker should fire NO E-TYPE-001 for the substring read — the only
    // valid action is the reset state revert.
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("Test 19 — reset on a non-lifecycle-field is a no-op (no false fire)", () => {
    // type User:struct = { id: number, passwordHash: (not to string) }   <-- id has no lifecycle
    // <u>: User = { id: 1, passwordHash: not }
    // reset(@u.id)                    // id is not lifecycle-annotated — no-op
    // @u.id                           // OK
    const decls = [
      makeTypeDecl("User", "struct",
        "{ id: number, passwordHash: (not to string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExprWithResetNode("reset(@u.id)", memberTarget("u", "id")),
      bareExpr("@u.id"),
    ];
    const structInstances = new Map([["u", "User"]]);
    const initialFieldStates = new Map([
      ["u", new Map([["passwordHash", "pre"]])],
    ]);
    checkLifecycleFieldAccess(body, structInstances, lifecycle, errors, span(), initialFieldStates);

    expect(errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// End-to-end pipeline verification via compileScrml
// ---------------------------------------------------------------------------

describe("§6.8.3 Q6-narrow end-to-end — via compileScrml", () => {
  let TMP;
  function setup() {
    if (!TMP) TMP = mkdtempSync(join(tmpdir(), "q6-narrow-"));
    return TMP;
  }

  function compileSource(name, source) {
    const dir = setup();
    const filePath = join(dir, `${name}.scrml`);
    writeFileSync(filePath, source);
    const result = compileScrml({
      inputFiles: [filePath],
      outputDir: join(dir, `${name}.dist`),
      write: false,
      log: () => {},
    });
    return {
      errors: result.errors || [],
      warnings: result.warnings || [],
    };
  }

  test("Test 20 — Probe 1 verbatim: reset reverts; subsequent read fires (presence)", () => {
    const src = `type User:struct = { id: number, name: string }
<state>: (not to User) = not
\${ @state = { id: 1, name: "Alice" } }
\${ @state.name }
\${ reset(@state) }
\${ @state.name }`;
    const result = compileSource("e2e-presence-reset", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/state/);
  });

  test("Test 21 — composition example from §6.8.3 (default= matching pre-type) reverts", () => {
    // <state default=not>: (not to User) = not
    // ... reset writes not → revert to pre
    const src = `type User:struct = { id: number, name: string }
<state default=not>: (not to User) = not
\${ @state = { id: 1, name: "Alice" } }
\${ reset(@state) }
\${ @state.name }`;
    const result = compileSource("e2e-default-not", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
  });

  test("Test 22 — composition example from §6.8.3 (default= matching post-type) stays post", () => {
    // <state default=existingUser>: (not to User) = not
    // ... reset writes existingUser → post (stays)
    // existingUser is conceptually a user-shaped value; classification heuristic
    // treats any non-`not` as post for presence-progression.
    const src = `type User:struct = { id: number, name: string }
<existingUser>: User = { id: 99, name: "Default" }
<state default=existingUser>: (not to User) = not
\${ @state = { id: 1, name: "Alice" } }
\${ reset(@state) }
\${ @state.name }`;
    const result = compileSource("e2e-default-post-shaped", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    // After Q6-narrow: default=existingUser (non-`not`) → post → no fire.
    // For the binding `existingUser` itself (Shape 1 non-lifecycle), no fire.
    expect(fires.length).toBe(0);
  });

  test("Test 23 — Probe 4 verbatim: multi-level reset on struct field reverts", () => {
    const src = `type User:struct = { id: number, email: string, passwordHash: (not to string) }
<u>: User = { id: 1, email: "a@b.com", passwordHash: not }
\${ @u.passwordHash = "hashed" }
\${ @u.passwordHash }
\${ reset(@u.passwordHash) }
\${ @u.passwordHash }`;
    const result = compileSource("e2e-struct-field-reset", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
    expect(fires[0].message).toMatch(/passwordHash/);
  });

  test("Test 24 — reset(@u) whole-compound reset reverts every lifecycle field", () => {
    const src = `type User:struct = { id: number, passwordHash: (not to string), verifiedAt: (not to number) }
<u>: User = { id: 1, passwordHash: not, verifiedAt: not }
\${ @u.passwordHash = "h" }
\${ @u.verifiedAt = 1234 }
\${ reset(@u) }
\${ @u.passwordHash }
\${ @u.verifiedAt }`;
    const result = compileSource("e2e-whole-compound-reset", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    // Both reverted; both reads fire.
    expect(fires.length).toBeGreaterThanOrEqual(2);
  });

  test("Test 25 — regression: existing B-prereq tracker still fires (no reset present)", () => {
    const src = `type User:struct = { id: number, name: string }
<state>: (not to User) = not
\${ @state.name }`;
    const result = compileSource("e2e-regression-baseline", src);
    const fires = result.errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBeGreaterThanOrEqual(1);
  });
});
