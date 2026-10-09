import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/control", "/control/schema", "/control/repetition/ny?prod=prod-fyren", "/control/kvittenser", "/control/produktioner", "/control/manus", "/me", "/me/schema", "/me/notiser", "/me/manus/script-fyren?scen=s-f-13", "/me/profil"];

for (const [scheme, path] of PAGES.flatMap((p) => [["light", p], ["dark", p]] as const)) {
  test(`a11y (WCAG 2.2 AA, axe, ${scheme}): ${path}`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    if (serious.length) console.log(path, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary ?? "").slice(0, 160)) })), null, 1));
    await ctx.close();
    expect(serious).toEqual([]);
  });
}
