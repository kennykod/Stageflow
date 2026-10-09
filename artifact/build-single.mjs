// Builds ONE self-contained HTML file (JS, CSS and Latin fonts inlined): dist-artifact/stageflow.html
// Open it directly in a browser – no server needed. PDF import is not available in this variant.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

execSync("npx vite build --config artifact/vite.config.mts --logLevel error", { stdio: "inherit", env: { ...process.env, SF_MODE: "single" } });
const out = "dist-artifact";
let css = readFileSync(`${out}/app.css`, "utf8");
css = css.replace(/url\(\.\/files\/([^)]+)\)/g, (m, f) => {
  if (!/-latin(-ext)?-/.test(f)) return "url(data:,)"; // non-Latin subsets: skipped to keep the file small
  const pkg = f.startsWith("inter") ? "inter" : "fraunces";
  const b64 = readFileSync(path.join("node_modules/@fontsource-variable", pkg, "files", f)).toString("base64");
  return `url(data:font/woff2;base64,${b64})`;
});
const js = readFileSync(`${out}/app.js`, "utf8").replace(/<\/script/gi, "<\\/script");
const html = `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>StageFlow – klickbar prototyp</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;
writeFileSync(`${out}/stageflow.html`, html);
console.log(`Wrote ${out}/stageflow.html (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
