/**
 * Build-time flags. The Next.js app runs with defaults; the standalone artifact
 * build (artifact/vite.config.mts) sets NEXT_PUBLIC_STAGEFLOW_ARTIFACT=1.
 */
export const IS_ARTIFACT = process.env.NEXT_PUBLIC_STAGEFLOW_ARTIFACT === "1";

/** Base for static files in /public (absolute in Next, relative in the artifact). */
export const ASSET_BASE = IS_ARTIFACT ? "./" : "/";

/** URL that opens a given in-app path as its own document (used by the split demo's iframes). */
export function pageHref(path: string) {
  return IS_ARTIFACT ? `app.html#${encodeURIComponent(path)}` : path;
}

/** The artifact viewer blocks file downloads started by the page. */
export const DOWNLOADS_BLOCKED = IS_ARTIFACT;
export const DOWNLOAD_BLOCKED_MSG = "Nedladdning är avstängd i webbförhandsvisningen – fungerar när du kör StageFlow lokalt.";
