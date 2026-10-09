import { expect, test } from "@playwright/test";

test("manusimport: exempel-PDF → tolkning → verifiering → synligt i Personal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Återställ demo/ }).click();
  await page.goto("/control/manus");
  await page.getByRole("button", { name: "Importera manus" }).click();
  await page.getByLabel("Produktion").selectOption("prod-hav");
  await page.getByRole("checkbox", { name: "Bekräfta rättigheter" }).check();
  await page.getByTestId("use-sample-pdf").click();
  await expect(page.getByRole("heading", { name: "Granska tolkningen" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("dialog")).toContainText("2 scener · 4 talare");
  await expect(page.getByLabel("Roll för Agnes")).toHaveValue("c-agnes");
  await page.screenshot({ path: "test-results/import-review.png" });
  await page.getByTestId("save-import").click();
  const card = page.locator("[data-testid^=script-]", { hasText: "Väntar på verifiering" });
  await expect(card).toBeVisible();
  await card.getByTestId("verify-script").click();
  await expect(page.getByText("Manuset är verifierat")).toBeVisible();
  // Lena is a member of all productions → can read it in Personal.
  await page.goto("/me/profil");
  await page.getByRole("button", { name: /Lena Bergström/ }).last().click();
  await page.goto("/me/manus");
  await expect(page.getByRole("heading", { name: "Kvinnorna vid havet" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: /Återställ demo/ }).click();
});
