/**
 * stdlib-regex — unit tests for scrml:regex
 *
 * Functions extracted here match stdlib/regex/index.scrml exactly.
 *
 * Coverage:
 *   RX1-RX10  patterns catalog (email, url, ipv4, uuid, slug, hexColor,
 *             semver, isoDate, phoneE164, usZip)
 *   RX11-RX13 test
 *   RX14-RX17 match (named groups, no-match, plain group, null safety)
 *   RX18-RX20 extract (multi-match, named groups, empty)
 *   RX21      replace
 *   RX22-RX24 escape
 *   RX25      caseInsensitive
 *   RX26-RX28 isValid
 */

import { describe, test, expect } from "bun:test";

// --- Functions extracted from stdlib/regex/index.scrml -----------------------

const patterns = {
    email:      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url:        /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
    ipv4:       /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
    uuid:       /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    slug:       /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    hexColor:   /^#(?:[0-9a-fA-F]{3}){1,2}$/,
    semver:     /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:-(?<prerelease>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?(?:\+(?<build>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
    isoDate:    /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/,
    phoneE164:  /^\+[1-9]\d{1,14}$/,
    usZip:      /^\d{5}(?:-\d{4})?$/,
    creditCard: /^\d{13,19}$/,
    username:   /^[a-zA-Z0-9_]{3,32}$/,
    password:   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
};

function test_(pattern, str) {
    if (typeof str !== "string") return false
    return pattern.test(str)
}

function match(pattern, str) {
    if (typeof str !== "string") return null
    const m = pattern.exec(str)
    if (!m) return null
    if (m.groups) return m.groups
    return m
}

function extract(pattern, str) {
    if (typeof str !== "string") return []
    const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"
    const p = new RegExp(pattern.source, flags)
    const out = []
    let m
    while ((m = p.exec(str)) !== null) {
        if (m.groups) out.push(m.groups)
        else if (m.length > 1) out.push(m[1] !== undefined ? m[1] : m[0])
        else out.push(m[0])
        if (m.index === p.lastIndex) p.lastIndex++
    }
    return out
}

function replace(pattern, str, replacement) {
    if (typeof str !== "string") return str
    return str.replace(pattern, replacement)
}

function escape_(str) {
    if (typeof str !== "string") return ""
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function caseInsensitive(source, additionalFlags) {
    const flags = "i" + (additionalFlags || "")
    return new RegExp(source, flags)
}

function isValid(patternName, str) {
    const p = patterns[patternName]
    if (!p) return false
    return test_(p, str)
}

// --- Tests -------------------------------------------------------------------

describe("scrml:regex — patterns catalog", () => {
    test("RX1: email accepts valid + rejects invalid", () => {
        expect(test_(patterns.email, "alice@example.com")).toBe(true)
        expect(test_(patterns.email, "no-at-sign")).toBe(false)
        expect(test_(patterns.email, "@no-local.com")).toBe(false)
    })
    test("RX2: url accepts http/https + rejects others", () => {
        expect(test_(patterns.url, "https://example.com/path?q=1")).toBe(true)
        expect(test_(patterns.url, "http://example.com")).toBe(true)
        expect(test_(patterns.url, "ftp://example.com")).toBe(false)
        expect(test_(patterns.url, "not a url")).toBe(false)
    })
    test("RX3: ipv4 accepts dotted-quad with valid octets", () => {
        expect(test_(patterns.ipv4, "192.168.1.1")).toBe(true)
        expect(test_(patterns.ipv4, "0.0.0.0")).toBe(true)
        expect(test_(patterns.ipv4, "255.255.255.255")).toBe(true)
        expect(test_(patterns.ipv4, "999.0.0.1")).toBe(false)
        expect(test_(patterns.ipv4, "1.2.3")).toBe(false)
    })
    test("RX4: uuid canonical 8-4-4-4-12 hex", () => {
        expect(test_(patterns.uuid, "550e8400-e29b-41d4-a716-446655440000")).toBe(true)
        expect(test_(patterns.uuid, "not-a-uuid")).toBe(false)
    })
    test("RX5: slug accepts kebab-case", () => {
        expect(test_(patterns.slug, "my-post-slug")).toBe(true)
        expect(test_(patterns.slug, "single")).toBe(true)
        expect(test_(patterns.slug, "Has Spaces")).toBe(false)
        expect(test_(patterns.slug, "-leading")).toBe(false)
        expect(test_(patterns.slug, "trailing-")).toBe(false)
    })
    test("RX6: hexColor #RGB or #RRGGBB", () => {
        expect(test_(patterns.hexColor, "#fff")).toBe(true)
        expect(test_(patterns.hexColor, "#FFAABB")).toBe(true)
        expect(test_(patterns.hexColor, "#abcd")).toBe(false)
    })
    test("RX7: semver", () => {
        expect(test_(patterns.semver, "1.2.3")).toBe(true)
        expect(test_(patterns.semver, "1.2.3-beta.1")).toBe(true)
        expect(test_(patterns.semver, "1.2.3+build.5")).toBe(true)
        expect(test_(patterns.semver, "1.2")).toBe(false)
    })
    test("RX8: isoDate accepts date + datetime", () => {
        expect(test_(patterns.isoDate, "2026-04-01")).toBe(true)
        expect(test_(patterns.isoDate, "2026-04-01T14:00:00Z")).toBe(true)
        expect(test_(patterns.isoDate, "April 1 2026")).toBe(false)
    })
    test("RX9: phoneE164", () => {
        expect(test_(patterns.phoneE164, "+14155551234")).toBe(true)
        expect(test_(patterns.phoneE164, "415-555-1234")).toBe(false)
    })
    test("RX10: usZip 5 or 9 digit", () => {
        expect(test_(patterns.usZip, "94103")).toBe(true)
        expect(test_(patterns.usZip, "94103-1234")).toBe(true)
        expect(test_(patterns.usZip, "abc")).toBe(false)
    })
})

describe("scrml:regex — test()", () => {
    test("RX11: returns boolean for string match", () => {
        expect(test_(/foo/, "food")).toBe(true)
        expect(test_(/foo/, "bar")).toBe(false)
    })
    test("RX12: false for non-string", () => {
        expect(test_(/foo/, null)).toBe(false)
        expect(test_(/foo/, undefined)).toBe(false)
        expect(test_(/foo/, 42)).toBe(false)
    })
    test("RX13: works with named-group patterns", () => {
        expect(test_(patterns.semver, "2.0.0")).toBe(true)
    })
})

describe("scrml:regex — match()", () => {
    test("RX14: returns named-group dict when present", () => {
        const r = match(patterns.semver, "1.2.3-beta+build")
        expect(r.major).toBe("1")
        expect(r.minor).toBe("2")
        expect(r.patch).toBe("3")
        expect(r.prerelease).toBe("beta")
        expect(r.build).toBe("build")
    })
    test("RX15: returns array for unnamed groups", () => {
        const r = match(/^(\w+)@(\w+)$/, "alice@host")
        expect(r[0]).toBe("alice@host")
        expect(r[1]).toBe("alice")
        expect(r[2]).toBe("host")
    })
    test("RX16: null on no match", () => {
        expect(match(patterns.email, "no-email")).toBeNull()
    })
    test("RX17: null for non-string input", () => {
        expect(match(/foo/, null)).toBeNull()
        expect(match(/foo/, 123)).toBeNull()
    })
})

describe("scrml:regex — extract()", () => {
    test("RX18: multiple matches", () => {
        const out = extract(/\b[\w.]+@[\w.]+\.\w+\b/g, "From a@b.com to x@y.org")
        expect(out.length).toBe(2)
        expect(out[0]).toBe("a@b.com")
        expect(out[1]).toBe("x@y.org")
    })
    test("RX19: auto-adds global flag", () => {
        const out = extract(/foo/, "foo bar foo baz foo")
        expect(out.length).toBe(3)
    })
    test("RX20: empty array on no matches", () => {
        expect(extract(/xyz/g, "abc")).toEqual([])
    })
    test("RX20a: named groups in extract", () => {
        const out = extract(/(?<word>\w+)/g, "hello world")
        expect(out.length).toBe(2)
        expect(out[0].word).toBe("hello")
        expect(out[1].word).toBe("world")
    })
})

describe("scrml:regex — replace()", () => {
    test("RX21: replace matches", () => {
        expect(replace(/foo/g, "foo bar foo", "BAZ")).toBe("BAZ bar BAZ")
    })
})

describe("scrml:regex — escape()", () => {
    test("RX22: escapes regex metacharacters", () => {
        expect(escape_("1.2.3")).toBe("1\\.2\\.3")
        expect(escape_("a.b*c+d")).toBe("a\\.b\\*c\\+d")
    })
    test("RX23: empty string for non-string", () => {
        expect(escape_(null)).toBe("")
        expect(escape_(undefined)).toBe("")
    })
    test("RX24: result usable in RegExp constructor", () => {
        const re = new RegExp(escape_("a.b"))
        expect(re.test("xa.by")).toBe(true)
        expect(re.test("axxb")).toBe(false)  // dot is literal, not "any char"
    })
})

describe("scrml:regex — caseInsensitive()", () => {
    test("RX25: returns case-insensitive RegExp", () => {
        const re = caseInsensitive("hello")
        expect(re.test("HELLO")).toBe(true)
        expect(re.test("Hello")).toBe(true)
    })
})

describe("scrml:regex — isValid()", () => {
    test("RX26: valid pattern name + matching value", () => {
        expect(isValid("email", "x@y.z")).toBe(true)
        expect(isValid("uuid", "550e8400-e29b-41d4-a716-446655440000")).toBe(true)
    })
    test("RX27: non-matching value", () => {
        expect(isValid("email", "no")).toBe(false)
    })
    test("RX28: unknown pattern name", () => {
        expect(isValid("nonexistent-pattern", "anything")).toBe(false)
    })
})
