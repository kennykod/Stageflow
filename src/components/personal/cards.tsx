"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpenText, CalendarPlus, Check, CheckCheck, ChevronRight, CircleSlash, Clock, MapPin, Sparkles, UserCheck, UserX } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups, type InboxItem } from "@/lib/hooks";
import { TYPE_LABEL, rolesFor } from "@/lib/domain";
import { buildICS, downloadICS } from "@/lib/ics";
import { DOWNLOAD_BLOCKED_MSG } from "@/lib/env";
import { p, capitalize, dayLabel, fmtDayLong, fmtRange, fmtStamp, fmtTime, relativeTo } from "@/lib/time";
import type { Rehearsal } from "@/lib/types";
import { cn, prodVars } from "@/lib/utils";
import { Avatar, Badge, Button, Textarea } from "@/components/ui/primitives";
import { toast } from "@/components/ui/overlay";
import { ChangeList, ProductionTag } from "@/components/shared";

export function useScriptForProduction(productionId: string) {
  return useStore((s) => s.scripts.find((x) => x.productionId === productionId && x.status === "verifierad"));
}

export function addToCalendar(r: Rehearsal, L: ReturnType<typeof useLookups>) {
  const d = r.published!;
  const ok = downloadICS(`stageflow-${d.start.slice(0, 10)}.ics`, buildICS(r.id, d, L.room(d.roomId), L.production(r.productionId)));
  if (ok) toast({ title: "Kalenderfil hämtad", body: "Öppna .ics-filen för att lägga till i din kalender." });
  else toast({ title: "Kalenderfilen kunde inte sparas här", body: DOWNLOAD_BLOCKED_MSG, tone: "info" });
}

/** The hero card on Today. */
export function NextCard({ r, now, meId, changed }: { r: Rehearsal; now: Date; meId: string; changed?: InboxItem }) {
  const L = useLookups();
  const characters = useStore((s) => s.characters);
  const scenes = useStore((s) => s.scenes);
  const script = useScriptForProduction(r.productionId);
  const d = r.published!;
  const prod = L.production(r.productionId)!;
  const room = L.room(d.roomId);
  const myRoles = rolesFor(meId, r.productionId, characters, d.sceneIds, scenes);
  const firstSceneWithScript = script ? d.sceneIds.find((sid) => script.scenes.some((s) => s.sceneId === sid)) : undefined;
  const rel = relativeTo(now, d.start, d.end);
  const live = rel === "Pågår nu";
  const timeChanged = changed?.dispatch.changes.some((c) => c.field === "time" || c.field === "date");
  const roomChanged = changed?.dispatch.changes.some((c) => c.field === "room");

  return (
    <article style={prodVars(prod.color)} className="relative overflow-hidden rounded-[28px] border border-line bg-surface shadow-[var(--shadow-card)]" aria-labelledby={`next-${r.id}`}>
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--pc-soft)] to-transparent" aria-hidden />
      <div className="relative p-5">
        <div className="flex items-center justify-between gap-2">
          <ProductionTag production={prod} />
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", live ? "bg-bad-soft text-bad" : "bg-surface text-ink-2 shadow-[var(--shadow-soft)]")}>
            {live && <span className="size-1.5 animate-pulse rounded-full bg-bad" />}
            {rel}
          </span>
        </div>

        <div className="mt-5 text-[13px] font-semibold tracking-wide text-ink-3 uppercase">{dayLabel(now, d.start)}</div>
        <div id={`next-${r.id}`} className="mt-1 flex flex-wrap items-baseline gap-x-3">
          <span className={cn("font-display text-[44px] leading-none font-medium tracking-tight tabular", timeChanged && "text-warn")}>{fmtRange(d.start, d.end)}</span>
        </div>
        {changed && changed.dispatch.kind === "andrad" && (
          <div className="mt-3 rounded-2xl bg-warn-soft px-3.5 py-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warn">
              <Sparkles className="size-3.5" /> Ändrad {fmtStamp(changed.dispatch.createdAt)}
            </div>
            <ChangeList changes={changed.dispatch.changes} compact />
          </div>
        )}
        <h2 className="mt-4 text-xl font-semibold">{d.title}</h2>
        <div className="mt-3 space-y-2.5 text-[15px]">
          <div className="flex items-start gap-3">
            <MapPin className={cn("mt-0.5 size-5 shrink-0", roomChanged ? "text-warn" : "text-ink-3")} />
            <div>
              <span className="sr-only">Plats: </span>
              <div className={cn("font-semibold", roomChanged && "text-warn")}>{room?.name}</div>
              <div className="text-sm text-ink-3">{room?.location}</div>
            </div>
          </div>
          {d.sceneIds.length > 0 && (
            <div className="flex items-start gap-3">
              <BookOpenText className="mt-0.5 size-5 shrink-0 text-ink-3" />
              <div>
                <span className="sr-only">Scener: </span>
                <div className="font-medium">
                  {d.sceneIds
                    .map((id) => L.scene(id))
                    .filter(Boolean)
                    .map((s) => `${s!.number} ${s!.title}`)
                    .join(" · ")}
                </div>
                {myRoles.length > 0 && <div className="text-sm text-ink-3">Du spelar: {myRoles.map((c) => c.name).join(", ")}</div>}
              </div>
            </div>
          )}
          {d.description && <p className="rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm text-ink-2">{d.description}</p>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {firstSceneWithScript ? (
            <Link href={`/me/manus/${script!.id}?scen=${firstSceneWithScript}`} className="col-span-2">
              <Button variant="primary" size="lg" className="w-full">
                <BookOpenText /> Öppna scenen i manus
              </Button>
            </Link>
          ) : null}
          <Link href={`/me/repetition/${r.id}`}>
            <Button size="lg" className="w-full">
              Detaljer <ChevronRight />
            </Button>
          </Link>
          <Button size="lg" onClick={() => addToCalendar(r, L)}>
            <CalendarPlus /> Kalender
          </Button>
        </div>
      </div>
    </article>
  );
}

