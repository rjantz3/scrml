/**
 * Bug 5 regression — nested component reference inside another component's
 * lift body survived CE and was emitted as `document.createElement("Name")`
 * (phantom DOM element with no associated body).
 *
 * The bug had two sides:
 *
 *   5a (CE skip) — walkLogicBody's lift-expr branch expanded a user-component
 *        ref via expandComponentNode and wrapped the result back into the
 *        lift node WITHOUT recursing into the expansion's body. When the
 *        expansion contained another user-component ref (e.g. Column's body
 *        contains `lift <TaskCard .../>`), that inner ref survived to
 *        codegen as phantom DOM. Fix: recurse via walkAndExpand into the
 *        expanded children after each lift-expr expansion (three sub-paths
 *        all needed the same fix — markup-form, bare-ref re-parse, full
 *        re-parse).
 *
 *   5b (VP-2 invariant gap) — the post-CE invariant pass checked only NR's
 *        `resolvedKind` field. parseComponentBody re-parses a component
 *        definition's body via BS+TAB only (no NR), so nested refs inside
 *        the parsed body have `isComponent: true` but no `resolvedKind` —
 *        and VP-2 silently skipped them. Fix: add a third clause that
 *        fires when `resolvedKind` is absent AND the tag is uppercase-first
 *        (BS's syntactic component-name predicate). Mirrors VP-2's existing
 *        (b) clause behavior for nodes that bypassed NR.
 *
 * Together: even if a future CE skip pattern surfaces (5a regression),
 * VP-2's 5b backstop will fail the compile loudly with E-COMPONENT-035
 * rather than silently emitting phantom DOM.
 *
 * SPEC §15.14, §34 E-COMPONENT-035.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "bug-5-nested-ce-"));
});

afterAll(() => {
  if (TMP) rmSync(TMP, { recursive: true, force: true });
});

function compileSource(name, source) {
  const filePath = join(TMP, `${name}.scrml`);
  writeFileSync(filePath, source);
  const outDir = join(TMP, `${name}.dist`);
  const result = compileScrml({
    inputFiles: [filePath],
    outputDir: outDir,
    write: true,
    log: () => {},
  });
  const errors = (result.errors || []).filter(
    e => e.severity == null || e.severity === "error",
  );
  let clientJs = "";
  try {
    clientJs = readFileSync(join(outDir, `${name}.client.js`), "utf8");
  } catch {
    // missing — leave empty
  }
  return { errors, clientJs };
}

describe("Bug 5: nested component reference CE expansion", () => {
  test("5a — nested component inside another component's lift body expands cleanly", () => {
    // The S95 canonical repro: Column's body contains `lift <TaskCard .../>`.
    // Pre-fix this emitted `document.createElement("TaskCard")` (phantom DOM)
    // because CE expanded Column but did not descend into Column's body to
    // expand TaskCard. Post-fix the inner TaskCard expands to its <li> body.
    const src = `<program title="bug-5a">
    type Task:struct = {
        id:     number
        title:  string
        column: string
    }

    const columns = ["Inbox", "Doing", "Done"]

    <tasks> = [
        { id: 1, title: "first",  column: "Inbox" },
        { id: 2, title: "second", column: "Inbox" },
    ]

    const TaskCard = <li class="task" props={ task: Task }>
        \${task.title}
    </>

    const Column = <section class="col" props={ name: string }>
        <h2>\${name}</h2>
        <ul>
            \${ for (let task of @tasks.filter(t => t.column == name)) {
                lift <TaskCard task=task/>
            } }
        </ul>
    </>

    <div class="board">
        \${ for (let col of columns) {
            lift <Column name=col/>
        } }
    </div>
</program>`;
    const { errors, clientJs } = compileSource("bug-5a", src);
    expect(errors).toEqual([]);
    // Phantom DOM check — TaskCard must NOT survive to runtime DOM API.
    expect(clientJs).not.toContain('createElement("TaskCard")');
    expect(clientJs).not.toContain('createElement("Column")');
    // Positive check — Column expanded to <section>, TaskCard expanded to <li>.
    expect(clientJs).toContain('createElement("section")');
    expect(clientJs).toContain('createElement("li")');
    // The TaskCard body's `${task.title}` text-node interpolation must survive.
    expect(clientJs).toContain("task.title");
  });

  test("5a — single-level component lift (regression guard, unchanged behavior)", () => {
    // The non-nested case must continue to work. TaskCard referenced directly
    // from <program> body — no enclosing Column.
    const src = `<program title="bug-5a-single">
    type Task:struct = { id: number, title: string }

    <tasks> = [
        { id: 1, title: "first" },
        { id: 2, title: "second" },
    ]

    const TaskCard = <li class="task" props={ task: Task }>
        \${task.title}
    </>

    <ul>
        \${ for (let t of @tasks) {
            lift <TaskCard task=t/>
        } }
    </ul>
</program>`;
    const { errors, clientJs } = compileSource("bug-5a-single", src);
    expect(errors).toEqual([]);
    expect(clientJs).not.toContain('createElement("TaskCard")');
    expect(clientJs).toContain('createElement("li")');
  });

  test("5b — typo'd nested component name fires E-COMPONENT-035 (no silent phantom)", () => {
    // Deliberately misspell TaskCard as TaskKard so CE cannot resolve it.
    // Pre-fix: silent phantom emit. Post-fix: E-COMPONENT-035 (or the
    // matching E-COMPONENT-020 from CE) fires and the compile fails.
    const src = `<program title="bug-5b-typo">
    type Task:struct = { id: number, title: string }

    <tasks> = [{ id: 1, title: "x" }]

    const TaskCard = <li class="task" props={ task: Task }>\${task.title}</>

    const Column = <section class="col">
        <ul>
            \${ for (let t of @tasks) {
                lift <TaskKard task=t/>
            } }
        </ul>
    </>

    <div>
        \${ for (let i of [1]) {
            lift <Column/>
        } }
    </div>
</program>`;
    const { errors } = compileSource("bug-5b-typo", src);
    // Spec authority §15.14.2: compilation SHALL NOT silently emit phantom
    // DOM for an unresolved component reference. The compile MUST fail with
    // E-COMPONENT-035 (post-CE invariant) and/or E-COMPONENT-020 (CE
    // resolution failure). Pre-fix this compile passed with zero errors and
    // emitted `createElement("TaskKard")`; the test guards against that
    // silent-failure regression.
    expect(errors.length).toBeGreaterThan(0);
    const codes = errors.map(e => e.code);
    expect(
      codes.includes("E-COMPONENT-035") || codes.includes("E-COMPONENT-020"),
    ).toBe(true);
    // Codegen may still write outputs alongside the error (api.js writes
    // unconditionally when `write && outputDir`). That's a separate concern
    // tracked outside Bug 5 scope. The load-bearing assertion here is that
    // the compile FAILS LOUDLY — the user sees the error rather than a
    // silent phantom-DOM artifact.
  });

  test("5b — VP-2 fires on residual node missing both resolvedKind and isComponent stamps", async () => {
    // Synthetic test: construct an AST shape where a markup node has
    // resolvedKind=undefined (no NR pass) and tag starts uppercase.
    // VP-2 must fire E-COMPONENT-035 — this is the defense-in-depth
    // backstop for the parseComponentBody re-parse path.
    const { runPostCEInvariantFile } = await import("../../src/validators/post-ce-invariant.ts");
    const fakeAst = {
      filePath: "/fake.scrml",
      nodes: [
        {
          kind: "markup",
          tag: "MyComp",
          // intentionally no resolvedKind, no isComponent — the bare
          // uppercase-tag heuristic alone must trigger the invariant
          children: [],
          span: { file: "/fake.scrml", start: 0, end: 0, line: 1, col: 1 },
        },
      ],
    };
    const errors = runPostCEInvariantFile({ filePath: "/fake.scrml", ast: fakeAst });
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe("E-COMPONENT-035");
    expect(errors[0].message).toContain("MyComp");
  });

  test("5b — lowercase residual tag does NOT trigger VP-2 (HTML element, not component)", async () => {
    // Defense-in-depth check that the uppercase-only heuristic still gates
    // correctly. A lowercase tag with no resolvedKind (e.g. a malformed
    // AST or a test fixture) must NOT be misclassified as a component
    // reference — VP-2 stays silent.
    const { runPostCEInvariantFile } = await import("../../src/validators/post-ce-invariant.ts");
    const fakeAst = {
      filePath: "/fake.scrml",
      nodes: [
        {
          kind: "markup",
          tag: "div",
          children: [],
          span: { file: "/fake.scrml", start: 0, end: 0, line: 1, col: 1 },
        },
      ],
    };
    const errors = runPostCEInvariantFile({ filePath: "/fake.scrml", ast: fakeAst });
    expect(errors.length).toBe(0);
  });
});
