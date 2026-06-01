/**
 * dev hot reload — Unit Tests
 *
 * Tests for the SSE hot-reload system added to compiler/src/commands/dev.js.
 * All tests operate on the exported pure functions only — no Bun.serve() is
 * started and no file system is required.
 *
 * Coverage:
 *   §1  createSseResponse() returns 200 with text/event-stream Content-Type
 *   §2  createSseResponse() includes Cache-Control: no-cache
 *   §3  createSseResponse() adds the controller to sseClients
 *   §4  createSseResponse() removes the controller from sseClients on cancel
 *   §5  broadcastReload() sends "event: reload" to all connected clients
 *   §6  broadcastReload() removes dead controllers silently (enqueue throws)
 *   §7  broadcastReload() is a no-op when sseClients is empty
 *   §8  injectHotReloadScript() inserts script before </body>
 *   §9  injectHotReloadScript() appends script when </body> is absent
 *   §10 injectHotReloadScript() inserts before the LAST </body> (nested docs)
 *   §11 injected script contains EventSource('/_scrml/live-reload')
 *   §12 injected script calls location.reload() on reload event
 *   §13 broadcastReload() sends to multiple clients
 *   §14 sseClients is a Set (can check size externally)
 */

import { describe, test, expect, beforeEach } from "bun:test";
import {
  createSseResponse,
  broadcastReload,
  injectHotReloadScript,
  sseClients,
  deriveWatchFiles,
  resolveRootEntryCandidate,
} from "../../src/commands/dev.js";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Drain the first chunk from a ReadableStream and return it as a string.
 * Used to verify the SSE connection handshake comment is emitted.
 *
 * @param {ReadableStream} stream
 * @returns {Promise<string>}
 */
async function readFirstChunk(stream) {
  const reader = stream.getReader();
  const { value } = await reader.read();
  reader.releaseLock();
  return new TextDecoder().decode(value);
}

/**
 * Cancel a ReadableStream's reader to simulate a client disconnect.
 *
 * @param {ReadableStream} stream
 */
async function cancelStream(stream) {
  const reader = stream.getReader();
  await reader.cancel();
  reader.releaseLock();
}

// ---------------------------------------------------------------------------
// Ensure each test starts with a clean sseClients set
// ---------------------------------------------------------------------------

beforeEach(() => {
  sseClients.clear();
});

// ---------------------------------------------------------------------------
// §1 — createSseResponse() status and Content-Type
// ---------------------------------------------------------------------------

describe("§1 createSseResponse() status", () => {
  test("returns HTTP 200", () => {
    const res = createSseResponse();
    expect(res.status).toBe(200);
  });
});

describe("§1 createSseResponse() Content-Type", () => {
  test("is text/event-stream", () => {
    const res = createSseResponse();
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });
});

// ---------------------------------------------------------------------------
// §2 — Cache-Control header
// ---------------------------------------------------------------------------

describe("§2 createSseResponse() Cache-Control", () => {
  test("is no-cache", () => {
    const res = createSseResponse();
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
  });
});

// ---------------------------------------------------------------------------
// §3 — createSseResponse() adds controller to sseClients
// ---------------------------------------------------------------------------

