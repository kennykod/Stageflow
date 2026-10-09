import { defineConfig } from "vite";
import path from "node:path";

const root = path.resolve(__dirname, "..");

export default defineConfig({
  root,
  base: "./",
  publicDir: false,
  define: {
    "process.env.NEXT_PUBLIC_STAGEFLOW_ARTIFACT": JSON.stringify("1"),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  resolve: {
    alias: [
      { find: /^next\/link$/, replacement: path.join(__dirname, "shims/link.tsx") },
      { find: /^next\/navigation$/, replacement: path.join(__dirname, "shims/navigation.ts") },
      { find: /^@\//, replacement: path.join(root, "src") + "/" },
    ],
  },
  oxc: { jsx: { runtime: "automatic" } },
  build: {
    outDir: path.join(root, "dist-artifact"),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: path.join(__dirname, "main.tsx"),
      output: {
        format: "iife",
        entryFileNames: "app.js",
        assetFileNames: (info) => (info.names?.[0]?.endsWith(".css") ? "app.css" : "assets/[name][extname]"),
        inlineDynamicImports: true,
      },
    },
  },
});
