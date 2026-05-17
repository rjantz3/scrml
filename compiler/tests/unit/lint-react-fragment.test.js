/**
 * S97 — W-LINT-023 React Fragment opener `<>`
 *
 * Adopter writes `<><div>a</div><div>b</div></>` expecting a React
 * Fragment. Pre-fix fired generic `E-CTX-001` (context-mismatch error,
 * no framework hint). Post-fix `W-LINT-023` names the shape + scrml
 * alternatives.
 *
 * Pattern matches LITERAL adjacent `<>` chars — the Fragment opener.
 * scrml's BARE CLOSER `</>` has `/` between `<` and `>` so the chars
 * aren't adjacent and the lint doesn't trip on it.
 *
 * SPEC authority: §15 (components return one root), §16 (slots for
 * grouping caller children).
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";

function lintCodes(src) {
  return lintGhostPatterns(src).map((d) => d.code);
}

describe("§1 — W-LINT-023 React Fragment opener", () => {
  test("§1.1 <>...</> Fragment wrapping siblings fires", () => {
    const src = `<program><><div>a</div><div>b</div></></program>`;
    expect(lintCodes(src)).toContain("W-LINT-023");
  });

  test("§1.2 empty Fragment <></> fires", () => {
    const src = `<program><></></program>`;
    expect(lintCodes(src)).toContain("W-LINT-023");
  });

  test("§1.3 Fragment inside a component body fires", () => {
    const src = `<program>\${
      const Wrapper = <div><>inner siblings</></div>
    }<Wrapper/></program>`;
    expect(lintCodes(src)).toContain("W-LINT-023");
  });
});

describe("§2 — anti-cases: don't false-fire on scrml's bare closer", () => {
  test("§2.1 scrml's </> bare closer does NOT fire (chars not adjacent)", () => {
    const src = `<program>\${ const Btn = <button>x</> }<Btn/></program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-023");
  });

  test("§2.2 mixed: </> closer NOT flagged, but <> opener IS flagged", () => {
    const src = `<program><div>x</div><><span>y</span></></program>`;
    const codes = lintCodes(src);
    expect(codes).toContain("W-LINT-023");
    // The `</div>` and `</span>` closers don't independently fire — they
    // contain `<`, `/`, identifier, `>` (with chars between `<` and `>`).
    // Verify only the `<>` opener counted as exactly 1 hit.
    const w23Count = codes.filter((c) => c === "W-LINT-023").length;
    expect(w23Count).toBe(1);
  });

  test("§2.3 comment-skipping", () => {
    const src = `<program>
    // <> is React Fragment; use <div> wrapper or component slot instead
    <div>x</div>
</program>`;
    expect(lintCodes(src)).not.toContain("W-LINT-023");
  });
});

describe("§3 — cross-fire prevention", () => {
  test("§3.1 React Fragment doesn't trip Vue/Angular/TS lint codes", () => {
    const src = `<program><><div>a</div></></program>`;
    const codes = lintCodes(src);
    expect(codes).toContain("W-LINT-023");
    expect(codes).not.toContain("W-LINT-020"); // Vue {{}}
    expect(codes).not.toContain("W-LINT-021"); // Angular
    expect(codes).not.toContain("W-LINT-022"); // TS types
  });
});
