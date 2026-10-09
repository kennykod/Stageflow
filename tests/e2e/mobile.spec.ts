import { expect, test } from "@playwright/test";

test("Personal Idag fungerar i mobilformat och kvittering går med ett tryck", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Återställ demo/ }).click();
  await page.goto("/me");
  await expect(page.getByRole("heading", { name: /Sara/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Personal" })).toBeVisible();
  const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(hasHorizontalScroll).toBe(false);
  await page.getByTestId("ack-button").first().click();
  await expect(page.getByText("Du har tagit del").first()).toBeVisible();
});
