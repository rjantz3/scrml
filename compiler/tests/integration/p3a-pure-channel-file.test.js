/**
 * P3.A — PURE-CHANNEL-FILE pattern tests.
 *
 * Per P3 deep-dive §6.2 step 9 + OQ-P3-5 = (a) (recognized automatically
 * by analogy to PURE-TYPE-FILE per SPEC §21.5).
 *
 * A `.scrml` file that contains only `export <channel>` declarations and
 * no top-level markup other than logic blocks is a PURE-CHANNEL-FILE.
 * The compiler emits no per-channel artifacts for such a file —
 * codegen happens at the inlined-consumer site.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "p3a-pure-channel-"));
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

// v0.3 Wave 1 (2026-05-12) — `.skip`'d. PURE-CHANNEL-FILE is a file
// with only `export <channel>` declarations and no `<program>`. Under
// v0.3, channels must live INSIDE `<program>` and the new walker fires
// `E-CHANNEL-OUTSIDE-PROGRAM` on these file-top channel declarations.
// The PURE-CHANNEL-FILE pattern's v0.3 disposition (e.g. a dispensation
// for `export <channel>` files; or its retirement in favor of in-program
// channel-with-export) is deferred to the v0.3 A8 wave that lands the
// cross-file route-emission contract.
describe.skip("P3.A — PURE-CHANNEL-FILE pattern (deferred to v0.3 A8 wave)", () => {
  test("a file with only `export <channel>` decls + a consumer: source emits no WS route", () => {
    // V5-strict body (M19 / S69 B19): channel-body cells use `<name> = init`,
    // not `@shared <name> = init`. Auto-sync comes from the channel-body
    // placement; no marker required.
    const channels = fx("a/channels.scrml", `export <channel name="ticker">
  ${"$"}{ <count>: number = 0 }
</>

export <channel name="updates">
  ${"$"}{ <messages> = [] }
</>
`);
    const consumer = fx("a/consumer.scrml", `<program>
${"$"}{ import { ticker, updates } from './channels.scrml' }
<ticker/>
<updates/>
</program>
`);

    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: join(TMP, "a-out"),
      write: false,
      log: () => {},
    });
    expect(result.errors ?? []).toEqual([]);

    // The consumer emits BOTH channels (CHX inlined them).
    const consumerOut = result.outputs?.get(consumer);
    expect(consumerOut?.serverJs).toMatch(/_scrml_ws[\w/-]*ticker/);
    expect(consumerOut?.serverJs).toMatch(/_scrml_ws[\w/-]*updates/);

    // The source channels.scrml emits NEITHER channel — PURE-CHANNEL-FILE
    // (its <channel> nodes are marked _p3aIsExport, which collectChannelNodes
    //  filters out at codegen).
    const channelsOut = result.outputs?.get(channels);
    if (channelsOut) {
      expect(channelsOut.serverJs ?? "").not.toMatch(/_scrml_ws[\w/-]*ticker/);
      expect(channelsOut.serverJs ?? "").not.toMatch(/_scrml_ws[\w/-]*updates/);
    }
  });

  test("PURE-CHANNEL-FILE without a consumer — channel exports register but emit no WS route", () => {
    // This case: the file has `export <channel>` decls but no other file
    // imports them. The channel is declared but never instantiated. The
    // compiler should not crash and should not emit a WS route for the
    // unused channel.
    // V5-strict body (M19 / S69 B19).
    const channels = fx("b/orphan.scrml", `export <channel name="unused">
  ${"$"}{ <count>: number = 0 }
</>
`);
    const result = compileScrml({
      inputFiles: [channels],
      outputDir: join(TMP, "b-out"),
      write: false,
      log: () => {},
    });
    // No hard errors (the W-PROGRAM-001 warning is allowed).
    const hardErrors = (result.errors ?? []).filter(e => !(e.code || "").startsWith("W-"));
    expect(hardErrors).toEqual([]);

    // No WS route emitted for the orphan channel (it has no consumer).
    const out = result.outputs?.get(channels);
    if (out) {
      expect(out.serverJs ?? "").not.toMatch(/_scrml_ws[\w/-]*unused/);
    }
  });
});
