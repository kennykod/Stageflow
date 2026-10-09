// Builds the standalone, clickable StageFlow artifact into dist-artifact/.
// Usage: node artifact/build.mjs
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const out = "dist-artifact";
execSync("npx vite build --config artifact/vite.config.mts --logLevel error", { stdio: "inherit" });

// Fonts referenced by the inlined @fontsource CSS.
mkdirSync(`${out}/files`, { recursive: true });
const css = readFileSync(`${out}/app.css`, "utf8");
const fonts = [...new Set([...css.matchAll(/url\(\.\/files\/([^)]+)\)/g)].map((m) => m[1]))];
for (const f of fonts) {
  const pkg = f.startsWith("inter") ? "inter" : "fraunces";
  copyFileSync(path.join("node_modules/@fontsource-variable", pkg, "files", f), `${out}/files/${f}`);
}

// Static assets used by the app.
mkdirSync(`${out}/demo`, { recursive: true });
copyFileSync("public/demo/exempelmanus-kvinnorna-vid-havet.pdf", `${out}/demo/exempelmanus-kvinnorna-vid-havet.pdf`);
const worker = "node_modules/pdfjs-dist/build/pdf.worker.min.mjs";
if (existsSync(worker)) copyFileSync(worker, `${out}/pdf.worker.min.mjs`);

// Replace raw control bytes (e.g. ESC inside string literals) with JS escapes – same
// runtime value, but the files stay plain text for publishing.
for (const f of ["app.js", "pdf.worker.min.mjs"]) {
  const p = `${out}/${f}`;
  if (!existsSync(p)) continue;
  const src = readFileSync(p, "utf8");
  const fixed = src.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`);
  writeFileSync(p, fixed);
}

const body = `<div id="root"></div>
<noscript>StageFlow kräver JavaScript.</noscript>
<script src="app.js"></script>`;

// The published page (the artifact skeleton adds doctype/head/body around it).
writeFileSync(
  `${out}/index.html`,
  `<title>StageFlow</title>
<link rel="stylesheet" href="app.css">
${body}
`,
);

// A full document used by the split demo's iframes.
writeFileSync(
  `${out}/app.html`,
  `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>StageFlow</title>
<link rel="stylesheet" href="app.css">
</head>
<body>
${body}
</body>
</html>
`,
);
console.log(`Built ${out}/ with ${fonts.length} font files.`);