/** Compact list row. */
export function RehearsalRow({ r, meId, changed, showDay, now }: { r: Rehearsal; meId: string; changed?: InboxItem; showDay?: boolean; now: Date }) {
  const L = useLookups();
  const d = r.published!;
  const prod = L.production(r.productionId)!;
  const mine = d.participantIds.includes(meId);
  const past = p(d.end) < now;
  return (
    <Link
      href={`/me/repetition/${r.id}`}
      style={prodVars(prod.color)}
      className={cn(
        "flex min-h-[64px] items-center gap-3.5 rounded-2xl border border-line bg-surface px-4 py-3 transition-colors active:bg-surface-2",
        past && "opacity-60",
        r.cancelled && "opacity-70",
      )}
    >
      <span className="h-10 w-1 shrink-0 rounded-full bg-[var(--pc)]" aria-hidden />
      <span className="w-[58px] shrink-0">
        <span className={cn("block text-[15px] font-semibold tabular", r.cancelled && "line-through")}>{fmtTime(d.start)}</span>
        <span className="block text-xs text-ink-3 tabular">{fmtTime(d.end)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={cn("truncate text-[15px] font-semibold", r.cancelled && "line-through")}>{d.title}</span>
        </span>
        <span className="block truncate text-[13px] text-ink-3">
          {showDay && `${capitalize(fmtDayLong(d.start))} · `}
          {L.room(d.roomId)?.name} · {prod.title}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {r.cancelled ? (
          <Badge tone="bad">Inställd</Badge>
        ) : changed?.dispatch.kind === "andrad" ? (
          <Badge tone="warn">Ändrad</Badge>
        ) : changed?.dispatch.kind === "ny" ? (
          <Badge tone="info">Ny</Badge>
        ) : null}
        {!mine && <Badge>Ej kallad</Badge>}
      </span>
    </Link>
  );
}

const KIND_TITLE = {
  ny: "Ny repetition",
  andrad: "Ändring i schemat",
  installd: "Repetition inställd",
  borttagen: "Du behövs inte längre",
  paminnelse: "Påminnelse",
} as const;

export function NotificationCard({ item, autoRead = true }: { item: InboxItem; autoRead?: boolean }) {
  const { notification: n, dispatch: d, rehearsal } = item;
  const L = useLookups();
  const acknowledge = useStore((s) => s.acknowledge);
  const respond = useStore((s) => s.respond);
  const markRead = useStore((s) => s.markRead);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLElement>(null);
  const sender = L.person(d.createdBy);
  const prod = L.production(d.productionId);
  const snap = d.snapshot;

  useEffect(() => {
    if (!autoRead || n.readAt || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          const t = setTimeout(() => markRead(n.id), 1200);
          io.disconnect();
          return () => clearTimeout(t);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoRead, n.readAt, n.id, markRead]);

  const kindIcon =
    d.kind === "installd" || d.kind === "borttagen" ? (
      <CircleSlash className="size-4" />
    ) : d.kind === "andrad" ? (
      <Sparkles className="size-4" />
    ) : (
      <CalendarPlus className="size-4" />
    );
  const kindTone = d.kind === "installd" || d.kind === "borttagen" ? "bg-bad-soft text-bad" : d.kind === "andrad" ? "bg-warn-soft text-warn" : "bg-info-soft text-info";

  return (
    <article
      ref={ref}
      data-testid={`notification-${n.id}`}
      className={cn("relative rounded-3xl border bg-surface p-4 shadow-[var(--shadow-soft)] transition-colors", !n.ackAt ? "border-line-strong" : "border-line")}
    >
      {!n.readAt && (
        <span className="absolute top-5 right-4 size-2.5 rounded-full bg-bad">
          <span className="sr-only">Oläst</span>
        </span>
      )}
      <header className="flex items-start gap-3 pr-5">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", kindTone)}>{kindIcon}</span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold">{KIND_TITLE[d.kind]}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
            <ProductionTag production={prod} size="sm" /> {fmtStamp(d.createdAt)}
          </div>
        </div>
      </header>

      <Link href={rehearsal ? `/me/repetition/${rehearsal.id}` : "#"} className="mt-3 block rounded-2xl bg-surface-2 px-3.5 py-3">
        <div className="text-[15px] font-semibold">{snap.title}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[13px] text-ink-2">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5 text-ink-3" />
            {capitalize(fmtDayLong(snap.start))} {fmtRange(snap.start, snap.end)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5 text-ink-3" />
            {L.room(snap.roomId)?.name}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-ink-3">{TYPE_LABEL[snap.type]}</div>
      </Link>

      {d.changes.length > 0 && (
        <div className="mt-3 rounded-2xl border border-warn/25 bg-warn-soft/40 px-3.5 py-3">
          <ChangeList changes={d.changes} compact />
        </div>
      )}

      {d.message && (
        <div className="mt-3 flex items-start gap-2.5">
          {sender && <Avatar name={sender.name} hue={sender.hue} size={26} />}
          <p className="rounded-2xl rounded-tl-md bg-surface-2 px-3 py-2 text-sm text-ink-2">
            <span className="block text-xs font-semibold text-ink">{sender?.name}</span>
            {d.message}
          </p>
        </div>
      )}
      {n.reminderCount > 0 && !n.ackAt && (
        <p className="mt-3 text-xs font-medium text-warn">Produktionen har skickat {n.reminderCount === 1 ? "en påminnelse" : `${n.reminderCount} påminnelser`}.</p>
      )}

      {/* Receipt */}
      <div className="mt-4">
        {n.ackAt ? (
          <div className="flex items-center gap-2 rounded-2xl bg-ok-soft px-3.5 py-3 text-sm font-medium text-ok">
            <CheckCheck className="size-5" /> Du har tagit del · {fmtStamp(n.ackAt)}
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            data-testid="ack-button"
            onClick={() => {
              acknowledge(n.id);
              toast({ title: "Kvitterat", body: "Produktionen ser att du har tagit del." });
            }}
          >
            <Check /> Jag har tagit del
          </Button>
        )}
      </div>

      {/* Attendance answer – separate from receipt */}
      {d.requiresResponse && (
        <div className="mt-3 rounded-2xl border border-line p-3.5">
          <div className="text-sm font-semibold">Kan du delta?</div>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-3">Kort varsel. Ditt svar är skilt från kvittensen – kvittensen betyder bara att du sett ändringen.</p>
          {n.response ? (
            <div className={cn("mt-2.5 flex items-center gap-2 text-sm font-medium", n.response === "kommer" ? "text-ok" : "text-bad")}>
              {n.response === "kommer" ? <UserCheck className="size-4" /> : <UserX className="size-4" />}
              {n.response === "kommer" ? "Du svarade: Jag kommer" : "Du svarade: Kan inte"}
              {n.responseNote && <span className="font-normal text-ink-3">– {n.responseNote}</span>}
              <button className="ml-auto text-xs text-ink-3 underline" onClick={() => respond(n.id, n.response === "kommer" ? "kan-inte" : "kommer")}>
                Ändra
              </button>
            </div>
          ) : declineOpen ? (
            <div className="mt-2.5 space-y-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kort förklaring till produktionen (valfritt)" className="min-h-[64px]" />
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setDeclineOpen(false)}>
                  Avbryt
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    respond(n.id, "kan-inte", note);
                    setDeclineOpen(false);
                    toast({ title: "Svar skickat", body: "Produktionen har fått ditt besked.", tone: "info" });
                  }}
                >
                  Skicka
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <Button onClick={() => respond(n.id, "kommer")}>
                <UserCheck /> Jag kommer
              </Button>
              <Button onClick={() => setDeclineOpen(true)}>
                <UserX /> Kan inte
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
