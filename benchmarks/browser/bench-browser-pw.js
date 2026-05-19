#!/usr/bin/env bun
/**
 * Real-browser TodoMVC benchmark using Playwright + headless Chrome.
 *
 * Port of benchmarks/browser/bench-browser.js (Puppeteer) to Playwright —
 * the project standard per @playwright/test ^1.49.0 + e2e/playwright.config.ts.
 *
 * Differences from the Puppeteer harness:
 *   - Uses @playwright/test's chromium API (chromium.launch / browser.newPage).
 *   - Adds Vanilla JS as a 5th baseline (mirrors benchmarks/runtime-benchmark.js
 *     and benchmarks/todomvc-vanilla/bench.js). Vanilla is the per-row cost
 *     floor — anything above it is framework overhead.
 *   - Same 10 ops, same JSON output shape, same per-framework prod-build
 *     orchestration (assumes the caller has run `bun run build` per framework).
 *
 * Pre-requisites (run before this script):
 *   - bunx playwright install chromium  (only chromium needed; ~170MB)
 *   - For scrml:    bun run compiler/src/cli.js compile benchmarks/todomvc/app.scrml \
 *                       --output benchmarks/todomvc/dist --convert-legacy-css
 *   - For React:    (cd benchmarks/todomvc-react   && bun install && bun run build)
 *   - For Svelte:   (cd benchmarks/todomvc-svelte  && bun install && bun run build)
 *   - For Vue:      (cd benchmarks/todomvc-vue     && bun install && bun run build)
 *   - For Vanilla:  no build step — served from benchmarks/todomvc-vanilla/static/
 *
 * Usage: bun benchmarks/browser/bench-browser-pw.js
 */

import { chromium } from "@playwright/test";
import { createServer } from "http";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, join, extname } from "path";

const ROOT = resolve(import.meta.dir, "..");

// ---------------------------------------------------------------------------
// Tiny static file server (shared between all frameworks)
// ---------------------------------------------------------------------------

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

function serve(dir) {
  return new Promise((res) => {
    const server = createServer((req, resp) => {
      let url = req.url === "/" ? "/index.html" : req.url;
      // Strip query string
      const q = url.indexOf("?");
      if (q !== -1) url = url.slice(0, q);
      const filePath = join(dir, url);
      if (!existsSync(filePath)) {
        resp.writeHead(404);
        resp.end("Not found: " + url);
        return;
      }
      const ext = extname(filePath);
      resp.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      resp.end(readFileSync(filePath));
    });
    server.listen(0, () => res({ server, port: server.address().port }));
  });
}

// ---------------------------------------------------------------------------
// scrml setup script — injected after page load to expose __bench API on
// top of the compiled runtime's _scrml_reactive_get / _scrml_reactive_set.
// (React/Svelte/Vue/Vanilla apps wire their own __bench from the app source.)
// ---------------------------------------------------------------------------

const SCRML_SETUP = `
  window.__bench = {
    createRows(n) {
      const adj = ["pretty","large","big","small","tall","short","long","handsome","plain","quaint","clean","elegant","easy","angry","crazy","helpful","mushy","odd","unsightly","adorable","important","inexpensive","cheap","expensive","fancy"];
      const col = ["red","yellow","blue","green","pink","brown","purple","brown","white","black","orange"];
      const noun = ["table","chair","house","bbq","desk","car","pony","cookie","sandwich","burger","pizza","mouse","keyboard"];
      const existing = _scrml_reactive_get("todos") || [];
      const maxId = existing.length > 0 ? Math.max(...existing.map(t => t.id)) : 0;
      const newTodos = [];
      for (let i = 0; i < n; i++) {
        newTodos.push({
          id: maxId + i + 1,
          title: adj[i % adj.length] + " " + col[i % col.length] + " " + noun[i % noun.length],
          completed: false,
        });
      }
      _scrml_reactive_set("todos", [...existing, ...newTodos]);
    },
    clearRows() { _scrml_reactive_set("todos", []); },
    updateEvery10th() {
      _scrml_reactive_set("todos", _scrml_reactive_get("todos").map((t, i) =>
        i % 10 === 0 ? { ...t, title: t.title + " !!!" } : t
      ));
    },
    deleteEvery10th() {
      _scrml_reactive_set("todos", _scrml_reactive_get("todos").filter((_, i) => i % 10 !== 0));
    },
    swapRows(a, b) {
      const todos = [..._scrml_reactive_get("todos")];
      if (todos[a] && todos[b]) {
        const tmp = todos[a]; todos[a] = todos[b]; todos[b] = tmp;
        _scrml_reactive_set("todos", todos);
      }
    },
    removeRow(idx) {
      const todos = _scrml_reactive_get("todos");
      if (todos[idx]) _scrml_reactive_set("todos", todos.filter((_, i) => i !== idx));
    },
    selectRow(idx) {
      const todos = _scrml_reactive_get("todos");
      if (todos[idx]) _scrml_reactive_set("editingId", todos[idx].id);
    },
    reset() {
      _scrml_reactive_set("todos", []);
      _scrml_reactive_set("nextId", 1);
    },
  };
  window.__benchFlush = () => Promise.resolve(); // scrml is synchronous
`;

