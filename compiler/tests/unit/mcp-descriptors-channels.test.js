/**
 * mcp-descriptors-channels.test.js — MCP-V0.A extractor unit test (channels.json)
 *
 * Sub-unit A test follow-on. Compiles a `<channel>` with auto-synced V5-strict
 * cells via the REAL per-route emit path, reads `channels.json` from disk, and
 * asserts the descriptor shape per SCOPING §3 Sub-unit A + §38.4. In particular
 * it pins the S126 fix where `collectChannelAutoSyncedCells` now descends the
 * channel body's `${ }` logic block (cells live in `logic.body`, not
 * `children`) so `autoSyncedCells` is no longer permanently `[]`.
 *
 * Channel fixture authoring note: under v0.3 a `<channel>` must live INSIDE
 * `<program>` (top-level placement → E-CHANNEL-OUTSIDE-PROGRAM). The synced
 * cells are V5-strict state-decls inside a `${ ... }` block in the channel body.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  makeSidecarTmpRoot,
  cleanupSidecarTmpRoot,
  compileAndReadSidecars,
} from "../helpers/mcp-sidecar-compile.js";

let TMP;
beforeAll(() => { TMP = makeSidecarTmpRoot("channels"); });
afterAll(() => { cleanupSidecarTmpRoot(TMP); });

const compile = (src) => compileAndReadSidecars(src, TMP);

// ---------------------------------------------------------------------------
// Fixture — one in-program channel `chat` with two auto-synced cells.
// ---------------------------------------------------------------------------

const CHANNEL_FIXTURE = `<program title="Chat">

<channel name="chat" topic="lobby">
  \${
    <messages> = []
    <count> = 0
    function postMessage(author: string, body: string) {
      @messages = [...@messages, { author, body }]
    }
  }
</>

<div>placeholder</div>

</program>
`;

describe("MCP-V0.A channels.json extractor", () => {
  test("compiles clean + emits channels.json as a JSON array with the channel", () => {
    const { fatal, channels } = compile(CHANNEL_FIXTURE);
    expect(fatal).toEqual([]);
    expect(Array.isArray(channels)).toBe(true);
    expect(channels).toHaveLength(1);
  });

  test("channel descriptor carries name + topic per §38.3", () => {
    const { channels } = compile(CHANNEL_FIXTURE);
    expect(channels[0].name).toBe("chat");
    expect(channels[0].topic).toBe("lobby");
  });

  test("auto-synced V5-strict cells surface with name + key (§38.4)", () => {
    const { channels } = compile(CHANNEL_FIXTURE);
    const cells = channels[0].autoSyncedCells;
    expect(Array.isArray(cells)).toBe(true);
    // The S126 fix: cells in the channel body's `${}` logic block are now
    // collected. Pre-fix this was always []. Dev-mode key === name.
    const byName = Object.fromEntries(cells.map((c) => [c.name, c.key]));
    expect(byName.messages).toBe("messages");
    expect(byName.count).toBe("count");
  });

  test("each auto-synced cell appears exactly once (no walk-edge duplicate)", () => {
    const { channels } = compile(CHANNEL_FIXTURE);
    const names = channels[0].autoSyncedCells.map((c) => c.name);
    const unique = new Set(names);
    expect(names.length).toBe(unique.size);
    expect(unique.has("messages")).toBe(true);
    expect(unique.has("count")).toBe(true);
  });

  test("topic defaults to the channel name when topic= is absent (§38.3)", () => {
    const src = `<program title="Notopic">

<channel name="alerts">
  \${ <feed> = [] }
</>

<div>x</div>

</program>
`;
    const { fatal, channels } = compile(src);
    expect(fatal).toEqual([]);
    expect(channels[0].name).toBe("alerts");
    expect(channels[0].topic).toBe("alerts"); // defaults to name
  });
});
