/**
 * T1 — Cross-file <Channel/> mount E-RI-002 skip-path
 *
 * Bug (2026-05-11): channels declared in one file (PURE-CHANNEL-FILE, §38.12.6)
 * and mounted cross-file via `<ChannelName/>` produced false E-RI-002 fires
 * for the channel's own `publish*` server function. The exporter file marks
 * its `<channel>` node with `_p3aIsExport: true` (to suppress duplicate WS
 * route emission), but the previous `collectChannelFunctionMap` /
 * `collectChannelCellMap` implementations also skipped on that flag — so the
 * RI E-RI-002 skip-path (route-inference.ts:2327) did not recognize the
 * exporter's server function as channel-owned and fired E-RI-002 on its
 * write to the channel cell. Repro: every channels/*.scrml file in the
 * trucking-dispatch example (4 channels: customer-events, dispatch-board,
 * driver-events, load-events).
 *
 * Fix: `collectChannelFunctionMap` and `collectChannelCellMap` no longer
 * skip channels marked `_p3aIsExport: true`. Channel-function and channel-
 * cell ownership are lexical (per §38.6 / §38.4) and do not depend on
 * whether the channel is the WS-emit site. The WS-emit decision is owned
 * by `collectChannelNodes` and is unchanged.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { compileScrml } from "../../src/api.js";

let TMP;

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), "cross-file-channel-ri002-"));
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

function errorsByCode(result, code) {
  return (result.errors ?? []).filter((e) => e.code === code);
}

describe("T1 cross-file channel mount — E-RI-002 skip-path", () => {
  test("PURE-CHANNEL-FILE (exporter) writing channel cell does NOT fire E-RI-002", () => {
    // Exporter file: channel + publish* server function that writes the
    // channel cell. Per SPEC §38.4, this write lowers to a `broadcast(...)`
    // wire frame; RI must suppress E-RI-002 here.
    const channelFile = fx("c1/channels/events.scrml", `// PURE-CHANNEL-FILE — §38.12.6
export <channel name="events">
\${
    <feed> = []

    server function publishEvent(kind, payload) {
        @feed = [...@feed, { kind, payload, at: new Date().toISOString() }]
    }
}
</>
`);
    const consumer = fx("c1/page.scrml", `<program>
\${ import { "events" as events } from './channels/events.scrml' }
<events/>
<button onclick=publishEvent("ping", { x: 1 })>ping</button>
<ul>\${ for (let e of @feed) { lift <li>\${e.kind}</li> } }</ul>
</program>
`);
    const result = compileScrml({
      inputFiles: [consumer],
      outputDir: join(TMP, "c1-out"),
      write: false,
      log: () => {},
    });
    // The skip-path must fire for BOTH the exporter file (where the
    // function lexically lives) AND the consumer file (where CHX inlined
    // a copy). No E-RI-002 should fire anywhere for `publishEvent`.
    const riErrs = errorsByCode(result, "E-RI-002");
    if (riErrs.length > 0) {
      // Surface details on failure to aid debugging.
      const details = riErrs.map((e) => `${e.message} @ ${e.filePath ?? e.file ?? "?"}`).join("\n");
      throw new Error(`Expected 0 E-RI-002 fires, got ${riErrs.length}:\n${details}`);
    }
    expect(riErrs.length).toBe(0);
  });

  test("exporter-only compilation: PURE-CHANNEL-FILE compiles standalone with no E-RI-002", () => {
    // Compiling the channel-decl file by itself (e.g. as part of an
    // auto-gather closure or a focused build) must NOT fire E-RI-002.
    // This is the smallest repro of the bug.
    const channelFile = fx("c2/channels/notifs.scrml", `export <channel name="notifs">
\${
    <inbox> = []

    server function publishNotif(targetId, body) {
        @inbox = [...@inbox, { targetId, body }]
    }
}
</>
`);
    const result = compileScrml({
      inputFiles: [channelFile],
      outputDir: join(TMP, "c2-out"),
      write: false,
      log: () => {},
    });
    const riErrs = errorsByCode(result, "E-RI-002");
    expect(riErrs.length).toBe(0);
  });

  test("exporter still emits the broadcast helper (collectChannelFunctionMap recognizes the fn)", () => {
    // Side-check: the fix ensures emit-server.ts also recognizes the
    // exporter's channel-owned function and injects `broadcast(...)`. This
    // is the codegen half of the same map-lookup that powers the RI skip.
    const channelFile = fx("c3/channels/feed.scrml", `export <channel name="feed" topic="news">
\${
    <items> = []

    server function publishItem(item) {
        @items = [...@items, item]
    }
}
</>
`);
    const result = compileScrml({
      inputFiles: [channelFile],
      outputDir: join(TMP, "c3-out"),
      write: false,
      log: () => {},
    });
    expect(errorsByCode(result, "E-RI-002").length).toBe(0);
    const out = result.outputs?.get(channelFile);
    const serverJs = out?.serverJs ?? "";
    // Broadcast helper must be injected into publishItem's handler body.
    expect(serverJs).toContain("const broadcast =");
  });
});
