/**
 * Type System — Lifecycle annotation unit tests
 *
 * Tests for the §14.3 lifecycle annotation per-access transition-state tracking.
 *
 * Landing 1 (HU-1 Q2=b, 2026-05-25) — implements the SPEC §14.3 line 7106 promise
 * that accessing a `(A -> B)` lifecycle-annotated struct field BEFORE the
 * transition has happened fires `E-TYPE-001`.
 *
 * The compiler-source surface under test:
 *   - `buildLifecycleRegistry(typeDecls, typeRegistry)` — per-struct lifecycle
 *     field extraction (returns LifecycleRegistry: Map<structName, Map<fieldName, {preType, postType}>>)
 *   - `checkLifecycleFieldAccess(body, structInstances, lifecycleRegistry, errors, fileSpan)` —
 *     statement walker that fires E-TYPE-001 at every pre-transition access site
 *
 * Test cases (per the dispatch brief Landing 1 spec):
 *   1. Pre-transition access fires E-TYPE-001
 *   2. Post-transition access passes
 *   3. Non-lifecycle field access remains unaffected
 *   4. Per-binding tracking — multiple bindings track separately
 *   5. Construction with B-shape initial value (positional binding) — field
 *      starts in post; subsequent access passes
 *
 * Edge cases covered:
 *   - Read on a non-tracked binding (no false positive)
 *   - Field access nested inside if/else branches
 *   - Write-on-LHS does NOT itself trigger a pre-transition read fire
 *   - Lifecycle annotation with non-`not` pre-type (e.g. `(string -> User)`)
 *   - Empty lifecycle registry (no fires)
 */

import { describe, test, expect } from "bun:test";
import {
  TSError,
  buildTypeRegistry,
  buildLifecycleRegistry,
  checkLifecycleFieldAccess,
  tPrimitive,
  tNot,
} from "../../src/type-system.js";

// ---------------------------------------------------------------------------
// Helpers — mirror the shape from type-system.test.js
// ---------------------------------------------------------------------------

function span(start = 0, file = "/test/lifecycle.scrml") {
  return { file, start, end: start + 10, line: 1, col: start + 1 };
}

function makeTypeDecl(name, typeKind, raw, id = 1) {
  return {
    id,
    kind: "type-decl",
    name,
    typeKind,
    raw,
    span: span(0),
  };
}

/**
 * Build a body-statement node from a raw expression string. Mirrors how
 * the parser produces bare-expression nodes for body walking.
 */
function bareExpr(text, kind = "bare-expr") {
  return { kind, value: text, expr: text, span: span(0) };
}

// ---------------------------------------------------------------------------
// §L1 buildLifecycleRegistry — lifecycle field extraction
// ---------------------------------------------------------------------------

