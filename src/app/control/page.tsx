"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { differenceInCalendarDays, format } from "date-fns";
import { sv } from "date-fns/locale";
import { AlertTriangle, ArrowRight, BellRing, CalendarCheck2, FilePen, History, Plus, Send, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/control/shell";
import { useControlData } from "@/components/control/data";
import { PublishDialog, RehearsalSheet } from "@/components/control/rehearsal";
import { Avatar, Badge, Button, Card, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { ProductionTag } from "@/components/shared";
import { useStore } from "@/lib/store";
import { useLookups, useNow } from "@/lib/hooks";
import { rehearsalStatus, totalHours, workingData } from "@/lib/domain";
import { capitalize, fmtRange, fmtStamp, greeting, p, toDateKey, weekNumber, weekStart } from "@/lib/time";
import type { ID } from "@/lib/types";
import { cn, plural, prodVars } from "@/lib/utils";

export default function Dashboard() {
  const now = useNow();
  const { meId, myProductions, myRehearsals, conflicts, allowedIds } = useControlData();
  const dispatches = useStore((s) => s.dispatches);
  const notifications = useStore((s) => s.notifications);
  const audit = useStore((s) => s.audit);
  const L = useLookups();
  const me = L.person(meId)!;
  const [openId, setOpenId] = useState<ID | null>(null);
  const [publishId, setPublishId] = useState<ID | null>(null);

  const todayKey = toDateKey(now);
  const today = myRehearsals
    .filter((r) => !r.cancelled && workingData(r).start.startsWith(todayKey))
    .sort((a, b) => workingData(a).start.localeCompare(workingData(b).start));
  const unpublished = myRehearsals.filter((r) => r.draft && !r.cancelled);
  const upcomingConflicts = Array.from(conflicts.entries()).filter(([id]) => {
    const r = myRehearsals.find((x) => x.id === id);
    return r && workingData(r).end >= todayKey;
  });

  const myDispatches = dispatches.filter((d) => allowedIds.includes(d.productionId));
  const ackStats = useMemo(
    () =>
      myDispatches.map((d) => {
        const ns = notifications.filter((n) => n.dispatchId === d.id);
        return { d, total: ns.length, acked: ns.filter((n) => n.ackAt).length, unread: ns.filter((n) => !n.readAt).length };
      }),
    [myDispatches, notifications],
  );
  const pendingAcks = ackStats.reduce((a, s) => a + (s.total - s.acked), 0);
  const weekKey = toDateKey(weekStart(now));
  const weekEnd = toDateKey(new Date(weekStart(now).getTime() + 7 * 864e5));

  return (
    <>
      <PageHeader
        title={`${greeting(now)}, ${me.name.split(" ")[0]}`}
        subtitle={`${capitalize(format(now, "EEEE d MMMM", { locale: sv }))} · vecka ${weekNumber(now)} · ${plural(myProductions.length, "produktion", "produktioner")}`}
        actions={
          <Link href="/control/repetition/ny">
            <Button variant="primary">
              <Plus /> Ny repetition
            </Button>
          </Link>
        }
      />
      <div className="space-y-8 px-5 pb-12 sm:px-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<CalendarCheck2 />} label="Repetitioner idag" value={today.length} hint={`${today.filter((r) => p(workingData(r).start) <= now && p(workingData(r).end) > now).length} pågår nu`} href="/control/schema?vy=dag" />
          <Kpi icon={<FilePen />} label="Opublicerat" value={unpublished.length} hint="Utkast och ändringar" tone={unpublished.length ? "gold" : undefined} href="/control/schema?vy=lista" />
          <Kpi icon={<AlertTriangle />} label="Konflikter" value={upcomingConflicts.length} hint="Kommande repetitioner" tone={upcomingConflicts.length ? "warn" : undefined} href="/control/schema?vy=lista" />
          <Kpi icon={<BellRing />} label="Väntar på kvittens" value={pendingAcks} hint={`${myDispatches.length} utskick`} tone={pendingAcks ? "info" : undefined} href="/control/kvittenser" />
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.25fr_1fr]">
          <div className="space-y-8">
            {/* Today */}
            <section>
              <SectionTitle
                action={
                  <Link href="/control/schema?vy=dag" className="text-[13px] font-medium text-ink-2 hover:text-ink">
                    Dagvy per lokal <ArrowRight className="inline size-3.5" />
                  </Link>
                }
              >
                Idag i huset
              </SectionTitle>
              <Card className="divide-y divide-line">
                {today.length === 0 && <p className="p-6 text-center text-sm text-ink-3">Inga repetitioner idag.</p>}
                {today.map((r) => {
                  const d = workingData(r);
                  const prod = L.production(r.productionId)!;
                  const live = p(d.start) <= now && p(d.end) > now;
                  const past = p(d.end) <= now;
                  return (
                    <button key={r.id} onClick={() => setOpenId(r.id)} className={cn("flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-surface-2/60", past && "opacity-55")}>
                      <span className="w-[92px] shrink-0 text-sm font-semibold tabular">{fmtRange(d.start, d.end)}</span>
                      <span style={prodVars(prod.color)} className="h-9 w-1 shrink-0 rounded-full bg-[var(--pc)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{d.title}</span>
                        <span className="block truncate text-xs text-ink-3">
                          {prod.title} · {L.room(d.roomId)?.name} · {d.participantIds.length} kallade
                        </span>
                      </span>
                      {live && (
                        <Badge tone="bad" dot className="animate-pulse-ring">
                          Pågår
                        </Badge>
                      )}
                      {conflicts.get(r.id) && <AlertTriangle className="size-4 text-warn" aria-label="Konflikt" />}
                    </button>
                  );
                })}
              </Card>
            </section>

            {/* Attention */}
            <section>
              <SectionTitle>Kräver uppmärksamhet</SectionTitle>
              <div className="space-y-2">
                {unpublished.slice(0, 4).map((r) => {
                  const d = workingData(r);
                  return (
                    <Card key={r.id} className="flex flex-wrap items-center gap-3 p-3.5">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-gold-soft text-gold">
                        <FilePen className="size-4" />
                      </span>
                      <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(r.id)}>
                        <span className="block truncate text-sm font-semibold">
                          {rehearsalStatus(r) === "utkast" ? "Utkast" : "Opublicerad ändring"}: {d.title}
                        </span>
                        <span className="block truncate text-xs text-ink-3">
                          {L.production(r.productionId)?.title} · {capitalize(format(p(d.start), "EEE d MMM", { locale: sv }))} {fmtRange(d.start, d.end)}
                        </span>
                      </button>
                      <Button size="sm" variant="soft" onClick={() => setPublishId(r.id)}>
                        <Send /> Granska & publicera
                      </Button>
                    </Card>
                  );
                })}
                {upcomingConflicts.slice(0, 4).map(([id, cs]) => {
                  const r = myRehearsals.find((x) => x.id === id)!;
                  const d = workingData(r);
                  const worst = cs.find((c) => c.severity === "error") ?? cs[0]!;
                  return (
                    <Card key={id} className="flex items-center gap-3 p-3.5">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", worst.severity === "error" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn")}>
                        <AlertTriangle className="size-4" />
                      </span>
                      <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(id)}>
                        <span className="block truncate text-sm font-semibold">
                          {d.title} · {capitalize(format(p(d.start), "EEE d MMM", { locale: sv }))} {fmtRange(d.start, d.end)}
                        </span>
                        <span className="block truncate text-xs text-ink-3">{worst.message}</span>
                      </button>
                      <ArrowRight className="size-4 text-ink-3" />
                    </Card>
                  );
                })}
                {ackStats
                  .filter((s) => s.total && s.acked / s.total < 0.75)
                  .slice(0, 3)
                  .map((s) => (
                    <Card key={s.d.id} className="flex items-center gap-3 p-3.5">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-info-soft text-info">
                        <BellRing className="size-4" />
                      </span>
                      <Link href="/control/kvittenser" className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {s.total - s.acked} har inte kvitterat: {s.d.snapshot.title}
                        </span>
                        <span className="block truncate text-xs text-ink-3">
                          {L.production(s.d.productionId)?.title} · skickat {fmtStamp(s.d.createdAt)}
                        </span>
                      </Link>
                      <span className="w-20">
                        <ProgressBar value={s.acked / s.total} tone="warn" label="Kvitterat" />
                      </span>
                    </Card>
                  ))}
                {!unpublished.length && !upcomingConflicts.length && (
                  <Card className="flex items-center gap-3 p-4 text-sm text-ink-2">
                    <Sparkles className="size-4 text-gold" /> Allt är publicerat och konfliktfritt.
                  </Card>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section>
              <SectionTitle>Produktioner</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {myProductions.map((prod) => {
                  const rs = myRehearsals.filter((r) => r.productionId === prod.id && !r.cancelled);
                  const week = rs.map(workingData).filter((d) => d.start >= weekKey && d.start < weekEnd);
                  const next = rs
                    .map((r) => workingData(r))
                    .filter((d) => p(d.end) > now)
                    .sort((a, b) => a.start.localeCompare(b.start))[0];
                  const days = differenceInCalendarDays(p(prod.premiere), now);
                  const st = ackStats.filter((s) => s.d.productionId === prod.id);
                  const tot = st.reduce((a, s) => a + s.total, 0);
                  const ack = st.reduce((a, s) => a + s.acked, 0);
                  return (
                    <Link key={prod.id} href={`/control/produktioner?p=${prod.id}`}>
                      <Card style={prodVars(prod.color)} className="group relative h-full overflow-hidden p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
                        <span className="absolute inset-x-0 top-0 h-1 bg-[var(--pc)]" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-display text-xl font-medium">{prod.title}</div>
                            <div className="text-xs text-ink-3">{prod.genre}</div>
                          </div>
                          <Badge tone={prod.status === "spelas" ? "ok" : prod.status === "repetition" ? "prod" : "neutral"}>
                            {prod.status === "spelas" ? "Spelas" : prod.status === "repetition" ? "Repetitionsperiod" : "Planering"}
                          </Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <Stat label={days >= 0 ? "Till premiär" : "Sedan premiär"} value={`${Math.abs(days)} d`} />
                          <Stat label="Denna vecka" value={`${totalHours(week)} h`} />
                          <Stat label="Kvitterat" value={tot ? `${Math.round((ack / tot) * 100)}%` : "–"} />
                        </div>
                        {next && (
                          <div className="mt-3 truncate rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-2">
                            Nästa: <span className="font-semibold text-ink">{next.title}</span> · {capitalize(format(p(next.start), "EEE", { locale: sv }))} {fmtRange(next.start, next.end)}
                          </div>
                        )}
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section>
              <SectionTitle
                action={
                  <Link href="/control/kvittenser?flik=logg" className="text-[13px] font-medium text-ink-2 hover:text-ink">
                    Granskningslogg <ArrowRight className="inline size-3.5" />
                  </Link>
                }
              >
                Senaste aktivitet
              </SectionTitle>
              <Card className="divide-y divide-line">
                {audit
                  .filter((a) => !a.productionId || allowedIds.includes(a.productionId))
                  .slice(0, 6)
                  .map((a) => {
                    const actor = L.person(a.actorId);
                    return (
                      <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                        {actor ? <Avatar name={actor.name} hue={actor.hue} size={28} /> : <History className="size-5 text-ink-3" />}
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] leading-snug">
                            <span className="font-semibold">{actor?.name}</span> <span className="text-ink-2">{a.summary}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-3">
                            {fmtStamp(a.at)}
                            {a.productionId && <ProductionTag production={L.production(a.productionId)} size="sm" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </Card>
            </section>
          </div>
        </div>
      </div>
      <RehearsalSheet rehearsalId={openId} onOpenChange={(v) => !v && setOpenId(null)} />
      {publishId && <PublishDialog rehearsalId={publishId} open onOpenChange={(v) => !v && setPublishId(null)} />}
    </>
  );
}

function Kpi({ icon, label, value, hint, tone, href }: { icon: React.ReactNode; label: string; value: number; hint: string; tone?: "gold" | "warn" | "info"; href: string }) {
  const toneCls = tone === "gold" ? "bg-gold-soft text-gold" : tone === "warn" ? "bg-warn-soft text-warn" : tone === "info" ? "bg-info-soft text-info" : "bg-surface-2 text-ink-3";
  return (
    <Link href={href}>
      <Card className="group h-full p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
        <div className="flex items-center justify-between">
          <span className={cn("flex size-9 items-center justify-center rounded-xl [&_svg]:size-[18px]", toneCls)}>{icon}</span>
          <ArrowRight className="size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="mt-3 font-display text-3xl font-medium tabular">{value}</div>
        <div className="text-[13px] font-medium text-ink-2">{label}</div>
        <div className="text-xs text-ink-3">{hint}</div>
      </Card>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--pc-soft)] px-2 py-2">
      <div className="text-[15px] font-semibold tabular">{value}</div>
      <div className="text-[10.5px] text-ink-3">{label}</div>
    </div>
  );
}
