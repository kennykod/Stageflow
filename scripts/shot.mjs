// Dev helper: node scripts/shot.mjs <outdir> <width> <path...>  – screenshots + console errors.
import { chromium } from "@playwright/test";
const [outDir, width, ...paths] = process.argv.slice(2);
const w = Number(width) || 1440;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 860 : 900 }, deviceScaleFactor: w < 600 ? 2 : 1, colorScheme: process.env.DARK ? "dark" : "light" });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log("CONSOLE:", m.text().slice(0, 300)));
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message.slice(0, 300)));
for (const p of paths) {
  await page.goto("http://localhost:3000" + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const name = (p.replace(/[^a-z0-9]+/gi, "_") || "root") + `_${w}.png`;
  await page.screenshot({ path: `${outDir}/${name}`, fullPage: process.env.FULL === "1" });
  console.log("shot", name);
}
await browser.close();
