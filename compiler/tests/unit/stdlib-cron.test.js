/**
 * stdlib-cron — unit tests for scrml:cron
 *
 * Tests each function — extracted from stdlib/cron/index.scrml.
 *
 * STRATEGY: stub Bun.cron for shape tests (no real timers); use the real
 * Bun.cron for nextOccurrence parse tests where it's a pure function.
 *
 * Coverage:
 *   C1   schedule returns a job handle with stop/ref/unref
 *   C2   stop wrapper calls .stop() on the handle (idempotent for null/missing)
 *   C3   nextOccurrence returns a Date for valid patterns
 *   C4   nextOccurrence accepts relativeDate
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";

// --- Stub Bun.cron for schedule/stop tests -----------------------------------

const stubLog = [];
let realBunCron;
const HAS_BUN_CRON = typeof Bun.cron === "function";
const HAS_BUN_CRON_PARSE = HAS_BUN_CRON && typeof Bun.cron.parse === "function";

beforeAll(() => {
  if (!HAS_BUN_CRON) return;
  realBunCron = Bun.cron;
  // Replace the cron callable; preserve .parse if the runtime has it
  const stubCallable = (pattern, handler) => {
    stubLog.push(["schedule", pattern, typeof handler]);
    const handle = {
      cron: pattern,
      stop: () => { stubLog.push(["stop", pattern]); return handle; },
      ref: () => { stubLog.push(["ref", pattern]); return handle; },
      unref: () => { stubLog.push(["unref", pattern]); return handle; },
    };
    return handle;
  };
  if (HAS_BUN_CRON_PARSE) {
    stubCallable.parse = realBunCron.parse.bind(realBunCron);
  }
  if (typeof realBunCron.remove === "function") {
    stubCallable.remove = realBunCron.remove.bind(realBunCron);
  }
  Bun.cron = stubCallable;
});

afterAll(() => {
  if (realBunCron) Bun.cron = realBunCron;
});

// --- Functions extracted from stdlib/cron/index.scrml ------------------------

function schedule(pattern, handler) { return Bun.cron(pattern, handler); }
function nextOccurrence(pattern, relativeDate) { return Bun.cron.parse(pattern, relativeDate); }
function stop(job) { if (job && typeof job.stop == "function") { job.stop(); } }

// --- Tests -------------------------------------------------------------------

describe.if(HAS_BUN_CRON)("scrml:cron", () => {
  test("C1 schedule returns a handle with stop/ref/unref", () => {
    const job = schedule("0 * * * *", () => {});
    expect(job).toBeDefined();
    expect(typeof job.stop).toBe("function");
    expect(typeof job.ref).toBe("function");
    expect(typeof job.unref).toBe("function");
    expect(job.cron).toBe("0 * * * *");

    expect(stubLog.find(e => e[0] === "schedule" && e[1] === "0 * * * *")).toBeDefined();

    job.stop();
  });

  test("C2 stop wrapper calls handle.stop; ignores null/undefined/missing", () => {
    const before = stubLog.length;
    const job = schedule("@daily", () => {});
    stop(job);
    expect(stubLog.some(e => e[0] === "stop" && e[1] === "@daily")).toBe(true);

    // Idempotent on bad input — must not throw
    stop(null);
    stop(undefined);
    stop({});                  // no .stop method
    stop({ stop: "not-a-fn" }); // wrong type
  });

  test.if(HAS_BUN_CRON_PARSE)("C3 nextOccurrence parses a valid pattern", () => {
    const next = nextOccurrence("0 0 * * *");
    expect(next).toBeInstanceOf(Date);
    expect(next.getTime()).toBeGreaterThan(Date.now());
  });

  test.if(HAS_BUN_CRON_PARSE)("C4 nextOccurrence accepts a relativeDate", () => {
    const base = new Date("2026-06-15T12:00:00Z");
    const next = nextOccurrence("0 0 * * *", base);
    expect(next).toBeInstanceOf(Date);
    expect(next.getTime()).toBeGreaterThan(base.getTime());
  });
});
