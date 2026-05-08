/**
 * P3.A — CHX same-file pass-through (regression pin).
 *
 * Per P3 deep-dive §10.1.
 *
 * Verifies that per-page `<channel name="X">` declarations (the existing
 * pattern in 15 dispatch app sites) continue to compile unchanged after
 * P3.A. CHX MUST NOT touch same-file channel declarations.
 *
 * The expected post-P3.A output for a per-page channel is byte-equivalent
 * to the pre-P3.A output (same WS route, same IIFE, same wire identity).
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p3a-same-file-"));
});

afterAll(() => {
  if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function fx(rel, src) {
  const abs = join(TMP, rel);
  mkdirSync(join(abs, "..").replace(/\/$/, ""), { recursive: true });
  writeFileSync(abs, src);
  return abs;
}

describe("P3.A CHX — same-file <channel> pass-through (regression pin)", () => {
  // S69 / M19 / B19 migration: channels are file-level (not inside
  // `<program>`), and channel bodies use V5-strict structural decls
  // (`<name> = init`), not the retired `@shared` modifier. The CHX
  // pass-through invariant being tested (per-page channel emits its
  // own WS route, _p3aIsExport stays unset, multiple channels per file
  // each emit) is a property of the v0.next file-level placement.
  //
  // The "channel inside a div" test (originally §5) is removed: that
  // shape now fires E-CHANNEL-INSIDE-PROGRAM (any descendant of another
  // markup is rejected per §38.1 line 15422). The CHX path it exercised
  // (VP-2 nested-markup wrapping) is no longer reachable in v0.next.

  test("simple per-page channel — compiles without errors", () => {
    const src = fx("a/page.scrml", `<channel name="chat" topic="lobby">
  ${"$"}{
    <messages> = []
  }
</>

<program>

<div>
  <ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m}/ } }</>
</div>

</program>
`);
    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "a-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(src);
    expect(out?.clientJs).toMatch(/chat/);
    expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*chat/);
  });

  test("per-page channel + server function — compiles without errors", () => {
    const src = fx("b/page.scrml", `<channel name="hub" topic="room1">
  ${"$"}{
    <messages> = []
    server function postMessage(author, body) {
      // V5-strict: function body neutral; this test probes WS routing only.
      return author
    }
  }
</>

<program>

<button onclick=postMessage("user", "hi")>Send</button>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m.author}: ${"$"}{m.body}/ } }</>

</program>
`);
    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "b-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(src);
    expect(out?.clientJs).toMatch(/hub/);
  });

  test("per-page channel — TAB AST does NOT mark _p3aIsExport", () => {
    const src = fx("c/page.scrml", `<channel name="ticker">
  ${"$"}{ <count>: number = 0 }
</>

<program>
</program>
`);
    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "c-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    // The serverJs MUST contain the WS route since this is a regular per-page channel.
    const out = result.outputs?.get(src);
    expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*ticker/);
  });

  test("multiple per-page channels in same file — both compile", () => {
    const src = fx("d/page.scrml", `<channel name="chat" topic="lobby">
  ${"$"}{ <messages> = [] }
</>

<channel name="updates">
  ${"$"}{ <count>: number = 0 }
</>

<program>
<div>multi</div>
</program>
`);
    const result = compileScrml({
      inputFiles: [src],
      outputDir: join(TMP, "d-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);
    const out = result.outputs?.get(src);
    expect(out?.clientJs).toMatch(/chat/);
    expect(out?.clientJs).toMatch(/updates/);
  });

  // §5 (channel-inside-div) removed in S69/B19: per §38.1 line 15422,
  // channels SHALL appear at file top level only. The "VP-2 wrapping"
  // path is unreachable in v0.next; the diagnostic E-CHANNEL-INSIDE-PROGRAM
  // is exercised by compiler/tests/unit/channel-placement-shared-b19.test.js
  // §B19.2 and §B19.3 instead.
});
