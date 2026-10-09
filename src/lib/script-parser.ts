/**
 * Heuristic parser for plain-text play scripts (from PDF text extraction or .txt).
 *
 * Recognises:
 *   - Scene headings:   "SCEN 1:3 – Mattias återvänder", "AKT 2: Natten", "Akt 1. Bryggan"
 *   - Dialogue:         "INGRID: Hej." or a NAME line in capitals followed by text lines
 *   - Stage directions: lines wrapped in ( ) or [ ], or prefixed "Scenanvisning:"
 *
 * The result is ALWAYS reviewed by a human before publishing (status "granskas"),
 * and lines with low confidence are flagged for review.
 */

export interface ParsedLine {
  speaker: string | null; // null = stage direction
  text: string;
  confidence: "hog" | "lag";
}
export interface ParsedScene {
  heading: string;
  number: string;
  title: string;
  lines: ParsedLine[];
}
export interface ParseResult {
  scenes: ParsedScene[];
  speakers: { name: string; count: number }[];
  warnings: string[];
}

const SCENE_RE = /^(?:SCEN|Scen|AKT|Akt|AKT\.|SCENE|Scene)\s+([0-9IVX]+(?:[:.][0-9]+)?)\s*(?:[-–—:.]\s*)?(.*)$/;
const INLINE_RE = /^([A-ZÅÄÖÉ][A-ZÅÄÖÉ .'-]{0,28}[A-ZÅÄÖÉ])\s*[:：]\s*(.+)$/;
const NAME_ONLY_RE = /^([A-ZÅÄÖÉ][A-ZÅÄÖÉ .'-]{0,28}[A-ZÅÄÖÉ])\s*[:：]?$/;
const DIRECTION_RE = /^[([].*[)\]]$/;

function cleanName(s: string) {
  const t = s.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function parseScript(raw: string): ParseResult {
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim());
  const scenes: ParsedScene[] = [];
  const warnings: string[] = [];
  let current: ParsedScene | null = null;
  let pendingSpeaker: string | null = null;
  let last: ParsedLine | null = null;

  // Text before the first scene heading (title page, cast list…) is kept aside as front matter.
  const front: ParsedScene = { heading: "Försättsblad", number: "0", title: "Försättsblad", lines: [] };
  const ensureScene = () => current ?? front;

  for (const l of lines) {
    if (!l) {
      pendingSpeaker = null;
      last = null;
      continue;
    }
    if (/^\d+$/.test(l)) continue; // page numbers
    const sm = l.match(SCENE_RE);
    if (sm) {
      current = { heading: l, number: sm[1]!, title: sm[2]?.trim() || `Scen ${sm[1]}`, lines: [] };
      scenes.push(current);
      pendingSpeaker = null;
      last = null;
      continue;
    }
    const sc = ensureScene();
    if (DIRECTION_RE.test(l) || /^scenanvisning:/i.test(l)) {
      last = { speaker: null, text: l.replace(/^[([]|[)\]]$/g, "").replace(/^scenanvisning:\s*/i, "").trim(), confidence: "hog" };
      sc.lines.push(last);
      pendingSpeaker = null;
      continue;
    }
    const im = l.match(INLINE_RE);
    if (im) {
      last = { speaker: cleanName(im[1]!), text: im[2]!.trim(), confidence: "hog" };
      sc.lines.push(last);
      pendingSpeaker = null;
      continue;
    }
    const nm = l.match(NAME_ONLY_RE);
    if (nm && l.length <= 30) {
      pendingSpeaker = cleanName(nm[1]!);
      last = null;
      continue;
    }
    if (pendingSpeaker) {
      last = { speaker: pendingSpeaker, text: l, confidence: "hog" };
      sc.lines.push(last);
      pendingSpeaker = null;
      continue;
    }
    if (last) {
      // Wrapped continuation of the previous line.
      last.text = `${last.text} ${l}`;
      continue;
    }
    // Unknown prose → treat as direction but flag for review.
    last = { speaker: null, text: l, confidence: "lag" };
    sc.lines.push(last);
  }

  if (!scenes.length && front.lines.length) {
    scenes.push({ ...front, heading: "Scen 1", number: "1", title: "Utan rubrik" });
    warnings.push("Inga scenrubriker hittades – all text lades i en scen.");
  } else if (front.lines.length) {
    warnings.push(`Försättsblad före första scenen (${front.lines.length} rader) ignorerades.`);
  }

  const counts = new Map<string, number>();
  scenes.forEach((s) => s.lines.forEach((x) => x.speaker && counts.set(x.speaker, (counts.get(x.speaker) ?? 0) + 1)));
  const speakers = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const low = scenes.reduce((a, s) => a + s.lines.filter((x) => x.confidence === "lag").length, 0);
  if (low) warnings.push(`${low} rader kunde inte tolkas säkert och markeras för granskning.`);
  if (!scenes.length) warnings.push("Inga scener hittades.");
  return { scenes, speakers, warnings };
}
