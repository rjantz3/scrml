/* SPDX-License-Identifier: MIT
 * BUG-2 — Sequential bare-variant writes to the same engine cell.
 *
 * Reproducer (PA S101): the SECOND bare-variant assignment to a reactive
 * engine cell in a function body spuriously fired E-VARIANT-AMBIGUOUS.
 * First write resolved cleanly; subsequent writes lost the type context.
 *
 * §14.10 normative position #2 (`@cell = .V where @cell: T`) fixes the
 * variant context from the cell's enum/union type. The fix-locus is
 * `inferReactiveSiteBareVariants` in compiler/src/type-system.ts (Bug 7 /
 * M9 walker, ~6702). The walker correctly resolves the bare variant on a
 * single assign-expr root, but did NOT descend into `block` statement
 * children, so inside a function body only the FIRST top-level statement
 * was visited at all — and only AssignExpr at the bare-expr ROOT. The
 * mechanism behind the matrix in the brief is different though: the
 * function-body walker invoked `inferReactiveSiteBareVariants` per
 * bare-expr, but the bare-expr's value-subtree (e.g. `.Success(42)`)
 * was already wrapped in some shape that the helper did not recognize
 * as a Position-2 site. See test-driven investigation below.
 *
 * Coverage:
 *   2.1 — two sequential bare-variant writes (unit + payload mix)
 *   2.2 — three sequential bare-variant writes
 *   2.3 — assignment in if/else branches (control-flow)
 *   2.4 — qualified `Phase.Success(42)` paired with bare `.Loading`
 *   2.5 — `.advance(.X)` method form alongside direct assignment
 */

import { describe, test, expect } from "bun:test";
import { runTS } from "../../src/type-system.ts";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function compile(source, filePath = "/test/app.scrml") {
  const bs = splitBlocks(filePath, source);
  const { ast } = buildAST(bs);
  const fileAST = {
    filePath,
    source,
    nodes: ast.nodes ?? [],
    machineDecls: ast.machineDecls ?? [],
    typeDecls: ast.typeDecls ?? [],
    components: ast.components ?? [],
    imports: ast.imports ?? [],
    exports: ast.exports ?? [],
    ast,
  };
  const result = runTS({
    files: [fileAST],
    protectAnalysis: { views: new Map() },
    routeMap: { functions: new Map() },
  });
  return { ast, errors: result.errors };
}

function errsByCode(errors, code) {
  return (errors ?? []).filter((e) => e?.code === code);
}

// ===========================================================================
// §BUG-2.1 — Two sequential bare-variant writes (the canonical reproducer)
// ===========================================================================

describe("§BUG-2.1 — two sequential bare-variant writes to same engine cell", () => {
  test("§BUG-2.1.1 unit then payload — no spurious E-VARIANT-AMBIGUOUS", () => {
    const src = `<program db="items.db">

type Phase:enum = { Idle, Loading, Success(count: int) }

function load() {
    @phase = .Loading
    @phase = .Success(42)
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading></>
    <Loading rule=.Success></>
    <Success count></>
</>

</>`;
    const { errors } = compile(src);
    const ambiguous = errsByCode(errors, "E-VARIANT-AMBIGUOUS");
    expect(ambiguous.length).toBe(0);
  });

  test("§BUG-2.1.2 payload then unit — symmetric", () => {
    const src = `<program db="items.db">

type Phase:enum = { Idle, Loading, Success(count: int) }

function load() {
    @phase = .Success(42)
    @phase = .Loading
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading></>
    <Loading rule=.Success></>
    <Success count></>
</>

</>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });

  test("§BUG-2.1.3 unit then unit (two different variants)", () => {
    const src = `<program db="items.db">

type Phase:enum = { Idle, Loading, Done }

function load() {
    @phase = .Loading
    @phase = .Done
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading></>
    <Loading rule=.Done></>
    <Done></>
</>

</>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §BUG-2.2 — Three+ sequential bare-variant writes
// ===========================================================================

describe("§BUG-2.2 — three+ sequential bare-variant writes", () => {
  test("§BUG-2.2.1 three sequential writes — no spurious diagnostic", () => {
    const src = `<program db="items.db">

type Phase:enum = { Idle, Loading, Success(count: int), Done }

function run() {
    @phase = .Loading
    @phase = .Success(7)
    @phase = .Done
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading></>
    <Loading rule=.Success></>
    <Success count rule=.Done></>
    <Done></>
</>

</>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });

  test("§BUG-2.2.2 four sequential writes — all clean", () => {
    const src = `<program db="items.db">

type Phase:enum = { A, B, C, D }

function chain() {
    @phase = .A
    @phase = .B
    @phase = .C
    @phase = .D
}

<engine for=Phase initial=.A>
    <A rule=.B></>
    <B rule=.C></>
    <C rule=.D></>
    <D></>
</>

</>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §BUG-2.3 — Assignment in control-flow branches
// ===========================================================================

describe("§BUG-2.3 — bare-variant writes in control-flow branches", () => {
  test("§BUG-2.3.1 if/else branches both assign — no spurious diagnostic", () => {
    const src = `<program db="items.db">

type Phase:enum = { Idle, Loading, Success(count: int) }

function check(b: bool) {
    if (b) {
        @phase = .Loading
    } else {
        @phase = .Success(0)
    }
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading></>
    <Loading rule=.Success></>
    <Success count></>
</>

</>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §BUG-2.4 — Qualified Phase.Variant paired with bare-variant write
// ===========================================================================

describe("§BUG-2.4 — qualified + bare combination in sequence", () => {
  test("§BUG-2.4.1 bare then qualified then bare — all clean", () => {
    const src = `<program db="items.db">

type Phase:enum = { Idle, Loading, Success(count: int) }

function run() {
    @phase = .Loading
    @phase = Phase.Success(11)
    @phase = .Idle
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading></>
    <Loading rule=.Success></>
    <Success count rule=.Idle></>
</>

</>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});

// ===========================================================================
// §BUG-2.5 — `.advance(.X)` method form alongside direct assignment
// ===========================================================================

describe("§BUG-2.5 — engine-transition method form alongside direct assignment", () => {
  test("§BUG-2.5.1 .advance(.X) then @cell = .Y — both bare-variants resolve", () => {
    const src = `<program db="items.db">

type Phase:enum = { Idle, Loading, Success(count: int) }

function step() {
    @phase.advance(.Loading)
    @phase = .Success(3)
}

<engine for=Phase initial=.Idle>
    <Idle rule=.Loading></>
    <Loading rule=.Success></>
    <Success count></>
</>

</>`;
    const { errors } = compile(src);
    expect(errsByCode(errors, "E-VARIANT-AMBIGUOUS").length).toBe(0);
  });
});