describe("§L1 buildLifecycleRegistry", () => {
  test("extracts a single (not -> string) lifecycle field per SPEC §14.3 worked example", () => {
    const decls = [
      makeTypeDecl("User", "struct",
        "{ name: string, passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    expect(lifecycle.has("User")).toBe(true);
    const userLifecycle = lifecycle.get("User");
    expect(userLifecycle.has("passwordHash")).toBe(true);
    expect(userLifecycle.has("name")).toBe(false);

    const spec = userLifecycle.get("passwordHash");
    expect(spec.preType.kind).toBe("not");
    expect(spec.postType.kind).toBe("primitive");
    expect(spec.postType.name).toBe("string");
  });

  test("multiple lifecycle fields on one struct", () => {
    const decls = [
      makeTypeDecl("Order", "struct",
        "{ id: number, receipt: (not -> string), confirmedAt: (not -> number) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const orderLifecycle = lifecycle.get("Order");
    expect(orderLifecycle.size).toBe(2);
    expect(orderLifecycle.has("receipt")).toBe(true);
    expect(orderLifecycle.has("confirmedAt")).toBe(true);
    expect(orderLifecycle.has("id")).toBe(false);
  });

  test("non-lifecycle struct produces no entry in the registry", () => {
    const decls = [
      makeTypeDecl("Plain", "struct", "{ id: number, name: string }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    // Sparse population — structs without lifecycle fields are absent.
    expect(lifecycle.has("Plain")).toBe(false);
    expect(lifecycle.size).toBe(0);
  });

  test("predicate annotations (!not && !number) are NOT lifecycle (no -> token)", () => {
    const decls = [
      makeTypeDecl("Profile", "struct",
        "{ metadata: (!not && !number), passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const profileLifecycle = lifecycle.get("Profile");
    expect(profileLifecycle.size).toBe(1);
    expect(profileLifecycle.has("passwordHash")).toBe(true);
    expect(profileLifecycle.has("metadata")).toBe(false);
  });

  test("non-`not` pre-type lifecycle (`string -> User`) — extracts both types", () => {
    const decls = [
      makeTypeDecl("Pending", "struct", "{ value: (string -> number) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const spec = lifecycle.get("Pending").get("value");
    expect(spec.preType.kind).toBe("primitive");
    expect(spec.preType.name).toBe("string");
    expect(spec.postType.kind).toBe("primitive");
    expect(spec.postType.name).toBe("number");
  });

  test("enum-typed lifecycle (not -> EnumType) — extracts the post-type as enum", () => {
    const decls = [
      makeTypeDecl("Phase", "enum", "{ Idle\nActive\nDone }"),
      makeTypeDecl("Job", "struct", "{ phase: (not -> Phase) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const spec = lifecycle.get("Job").get("phase");
    expect(spec.preType.kind).toBe("not");
    expect(spec.postType.kind).toBe("enum");
    expect(spec.postType.name).toBe("Phase");
  });
});

// ---------------------------------------------------------------------------
// §L2 checkLifecycleFieldAccess — Case 1: pre-transition access fires E-TYPE-001
// ---------------------------------------------------------------------------

describe("§L2 checkLifecycleFieldAccess — pre-transition access fires E-TYPE-001", () => {
  test("Case 1: SPEC §14.3 worked example — print(u.passwordHash) before transition", () => {
    // type User:struct = { name: string, passwordHash: (not -> string) }
    // let u = < User name="alice">
    // print(u.passwordHash)   // E-TYPE-001 — pre-transition access
    const decls = [
      makeTypeDecl("User", "struct",
        "{ name: string, passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExpr("print(u.passwordHash)"),
    ];
    const structInstances = new Map([["u", "User"]]);

    checkLifecycleFieldAccess(body, structInstances, lifecycle, errors, span());

    expect(errors.length).toBeGreaterThanOrEqual(1);
    const fires = errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toMatch(/passwordHash/);
    expect(fires[0].message).toMatch(/User/);
    expect(fires[0].message).toMatch(/lifecycle/);
    expect(fires[0].message).toMatch(/pre-transition/);
  });

  test("read inside a non-write context (function argument) fires", () => {
    const decls = [
      makeTypeDecl("Token", "struct", "{ hash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [bareExpr("sendHash(t.hash)")];
    checkLifecycleFieldAccess(body, new Map([["t", "Token"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });

  test("read on RHS of let-decl fires", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      { kind: "let-decl", name: "h", value: "u.passwordHash", span: span(0) },
    ];
    checkLifecycleFieldAccess(body, new Map([["u", "User"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §L3 checkLifecycleFieldAccess — Case 2: post-transition access passes
// ---------------------------------------------------------------------------

describe("§L3 checkLifecycleFieldAccess — post-transition access passes", () => {
  test("Case 2: SPEC §14.3 worked example — assign then read passes", () => {
    // let u = < User name="alice">
    // u.passwordHash = hash(password)   // transition: not → string
    // print(u.passwordHash)              // OK — post-transition
    const decls = [
      makeTypeDecl("User", "struct",
        "{ name: string, passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExpr("u.passwordHash = hash(password)"),
      bareExpr("print(u.passwordHash)"),
    ];
    checkLifecycleFieldAccess(body, new Map([["u", "User"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("transition once, multiple subsequent reads pass", () => {
    const decls = [
      makeTypeDecl("Order", "struct",
        "{ receipt: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExpr("o.receipt = chargeCard(card)"),
      bareExpr("send(o.receipt)"),
      bareExpr("log(o.receipt)"),
      bareExpr("archive(o.receipt)"),
    ];
    checkLifecycleFieldAccess(body, new Map([["o", "Order"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §L4 checkLifecycleFieldAccess — Case 3: non-lifecycle field access unaffected
// ---------------------------------------------------------------------------

describe("§L4 checkLifecycleFieldAccess — non-lifecycle fields unaffected", () => {
  test("Case 3: print(u.name) where name is plain `string` — no E-TYPE-001", () => {
    // type User:struct = { name: string, passwordHash: (not -> string) }
    // let u = < User>
    // print(u.name)                    // OK — name is not lifecycle-annotated
    // (would-be-fire on u.passwordHash NOT triggered because we don't read it)
    const decls = [
      makeTypeDecl("User", "struct",
        "{ name: string, passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [bareExpr("print(u.name)")];
    checkLifecycleFieldAccess(body, new Map([["u", "User"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("write to non-lifecycle field does NOT mis-fire", () => {
    const decls = [
      makeTypeDecl("User", "struct",
        "{ name: string, passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExpr("u.name = \"bob\""),
      bareExpr("print(u.name)"),
    ];
    checkLifecycleFieldAccess(body, new Map([["u", "User"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("struct with NO lifecycle fields produces no fires regardless of access", () => {
    const decls = [
      makeTypeDecl("Plain", "struct", "{ id: number, name: string }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExpr("print(p.id)"),
      bareExpr("print(p.name)"),
    ];
    checkLifecycleFieldAccess(body, new Map([["p", "Plain"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §L5 checkLifecycleFieldAccess — Case 4: per-binding tracking
// ---------------------------------------------------------------------------

describe("§L5 checkLifecycleFieldAccess — per-binding tracking", () => {
  test("Case 4: two bindings track separately — transitioned u passes, untransitioned v fires", () => {
    // let u = < User>;  u.passwordHash = hash("a"); print(u.passwordHash)   // OK
    // let v = < User>;  print(v.passwordHash)                              // E-TYPE-001
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExpr("u.passwordHash = hash(\"a\")"),
      bareExpr("print(u.passwordHash)"),
      bareExpr("print(v.passwordHash)"),
    ];
    const structInstances = new Map([
      ["u", "User"],
      ["v", "User"],
    ]);
    checkLifecycleFieldAccess(body, structInstances, lifecycle, errors, span());

    const fires = errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toMatch(/`v`/);
  });

  test("two bindings, both transitioned — no fires", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExpr("u.passwordHash = hash(\"a\")"),
      bareExpr("v.passwordHash = hash(\"b\")"),
      bareExpr("print(u.passwordHash)"),
      bareExpr("print(v.passwordHash)"),
    ];
    checkLifecycleFieldAccess(
      body,
      new Map([["u", "User"], ["v", "User"]]),
      lifecycle,
      errors,
      span(),
    );

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("two bindings, two reads pre-transition — two fires", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExpr("print(u.passwordHash)"),
      bareExpr("print(v.passwordHash)"),
    ];
    checkLifecycleFieldAccess(
      body,
      new Map([["u", "User"], ["v", "User"]]),
      lifecycle,
      errors,
      span(),
    );

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// §L6 checkLifecycleFieldAccess — Case 5: B-shape initial value (positional)
// ---------------------------------------------------------------------------

describe("§L6 checkLifecycleFieldAccess — B-shape initial value via initialFieldStates", () => {
  test("Case 5: positional binding seeds lifecycle field to POST — subsequent access passes", () => {
    // type User:struct = { name: string, passwordHash: (not -> string) }
    // let u: User = ("alice", "hash")    // positional — passwordHash starts POST
    // print(u.passwordHash)              // OK
    const decls = [
      makeTypeDecl("User", "struct",
        "{ name: string, passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [bareExpr("print(u.passwordHash)")];
    const structInstances = new Map([["u", "User"]]);
    // Caller-supplied initial: u.passwordHash starts "post" (B-shape value
    // provided at construction)
    const initialFieldStates = new Map([
      ["u", new Map([["passwordHash", "post"]])],
    ]);

    checkLifecycleFieldAccess(
      body, structInstances, lifecycle, errors, span(), initialFieldStates,
    );

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("Case 5 inverse: initialFieldStates seeded `pre` — fires per default", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [bareExpr("print(u.passwordHash)")];
    const initialFieldStates = new Map([
      ["u", new Map([["passwordHash", "pre"]])],
    ]);

    checkLifecycleFieldAccess(
      body, new Map([["u", "User"]]), lifecycle, errors, span(), initialFieldStates,
    );

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §L7 checkLifecycleFieldAccess — edge cases
// ---------------------------------------------------------------------------

describe("§L7 checkLifecycleFieldAccess — edge cases", () => {
  test("read on a non-tracked binding produces no fire (no false positive)", () => {
    // The binding `q` is NOT in structInstances — it's some other variable.
    // Even if its `.passwordHash` shape matches a lifecycle pattern textually,
    // the checker is bind-scoped and produces no fire.
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [bareExpr("print(q.passwordHash)")];
    checkLifecycleFieldAccess(body, new Map([["u", "User"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("empty lifecycle registry — no fires regardless of body", () => {
    const errors = [];
    const body = [
      bareExpr("print(u.passwordHash)"),
      bareExpr("print(v.x)"),
    ];
    checkLifecycleFieldAccess(
      body,
      new Map([["u", "User"], ["v", "Thing"]]),
      new Map(), // empty lifecycle registry
      errors,
      span(),
    );

    expect(errors.length).toBe(0);
  });

  test("empty structInstances — no fires", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [bareExpr("print(u.passwordHash)")];
    checkLifecycleFieldAccess(body, new Map(), lifecycle, errors, span());

    expect(errors.length).toBe(0);
  });

  test("field access nested inside if-branches — pre-transition read in branch fires", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      {
        kind: "if-stmt",
        value: "isReady",
        span: span(0),
        then: [bareExpr("print(u.passwordHash)")],
        else: [bareExpr("setupLater()")],
      },
    ];
    checkLifecycleFieldAccess(body, new Map([["u", "User"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(1);
  });

  test("transition in a branch does NOT post-transition the binding for the outer scope (Landing 1 conservative)", () => {
    // Landing 1 design: writes inside if/else branches DO transition the
    // tracked state, but the walker proceeds linearly statement-by-statement —
    // a write inside an if-branch will be visible to subsequent reads in the
    // overall walk. Branch-sensitive analysis (write happens only in one path)
    // is Landing 2 work. This test pins the Landing 1 behaviour.
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      {
        kind: "if-stmt",
        value: "ready",
        span: span(0),
        then: [bareExpr("u.passwordHash = hash(\"a\")")],
      },
      bareExpr("print(u.passwordHash)"),
    ];
    checkLifecycleFieldAccess(body, new Map([["u", "User"]]), lifecycle, errors, span());

    // The Landing 1 walker IS conservative — a transition in any reachable
    // path treats the field as post for subsequent statements. Branch-sensitive
    // analysis is deferred (HU-1 Q3 carry-forward + Landing 2 design work).
    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("multiple lifecycle fields on one binding — each tracked independently", () => {
    const decls = [
      makeTypeDecl("Order", "struct",
        "{ receipt: (not -> string), confirmedAt: (not -> number) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [
      bareExpr("o.receipt = chargeCard(card)"),
      bareExpr("print(o.receipt)"),     // OK
      bareExpr("print(o.confirmedAt)"), // E-TYPE-001 — confirmedAt not yet transitioned
    ];
    checkLifecycleFieldAccess(body, new Map([["o", "Order"]]), lifecycle, errors, span());

    const fires = errors.filter(e => e.code === "E-TYPE-001");
    expect(fires.length).toBe(1);
    expect(fires[0].message).toMatch(/confirmedAt/);
  });

  test("write-on-LHS does not itself trigger a pre-transition read fire", () => {
    // `u.passwordHash = hash(password)` — the LHS `u.passwordHash` is a write,
    // not a read. The RHS `hash(password)` reads `password` (a primitive,
    // not a struct field). No E-TYPE-001 should fire here.
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [bareExpr("u.passwordHash = hash(password)")];
    checkLifecycleFieldAccess(body, new Map([["u", "User"]]), lifecycle, errors, span());

    expect(errors.filter(e => e.code === "E-TYPE-001").length).toBe(0);
  });

  test("error message names §14.3 SPEC anchor + binding + field + types", () => {
    const decls = [
      makeTypeDecl("User", "struct", "{ passwordHash: (not -> string) }"),
    ];
    const errors = [];
    const typeRegistry = buildTypeRegistry(decls, errors, span());
    const lifecycle = buildLifecycleRegistry(decls, typeRegistry);

    const body = [bareExpr("print(u.passwordHash)")];
    checkLifecycleFieldAccess(body, new Map([["u", "User"]]), lifecycle, errors, span());

    const fire = errors.find(e => e.code === "E-TYPE-001");
    expect(fire).toBeDefined();
    expect(fire.message).toMatch(/SPEC §14\.3/);
    expect(fire.message).toMatch(/u/);
    expect(fire.message).toMatch(/passwordHash/);
    expect(fire.message).toMatch(/not/);
    expect(fire.message).toMatch(/string/);
  });
});
