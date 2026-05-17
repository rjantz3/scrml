/**
 * S97 — W-LINT-020 (Vue {{}}), W-LINT-021 (Angular), W-LINT-022 (TS types).
 *
 * Closes the 6 uncovered-gap fixtures from the S97 stress harness — each
 * was a silently-accepted non-scrml shape that emitted broken HTML/JS at
 * runtime with NO compile-time diagnostic.
 *
 * Pre-fix:
 *   {{ user.name }}              → emitted as literal text in HTML
 *   *ngIf="flag"                 → silently parsed as boolean attribute
 *   (click)="fn()"               → silently parsed as `(click)` attr name
 *   [(ngModel)]="x"              → silently parsed
 *   interface Foo { ... }        → E-SCOPE-001 (generic; no framework hint)
 *   type X = { ... }             → silently accepted; `{ ... }` becomes empty literal
 *
 * Post-fix: pattern-specific W-LINT-* with scrml-primitive guidance.
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";

function lintCodes(src) {
  return lintGhostPatterns(src).map((d) => d.code);
}

// ---------------------------------------------------------------------------
// §1 — W-LINT-020 Vue {{}} double-brace interpolation
// ---------------------------------------------------------------------------

describe("§1 — W-LINT-020 Vue double-brace interpolation", () => {
  test("§1.1 {{ user.name }} fires", () => {
    const src = `<program><div>{{ user.name }}</div></program>`;
    expect(lintCodes(src)).toContain("W-LINT-020");
  });

  test("§1.2 multiple {{ ... }} in one element fire once each", () => {
    const src = `<program><div>{{ a }} and {{ b }}</div></program>`;
    const w20Count = lintCodes(src).filter((c) => c === "W-LINT-020").length;
    expect(w20Count).toBe(2);
  });

  test("§1.3 scrml ${...} interpolation does NOT fire (regression guard)", () => {
    const src = `<program><x> = 0<div>\${@x}</div></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-020");
  });

  test("§1.4 comment-skipping", () => {
    const src = `<program>
    // {{ user.name }} is Vue; use \${@user.name}
    <user> = "alice"
    <div>\${@user}</div>
</program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-020");
  });
});

// ---------------------------------------------------------------------------
// §2 — W-LINT-021 Angular directives (3 sub-patterns share the code)
// ---------------------------------------------------------------------------

describe("§2 — W-LINT-021 Angular structural directives", () => {
  test("§2.1 *ngIf= fires", () => {
    const src = `<program><div *ngIf="show">x</div></program>`;
    expect(lintCodes(src)).toContain("W-LINT-021");
  });

  test("§2.2 *ngFor= fires", () => {
    const src = `<program><li *ngFor="let item of items">x</li></program>`;
    expect(lintCodes(src)).toContain("W-LINT-021");
  });

  test("§2.3 *ngSwitch= and *ngSwitchCase= fire", () => {
    const src = `<program><div *ngSwitch="phase"><div *ngSwitchCase="'a'">A</div></div></program>`;
    const w21Count = lintCodes(src).filter((c) => c === "W-LINT-021").length;
    expect(w21Count).toBeGreaterThanOrEqual(2);
  });
});

describe("§2b — W-LINT-021 Angular event binding (event)=", () => {
  test("§2b.1 (click)= fires", () => {
    const src = `<program><button (click)="fn()">x</button></program>`;
    expect(lintCodes(src)).toContain("W-LINT-021");
  });

  test("§2b.2 (submit)= and (change)= fire", () => {
    const src = `<program><form (submit)="fn()"><input (change)="up()" /></form></program>`;
    const w21Count = lintCodes(src).filter((c) => c === "W-LINT-021").length;
    expect(w21Count).toBeGreaterThanOrEqual(2);
  });

  test("§2b.3 scrml class:active=(expr) parens-AFTER-= does NOT fire (regression guard)", () => {
    const src = `<program><x> = true<div class:active=(@x || true)>x</div></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-021");
  });
});

describe("§2c — W-LINT-021 Angular [(ngModel)]= / [prop]= binding", () => {
  test("§2c.1 [(ngModel)]= fires", () => {
    const src = `<program><input [(ngModel)]="name" /></program>`;
    expect(lintCodes(src)).toContain("W-LINT-021");
  });

  test("§2c.2 [class.X]= fires", () => {
    const src = `<program><div [class.active]="isActive">x</div></program>`;
    expect(lintCodes(src)).toContain("W-LINT-021");
  });

  test("§2c.3 [disabled]= fires", () => {
    const src = `<program><button [disabled]="busy">x</button></program>`;
    expect(lintCodes(src)).toContain("W-LINT-021");
  });
});

// ---------------------------------------------------------------------------
// §3 — W-LINT-022 TypeScript untagged type declarations
// ---------------------------------------------------------------------------

describe("§3 — W-LINT-022 TypeScript untagged types", () => {
  test("§3.1 interface Foo { ... } fires", () => {
    const src = `<program>\${ interface User { name: string } }<div>x</div></program>`;
    expect(lintCodes(src)).toContain("W-LINT-022");
  });

  test("§3.2 type X = { ... } (untagged) fires", () => {
    const src = `<program>\${ type User = { name: string } }<div>x</div></program>`;
    expect(lintCodes(src)).toContain("W-LINT-022");
  });

  test("§3.3 scrml `type X:struct = { ... }` does NOT fire (regression guard)", () => {
    const src = `<program>\${ type User:struct = { name: string } }<div>x</div></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-022");
  });

  test("§3.4 scrml `type X:enum = { ... }` does NOT fire (regression guard)", () => {
    const src = `<program>\${ type Phase:enum = { Idle, Loading } }<div>x</div></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-022");
  });

  test("§3.5 comment-skipping for both shapes", () => {
    const src = `<program>
    // interface Foo and type X = {} are TypeScript
    \${ type User:struct = { name: string } }
    <div>x</div>
</program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-022");
  });
});

// ---------------------------------------------------------------------------
// §4 — Cross-fire prevention
// ---------------------------------------------------------------------------

describe("§4 — cross-fire prevention", () => {
  test("§4.1 Vue {{}} doesn't trip Angular / TS codes", () => {
    const src = `<program><div>{{ user.name }}</div></program>`;
    const codes = lintCodes(src);
    expect(codes).toContain("W-LINT-020");
    expect(codes).not.toContain("W-LINT-021");
    expect(codes).not.toContain("W-LINT-022");
  });

  test("§4.2 Angular *ngIf doesn't trip Vue / TS codes", () => {
    const src = `<program><div *ngIf="x">y</div></program>`;
    const codes = lintCodes(src);
    expect(codes).toContain("W-LINT-021");
    expect(codes).not.toContain("W-LINT-020");
    expect(codes).not.toContain("W-LINT-022");
  });

  test("§4.3 TS interface doesn't trip Vue / Angular codes", () => {
    const src = `<program>\${ interface Foo { x: number } }<div>x</div></program>`;
    const codes = lintCodes(src);
    expect(codes).toContain("W-LINT-022");
    expect(codes).not.toContain("W-LINT-020");
    expect(codes).not.toContain("W-LINT-021");
  });
});