// ---------------------------------------------------------------------------
// Framework manifest — one entry per app; order matches RESULTS.md column order.
// ---------------------------------------------------------------------------

const frameworks = [
  {
    name: "scrml",
    dist: resolve(ROOT, "todomvc/dist"),
    index: "app.html",
    setup: SCRML_SETUP,
  },
  {
    name: "React 19",
    dist: resolve(ROOT, "todomvc-react/dist"),
    index: "index.html",
    setup: "", // App.jsx wires __bench in a useEffect
  },
  {
    name: "Svelte 5",
    dist: resolve(ROOT, "todomvc-svelte/dist"),
    index: "index.html",
    setup: "",
  },
  {
    name: "Vue 3",
    dist: resolve(ROOT, "todomvc-vue/dist"),
    index: "index.html",
    setup: "",
  },
  {
    name: "Vanilla JS",
    dist: resolve(ROOT, "todomvc-vanilla/static"),
    index: "index.html",
    setup: "", // static page wires __bench inline
  },
];

// ---------------------------------------------------------------------------
// Benchmark runner — same shape as the Puppeteer harness
// ---------------------------------------------------------------------------

const WARMUP = 5;
const ITERATIONS = 10;

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function p95(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.min(idx, sorted.length - 1)];
}

async function runBenchmark(page, name, setupCode, benchCode, iters = ITERATIONS) {
  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    await page.evaluate(setupCode);
    await page.evaluate(benchCode);
  }

  const times = [];
  for (let i = 0; i < iters; i++) {
    await page.evaluate(setupCode);
    // Force GC + settle before measuring (gc exposed via --js-flags=--expose-gc)
    await page.evaluate(() => { if (typeof gc === "function") gc(); });
    await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
    const elapsed = await page.evaluate(`
      (async () => {
        const start = performance.now();
        ${benchCode}
        // Flush framework async updates (Vue nextTick, Svelte tick).
        if (window.__benchFlush) await window.__benchFlush();
        // Force synchronous layout to include reflow cost.
        document.body.offsetHeight;
        return performance.now() - start;
      })()
    `);
    times.push(elapsed);
  }
  return {
    benchmark: name,
    median: median(times),
    mean: mean(times),
    p95: p95(times),
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--enable-precise-memory-info",
      "--js-flags=--expose-gc",
    ],
  });

  const results = {};
  const startTime = Date.now();

  for (const fw of frameworks) {
    console.log(`\n=== ${fw.name} ===`);

    if (!existsSync(join(fw.dist, fw.index))) {
      console.log(`  SKIP: ${join(fw.dist, fw.index)} not found — did you run the build?`);
      continue;
    }

    const { server, port } = await serve(fw.dist);
    const page = await browser.newPage();

    // Surface page console errors to the harness log for easier debug.
    page.on("pageerror", (err) => console.log(`  [pageerror] ${err.message}`));

    const url = `http://localhost:${port}/${fw.index}`;
    await page.goto(url, { waitUntil: "networkidle" });

    if (fw.setup) await page.evaluate(fw.setup);

    // Wait for app to mount + __bench to be ready.
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));

    const hasApi = await page.evaluate(() => typeof window.__bench !== "undefined");
    if (!hasApi) {
      console.log("  SKIP: __bench API not available");
      server.close();
      await page.close();
      continue;
    }

    const fwResults = [];
    const benchmarks = [
      ["create-1000",       `window.__bench.reset();`,                                           `window.__bench.createRows(1000);`],
      ["replace-1000",      `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.clearRows(); window.__bench.createRows(1000);`],
      ["partial-update",    `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.updateEvery10th();`],
      ["delete-every-10th", `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.deleteEvery10th();`],
      ["clear-all",         `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.clearRows();`],
      ["select-row",        `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.selectRow(500);`],
      ["swap-rows",         `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.swapRows(1, 998);`],
      ["remove-row",        `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.removeRow(500);`],
      ["create-10000",      `window.__bench.reset();`,                                           `window.__bench.createRows(10000);`, 5],
      ["append-1000",       `window.__bench.reset(); window.__bench.createRows(1000);`,          `window.__bench.createRows(1000);`],
    ];

    for (const [name, setup, bench, iters] of benchmarks) {
      const result = await runBenchmark(page, name, setup, bench, iters);
      fwResults.push(result);
      console.log(`  ${name}: ${result.median.toFixed(2)}ms`);
    }

    results[fw.name] = fwResults;
    await page.close();
    server.close();
  }

  await browser.close();

  // ---------------------------------------------------------------------
  // Summary table (medians, ms) — same format as the Puppeteer harness
  // ---------------------------------------------------------------------

  console.log("\n=== SUMMARY (medians, ms) ===");
  const names = Object.keys(results);
  if (names.length === 0) {
    console.error("No frameworks produced results.");
    process.exit(1);
  }
  const ops = results[names[0]].map(r => r.benchmark);
  const pad = (s, n) => s.padEnd(n);
  console.log(pad("Operation", 22) + names.map(n => pad(n, 12)).join(""));
  for (const op of ops) {
    let line = pad(op, 22);
    for (const name of names) {
      const r = results[name].find(r => r.benchmark === op);
      line += pad(r ? r.median.toFixed(2) : "—", 12);
    }
    console.log(line);
  }

  // ---------------------------------------------------------------------
  // Markdown table (ready to paste into RESULTS.md)
  // ---------------------------------------------------------------------

  console.log("\n=== MARKDOWN ===");
  console.log(`| Operation | ${names.join(" | ")} | Best |`);
  console.log(`|---|${names.map(() => "---:").join("|")}|---|`);
  for (const op of ops) {
    const cells = names.map(n => {
      const r = results[n].find(r => r.benchmark === op);
      return r ? r.median.toFixed(2) : "—";
    });
    // Find the best (lowest median) framework for this op.
    let best = null;
    let bestVal = Infinity;
    for (const n of names) {
      const r = results[n].find(r => r.benchmark === op);
      if (r && r.median < bestVal) { bestVal = r.median; best = n; }
    }
    console.log(`| ${op} | ${cells.join(" | ")} | ${best ?? "—"} |`);
  }

  // ---------------------------------------------------------------------
  // JSON output (mirrors benchmarks/runtime-results.json schema)
  // ---------------------------------------------------------------------

  const jsonOutput = {
    timestamp: new Date().toISOString(),
    environment: {
      runtime: `Bun ${Bun.version}`,
      browser: "headless Chrome (Playwright chromium)",
      warmup: WARMUP,
      iterations: ITERATIONS,
    },
    frameworks: {},
  };
  for (const name of names) {
    jsonOutput.frameworks[name] = {};
    for (const r of results[name]) {
      jsonOutput.frameworks[name][r.benchmark] = {
        median: r.median,
        mean: r.mean,
        p95: r.p95,
        min: r.min,
        max: r.max,
      };
    }
  }

  const jsonPath = resolve(import.meta.dir, "browser-results-pw.json");
  writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`\nJSON results: benchmarks/browser/browser-results-pw.json`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nTotal runtime: ${elapsed}s`);
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
