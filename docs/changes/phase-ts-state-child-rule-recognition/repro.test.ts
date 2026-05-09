/**
 * Phase 0 SURVEY — bug-reproduction harness for the
 * "TS state-child rule= recognition" issue (S75).
 *
 * Two cases:
 *   1. Modern `<engine>` form: `<engine for=Phase initial=.Idle> <Idle rule=.Loading>...</> </>`
 *      EXPECTED: no E-ENGINE-005 fires (B15 already validates this form).
 *      ACTUAL (bug): TS-stage `parseMachineRules` doesn't recognize state-child
 *      bodies, returns rules.length === 0, fires E-ENGINE-005.
 *
 *   2. Legacy `<machine>` form: `<machine name=M for=Phase> .Idle => .Done </>`
 *      EXPECTED: no false-positive (parseMachineRules handles this — should pass).
 *
 * This file is a transient diagnostic — survey only. NOT a regression test
 * (those land in Phase 1+ under the canonical samples directory).
 */
import { describe, test, expect } from "bun:test";
import { compileScrml } from "../../../compiler/src/api.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runCompile(source: string, basename = "test"): { errors: any[]; warnings: any[] } {
  const dir = mkdtempSync(join(tmpdir(), "scrml-bug-"));
  const file = join(dir, `${basename}.scrml`);
  writeFileSync(file, source, "utf8");
  try {
    const result = compileScrml({
      inputFiles: [file],
      outputDir: join(dir, "dist"),
      write: false,
      mode: "library",
    } as any);
    return { errors: (result as any).errors ?? [], warnings: (result as any).warnings ?? [] };
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

describe("[SURVEY] TS state-child rule= recognition bug", () => {
  test("modern <engine> with rule= state-children fires false-positive E-ENGINE-005", () => {
    const source = `
type Phase:enum = { Idle, Loading, Done }

<engine for=Phase initial=.Idle>
  <Idle rule=.Loading></>
  <Loading rule=.Done></>
  <Done rule=.Idle></>
</>
`;
    const { errors, warnings } = runCompile(source, "modern");
    console.log("--- modern <engine>: codes ---");
    console.log(errors.map((e: any) => e.code));
    for (const e of errors) console.log(" ", e.code, "—", String(e.message).slice(0, 250));
    expect(true).toBe(true);
  });

  test("legacy <machine> with arrow-rules — baseline (should NOT fire E-ENGINE-005)", () => {
    const source = `
type Phase:enum = { Idle, Loading, Done }

< machine name=PhaseM for=Phase >
.Idle => .Loading
.Loading => .Done
.Done => .Idle
</>
`;
    const { errors } = runCompile(source, "legacy");
    console.log("--- legacy <machine>: codes ---");
    console.log(errors.map((e: any) => e.code));
    for (const e of errors) console.log(" ", e.code, "—", String(e.message).slice(0, 250));
    expect(true).toBe(true);
  });
});
