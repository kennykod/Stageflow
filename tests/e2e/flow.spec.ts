import { expect, test } from "@playwright/test";

/** Next Monday – a clean slot (no evening performance the night before → no rest-time warning). */
function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("hela demoflödet: skapa → välj → publicera → se → ändra → kvittera → följ upp → repetera", async ({ page }) => {
  const title = `E2E-repetition ${Date.now().toString().slice(-5)}`;
  const date = nextMonday();

  // Reset to a clean demo state.
  await page.goto("/");
  await page.getByRole("button", { name: /Återställ demo/ }).click();

  // 1–2. Scheduler creates a rehearsal and selects participants via scene suggestions + group chips.
  await page.goto(`/control/repetition/ny?prod=prod-fyren&date=${date}&start=08:00&room=room-las`);
  await page.getByLabel("Titel").fill(title);
  await page.getByLabel("Slut").fill("09:00");
  await page.getByTestId("scene-s-f-13").click();
  await page.getByTestId("add-suggestions").click();
  await expect(page.getByTestId("selected-count")).toContainText("5 kallade");
  await page.getByRole("button", { name: /^Konstnärligt team/ }).click(); // saved group chip adds the dramaturg
  await expect(page.getByTestId("selected-count")).toContainText("6 kallade");

  // 3. Conflict check + review + publish.
  await expect(page.getByText("Inga konflikter – lokal och kallade är lediga.")).toBeVisible();
  await page.getByTestId("review-publish").click();
  await expect(page.getByRole("dialog")).toContainText("Nyinkallade");
  await page.getByTestId("confirm-publish").click();
  await expect(page.getByText("Repetitionen är publicerad")).toBeVisible();

  // 4. Cast member (Sara, default Personal persona) sees it.
  await page.goto("/me/notiser");
  await expect(page.getByText(title).first()).toBeVisible();

  // 5. Scheduler drags it one hour later in the week view and publishes the change.
  await page.goto(`/control/schema?d=${date}&vy=vecka`);
  const ev = page.getByRole("button", { name: new RegExp(`Fyren: ${title}`) });
  await ev.scrollIntoViewIfNeeded();
  const box = (await ev.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 10);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width / 2, box.y + 10 + i * 5.2);
  await page.mouse.up();
  await expect(page.getByText("Flyttad – inte publicerad än")).toBeVisible();
  await page.getByRole("button", { name: "Granska & publicera" }).last().click();
  await expect(page.getByRole("dialog")).toContainText("09:00–10:00");
  await page.getByTestId("confirm-publish").click();
  await expect(page.getByText("Ändringen är publicerad")).toBeVisible();

  // 6. Sara receives the change with before/after and acknowledges it.
  await page.goto("/me/notiser");
  const card = page.locator("article", { hasText: "Ändring i schemat" }).filter({ hasText: title }).first();
  await expect(card).toContainText("08:00–09:00");
  await expect(card).toContainText("09:00–10:00");
  await card.getByTestId("ack-button").click();
  await expect(card).toContainText("Du har tagit del");

  // 7. Manager sees the acknowledgement status.
  await page.goto("/control/kvittenser");
  const dispatch = page.locator("[data-testid^=dispatch-]", { hasText: title }).first();
  await expect(dispatch).toContainText("Ändring");
  await expect(dispatch).toContainText("1 kvitterat");
  await dispatch.getByRole("button", { name: /Visa .* mottagare/ }).click();
  await expect(dispatch).toContainText("Sara Lindqvist");

  // 8. Sara opens the scene and starts rehearsal mode.
  await page.goto("/me/manus/script-fyren?scen=s-f-13");
  await expect(page.getByRole("heading", { name: "Mattias återvänder" })).toBeVisible();
  await page.getByTestId("start-rehearsal-mode").click();
  await page.getByTestId("start-run").click();
  await expect(page.getByTestId("rehearsal-run")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("rehearsal-run")).toContainText(/Din replik|Viveka|Ingrid/);
});

test("behörighet: skådespelare når inte Control", async ({ page }) => {
  await page.goto("/control");
  await page.getByRole("button", { name: /Byt demoroll/ }).first().click();
  await page.getByRole("menuitem", { name: /Sara Lindqvist/ }).click();
  await expect(page.getByRole("heading", { name: "Ingen behörighet" })).toBeVisible();
  // restore
  await page.goto("/");
  await page.getByRole("button", { name: /Återställ demo/ }).click();
});

test("regissören ser bara sin egen produktion", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Återställ demo/ }).click();
  await page.goto("/control");
  await page.getByRole("button", { name: /Byt demoroll/ }).first().click();
  await page.getByRole("menuitem", { name: /Mikael Strand/ }).click();
  await page.goto("/control/schema?vy=lista");
  await expect(page.getByRole("button", { name: "Fyren", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Vinterresan", exact: true })).toHaveCount(0);
  await page.goto("/");
  await page.getByRole("button", { name: /Återställ demo/ }).click();
});
