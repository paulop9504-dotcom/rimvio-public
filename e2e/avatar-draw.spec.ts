import { test, expect } from "@playwright/test";
import { RIMVIO_AVATAR_VARIANTS } from "../lib/brand/rimvio-avatar-colors";

test.describe("avatar draw", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("rimvio.draw-redirected", "1");
    });

    await page.goto("/welcome?draw=1");
    await page.evaluate(() => {
      localStorage.removeItem("blink-room-guest");
      localStorage.removeItem("rimvio.avatar-onboarding.v1");
    });
    await page.reload();
  });

  test("draw updates home feed icon color", async ({ page }) => {
    await page.goto("/welcome?draw=1&testVariant=red");
    await expect(page.getByTestId("rimvio-draw-button")).toBeVisible();

    await page.getByTestId("rimvio-draw-button").click();
    await expect(page.getByTestId("rimvio-draw-button")).toBeHidden({
      timeout: 15_000,
    });

    await page.waitForFunction(() => {
      const raw = localStorage.getItem("blink-room-guest");
      if (!raw) return false;
      const guest = JSON.parse(raw) as {
        avatarDrawn?: boolean;
        avatarVariant?: string;
      };
      return guest.avatarDrawn === true && guest.avatarVariant === "red";
    });

    await page.goto("/");
    const feedMark = page
      .getByTestId("rimvio-bottom-nav")
      .getByTestId("rimvio-feed-mark");

    await expect(feedMark.locator("circle").nth(1)).toHaveAttribute(
      "stroke",
      RIMVIO_AVATAR_VARIANTS.red.eyeRing,
      { timeout: 15_000 }
    );
  });

  test("purple draw shows full-screen reveal overlay", async ({ page }) => {
    await page.goto("/welcome?draw=1&testVariant=purple");
    await page.getByTestId("rimvio-draw-button").click();

    await expect(page.getByTestId("rimvio-purple-reveal")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { name: "보라 림비오!" })
    ).toBeVisible();
  });
});
