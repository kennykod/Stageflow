"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bookmark, BookmarkCheck, Eye, EyeOff, Highlighter, Mic, NotebookPen, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { usePersonalData } from "@/components/personal/data";
import { can } from "@/lib/permissions";
import { cn, prodVars } from "@/lib/utils";
import { Button, Switch, Textarea } from "@/components/ui/primitives";
import { Dialog, Sheet, toast } from "@/components/ui/overlay";
import { fmtStamp } from "@/lib/time";

export default function ReaderPage() {
  return (
    <Suspense>
      <Reader />
    </Suspense>
  );
}

function Reader() {
  const { id } = useParams<{ id: string }>();
  const qs = useSearchParams();
  const router = useRouter();
  const L = useLookups();
  const { meId } = usePersonalData();
  const script = useStore((s) => s.scripts.find((x) => x.id === id));
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const characters = useStore((s) => s.characters);
  const bookmarks = useStore((s) => s.bookmarks);
  const annotations = useStore((s) => s.annotations);
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const setAnnotation = useStore((s) => s.setAnnotation);
  const markProgress = useStore((s) => s.markProgress);

  const sceneParam = qs.get("scen");
  const [sceneId, setSceneId] = useState<string | undefined>(sceneParam ?? script?.scenes[0]?.sceneId);
  const [highlight, setHighlight] = useState(true);
  const [hideMine, setHideMine] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [noteLine, setNoteLine] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [marksOpen, setMarksOpen] = useState(false);
  const chipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    markProgress("scriptOpened");
    chipRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myChars = useMemo(() => characters.filter((c) => c.productionId === script?.productionId && c.personIds.includes(meId)), [characters, script, meId]);
  const myCharIds = new Set(myChars.map((c) => c.id));

  if (!script || !can({ people, memberships }, meId, "script.read", script.productionId) || script.status !== "verifierad") {
    return (
      <div className="px-5 pt-10 text-center">
        <h1 className="font-display text-2xl">Manuset kan inte visas</h1>
        <p className="mt-2 text-sm text-ink-3">Du saknar behörighet till produktionens manus, eller så är det inte verifierat ännu.</p>
        <Link href="/me/manus" className="mt-5 inline-block">
          <Button>Till manus</Button>
        </Link>
      </div>
    );
  }

  const prod = L.production(script.productionId)!;
  const scene = script.scenes.find((s) => s.sceneId === sceneId) ?? script.scenes[0]!;
  const meta = L.scene(scene.sceneId);
  const myBookmarks = new Set(bookmarks.filter((b) => b.personId === meId).map((b) => b.lineId));
  const myNotes = new Map(annotations.filter((a) => a.personId === meId).map((a) => [a.lineId, a]));
  const allLines = script.scenes.flatMap((s) => s.lines.map((l) => ({ ...l, sceneId: s.sceneId })));

  return (
    <div style={prodVars(prod.color)}>
      <div className="sticky top-[52px] z-20 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 px-3 pt-1">
          <button onClick={() => router.push("/me/manus")} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-ink-2 hover:text-ink">
            <ArrowLeft className="size-4" /> {script.title}
          </button>
          <Button size="sm" variant="ghost" onClick={() => setMarksOpen(true)}>
            <Bookmark /> Mina markeringar
          </Button>
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pt-1 pb-3" role="tablist" aria-label="Scener">
          {script.scenes.map((s) => {
            const m = L.scene(s.sceneId);
            const active = s.sceneId === scene.sceneId;
            const hasMe = s.lines.some((l) => l.characterId && myCharIds.has(l.characterId));
            return (
              <button
                key={s.sceneId}
                ref={active ? chipRef : undefined}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSceneId(s.sceneId);
                  setRevealed(new Set());
                  router.replace(`/me/manus/${script.id}?scen=${s.sceneId}`, { scroll: false });
                  window.scrollTo({ top: 0 });
                }}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  active ? "border-transparent bg-accent text-accent-ink" : "border-line bg-surface text-ink-2",
                )}
              >
                <span className="tabular opacity-80">{m?.number}</span>
                {m?.title}
                {hasMe && <span className={cn("size-1.5 rounded-full", active ? "bg-gold" : "bg-[var(--pc)]")} aria-label="Du är med" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Scen {meta?.number}</div>
        <h1 className="font-display text-[28px] leading-tight font-medium">{meta?.title}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3">
          <ShieldCheck className="size-3.5 text-ok" /> {script.version} · verifierat {script.verifiedAt ? fmtStamp(script.verifiedAt) : ""} av {L.person(script.verifiedBy ?? "")?.name}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5 text-[13px] font-medium">
            <span className="flex items-center gap-2">
              <Highlighter className="size-4 text-gold" /> Markera mina
            </span>
            <Switch checked={highlight} onChange={setHighlight} label="Markera mina repliker" />
          </label>
          <label className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5 text-[13px] font-medium">
            <span className="flex items-center gap-2">
              <EyeOff className="size-4 text-ink-3" /> Dölj mina
            </span>
            <Switch checked={hideMine} onChange={(v) => { setHideMine(v); setRevealed(new Set()); }} label="Dölj mina repliker" />
          </label>
        </div>
        {myChars.length > 0 && (
          <p className="mt-2 text-xs text-ink-3">
            Din roll: <span className="font-semibold text-ink-2">{myChars.map((c) => c.name).join(", ")}</span>
          </p>
        )}

        <ol className="mt-6 space-y-4 pb-36" aria-label="Manustext">
          {scene.lines.map((l) => {
            const mine = l.characterId ? myCharIds.has(l.characterId) : false;
            const charName = l.characterId ? L.character(l.characterId)?.name : null;
            const hidden = mine && hideMine && !revealed.has(l.id);
            const note = myNotes.get(l.id);
            const marked = myBookmarks.has(l.id);
            if (!l.characterId) {
              return (
                <li key={l.id} className="px-1 text-[14.5px] leading-relaxed text-ink-3 italic">
                  {l.text}
                </li>
              );
            }
            return (
              <li key={l.id} id={l.id} className={cn("group relative rounded-2xl px-4 py-3 transition-colors", mine && highlight ? "border-l-4 border-gold bg-gold-soft/70" : "bg-surface border border-line/60")}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-[12px] font-bold tracking-[0.08em] uppercase", mine ? "text-gold" : "text-ink-2")}>{charName}</span>
                  <span className="flex items-center gap-0.5">
                    <button
                      className={cn("rounded-lg p-1.5 hover:bg-surface-2", marked ? "text-gold" : "text-ink-3")}
                      aria-label={marked ? "Ta bort bokmärke" : "Bokmärk repliken"}
                      aria-pressed={marked}
                      onClick={() => toggleBookmark(meId, l.id)}
                    >
                      {marked ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                    </button>
                    <button
                      className={cn("rounded-lg p-1.5 hover:bg-surface-2", note ? "text-info" : "text-ink-3")}
                      aria-label="Privat anteckning"
                      onClick={() => {
                        setNoteLine(l.id);
                        setNoteText(note?.text ?? "");
                      }}
                    >
                      <NotebookPen className="size-4" />
                    </button>
                  </span>
                </div>
                {hidden ? (
                  <button
                    onClick={() => setRevealed((s) => new Set(s).add(l.id))}
                    className="mt-1.5 flex w-full items-center gap-2 text-left text-sm text-ink-3"
                    aria-label="Visa repliken"
                  >
                    <span className="flex-1 space-y-1.5" aria-hidden>
                      <span className="block h-2.5 w-11/12 rounded-full bg-gold/25" />
                      <span className="block h-2.5 w-2/3 rounded-full bg-gold/25" />
                    </span>
                    <Eye className="size-4" />
                  </button>
                ) : (
                  <p className={cn("mt-1 text-[17px] leading-relaxed", mine ? "font-medium text-ink" : "text-ink")}>{l.text}</p>
                )}
                {note && (
                  <p className="mt-2 rounded-xl bg-info-soft px-3 py-2 text-[13px] text-ink-2">
                    <span className="font-semibold text-info">Min anteckning: </span>
                    {note.text}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="fixed inset-x-0 bottom-[78px] z-20 mx-auto w-full max-w-[460px] px-5 lg:sticky lg:bottom-[86px]">
        <Link href={`/me/manus/${script.id}/repetera?scen=${scene.sceneId}`} data-testid="start-rehearsal-mode">
          <Button variant="primary" size="lg" className="w-full shadow-[var(--shadow-lift)]">
            <Mic /> Repetera scenen med AI-partner
          </Button>
        </Link>
      </div>

      <Dialog
        open={!!noteLine}
        onOpenChange={(v) => !v && setNoteLine(null)}
        title="Privat anteckning"
        description="Endast synlig för dig. Ändrar aldrig manustexten."
        footer={
          <>
            {myNotes.get(noteLine ?? "") && (
              <Button
                variant="ghost"
                className="mr-auto text-bad"
                onClick={() => {
                  setAnnotation(meId, noteLine!, "");
                  setNoteLine(null);
                }}
              >
                Ta bort
              </Button>
            )}
            <Button variant="ghost" onClick={() => setNoteLine(null)}>
              Avbryt
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setAnnotation(meId, noteLine!, noteText);
                setNoteLine(null);
                toast({ title: "Anteckningen är sparad" });
              }}
            >
              Spara
            </Button>
          </>
        }
      >
        <p className="mb-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2 italic">{allLines.find((l) => l.id === noteLine)?.text}</p>
        <Textarea autoFocus value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="T.ex. Paus före ’Det är tisdag’. Blick mot fönstret." />
      </Dialog>

      <Sheet open={marksOpen} onOpenChange={setMarksOpen} title="Mina markeringar" description="Bokmärken och privata anteckningar i detta manus.">
        {(() => {
          const items = allLines.filter((l) => myBookmarks.has(l.id) || myNotes.has(l.id));
          if (!items.length) return <p className="py-8 text-center text-sm text-ink-3">Inga markeringar ännu. Tryck på bokmärket vid en replik.</p>;
          return (
            <ul className="space-y-2">
              {items.map((l) => (
                <li key={l.id}>
                  <button
                    className="w-full rounded-2xl border border-line p-3 text-left hover:bg-surface-2"
                    onClick={() => {
                      setSceneId(l.sceneId);
                      setMarksOpen(false);
                      setTimeout(() => document.getElementById(l.id)?.scrollIntoView({ block: "center", behavior: "smooth" }), 150);
                    }}
                  >
                    <div className="text-xs font-semibold text-ink-3">
                      {L.scene(l.sceneId)?.number} · {l.characterId ? L.character(l.characterId)?.name : "Scenanvisning"}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-sm">{l.text}</div>
                    {myNotes.get(l.id) && <div className="mt-1 text-xs text-info">{myNotes.get(l.id)!.text}</div>}
                  </button>
                </li>
              ))}
            </ul>
          );
        })()}
      </Sheet>
    </div>
  );
}
