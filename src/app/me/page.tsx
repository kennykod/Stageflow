"use client";

import Link from "next/link";
import { useEffect } from "react";
import { format, isSameDay } from "date-fns";
import { sv } from "date-fns/locale";
import { ArrowRight, BellRing, Coffee } from "lucide-react";
import { usePersonalData, upcoming } from "@/components/personal/data";
import { NextCard, NotificationCard, RehearsalRow } from "@/components/personal/cards";
import { useMarkPersonalSeen } from "@/components/personal/shell";
import { useNow } from "@/lib/hooks";
import { capitalize, dayLabel, greeting, p } from "@/lib/time";
import type { Rehearsal } from "@/lib/types";

export default function Today() {
  const now = useNow();
  const { me, meId, visible, unacked, changes } = usePersonalData("mitt");
  const seen = useMarkPersonalSeen();
  useEffect(() => seen(), [seen]);

  const mine = upcoming(visible, now);
  const next = mine[0];
  const laterToday = mine.slice(1).filter((r) => isSameDay(p(r.published!.start), now));
  const coming = mine.slice(1).filter((r) => !isSameDay(p(r.published!.start), now)).slice(0, 6);
  const todayHasAny = visible.some((r) => isSameDay(p(r.published!.start), now) && !r.cancelled);

  const byDay = new Map<string, Rehearsal[]>();
  coming.forEach((r) => {
    const k = r.published!.start.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(r);
  });

  return (
    <div className="space-y-7 px-5 pt-3">
      <section className="animate-rise">
        <p className="text-sm font-medium text-ink-3">{capitalize(format(now, "EEEE d MMMM", { locale: sv }))}</p>
        <h1 className="mt-0.5 font-display text-[32px] leading-tight font-medium">
          {greeting(now)}, {me.name.split(" ")[0]}
        </h1>
        {!todayHasAny && next && <p className="mt-1 text-[15px] text-ink-2">Du är ledig idag. Nästa repetition är {dayLabel(now, next.published!.start).toLowerCase()}.</p>}
      </section>

      {unacked.length > 0 && (
        <section aria-labelledby="todo" className="animate-rise [animation-delay:60ms]">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 id="todo" className="flex items-center gap-2 text-[15px] font-semibold">
              <BellRing className="size-4 text-bad" /> {unacked.length === 1 ? "1 sak att kvittera" : `${unacked.length} saker att kvittera`}
            </h2>
            {unacked.length > 1 && (
              <Link href="/me/notiser" className="text-sm font-medium text-accent">
                Visa alla
              </Link>
            )}
          </div>
          <NotificationCard item={unacked[0]!} />
        </section>
      )}

      <section aria-label="Nästa repetition" className="animate-rise [animation-delay:120ms]">
        {next ? (
          <NextCard r={next} now={now} meId={meId} changed={changes.get(next.id)} />
        ) : (
          <div className="rounded-[28px] border border-line bg-surface p-8 text-center">
            <Coffee className="mx-auto size-8 text-ink-3" />
            <h2 className="mt-3 font-display text-xl">Inga kommande repetitioner</h2>
            <p className="mt-1 text-sm text-ink-3">När du kallas till något dyker det upp här.</p>
          </div>
        )}
      </section>

      {laterToday.length > 0 && (
        <section>
          <h2 className="mb-2.5 text-[13px] font-semibold tracking-wide text-ink-3 uppercase">Senare idag</h2>
          <div className="space-y-2">
            {laterToday.map((r) => (
              <RehearsalRow key={r.id} r={r} meId={meId} changed={changes.get(r.id)} now={now} />
            ))}
          </div>
        </section>
      )}

      {byDay.size > 0 && (
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold tracking-wide text-ink-3 uppercase">Kommande</h2>
            <Link href="/me/schema" className="inline-flex items-center gap-1 text-sm font-medium text-accent">
              Hela schemat <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="space-y-5">
            {Array.from(byDay.entries()).map(([k, list]) => (
              <div key={k}>
                <h3 className="mb-2 text-sm font-semibold text-ink-2">{dayLabel(now, `${k}T00:00`)}</h3>
                <div className="space-y-2">
                  {list.map((r) => (
                    <RehearsalRow key={r.id} r={r} meId={meId} changed={changes.get(r.id)} now={now} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
