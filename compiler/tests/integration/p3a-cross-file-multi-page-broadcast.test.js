/**
 * P3.A — Multi-page broadcast integration tests.
 *
 * Per P3 deep-dive §6.3 (case 3 — multi-page broadcast verification).
 *
 * Verifies that when multiple consumer pages import the same exported
 * channel, every consumer subscribes to the same WS topic by virtue of
 * shared `name=` identity. This is the wire-layer-by-name property: the
 * channel CG emits identical `_scrml_ws/<name>` routes for each consumer,
 * and channel-body cell mirrors stay in sync via the shared topic.
 *
 * Fixture syntax (S69 / M19 / B19): channel bodies use V5-strict
 * structural decls (`<name> = init`), NOT the retired `@shared` modifier.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p3a-multi-page-"));
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

// v0.3 Wave 1 (2026-05-12) — `.skip`'d. These tests exercise the
// pre-v0.3 "channel-only module file" pattern (a `.scrml` module file
// containing `export <channel>` declarations at file top level with no
// `<program>`). Under v0.3, channels live INSIDE `<program>` and a
// file-top channel fires `E-CHANNEL-OUTSIDE-PROGRAM`. The v0.3
// cross-file route-emission contract (A8 — exporter is route-handler
// SoT, consumers emit client stub only; route-dedup across consumer
// pages) is in v0.3 scope but the implementation is DEFERRED to a later
// wave (compiler-source codegen change). The "module-file channel
// dispensation" question — whether a channel-only file is permitted, or
// whether every channel must live inside a `<program>` in the entry file
// — is also deferred. When the implementation lands, these tests will
// be rewritten against the canonical v0.3 cross-file shape (which may
// require entry-file `<program>` channel declarations and
// re-exports rather than per-module channel declarations).
describe.skip("P3.A multi-page broadcast — case 3 of dive §6.3 (deferred to v0.3 A8 wave)", () => {
  test("two consumer pages share the same wire identity by `name=`", () => {
    // V5-strict body (M19 / S69 B19): channel-body cells use `<name> = init`,
    // NOT `@shared`. The `@shared` modifier was removed in v0.next; auto-sync
    // comes from being declared inside a channel body. Per SPEC §38.4 line
    // 15468 + B19, `@shared` fires E-CHANNEL-SHARED-MODIFIER.
    fx("a/channels.scrml", `export <channel name="chat" topic="lobby">
  ${"$"}{
    <messages> = []
    server function postMessage(author, body) {
      // V5-strict: function body neutral. Test probes WS routing only.
      return author
    }
  }
</>
`);

    // Page A: publishes new messages
    const pageA = fx("a/page-a.scrml", `<program>
${"$"}{ import { chat } from './channels.scrml' }
<chat/>
<button onclick=postMessage("user-a", "hello from A")>Send from A</button>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m.author}: ${"$"}{m.body}/ } }</>
</program>
`);

    // Page B: also imports + uses the same channel
    const pageB = fx("a/page-b.scrml", `<program>
${"$"}{ import { chat } from './channels.scrml' }
<chat/>
<button onclick=postMessage("user-b", "hello from B")>Send from B</button>
<ul>${"$"}{ for (let m of @messages) { lift <li>${"$"}{m.author}: ${"$"}{m.body}/ } }</>
</program>
`);

    const result = compileScrml({
      inputFiles: [pageA, pageB],
      outputDir: join(TMP, "a-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);

    // Both pages must emit the same WS route name `chat`.
    const aOut = result.outputs?.get(pageA);
    const bOut = result.outputs?.get(pageB);
    expect(aOut?.clientJs).toMatch(/chat/);
    expect(bOut?.clientJs).toMatch(/chat/);
    // Both pages register the WS route on the server side.
    expect(aOut?.serverJs).toMatch(/_scrml_ws[\w/-]*chat/);
    expect(bOut?.serverJs).toMatch(/_scrml_ws[\w/-]*chat/);
  });

  test("3 consumer pages — all share the channel; PURE-CHANNEL-FILE doesn't emit duplicate routes", () => {
    // V5-strict body (M19 / S69 B19): use `<count>: number = 0` instead of
    // the retired `@shared count:number = 0`.
    fx("b/channels.scrml", `export <channel name="updates">
  ${"$"}{
    <count>: number = 0
  }
</>
`);
    const pageA = fx("b/page-a.scrml", `<program>
${"$"}{ import { updates } from './channels.scrml' }
<updates/>
<p>A count: ${"$"}{@count}</p>
</program>
`);
    const pageB = fx("b/page-b.scrml", `<program>
${"$"}{ import { updates } from './channels.scrml' }
<updates/>
<p>B count: ${"$"}{@count}</p>
</program>
`);
    const pageC = fx("b/page-c.scrml", `<program>
${"$"}{ import { updates } from './channels.scrml' }
<updates/>
<p>C count: ${"$"}{@count}</p>
</program>
`);

    const result = compileScrml({
      inputFiles: [pageA, pageB, pageC],
      outputDir: join(TMP, "b-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);

    // All 3 consumers emit the route.
    const aOut = result.outputs?.get(pageA);
    const bOut = result.outputs?.get(pageB);
    const cOut = result.outputs?.get(pageC);
    expect(aOut?.serverJs).toMatch(/_scrml_ws[\w/-]*updates/);
    expect(bOut?.serverJs).toMatch(/_scrml_ws[\w/-]*updates/);
    expect(cOut?.serverJs).toMatch(/_scrml_ws[\w/-]*updates/);

    // PURE-CHANNEL-FILE: the source channels.scrml does NOT emit a route.
    const channelsOut = result.outputs?.get(join(TMP, "b/channels.scrml"));
    if (channelsOut) {
      expect(channelsOut.serverJs ?? "").not.toMatch(/_scrml_ws[\w/-]*updates/);
    }
  });

  test("eliminates ~180 LOC duplication: per-page channels coalesce to one declaration", () => {
    // This test validates the eliminated-duplication promise from
    // FRICTION.md §F-CHANNEL-003: 5 channels × ~3 redeclarations = ~180 LOC.
    // V5-strict body (M19 / S69 B19): three channels each declaring a
    // single typed cell. Replaces the retired `@shared <name>:T = init` form.
    fx("c/channels.scrml", `export <channel name="ch1">
  ${"$"}{ <a>: number = 0 }
</>

export <channel name="ch2">
  ${"$"}{ <b>: number = 0 }
</>

export <channel name="ch3">
  ${"$"}{ <c>: number = 0 }
</>
`);
    // 3 pages, each importing all 3 channels.
    const pages = ["c/p1.scrml", "c/p2.scrml", "c/p3.scrml"].map(rel => fx(rel, `<program>
${"$"}{ import { ch1, ch2, ch3 } from './channels.scrml' }
<ch1/>
<ch2/>
<ch3/>
</program>
`));

    const result = compileScrml({
      inputFiles: pages,
      outputDir: join(TMP, "c-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);

    // Each page emits all 3 channels.
    for (const page of pages) {
      const out = result.outputs?.get(page);
      expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*ch1/);
      expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*ch2/);
      expect(out?.serverJs).toMatch(/_scrml_ws[\w/-]*ch3/);
    }
  });
});
