/**
 * 02-counter.spec.ts — canary e2e test for Wave 3 Dispatch 1.
 *
 * Tests the compiled output of examples/02-counter.scrml served via `scrml dev`
 * on http://localhost:3100. This is the simplest reactive-state example —
 * pass here means the entire Playwright + dev-server + scrml-runtime
 * end-to-end pipeline is wired correctly.
 *
 * Acceptance criteria (survey §A3 — 02-counter row):
 *   AC1 — page loads with count = 0 visible
 *   AC2 — clicking "+" increments by step (default step=1)
 *   AC3 — clicking "−" decrements
 *   AC4 — clicking "Reset" returns count to 0
 *   AC5 — changing step input updates the increment amount
 *
 * Locator strategy: accessible role + name for the three buttons; the count
 * display is the only `<p>` on the page; the step input is the only
 * `input[type=number]`. No brittle CSS-class selectors are used.
 *
 * scrml runtime check: each <p>${@count} interpolation compiles to a
 * `<span data-scrml-logic="...">` placeholder, which the client-side
 * `_scrml_reactive_*` runtime fills on DOMContentLoaded. If the runtime
 * never wires (e.g., scrml-runtime.js failed to load), AC1 itself fails
 * because the visible count text would be empty.
 */

import { test, expect } from "../fixtures/dev-server-fixture";

const PATH = "/02-counter.html";

test.describe("02-counter — reactive state canary", () => {
  // The dev server injects an SSE hot-reload script on every HTML response.
  // Tests should not interact with reload events; if WebKit has trouble with
  // EventSource keep-alive, AC1's page.goto will hang and surface clean.
  test.beforeEach(async ({ page }) => {
    await page.goto(PATH);
  });

  test("AC1 — page loads with count = 0", async ({ page }) => {
    // The count is rendered inside a <p> styled text-6xl. We grab the <p>
    // by its accessible role (paragraph isn't a role; use the locator).
    // Simplest: assert the count display contains "0" — the only digit on
    // the page initially. We scope to a paragraph element to avoid matching
    // the "0" that might appear in class names or button text.
    const countDisplay = page.locator("p.text-6xl");
    await expect(countDisplay).toBeVisible();
    await expect(countDisplay).toHaveText("0");
  });

  test("AC2 — clicking + increments count by step (default 1)", async ({ page }) => {
    const countDisplay = page.locator("p.text-6xl");
    const incrementBtn = page.getByRole("button", { name: "+" });

    await expect(countDisplay).toHaveText("0");

    await incrementBtn.click();
    await expect(countDisplay).toHaveText("1");

    await incrementBtn.click();
    await incrementBtn.click();
    await expect(countDisplay).toHaveText("3");
  });

  test("AC3 — clicking − decrements count", async ({ page }) => {
    const countDisplay = page.locator("p.text-6xl");
    const incrementBtn = page.getByRole("button", { name: "+" });
    const decrementBtn = page.getByRole("button", { name: "−" });

    // Bump up first so the decrement is observable from a non-zero state.
    await incrementBtn.click();
    await incrementBtn.click();
    await expect(countDisplay).toHaveText("2");

    await decrementBtn.click();
    await expect(countDisplay).toHaveText("1");

    await decrementBtn.click();
    await expect(countDisplay).toHaveText("0");

    // Going negative is allowed (no clamp in the source program).
    await decrementBtn.click();
    await expect(countDisplay).toHaveText("-1");
  });

  test("AC4 — Reset button returns count to 0", async ({ page }) => {
    const countDisplay = page.locator("p.text-6xl");
    const incrementBtn = page.getByRole("button", { name: "+" });
    const resetBtn = page.getByRole("button", { name: "Reset" });

    await incrementBtn.click();
    await incrementBtn.click();
    await incrementBtn.click();
    await expect(countDisplay).toHaveText("3");

    await resetBtn.click();
    await expect(countDisplay).toHaveText("0");
  });

  test("AC5 — changing step input updates increment amount", async ({ page }) => {
    const countDisplay = page.locator("p.text-6xl");
    const incrementBtn = page.getByRole("button", { name: "+" });
    const stepInput = page.locator('input[type="number"]');

    await expect(countDisplay).toHaveText("0");

    // Bump step from 1 to 5.
    await stepInput.fill("5");
    // bind:value is wired on input/change — give the runtime a beat to commit.
    // (Playwright auto-waits on the next assertion; no explicit sleep needed.)

    await incrementBtn.click();
    await expect(countDisplay).toHaveText("5");

    await incrementBtn.click();
    await expect(countDisplay).toHaveText("10");

    // Change step to 7 mid-flight; subsequent increment uses new step.
    await stepInput.fill("7");
    await incrementBtn.click();
    await expect(countDisplay).toHaveText("17");
  });
});
