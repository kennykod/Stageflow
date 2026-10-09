"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { sv } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { usePersonalData } from "@/components/personal/data";
import { RehearsalRow } from "@/components/personal/cards";
import { useMarkPersonalSeen } from "@/components/personal/shell";
import { Button, Segmented, Switch } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { capitalize, dayLabel, p, toDateKey, weekNumber } from "@/lib/time";
import type { PersonalView, Rehearsal } from "@/lib/types";
import { cn, prodVars } from "@/lib/utils";

export default function PersonalSchedule() {
  const now = useNow();
  const prefs = useStore((s) => s.preferences);
  const setPrefs = useStore((s) => s.setPrefs);
  const { meId, visible, changes, canFull, myProductions, scope } = usePersonalData();
  const [anchor, setAnchor] = useState(now);
  const [prodFilter, setProdFilter] = useState<string | null>(null);
  const seen = useMarkPersonalSeen();
  useEffect(() => seen(), [seen]);
  const view = prefs.personalView;

  const list = useMemo(() => visible.filter((r) => !prodFilter || r.productionId === prodFilter), [visible, prodFilter]);

  const ws = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const forDay = (d: Date) => list.filter((r) => isSameDay(p(r.published!.start), d));

  const agenda = useMemo(() => {
    const m = new Map<string, Rehearsal[]>();
    list
      .filter((r) => p(r.published!.end) > now || isSameDay(p(r.published!.start), now))
      .slice(0, 60)
      .forEach((r) => {
        const k = r.published!.start.slice(0, 10);
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(r);
      });
    return m;
  }, [list, now]);

  return (
    <div className="px-5 pt-3">
      <h1 className="font-display text-[28px] font-medium">Schema</h1>

      <div className="mt-3 space-y-3">
        <Segmented<PersonalView>
          label="Visning"
          value={view}
          onChange={(v) => setPrefs({ personalView: v })}
          className="w-full"
          options={[
            { value: "dag", label: "Dag" },
            { value: "vecka", label: "Vecka" },
            { value: "agenda", label: "Agenda" },
          ]}
        />
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{scope === "produktion" ? "Hela produktionen" : "Mitt schema"}</div>
            <div className="text-xs text-ink-3">
              {canFull ? (scope === "produktion" ? "Visar även repetitioner du inte är kallad till" : "Visar endast det du är kallad till") : "Du ser det du är kallad till"}
            </div>
          </div>
          {canFull ? (
            <Switch checked={scope === "produktion"} onChange={(v) => setPrefs({ personalScope: v ? "produktion" : "mitt" })} label="Visa hela produktionen" />
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-ink-3" title="Kräver behörighet">
              <Lock className="size-3.5" /> Endast eget
            </span>
          )}
        </div>
        {myProductions.length > 1 && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            <FilterChip active={!prodFilter} onClick={() => setProdFilter(null)}>
              Alla
            </FilterChip>
            {myProductions.map((x) => (
              <FilterChip key={x.id} active={prodFilter === x.id} onClick={() => setProdFilter(x.id)} color={x.color}>
                {x.title}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {view !== "agenda" && (
        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Föregående" onClick={() => setAnchor(addDays(anchor, view === "dag" ? -1 : -7))}>
            <ChevronLeft className="size-5" />
          </Button>
          <button className="text-center" onClick={() => setAnchor(now)}>
            <div className="text-[15px] font-semibold">{view === "dag" ? dayLabel(now, toDateKey(anchor) + "T00:00") : `Vecka ${weekNumber(anchor)}`}</div>
            <div className="text-xs text-ink-3">{view === "dag" ? capitalize(format(anchor, "EEEE d MMMM", { locale: sv })) : `${format(ws, "d MMM", { locale: sv })} – ${format(addDays(ws, 6), "d MMM", { locale: sv })}`}</div>
          </button>
          <Button variant="ghost" size="icon" aria-label="Nästa" onClick={() => setAnchor(addDays(anchor, view === "dag" ? 1 : 7))}>
            <ChevronRight className="size-5" />
          </Button>
        </div>
      )}

      {view === "dag" && (
        <>
          <div className="mt-3 grid grid-cols-7 gap-1" role="tablist" aria-label="Välj dag">
            {weekDays.map((d) => {
              const active = isSameDay(d, anchor);
              const has = forDay(d).length > 0;
              return (
                <button
                  key={d.toISOString()}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setAnchor(d)}
                  className={cn("flex flex-col items-center rounded-2xl py-2 transition-colors", active ? "bg-accent text-accent-ink" : "hover:bg-surface-2")}
                >
                  <span className={cn("text-[11px] font-medium uppercase", active ? "opacity-80" : "text-ink-3")}>{format(d, "EEEEEE", { locale: sv })}</span>
                  <span className={cn("text-[17px] font-semibold tabular", isSameDay(d, now) && !active && "text-accent")}>{format(d, "d")}</span>
                  <span className={cn("mt-0.5 size-1 rounded-full", has ? (active ? "bg-accent-ink" : "bg-accent") : "bg-transparent")} />
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-2">
            {forDay(anchor).length ? (
              forDay(anchor).map((r) => <RehearsalRow key={r.id} r={r} meId={meId} changed={changes.get(r.id)} now={now} />)
            ) : (
              <Empty />
            )}
          </div>
        </>
      )}

      {view === "vecka" && (
        <div className="mt-3 space-y-4">
          {weekDays.map((d) => {
            const items = forDay(d);
            return (
              <section key={d.toISOString()}>
                <h2 className={cn("mb-1.5 flex items-baseline gap-2 text-sm font-semibold", isSameDay(d, now) ? "text-accent" : "text-ink-2")}>
                  {capitalize(format(d, "EEEE d/M", { locale: sv }))}
                  {isSameDay(d, now) && <span className="text-xs font-medium">Idag</span>}
                </h2>
                {items.length ? (
                  <div className="space-y-2">
                    {items.map((r) => (
                      <RehearsalRow key={r.id} r={r} meId={meId} changed={changes.get(r.id)} now={now} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-line px-4 py-2.5 text-sm text-ink-3">Ledig</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {view === "agenda" && (
        <div className="mt-5 space-y-5">
          {agenda.size === 0 && <Empty />}
          {Array.from(agenda.entries()).map(([k, items]) => (
            <section key={k}>
              <h2 className={cn("mb-2 text-sm font-semibold", k === toDateKey(now) ? "text-accent" : "text-ink-2")}>{dayLabel(now, `${k}T00:00`)}</h2>
              <div className="space-y-2">
                {items.map((r) => (
                  <RehearsalRow key={r.id} r={r} meId={meId} changed={changes.get(r.id)} now={now} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={color ? prodVars(color as never) : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active ? "border-transparent bg-accent text-accent-ink" : "border-line bg-surface text-ink-2",
      )}
    >
      {color && <span className="size-2 rounded-full bg-[var(--pc)]" />}
      {children}
    </button>
  );
}

function Empty() {
  return <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">Inga repetitioner – ledig.</p>;
}