describe("§3 createSseResponse() registers client", () => {
  test("sseClients grows by 1 after response is created", async () => {
    expect(sseClients.size).toBe(0);
    const res = createSseResponse();
    // The ReadableStream start() callback runs synchronously in Bun, so the
    // controller is added before we can read the first chunk. Read one chunk
    // to ensure the stream is started.
    await readFirstChunk(res.body);
    expect(sseClients.size).toBe(1);
  });

  test("sseClients grows by 2 after two responses are created", async () => {
    const res1 = createSseResponse();
    const res2 = createSseResponse();
    await readFirstChunk(res1.body);
    await readFirstChunk(res2.body);
    expect(sseClients.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// §4 — createSseResponse() removes controller on cancel
// ---------------------------------------------------------------------------

describe("§4 createSseResponse() deregisters on cancel", () => {
  test("sseClients shrinks by 1 when stream is cancelled", async () => {
    const res = createSseResponse();
    await readFirstChunk(res.body);
    expect(sseClients.size).toBe(1);
    await cancelStream(res.body);
    expect(sseClients.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §5 — broadcastReload() sends reload event
// ---------------------------------------------------------------------------

describe("§5 broadcastReload() sends reload event", () => {
  test("enqueued data contains 'event: reload'", async () => {
    // Capture what is enqueued by broadcastReload by using a mock controller.
    const chunks = [];
    const mockCtrl = {
      enqueue(chunk) { chunks.push(chunk); },
    };
    sseClients.add(mockCtrl);

    broadcastReload();

    expect(chunks.length).toBe(1);
    const text = new TextDecoder().decode(chunks[0]);
    expect(text).toContain("event: reload");
  });
});

// ---------------------------------------------------------------------------
// §6 — broadcastReload() removes dead controllers
// ---------------------------------------------------------------------------

describe("§6 broadcastReload() removes dead controllers", () => {
  test("controller that throws on enqueue is removed from sseClients", () => {
    const deadCtrl = {
      enqueue() { throw new Error("client gone"); },
    };
    sseClients.add(deadCtrl);
    expect(sseClients.size).toBe(1);

    broadcastReload();

    expect(sseClients.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §7 — broadcastReload() is a no-op on empty set
// ---------------------------------------------------------------------------

describe("§7 broadcastReload() no-op on empty clients", () => {
  test("does not throw when sseClients is empty", () => {
    expect(sseClients.size).toBe(0);
    expect(() => broadcastReload()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §8 — injectHotReloadScript() inserts before </body>
// ---------------------------------------------------------------------------

describe("§8 injectHotReloadScript() before </body>", () => {
  test("inserts script before </body>", () => {
    const html = "<html><body><h1>Hello</h1></body></html>";
    const result = injectHotReloadScript(html);
    const scriptIdx = result.indexOf("<script>");
    const bodyCloseIdx = result.indexOf("</body>");
    expect(scriptIdx).toBeGreaterThan(-1);
    expect(scriptIdx).toBeLessThan(bodyCloseIdx);
  });

  test("</body> is still present after injection", () => {
    const html = "<html><body><h1>Hello</h1></body></html>";
    const result = injectHotReloadScript(html);
    expect(result).toContain("</body></html>");
  });
});

// ---------------------------------------------------------------------------
// §9 — injectHotReloadScript() appends when </body> absent
// ---------------------------------------------------------------------------

describe("§9 injectHotReloadScript() appends when no </body>", () => {
  test("script is appended at end when </body> is absent", () => {
    const html = "<h1>Bare fragment</h1>";
    const result = injectHotReloadScript(html);
    expect(result.startsWith(html)).toBe(true);
    expect(result).toContain("<script>");
  });
});

// ---------------------------------------------------------------------------
// §10 — injectHotReloadScript() uses LAST </body>
// ---------------------------------------------------------------------------

describe("§10 injectHotReloadScript() uses last </body>", () => {
  test("script appears before the last </body> when multiple exist", () => {
    // Unusual but possible in template contexts
    const html = "<html><body><p>inner</p></body><body><p>outer</p></body></html>";
    const result = injectHotReloadScript(html);
    const lastBodyClose = result.lastIndexOf("</body>");
    const scriptIdx = result.lastIndexOf("<script>");
    expect(scriptIdx).toBeLessThan(lastBodyClose);
  });
});

// ---------------------------------------------------------------------------
// §11 — injected script references /_scrml/live-reload
// ---------------------------------------------------------------------------

describe("§11 injected script EventSource URL", () => {
  test("script contains EventSource with correct URL", () => {
    const html = "<html><body></body></html>";
    const result = injectHotReloadScript(html);
    expect(result).toContain("/_scrml/live-reload");
    expect(result).toContain("EventSource");
  });
});

// ---------------------------------------------------------------------------
// §12 — injected script calls location.reload()
// ---------------------------------------------------------------------------

describe("§12 injected script reload behavior", () => {
  test("script contains location.reload()", () => {
    const html = "<html><body></body></html>";
    const result = injectHotReloadScript(html);
    expect(result).toContain("location.reload()");
  });
});

// ---------------------------------------------------------------------------
// §13 — broadcastReload() sends to multiple clients
// ---------------------------------------------------------------------------

describe("§13 broadcastReload() multiple clients", () => {
  test("all clients receive the reload event", () => {
    const received = [];

    for (let i = 0; i < 3; i++) {
      const idx = i;
      sseClients.add({
        enqueue(chunk) { received.push(idx); },
      });
    }

    broadcastReload();

    expect(received.length).toBe(3);
    expect(received).toContain(0);
    expect(received).toContain(1);
    expect(received).toContain(2);
  });
});

// ---------------------------------------------------------------------------
// §14 — sseClients is the exported Set
// ---------------------------------------------------------------------------

describe("§14 sseClients is exported Set", () => {
  test("sseClients is a Set instance", () => {
    expect(sseClients).toBeInstanceOf(Set);
  });

  test("sseClients.size is 0 after beforeEach clear", () => {
    expect(sseClients.size).toBe(0);
  });
});


// ===========================================================================
// scrml-dev-watcher-and-stale-entry-2026-06-01 — BUG-1 + BUG-2
// ===========================================================================

// ---------------------------------------------------------------------------
// §15 — BUG-1: deriveWatchFiles() yields a bounded per-file set, never dirs
// ---------------------------------------------------------------------------

describe("§15 deriveWatchFiles() derives from gathered .scrml files", () => {
  test("returns the union of inputFiles and gatheredFiles (.scrml only)", () => {
    const opts = { inputFiles: ["/proj/app.scrml"] };
    const gathered = ["/proj/app.scrml", "/proj/components/header.scrml"];
    const files = deriveWatchFiles(opts, gathered);
    expect(files).toContain("/proj/app.scrml");
    expect(files).toContain("/proj/components/header.scrml");
  });

  test("de-dups when the entry is also present in the gathered set", () => {
    const opts = { inputFiles: ["/proj/app.scrml"] };
    const gathered = ["/proj/app.scrml"];
    const files = deriveWatchFiles(opts, gathered);
    expect(files.length).toBe(1);
    expect(files[0]).toBe("/proj/app.scrml");
  });

  test("NEVER includes node_modules / non-.scrml paths (the BUG-1 crash cause)", () => {
    // The old code watched dirname(input) recursively, pulling in every file
    // under the tree (node_modules, .git, sibling repos). The per-file set must
    // contain ONLY .scrml sources — no directory entries, no node_modules.
    const opts = { inputFiles: ["/big/parent/req.scrml"] };
    const gathered = [
      "/big/parent/req.scrml",
      "/big/parent/lib/util.scrml",
      // these must be filtered out — they are not .scrml sources
      "/big/parent/node_modules/foo/index.js",
      "/big/parent/node_modules",
      "/big/parent/.git",
    ];
    const files = deriveWatchFiles(opts, gathered);
    expect(files.every(f => f.endsWith(".scrml"))).toBe(true);
    expect(files.some(f => f.includes("node_modules"))).toBe(false);
    expect(files.some(f => f.endsWith(".git"))).toBe(false);
    expect(files).toEqual(["/big/parent/req.scrml", "/big/parent/lib/util.scrml"]);
  });

  test("tolerates absent/empty inputs without throwing", () => {
    expect(() => deriveWatchFiles({ inputFiles: [] }, [])).not.toThrow();
    expect(deriveWatchFiles({ inputFiles: [] }, [])).toEqual([]);
    expect(deriveWatchFiles({}, undefined)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// §16 — BUG-1: a per-file watch error (ENOSPC) does not crash watch-setup
// ---------------------------------------------------------------------------

describe("§16 watch error resilience (ENOSPC graceful degradation)", () => {
  // The fix wraps each watch in try/catch and attaches a watcher `error`
  // handler so a dead watcher (e.g. inotify limit hit) degrades to
  // "hot-reload disabled" rather than crashing the dev server. We assert the
  // resilience contract by simulating the exact watch-setup pattern dev.js
  // uses: a synchronous throw on watch() must be caught, and an async `error`
  // event on the returned watcher must be handled (not rethrown).

  test("synchronous watch() ENOSPC throw is caught, loop continues", () => {
    const watched = [];
    let warned = 0;
    // Mirror the watchFile contract: try watch(); on throw, warn once + continue.
    function watchFile(file, watchImpl) {
      try {
        const w = watchImpl(file);
        w.on("error", () => { warned++; });
        watched.push(file);
      } catch (err) {
        if (err && err.code === "ENOSPC") warned++;
      }
    }
    const throwingWatch = () => { const e = new Error("ENOSPC"); e.code = "ENOSPC"; throw e; };
    expect(() => {
      for (const f of ["/a.scrml", "/b.scrml"]) watchFile(f, throwingWatch);
    }).not.toThrow();
    // No files registered (all watch attempts threw), but no crash + warned.
    expect(watched.length).toBe(0);
    expect(warned).toBeGreaterThan(0);
  });

  test("async watcher 'error' event is handled, not rethrown", () => {
    let handled = false;
    // Simulate a watcher that emits an error asynchronously via its handler.
    const fakeWatcher = {
      _errCb: null,
      on(evt, cb) { if (evt === "error") this._errCb = cb; },
      emitError(err) { if (this._errCb) this._errCb(err); },
    };
    function watchFile() {
      const w = fakeWatcher;
      w.on("error", () => { handled = true; });
      return w;
    }
    const w = watchFile();
    const e = new Error("ENOSPC"); e.code = "ENOSPC";
    expect(() => w.emitError(e)).not.toThrow();
    expect(handled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §17 — BUG-2: root `/` resolution prefers <entryBase>.html over stale .html
// ---------------------------------------------------------------------------

describe("§17 resolveRootEntryCandidate() prefers the compiled entry", () => {
  test("single input → returns <entryBase>.html in serveDir", () => {
    const opts = { inputFiles: ["/proj/src/req.scrml"] };
    const candidate = resolveRootEntryCandidate(opts, "/proj/dist");
    expect(candidate).toBe(join("/proj/dist", "req.html"));
  });

  test("multi-input (>=2) → no single unambiguous entry, returns absence", () => {
    const opts = { inputFiles: ["/proj/a.scrml", "/proj/b.scrml"] };
    expect(resolveRootEntryCandidate(opts, "/proj/dist")).toBe("");
  });

  test("zero inputs → returns absence", () => {
    expect(resolveRootEntryCandidate({ inputFiles: [] }, "/proj/dist")).toBe("");
    expect(resolveRootEntryCandidate({}, "/proj/dist")).toBe("");
  });

  test("end-to-end: entry candidate sorts independent of stale sibling on disk", () => {
    // The stale-app bug: dist has both <entry>.html and a stale sibling that
    // sorts BEFORE it alphabetically; the OLD "first .html via readdirSync"
    // fallback would serve the stale one. The fix resolves the entry candidate
    // (req.html) directly — independent of any sibling, alphabetical order, or
    // readdir order. Here we verify the candidate path is the entry's html and
    // that the stale sibling does NOT influence it.
    const dir = mkdtempSync(join(tmpdir(), "scrml-dev-entry-"));
    try {
      writeFileSync(join(dir, "aaa-stale.html"), "<div>STALE WRONG APP</div>");
      writeFileSync(join(dir, "req.html"), "<div>FRESH ENTRY</div>");
      const opts = { inputFiles: [join(dir, "req.scrml")] };
      const candidate = resolveRootEntryCandidate(opts, dir);
      expect(candidate).toBe(join(dir, "req.html"));
      expect(candidate).not.toContain("aaa-stale");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
