"use client";

/**
 * Thin wrapper around the browser's Web Speech API.
 *
 * Text is ALWAYS spoken verbatim from the approved script – nothing is generated,
 * paraphrased or improvised. In production this would be replaced by a server-side
 * neural TTS behind an access-controlled, rights-cleared pipeline.
 */

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

export interface VoiceProfile {
  voice?: SpeechSynthesisVoice;
  pitch: number;
  label: string;
}

const PITCHES = [1.0, 0.82, 1.18, 0.92, 1.3, 0.75];

/** Distinct voice per character: prefer Swedish voices, then Nordic, then anything; vary pitch. */
export function assignVoices(characterIds: string[], voices: SpeechSynthesisVoice[]): Map<string, VoiceProfile> {
  const sv = voices.filter((v) => v.lang?.toLowerCase().startsWith("sv"));
  const nordic = voices.filter((v) => /^(nb|no|da|fi)/i.test(v.lang ?? ""));
  const pool = sv.length ? sv : nordic.length ? nordic : voices;
  const m = new Map<string, VoiceProfile>();
  characterIds.forEach((cid, i) => {
    const voice = pool.length ? pool[i % pool.length] : undefined;
    const pitch = PITCHES[i % PITCHES.length]!;
    m.set(cid, { voice, pitch, label: voice ? `${voice.name.replace(/\(.*\)/, "").trim()} · ${voice.lang}` : "Standardröst" });
  });
  return m;
}

let current: SpeechSynthesisUtterance | null = null;

export function speak(text: string, profile: VoiceProfile | undefined, rate: number): Promise<"done" | "cancelled"> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve("done");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = profile?.voice?.lang ?? "sv-SE";
    if (profile?.voice) u.voice = profile.voice;
    u.pitch = profile?.pitch ?? 1;
    u.rate = rate;
    current = u;
    u.onend = () => resolve(current === u ? "done" : "cancelled");
    u.onerror = () => resolve("cancelled");
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  current = null;
  if (ttsSupported()) window.speechSynthesis.cancel();
}

// ---------------------------------------------------------------------------
// Speech recognition (experimental – Chrome/Edge/Safari only)
// ---------------------------------------------------------------------------

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function recognitionSupported() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listenOnce(onInterim: (t: string) => void): { promise: Promise<string>; stop: () => void } {
  const w = window as unknown as Record<string, new () => Rec>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  const rec = new Ctor!();
  rec.lang = "sv-SE";
  rec.interimResults = true;
  rec.continuous = false;
  let finalText = "";
  const promise = new Promise<string>((resolve, reject) => {
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) finalText += r[0]!.transcript;
        else interim += r[0]!.transcript;
      }
      onInterim(finalText + interim);
    };
    rec.onerror = (e) => reject(new Error(e.error));
    rec.onend = () => resolve(finalText);
  });
  rec.start();
  return { promise, stop: () => rec.abort() };
}

/** Rough word-overlap score 0–1 used only for feedback, never to alter text. */
export function similarity(expected: string, said: string) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .split(/\s+/)
      .filter(Boolean);
  const a = norm(expected);
  const b = new Set(norm(said));
  if (!a.length) return 1;
  return a.filter((w) => b.has(w)).length / a.length;
}
