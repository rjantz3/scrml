/**
 * 05-multi-step-form.spec.ts — Multi-step wizard e2e (Wave 3 Dispatch 2).
 *
 * Tests the compiled output of examples/05-multi-step-form.scrml served via
 * `scrml dev` on http://localhost:3100. This is the only critical-path spec
 * that exercises multi-component composition: three step components
 * (InfoStep / PreferencesStep / ConfirmStep) rendered through an if= chain
 * keyed on `@currentStep: Step:enum`.
 *
 * Acceptance criteria (Wave 3 scoping §A3 — 05-multi-step-form row):
 *   AC1 — page loads on Step 1 (Info)
 *   AC2 — clicking "Next" advances to Step 2 (Preferences); back button visible
 *   AC3 — clicking "Back" returns to Step 1
 *   AC4 — clicking "Next" from Step 2 advances to Step 3 (Confirm)
 *   AC5 — clicking "Submit" sets @submitted = true, prevents double-submit
 *   AC6 — no console errors
 *
 * Locator strategy: prefer step-banner headings ("Your Info", "Preferences",
 * "Confirm") rendered inside `<h2>` tags of each step component, plus
 * accessible button names ("Next", "Back", "Submit"). The wizard progress
 * row at the top of the page uses `class:active=` — we don't assert on
 * that, only on which step's content panel is currently shown.
 *
 * AC5 (double-submit prevention) is asserted via clicking Submit twice; the
 * source guards `if (@submitted) return` so the second click is a no-op.
 * The user-visible effect is that the Confirm screen continues to display
 * (the if-chain does not re-render). We assert by clicking Submit twice
 * and verifying we remain on the Confirm view (no exception, no extra
 * branch swap).
 */

import { test, expect } from "../fixtures/dev-server-fixture";

const PATH = "/05-multi-step-form.html";

test.describe("05-multi-step-form — wizard composition", () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (/EventSource|live-reload/i.test(text)) return;
        consoleErrors.push(text);
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
    await page.goto(PATH);
  });

  test("AC1 — page loads on Step 1 (Info)", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Your Info" })).toBeVisible();
    // The Step 1 view exposes a Next button (no Back, since it's the first step).
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
  });

  test("AC2 — clicking Next advances to Step 2 (Preferences) with Back button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Your Info" })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
  });

  test("AC3 — clicking Back from Step 2 returns to Step 1", async ({ page }) => {
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Your Info" })).toBeVisible();
  });

  test("AC4 — clicking Next from Step 2 advances to Step 3 (Confirm)", async ({ page }) => {
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Confirm" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
  });

  test("AC5 — clicking Submit transitions to confirm + prevents double-submit", async ({ page }) => {
    // Navigate to Step 3.
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Confirm" })).toBeVisible();

    const submitBtn = page.getByRole("button", { name: "Submit" });
    await submitBtn.click();
    // After submit, @submitted=true is set internally. Source forces
    // @currentStep = Step::Confirm — so the user remains on the Confirm view.
    // We click submit again to exercise the double-submit guard.
    await submitBtn.click();
    // Page should still be on the Confirm screen and not have thrown.
    await expect(page.getByRole("heading", { name: "Confirm" })).toBeVisible();
  });

  test("AC6 — no console errors during navigation", async ({ page }) => {
    // Walk the full flow, then assert.
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("heading", { name: "Confirm" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
});
