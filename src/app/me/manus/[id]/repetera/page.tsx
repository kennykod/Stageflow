"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Lightbulb, Mic, MicOff, Pause, Play, RotateCcw, Volume2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { usePersonalData } from "@/components/personal/data";
import { can } from "@/lib/permissions";
import { assignVoices, listenOnce, loadVoices, recognitionSupported, similarity, speak, stopSpeaking, ttsSupported, type VoiceProfile } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { Button, DemoTag, Segmented, Switch } from "@/components/ui/primitives";
import type { ScriptLine } from "@/lib/types";

type OwnMode = "dold" | "ledtrad" | "visa";

export default function RehearsePage() {
  return (
    <Suspense>
      <Rehearse />
    </Suspense>
  );
}

function Rehearse() {
  const { id } = useParams<{ id: string }>();
  const qs = useSearchParams();
  const router = useRouter();
  const L = useLookups();
  const { meId } = usePersonalData();
  const script = useStore((s) => s.scripts.find((x) => x.id === id));
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const characters = useStore((s) => s.characters);
  const markProgress = useStore((s) => s.markProgress);

  const scene = script?.scenes.find((s) => s.sceneId === qs.get("scen")) ?? script?.scenes[0];
  const sceneChars = useMemo(() => Array.from(new Set((scene?.lines ?? []).map((l) => l.characterId).filter(Boolean) as string[])), [scene]);
  const defaultRole = sceneChars.find((cid) => characters.find((c) => c.id === cid)?.personIds.includes(meId)) ?? sceneChars[0];

  const [phase, setPhase] = useState<"setup" | "run" | "done">("setup");
  const [role, setRole] = useState<string | undefined>(defaultRole);
  const [ownMode, setOwnMode] = useState<OwnMode>("dold");
  const [rate, setRate] = useState(1);
  const [auto, setAuto] = useState(true);
  const [readDirections, setReadDirections] = useState(false);
  const [showPartnerText, setShowPartnerText] = useState(true);
  const [mic, setMic] = useState(false);
  const [voices, setVoices] = useState<Map<string, VoiceProfile>>(new Map());
  const [tts, setTts] = useState(false);
  const [micOk, setMicOk] = useState(false);

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reveal, setReveal] = useState(0);
  const [hints, setHints] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const token = useRef(0);

  useEffect(() => {
    setTts(ttsSupported());
    setMicOk(recognitionSupported());
    loadVoices().then((v) => setVoices(assignVoices([...sceneChars, "__narrator"], v)));
    return () => stopSpeaking();
  }, [sceneChars]);
  useEffect(() => setRole(defaultRole), [defaultRole]);

  const lines: ScriptLine[] = useMemo(() => (scene?.lines ?? []).filter((l) => l.characterId || readDirections), [scene, readDirections]);
  const line = lines[idx];
  const isMine = !!line && line.characterId === role;

  const next = useCallback(() => setIdx((i) => Math.min(lines.length, i + 1)), [lines.length]);
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  // The rehearsal engine: speak partner lines, wait (or listen) on yours.
  useEffect(() => {
    if (phase !== "run" || paused) return;
    if (idx >= lines.length) {
      setPhase("done");
      return;
    }
    const my = ++token.current;
    const l = lines[idx]!;
    setReveal(0);
    setHeard("");
    setScore(null);
    let stopListen: (() => void) | undefined;

    if (l.characterId === role) {
      if (mic && micOk) {
        setListening(true);
        const h = listenOnce((t) => token.current === my && setHeard(t));
        stopListen = h.stop;
        h.promise
          .then((said) => {
            if (token.current !== my) return;
            setListening(false);
            setScore(similarity(l.text, said));
            setTimeout(() => token.current === my && next(), 900);
          })
          .catch(() => token.current === my && setListening(false));
      }
    } else {
      (async () => {
        setSpeaking(true);
        const profile = voices.get(l.characterId ?? "__narrator");
        if (tts) await speak(l.text, profile, rate);
        else await new Promise((r) => setTimeout(r, Math.max(1400, l.text.split(/\s+/).length * 380) / rate));
        if (token.current !== my) return;
        setSpeaking(false);
        if (auto) next();
      })();
    }
    return () => {
      token.current++;
      stopSpeaking();
      stopListen?.();
      setSpeaking(false);
      setListening(false);
    };
  }, [phase, idx, paused, lines, role, mic, micOk, tts, voices, rate, auto, next]);

  useEffect(() => {
    if (phase !== "run") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" || e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") prev();
      else if (e.key.toLowerCase() === "h" && isMine) {
        setReveal((r) => Math.min(2, r + 1));
        setHints((h) => h + 1);
      } else if (e.key.toLowerCase() === "p") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next, prev, isMine]);

  if (!script || !scene || !can({ people, memberships }, meId, "script.read", script.productionId)) {
    return (
      <div className="px-5 pt-10 text-center">
        <h1 className="font-display text-2xl">Repetitionsläget kan inte öppnas</h1>
        <Link href="/me/manus" className="mt-5 inline-block">
          <Button>Till manus</Button>
        </Link>
      </div>
    );
  }

  const meta = L.scene(scene.sceneId);
  const charName = (cid: string | null) => (cid ? (L.character(cid)?.name ?? "") : "Scenanvisning");
  const backHref = `/me/manus/${script.id}?scen=${scene.sceneId}`;
  const myCount = lines.filter((l) => l.characterId === role).length;

  // ---------------------------------------------------------------- setup
  if (phase === "setup") {
    return (
      <div className="min-h-dvh bg-canvas px-5 pt-4 pb-10">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push(backHref)} className="inline-flex min-h-11 items-center gap-1 rounded-xl text-sm font-medium text-ink-2" aria-label="Stäng">
            <X className="size-5" /> Stäng
          </button>
          <DemoTag kind="simulerad" />
        </div>
        <div className="mt-3 text-xs font-semibold tracking-wide text-ink-3 uppercase">Repetitionsläge · Scen {meta?.number}</div>
        <h1 className="font-display text-[30px] leading-tight font-medium">{meta?.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          AI-partnern läser motspelarnas repliker ordagrant ur det verifierade manuset. Dina repliker är tysta – du säger dem själv.
        </p>

        <div className="mt-6 space-y-5">
          <section>
            <h2 className="mb-2 text-sm font-semibold">Jag läser som</h2>
            <div className="flex flex-wrap gap-2">
              {sceneChars.map((cid) => (
                <button
                  key={cid}
                  onClick={() => setRole(cid)}
                  aria-pressed={role === cid}
                  className={cn("h-10 rounded-full border px-4 text-sm font-semibold transition-colors", role === cid ? "border-transparent bg-accent text-accent-ink" : "border-line bg-surface")}
                >
                  {charName(cid)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-3">{myCount} repliker för {charName(role ?? null)} i scenen.</p>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Mina repliker</h2>
            <Segmented<OwnMode>
              label="Mina repliker"
              value={ownMode}
              onChange={setOwnMode}
              className="w-full"
              options={[
                { value: "dold", label: "Dolda" },
                { value: "ledtrad", label: "Ledtråd" },
                { value: "visa", label: "Synliga" },
              ]}
            />
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Talhastighet</h2>
              <span className="text-sm text-ink-3 tabular">{rate.toFixed(1)}×</span>
            </div>
            <input type="range" min={0.6} max={1.5} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-[var(--accent)]" aria-label="Talhastighet" />
          </section>

          <section className="divide-y divide-line rounded-3xl border border-line bg-surface">
            <Toggle label="Gå vidare automatiskt" hint="Efter motspelarens replik" checked={auto} onChange={setAuto} />
            <Toggle label="Visa motspelarens text" checked={showPartnerText} onChange={setShowPartnerText} />
            <Toggle label="Läs scenanvisningar" hint="Med berättarröst" checked={readDirections} onChange={setReadDirections} />
            <Toggle
              label={
                <span className="flex items-center gap-2">
                  Mikrofonläge <DemoTag kind="experimentell" />
                </span>
              }
              hint={micOk ? "Lyssnar när det är din tur och går vidare när du talat klart" : "Stöds inte i den här webbläsaren"}
              checked={mic && micOk}
              disabled={!micOk}
              onChange={setMic}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">Röster</h2>
            {!tts && <p className="mb-2 rounded-2xl bg-warn-soft px-3 py-2 text-[13px] text-warn">Talsyntes stöds inte här – motspelarens repliker visas som text med automatisk tidtagning.</p>}
            <ul className="divide-y divide-line rounded-3xl border border-line bg-surface">
              {sceneChars
                .filter((c) => c !== role)
                .map((cid) => {
                  const firstLine = scene.lines.find((l) => l.characterId === cid);
                  return (
                    <li key={cid} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{charName(cid)}</span>
                        <span className="block truncate text-xs text-ink-3">
                          {voices.get(cid)?.label ?? "Standardröst"} · tonhöjd {voices.get(cid)?.pitch.toFixed(2)}
                        </span>
                      </span>
                      <Button size="sm" variant="ghost" disabled={!tts || !firstLine} onClick={() => firstLine && speak(firstLine.text, voices.get(cid), rate)}>
                        <Volume2 /> Provlyssna
                      </Button>
                    </li>
                  );
                })}
            </ul>
          </section>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            data-testid="start-run"
            disabled={!role}
            onClick={() => {
              setIdx(0);
              setHints(0);
              setPaused(false);
              setPhase("run");
              markProgress("rehearsalStarted");
            }}
          >
            <Play /> Starta repetitionen
          </Button>
          <p className="text-center text-xs leading-relaxed text-ink-3">
            Inga repliker skapas, ändras eller improviseras. Ljud bearbetas lokalt i webbläsaren. I produktion: rättighetsklarerad, säker AI-tjänst.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- done
  if (phase === "done") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0b1020] px-6 text-center text-white">
        <div className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">Ridå</div>
        <h1 className="mt-3 font-display text-4xl font-medium">Scenen är slut</h1>
        <p className="mt-3 text-white/70">
          {myCount} repliker som {charName(role ?? null)} · {hints === 0 ? "inga ledtrådar – starkt!" : `${hints} ledtrådar`}
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
          <Button
            size="lg"
            className="border-0 bg-white text-[#0b1020] hover:bg-white/90"
            onClick={() => {
              setIdx(0);
              setHints(0);
              setPhase("run");
            }}
          >
            <RotateCcw /> Repetera igen
          </Button>
          <Button size="lg" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setPhase("setup")}>
            Ändra inställningar
          </Button>
          <Link href={backHref}>
            <Button size="lg" variant="ghost" className="w-full text-white/80 hover:bg-white/10 hover:text-white">
              Tillbaka till manus
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- run
  const prevLine = lines[idx - 1];
  const upcoming = lines[idx + 1];
  const words = line?.text.split(/\s+/) ?? [];
  const showOwn = ownMode === "visa" || reveal >= 2;
  const hintText = ownMode === "ledtrad" || reveal === 1 ? words.slice(0, 3).join(" ") + " …" : null;

  return (
    <div className="flex min-h-dvh flex-col bg-[#0b1020] text-white" data-testid="rehearsal-run">
      <div className="flex items-center justify-between px-4 pt-3">
        <button onClick={() => setPhase("setup")} className="inline-flex size-11 items-center justify-center rounded-xl text-white/70 hover:bg-white/10" aria-label="Avsluta">
          <X className="size-5" />
        </button>
        <div className="text-center">
          <div className="text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">Scen {meta?.number}</div>
          <div className="text-sm font-semibold">{meta?.title}</div>
        </div>
        <span className="w-11 text-right text-sm text-white/60 tabular">
          {Math.min(idx + 1, lines.length)}/{lines.length}
        </span>
      </div>
      <div className="mx-4 mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[var(--gold)] transition-[width] duration-500" style={{ width: `${(idx / lines.length) * 100}%` }} />
      </div>

      <div className="flex flex-1 flex-col justify-center px-5 py-8" aria-live="polite">
        {prevLine && (
          <p className="mb-6 line-clamp-2 text-[15px] leading-relaxed text-white/35">
            <span className="mr-2 text-[11px] font-bold tracking-[0.1em] uppercase">{charName(prevLine.characterId)}</span>
            {prevLine.text}
          </p>
        )}
        {line && (
          <div key={line.id} className={cn("animate-rise rounded-[28px] p-6", isMine ? "bg-[var(--gold)]/15 ring-1 ring-[var(--gold)]/40" : "bg-white/[0.06]")}>
            <div className="flex items-center justify-between">
              <span className={cn("text-[12px] font-bold tracking-[0.14em] uppercase", isMine ? "text-[var(--gold)]" : "text-white/60")}>
                {isMine ? `Din replik · ${charName(line.characterId)}` : charName(line.characterId)}
              </span>
              {speaking && (
                <span className="flex h-4 items-end gap-0.5" aria-label="Läser upp">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="w-1 animate-[rise_0.6s_ease-in-out_infinite_alternate] rounded-full bg-white/70" style={{ height: `${40 + i * 15}%`, animationDelay: `${i * 0.12}s` }} />
                  ))}
                </span>
              )}
              {listening && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--gold)]">
                  <Mic className="size-4 animate-pulse" /> Lyssnar…
                </span>
              )}
            </div>
            {isMine ? (
              showOwn ? (
                <p className="mt-3 font-display text-[26px] leading-snug">{line.text}</p>
              ) : hintText ? (
                <p className="mt-3 font-display text-[26px] leading-snug text-white/80">{hintText}</p>
              ) : (
                <div className="mt-4 space-y-2.5" aria-label="Repliken är dold">
                  <div className="h-3.5 w-11/12 rounded-full bg-white/15" />
                  <div className="h-3.5 w-3/4 rounded-full bg-white/15" />
                  {words.length > 10 && <div className="h-3.5 w-1/2 rounded-full bg-white/15" />}
                </div>
              )
            ) : showPartnerText || !line.characterId ? (
              <p className={cn("mt-3 text-[22px] leading-snug", !line.characterId && "text-white/70 italic")}>{line.text}</p>
            ) : (
              <p className="mt-3 text-white/50">Lyssna…</p>
            )}
            {isMine && heard && <p className="mt-4 text-sm text-white/60">Du sa: ”{heard}”</p>}
            {isMine && score !== null && (
              <p className={cn("mt-1 text-sm font-semibold", score > 0.75 ? "text-[#6fcf98]" : "text-[var(--gold)]")}>
                {score > 0.75 ? "Mycket nära manus" : `${Math.round(score * 100)} % av orden träffade`}
              </p>
            )}
          </div>
        )}
        {upcoming && <p className="mt-6 text-center text-xs font-semibold tracking-[0.14em] text-white/40 uppercase">Nästa: {upcoming.characterId === role ? "Du" : charName(upcoming.characterId)}</p>}
      </div>

      <div className="safe-bottom px-5 pb-4">
        {isMine && !showOwn && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button
              size="lg"
              variant="ghost"
              className="bg-white/[0.06] text-white hover:bg-white/10"
              onClick={() => {
                setReveal((r) => Math.max(r, 1));
                setHints((h) => h + 1);
              }}
            >
              <Lightbulb /> Ledtråd
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="bg-white/[0.06] text-white hover:bg-white/10"
              onClick={() => {
                setReveal(2);
                setHints((h) => h + 1);
              }}
            >
              Visa repliken
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <Button size="icon" variant="ghost" className="size-14 rounded-2xl text-white hover:bg-white/10" aria-label="Föregående replik" onClick={prev} disabled={idx === 0}>
            <ChevronLeft className="!size-6" />
          </Button>
          <Button
            size="lg"
            className="h-14 flex-1 rounded-2xl border-0 bg-white text-base text-[#0b1020] hover:bg-white/90"
            onClick={() => (paused ? setPaused(false) : isMine || !auto ? next() : setPaused(true))}
            data-testid="run-primary"
          >
            {paused ? (
              <>
                <Play /> Fortsätt
              </>
            ) : isMine ? (
              <>
                {mic && micOk ? <MicOff /> : <ChevronRight />} {mic && micOk ? "Hoppa vidare" : "Klar – nästa"}
              </>
            ) : auto ? (
              <>
                <Pause /> Pausa
              </>
            ) : (
              <>
                <ChevronRight /> Nästa
              </>
            )}
          </Button>
          <Button size="icon" variant="ghost" className="size-14 rounded-2xl text-white hover:bg-white/10" aria-label="Nästa replik" onClick={next}>
            <ChevronRight className="!size-6" />
          </Button>
        </div>
        <p className="mt-3 hidden text-center text-[11px] text-white/40 sm:block">Mellanslag = nästa · ← föregående · H = ledtråd · P = paus</p>
      </div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange, disabled }: { label: React.ReactNode; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={cn("flex min-h-[56px] items-center gap-3 px-4 py-2.5", disabled && "opacity-60")}>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-ink-3">{hint}</span>}
      </span>
      <Switch checked={checked} onChange={(v) => !disabled && onChange(v)} label={typeof label === "string" ? label : "Mikrofonläge"} />
    </div>
  );
}
