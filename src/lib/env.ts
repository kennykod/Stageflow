/**
 * Build-time flags. The Next.js app runs with defaults; the standalone artifact
 * build (artifact/vite.config.mts) sets NEXT_PUBLIC_STAGEFLOW_ARTIFACT=1.
 */
const MODE = process.env.NEXT_PUBLIC_STAGEFLOW_ARTIFACT; // undefined (Next) | "1" (artifact) | "single" (one HTML file)
export const IS_ARTIFACT = MODE === "1" || MODE === "single";

/** Base for static files in /public (absolute in Next, relative in the artifact). */
export const ASSET_BASE = IS_ARTIFACT ? "./" : "/";

/** URL that opens a given in-app path as its own document (used by the split demo's iframes). */
export function pageHref(path: string) {
  if (MODE === "single") return `${window.location.href.split("#")[0]}#${encodeURIComponent(path)}`;
  return IS_ARTIFACT ? `app.html#${encodeURIComponent(path)}` : path;
}

/** The artifact viewer blocks file downloads started by the page. */
export const DOWNLOADS_BLOCKED = MODE === "1";
export const DOWNLOAD_BLOCKED_MSG = "Nedladdning är avstängd i webbförhandsvisningen – fungerar när du kör StageFlow lokalt.";
