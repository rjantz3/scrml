/**
 * stdlib-time — unit tests for scrml:time (Tier 2 timezone + ISO additions)
 *
 * Tests the S57 Tier 2 additions to scrml:time: formatInTimezone, nowInTimezone,
 * toTimezoneParts, tzOffset, formatISO, parseISO. The pre-existing functions
 * (formatDate, formatRelative, debounce, etc.) are exercised by the inline
 * `~{}` block in stdlib/time/index.scrml.
 *
 * Functions extracted here match stdlib/time/index.scrml exactly.
 *
 * Coverage:
 *   T1-T3   formatInTimezone / nowInTimezone
 *   T4-T7   toTimezoneParts
 *   T8-T10  tzOffset
 *   T11-T12 formatISO
 *   T13-T17 parseISO
 */

import { describe, test, expect } from "bun:test";

// --- Functions extracted from stdlib/time/index.scrml (Tier 2 only) ---------

function formatInTimezone(timestamp, tz, options, locale) {
    const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp
    const usingStyles = options && (options.dateStyle !== undefined || options.timeStyle !== undefined)
    const defaults = usingStyles
        ? {}
        : { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    const opts = Object.assign(defaults, options || {}, { timeZone: tz })
    return new Intl.DateTimeFormat(locale || "en-US", opts).format(date)
}

function nowInTimezone(tz, options, locale) {
    return formatInTimezone(Date.now(), tz, options, locale)
}

function toTimezoneParts(timestamp, tz) {
    const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp
    const fmt = new Intl.DateTimeFormat("en-US", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        weekday: "short", hour12: false,
        timeZone: tz
    })
    const parts = {}
    for (const p of fmt.formatToParts(date)) {
        if (p.type !== "literal") parts[p.type] = p.value
    }
    return {
        year:    parseInt(parts.year, 10),
        month:   parseInt(parts.month, 10),
        day:     parseInt(parts.day, 10),
        hour:    parseInt(parts.hour, 10) % 24,
        minute:  parseInt(parts.minute, 10),
        second:  parts.second ? parseInt(parts.second, 10) : 0,
        weekday: parts.weekday
    }
}

function tzOffset(tz, timestamp) {
    const ts = timestamp === undefined ? Date.now() : (typeof timestamp === "number" ? timestamp : timestamp.getTime())
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, timeZoneName: "shortOffset"
    })
    const parts = fmt.formatToParts(new Date(ts))
    const tzPart = parts.find(p => p.type === "timeZoneName")
    if (!tzPart) return 0
    const m = /GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?/.exec(tzPart.value)
    if (!m || !m[1]) return 0
    const sign = m[1] === "+" ? 1 : -1
    const hours = parseInt(m[2], 10)
    const mins  = m[3] ? parseInt(m[3], 10) : 0
    return sign * (hours * 60 + mins)
}

function formatISO(timestamp) {
    const date = typeof timestamp === "number" ? new Date(timestamp) : timestamp
    return date.toISOString()
}

function parseISO(str) {
    if (typeof str !== "string") return undefined
    if (!/^\d{4}-\d{2}(-\d{2})?(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(str)) {
        return undefined
    }
    const d = new Date(str)
    return isNaN(d.getTime()) ? undefined : d
}

// --- Tests -------------------------------------------------------------------

const FIXED_TS = new Date("2026-04-01T14:34:07.000Z").getTime();

describe("scrml:time — formatInTimezone / nowInTimezone (Tier 2)", () => {
    test("T1: formatInTimezone UTC contains year + month", () => {
        const out = formatInTimezone(FIXED_TS, "UTC")
        expect(out.indexOf("2026") >= 0).toBe(true)
        expect(out.indexOf("Apr") >= 0).toBe(true)
    })
    test("T2: formatInTimezone respects custom options", () => {
        const out = formatInTimezone(FIXED_TS, "UTC", { dateStyle: "full" })
        expect(typeof out).toBe("string")
        expect(out.length).toBeGreaterThan(10)
    })
    test("T3: nowInTimezone returns a non-empty string", () => {
        const out = nowInTimezone("Asia/Tokyo")
        expect(typeof out).toBe("string")
        expect(out.length).toBeGreaterThan(0)
    })
})

describe("scrml:time — toTimezoneParts (Tier 2)", () => {
    test("T4: UTC parts match the source instant", () => {
        const p = toTimezoneParts(FIXED_TS, "UTC")
        expect(p.year).toBe(2026)
        expect(p.month).toBe(4)
        expect(p.day).toBe(1)
        expect(p.hour).toBe(14)
        expect(p.minute).toBe(34)
    })
    test("T5: weekday is a short string", () => {
        const p = toTimezoneParts(FIXED_TS, "UTC")
        expect(typeof p.weekday).toBe("string")
        expect(p.weekday.length).toBeGreaterThan(0)
    })
    test("T6: Tokyo is 9h ahead of UTC for the same instant", () => {
        const utc = toTimezoneParts(FIXED_TS, "UTC")
        const tok = toTimezoneParts(FIXED_TS, "Asia/Tokyo")
        // 14:34 UTC → 23:34 JST (same calendar day)
        expect(tok.hour).toBe(23)
        expect(tok.day).toBe(utc.day)
    })
    test("T7: accepts a Date input as well as a number", () => {
        const p = toTimezoneParts(new Date(FIXED_TS), "UTC")
        expect(p.year).toBe(2026)
    })
})

describe("scrml:time — tzOffset (Tier 2)", () => {
    test("T8: UTC offset is 0", () => {
        expect(tzOffset("UTC", FIXED_TS)).toBe(0)
    })
    test("T9: Tokyo is +540 (UTC+9)", () => {
        expect(tzOffset("Asia/Tokyo", FIXED_TS)).toBe(540)
    })
    test("T10: New York is -300 (EST) or -240 (EDT)", () => {
        const off = tzOffset("America/New_York", FIXED_TS)
        expect(off === -300 || off === -240).toBe(true)
    })
})

describe("scrml:time — formatISO (Tier 2)", () => {
    test("T11: number timestamp roundtrip", () => {
        expect(formatISO(FIXED_TS)).toBe("2026-04-01T14:34:07.000Z")
    })
    test("T12: Date input also works", () => {
        expect(formatISO(new Date(FIXED_TS))).toBe("2026-04-01T14:34:07.000Z")
    })
})

describe("scrml:time — parseISO (Tier 2)", () => {
    test("T13: full ISO timestamp", () => {
        const d = parseISO("2026-04-01T14:34:07Z")
        expect(d).toBeInstanceOf(Date)
        expect(d.getTime()).toBe(FIXED_TS)
    })
    test("T14: date-only ISO", () => {
        expect(parseISO("2026-04-01")).toBeInstanceOf(Date)
    })
    test("T15: rejects non-ISO format", () => {
        expect(parseISO("April 1 2026")).toBeUndefined()
    })
    test("T16: rejects garbage string", () => {
        expect(parseISO("not-a-date")).toBeUndefined()
    })
    test("T17: rejects non-string input", () => {
        expect(parseISO(null)).toBeUndefined()
        expect(parseISO(undefined)).toBeUndefined()
        expect(parseISO(12345)).toBeUndefined()
    })
})
