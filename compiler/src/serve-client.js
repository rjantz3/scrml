/**
 * @module serve-client
 * Client helper for the persistent scrml compiler server.
 *
 * Checks if the serve process is running and sends compile requests to it,
 * falling back to direct compilation if the server isn't available.
 *
 * Usage:
 *   import { compileViaServer } from "./serve-client.js";
 *   const result = await compileViaServer({ inputFiles: [...], outputDir: "dist" });
 */

import { compileScrml } from "./api.js";

const DEFAULT_PORT = 3100;

/**
 * S79 audit fix (hardcoded-thresholds B.1): default AbortSignal.timeout values
 * for the four serve-client RPC sites. Tests can inject smaller values to
 * exercise the timeout-fallback path without needing an actually-hung server.
 *
 * Override via `__testOnly_serverTimeouts` second-arg to each function (or via
 * the global `globalThis.__scrml_test_server_timeouts` hook for cases where
 * the call site cannot pass an option, e.g. Bun child-process spawn that
 * dials a parent compile server). Adopter-facing env vars NOT exposed —
 * persistent-server is internal compiler infra, not authoring surface.
 *
 * Defaults: health=500ms, info=1000ms, compile=30000ms, shutdown=2000ms
 * (pre-S79 hardcoded values, preserved as defaults).
 */
const DEFAULT_TIMEOUTS = {
  health: 500,
  info: 1000,
  compile: 30000,
  shutdown: 2000,
};

function resolveTimeouts(override) {
  const globalHook = (typeof globalThis !== "undefined"
    && globalThis.__scrml_test_server_timeouts
    && typeof globalThis.__scrml_test_server_timeouts === "object")
    ? globalThis.__scrml_test_server_timeouts
    : null;
  return {
    health: (override?.health ?? globalHook?.health ?? DEFAULT_TIMEOUTS.health),
    info: (override?.info ?? globalHook?.info ?? DEFAULT_TIMEOUTS.info),
    compile: (override?.compile ?? globalHook?.compile ?? DEFAULT_TIMEOUTS.compile),
    shutdown: (override?.shutdown ?? globalHook?.shutdown ?? DEFAULT_TIMEOUTS.shutdown),
  };
}

/**
 * Get the server URL from environment or default.
 * @returns {string}
 */
function getServerUrl() {
  const port = parseInt(process.env.SCRML_PORT ?? String(DEFAULT_PORT), 10);
  return `http://localhost:${port}`;
}

/**
 * Check if the compiler server is running.
 *
 * @param {string} [serverUrl] — override server URL
 * @param {object} [options] — optional `{ __testOnly_serverTimeouts: { health, ...} }` (S79 B.1)
 * @returns {Promise<boolean>}
 */
export async function isServerRunning(serverUrl, options) {
  const url = serverUrl || getServerUrl();
  const t = resolveTimeouts(options?.__testOnly_serverTimeouts);
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(t.health) });
    if (res.ok) {
      const data = await res.json();
      return data.status === "ok";
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get server health info.
 *
 * @param {string} [serverUrl] — override server URL
 * @param {object} [options] — optional `{ __testOnly_serverTimeouts: { info, ...} }` (S79 B.1)
 * @returns {Promise<{ status: string, uptime: number, compilations: number, memoryMB: number } | null>}
 */
export async function getServerHealth(serverUrl, options) {
  const url = serverUrl || getServerUrl();
  const t = resolveTimeouts(options?.__testOnly_serverTimeouts);
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(t.info) });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

/**
 * Compile via the persistent server, falling back to direct compilation
 * if the server is not running.
 *
 * @param {object} options
 * @param {string[]} options.inputFiles       — .scrml file paths to compile
 * @param {string}  [options.outputDir]       — output directory
 * @param {boolean} [options.verbose]         — per-stage timing
 * @param {boolean} [options.convertLegacyCss]
 * @param {boolean} [options.embedRuntime]
 * @param {boolean} [options.write]           — write output files (default true)
 * @param {string}  [options.serverUrl]       — override server URL
 *
 * @returns {Promise<{
 *   errors: object[],
 *   warnings: object[],
 *   fileCount: number,
 *   outputDir: string,
 *   durationMs: number,
 *   outputs: object,
 *   usedServer: boolean
 * }>}
 */
export async function compileViaServer(options = {}) {
  const {
    inputFiles = [],
    outputDir,
    verbose = false,
    convertLegacyCss = false,
    embedRuntime = false,
    write = true,
    serverUrl,
    // S79 audit fix B.1 — opt-in test injection of timeouts.
    __testOnly_serverTimeouts: timeoutsOverride,
  } = options;

  const url = serverUrl || getServerUrl();
  const t = resolveTimeouts(timeoutsOverride);

  // Try the server first (propagate timeouts override into the health probe).
  const running = await isServerRunning(url, { __testOnly_serverTimeouts: timeoutsOverride });

  if (running) {
    try {
      const res = await fetch(`${url}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputFiles,
          outputDir,
          options: { verbose, convertLegacyCss, embedRuntime, write },
        }),
        signal: AbortSignal.timeout(t.compile), // S79 B.1 — was hardcoded 30000
      });

      if (res.ok) {
        const result = await res.json();
        return { ...result, usedServer: true };
      }

      // Server returned an error — fall through to direct compilation
      const err = await res.json().catch(() => ({}));
      if (verbose) {
        console.warn(`[serve-client] Server returned ${res.status}: ${err.error || "unknown error"}, falling back to direct compilation`);
      }
    } catch (fetchErr) {
      if (verbose) {
        console.warn(`[serve-client] Server request failed: ${fetchErr.message}, falling back to direct compilation`);
      }
    }
  }

  // Fallback: direct compilation
  const result = compileScrml({
    inputFiles,
    outputDir,
    verbose,
    convertLegacyCss,
    embedRuntime,
    write,
    log: verbose ? console.log : () => {},
  });

  // Convert outputs Map to plain object for consistency
  const outputsObj = {};
  if (result.outputs) {
    for (const [filePath, output] of result.outputs) {
      outputsObj[filePath] = output;
    }
  }

  return {
    errors: result.errors,
    warnings: result.warnings,
    fileCount: result.fileCount,
    outputDir: result.outputDir,
    durationMs: result.durationMs,
    outputs: outputsObj,
    usedServer: false,
  };
}

/**
 * Shut down the compiler server.
 *
 * @param {string} [serverUrl] — override server URL
 * @param {object} [options] — optional `{ __testOnly_serverTimeouts: { shutdown, ...} }` (S79 B.1)
 * @returns {Promise<boolean>} — true if shutdown was acknowledged
 */
export async function shutdownServer(serverUrl, options) {
  const url = serverUrl || getServerUrl();
  const t = resolveTimeouts(options?.__testOnly_serverTimeouts);
  try {
    const res = await fetch(`${url}/shutdown`, {
      method: "POST",
      signal: AbortSignal.timeout(t.shutdown),
    });
    return res.ok;
  } catch {
    return false;
  }
}
