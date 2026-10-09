"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import type { ID, Production, Rehearsal, RehearsalData, Room } from "@/lib/types";
import { durationMin, fmtRange, fmtTime, minutesOfDay, toDateKey, p, capitalize, fmtDayShort } from "@/lib/time";
import { cn, prodVars } from "@/lib/utils";
import { rehearsalStatus, TYPE_LABEL, type Conflict } from "@/lib/domain";
import { conflictLevel } from "./data";
import { addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { sv } from "date-fns/locale";
import { Badge } from "@/components/ui/primitives";

export interface GridItem {
  r: Rehearsal;
  data: RehearsalData;
  col: string;
}
export interface GridColumn {
  key: string;
  label: string;
  sub?: string;
  dateKey: string;
  roomId?: ID;
  isToday?: boolean;
}

const START_H = 7;
const END_H = 23;
const SNAP = 15;

function layoutLanes(items: GridItem[]) {
  const sorted = [...items].sort((a, b) => a.data.start.localeCompare(b.data.start) || b.data.end.localeCompare(a.data.end));
  const out = new Map<ID, { lane: number; lanes: number }>();
  let cluster: GridItem[] = [];
  let clusterEnd = "";
  let laneEnds: string[] = [];
  const flush = () => {
    const n = laneEnds.length;
    cluster.forEach((it) => (out.get(it.r.id)!.lanes = n));
    cluster = [];
    laneEnds = [];
  };
  for (const it of sorted) {
    if (cluster.length && it.data.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((e) => e <= it.data.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.data.end);
    } else laneEnds[lane] = it.data.end;
    out.set(it.r.id, { lane, lanes: 1 });
    cluster.push(it);
    clusterEnd = clusterEnd && clusterEnd > it.data.end ? clusterEnd : it.data.end;
  }
  flush();
  return out;
}

interface DragState {
  id: ID;
  pointerId: number;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  moved: boolean;
}

export function TimeGrid({
  columns,
  items,
  productions,
  rooms,
  conflicts,
  now,
  hourPx = 52,
  minColWidth = 0,
  showRoom = true,
  canEdit,
  onOpen,
  onMove,
  onCreate,
}: {
  columns: GridColumn[];
  items: GridItem[];
  productions: Production[];
  rooms: Room[];
  conflicts: Map<ID, Conflict[]>;
  now: Date;
  hourPx?: number;
  minColWidth?: number;
  showRoom?: boolean;
  canEdit: (r: Rehearsal) => boolean;
  onOpen: (id: ID) => void;
  onMove: (r: Rehearsal, col: GridColumn, startMin: number) => void;
  onCreate: (col: GridColumn, startMin: number) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const hours = END_H - START_H;
  const totalPx = hours * hourPx;

  useEffect(() => {
    // Scroll to ~08:30 on mount.
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, 1.5 * hourPx - 20);
  }, [hourPx]);

  const byCol = useMemo(() => {
    const m = new Map<string, GridItem[]>();
    columns.forEach((c) => m.set(c.key, []));
    items.forEach((it) => m.get(it.col)?.push(it));
    return m;
  }, [columns, items]);
  const lanes = useMemo(() => {
    const m = new Map<ID, { lane: number; lanes: number }>();
    byCol.forEach((list) => layoutLanes(list).forEach((v, k) => m.set(k, v)));
    return m;
  }, [byCol]);

  const colWidth = () => {
    const el = bodyRef.current;
    if (!el) return 100;
    return el.getBoundingClientRect().width / columns.length;
  };

  const target = (it: GridItem, d: DragState) => {
    const ci = columns.findIndex((c) => c.key === it.col);
    const newCi = Math.min(columns.length - 1, Math.max(0, ci + Math.round(d.dx / colWidth())));
    const dur = durationMin(it.data.start, it.data.end);
    const start0 = minutesOfDay(it.data.start);
    let s = Math.round((start0 + (d.dy / hourPx) * 60) / SNAP) * SNAP;
    s = Math.max(START_H * 60, Math.min(END_H * 60 - dur, s));
    return { col: columns[newCi]!, startMin: s, dur };
  };

  const prodById = new Map(productions.map((x) => [x.id, x]));
  const roomById = new Map(rooms.map((x) => [x.id, x]));
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return (
    <div ref={scrollRef} className="scrollbar-thin relative max-h-[calc(100dvh-230px)] min-h-[480px] overflow-auto rounded-2xl border border-line bg-surface">
      <div style={{ minWidth: minColWidth ? 56 + minColWidth * columns.length : undefined }}>
        {/* Header */}
        <div className="sticky top-0 z-20 grid border-b border-line bg-surface/95 backdrop-blur" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0,1fr))` }}>
          <div />
          {columns.map((c) => (
            <div key={c.key} className={cn("border-l border-line px-2 py-2.5 text-center", c.isToday && "bg-accent-soft/50")}>
              <div className={cn("text-[11px] font-semibold tracking-wide uppercase", c.isToday ? "text-accent" : "text-ink-3")}>{c.label}</div>
              {c.sub && <div className={cn("mt-0.5 text-[13px] font-semibold tabular", c.isToday ? "text-accent" : "text-ink")}>{c.sub}</div>}
            </div>
          ))}
        </div>
        {/* Body */}
        <div className="grid" style={{ gridTemplateColumns: `56px 1fr` }}>
          <div className="relative" style={{ height: totalPx }}>
            {Array.from({ length: hours }).map((_, i) => (
              <div key={i} className="absolute right-2 -translate-y-1/2 text-[11px] text-ink-3 tabular" style={{ top: i * hourPx }}>
                {i > 0 && `${String(START_H + i).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>
          <div ref={bodyRef} className="relative grid" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr))`, height: totalPx }}>
            {/* hour lines */}
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              {Array.from({ length: hours }).map((_, i) => (
                <div key={i} className="absolute inset-x-0 border-t border-line/70" style={{ top: i * hourPx }} />
              ))}
            </div>
            {columns.map((c) => (
              <div
                key={c.key}
                className={cn("group/col relative border-l border-line", c.isToday && "bg-accent-soft/25")}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const m = START_H * 60 + Math.floor(((e.clientY - rect.top) / hourPx) * 2) * 30;
                  onCreate(c, m);
                }}
                title="Klicka för att skapa repetition"
              >
                {c.isToday && nowMin > START_H * 60 && nowMin < END_H * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((nowMin - START_H * 60) / 60) * hourPx }}>
                    <span className="-ml-1 size-2 rounded-full bg-bad" />
                    <span className="h-px flex-1 bg-bad" />
                  </div>
                )}
                {(byCol.get(c.key) ?? []).map((it) => {
                  const lay = lanes.get(it.r.id) ?? { lane: 0, lanes: 1 };
                  const prod = prodById.get(it.r.productionId)!;
                  const isDragging = drag?.id === it.r.id;
                  const t = isDragging && drag.moved ? target(it, drag) : null;
                  const startMin = minutesOfDay(it.data.start);
                  const dur = durationMin(it.data.start, it.data.end);
                  const top = ((startMin - START_H * 60) / 60) * hourPx;
                  const height = Math.max(22, (dur / 60) * hourPx - 2);
                  const status = rehearsalStatus(it.r);
                  const cl = conflictLevel(conflicts.get(it.r.id));
                  const editable = canEdit(it.r);
                  const width = `calc(${100 / lay.lanes}% - 4px)`;
                  const left = `calc(${(100 / lay.lanes) * lay.lane}% + 2px)`;
                  return (
                    <div key={it.r.id}>
                      <button
                        data-testid={`event-${it.r.id}`}
                        title={`${prod.title}: ${it.data.title}\n${fmtRange(it.data.start, it.data.end)} · ${roomById.get(it.data.roomId)?.name}`}
                        aria-label={`${prod.title}: ${it.data.title}, ${fmtRange(it.data.start, it.data.end)}, ${roomById.get(it.data.roomId)?.name}${status === "utkast" ? ", utkast" : status === "andrad" ? ", opublicerad ändring" : ""}${cl ? ", har konflikt" : ""}`}
                        style={{ ...prodVars(prod.color), top, height, width, left }}
                        className={cn(
                          "@container absolute z-[1] flex flex-col overflow-hidden rounded-lg border-l-[3px] border-[var(--pc)] bg-[var(--pc-soft)] px-1.5 py-1 text-left text-[11.5px] leading-tight text-ink transition-shadow hover:z-[5] hover:shadow-[var(--shadow-card)]",
                          status === "utkast" && "border border-l-[3px] border-dashed border-[var(--pc)] bg-surface",
                          cl === "error" && "ring-2 ring-bad/70",
                          cl === "warning" && "ring-1 ring-warn/60",
                          isDragging && drag.moved && "opacity-35",
                          editable ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer",
                        )}
                        onPointerDown={(e) => {
                          if (!editable || e.button !== 0) return;
                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                          setDrag({ id: it.r.id, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, moved: false });
                        }}
                        onPointerMove={(e) => {
                          if (!drag || drag.id !== it.r.id) return;
                          const dx = e.clientX - drag.x0;
                          const dy = e.clientY - drag.y0;
                          setDrag({ ...drag, dx, dy, moved: drag.moved || Math.abs(dx) > 4 || Math.abs(dy) > 4 });
                        }}
                        onPointerUp={() => {
                          if (!drag || drag.id !== it.r.id) return;
                          const d = drag;
                          setDrag(null);
                          if (!d.moved) return onOpen(it.r.id);
                          const tg = target(it, d);
                          if (tg.col.key === it.col && tg.startMin === startMin) return;
                          onMove(it.r, tg.col, tg.startMin);
                        }}
                        onPointerCancel={() => setDrag(null)}
                        onClick={(e) => {
                          // Keyboard activation (Enter/Space) – pointer clicks are handled in onPointerUp.
                          if (e.detail === 0) onOpen(it.r.id);
                          else if (!editable) onOpen(it.r.id);
                        }}
                      >
                        <span className="flex items-center gap-1 font-semibold">
                          {cl && <AlertTriangle className={cn("size-3 shrink-0", cl === "error" ? "text-bad" : "text-warn")} />}
                          {status === "andrad" && <span className="size-1.5 shrink-0 rounded-full bg-warn" title="Opublicerad ändring" />}
                          <span className="truncate">{it.data.title}</span>
                        </span>
                        {height > 34 && (
                          <>
                            <span className="truncate text-ink-2 tabular @max-[90px]:hidden">
                              {fmtRange(it.data.start, it.data.end)}
                              {showRoom ? ` · ${roomById.get(it.data.roomId)?.name}` : ` · ${prod.title}`}
                            </span>
                            <span className="hidden text-ink-2 tabular @max-[90px]:block">{fmtTime(it.data.start)}</span>
                          </>
                        )}
                        {height > 60 && (
                          <span className="mt-auto truncate text-[10.5px] font-medium text-[var(--pc)] @max-[90px]:hidden">
                            {status === "utkast" ? "Utkast · " : ""}
                            {showRoom ? prod.title : TYPE_LABEL[it.data.type]}
                          </span>
                        )}
                      </button>
                      {t && (
                        <DragGhost
                          prod={prod}
                          title={it.data.title}
                          topPx={((t.startMin - START_H * 60) / 60) * hourPx}
                          heightPx={height}
                          colOffset={columns.findIndex((x) => x.key === t.col.key) - columns.findIndex((x) => x.key === it.col)}
                          label={`${String(Math.floor(t.startMin / 60)).padStart(2, "0")}:${String(t.startMin % 60).padStart(2, "0")} · ${t.col.sub ? t.col.label + " " + t.col.sub : t.col.label}`}
                        />
                      )}
                    </div>
                  );
                })}
                <span className="pointer-events-none absolute top-2 right-2 hidden text-ink-3 group-hover/col:block" aria-hidden>
                  <Plus className="size-3.5" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DragGhost({ prod, title, topPx, heightPx, colOffset, label }: { prod: Production; title: string; topPx: number; heightPx: number; colOffset: number; label: string }) {
  return (
    <div
      aria-hidden
      style={{ ...prodVars(prod.color), top: topPx, height: heightPx, left: `calc(${colOffset * 100}% + 2px)`, width: "calc(100% - 4px)" }}
      className="pointer-events-none absolute z-30 rounded-lg border-2 border-[var(--pc)] bg-[var(--pc-soft)] px-1.5 py-1 text-[11.5px] shadow-[var(--shadow-lift)]"
    >
      <div className="truncate font-semibold">{title}</div>
      <div className="mt-0.5 inline-block rounded bg-accent px-1 text-[10.5px] font-semibold text-accent-ink tabular">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month view
// ---------------------------------------------------------------------------
export function MonthGrid({
  anchor,
  items,
  productions,
  conflicts,
  now,
  onOpen,
  onDay,
}: {
  anchor: Date;
  items: GridItem[];
  productions: Production[];
  conflicts: Map<ID, Conflict[]>;
  now: Date;
  onOpen: (id: ID) => void;
  onDay: (d: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
  });
  const prodById = new Map(productions.map((x) => [x.id, x]));
  const byDay = new Map<string, GridItem[]>();
  items.forEach((it) => {
    const k = it.data.start.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(it);
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line bg-surface-2/50">
        {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const k = toDateKey(d);
          const list = (byDay.get(k) ?? []).sort((a, b) => a.data.start.localeCompare(b.data.start));
          const today = isSameDay(d, now);
          return (
            <div key={k} className={cn("min-h-[118px] border-r border-b border-line p-1.5 [&:nth-child(7n)]:border-r-0", !isSameMonth(d, anchor) && "bg-surface-2/40")}>
              <button
                onClick={() => onDay(d)}
                className={cn(
                  "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular hover:bg-surface-2",
                  today ? "bg-accent text-accent-ink hover:bg-accent" : isSameMonth(d, anchor) ? "text-ink" : "text-ink-3",
                )}
                aria-label={`Visa ${format(d, "d MMMM", { locale: sv })}`}
              >
                {format(d, "d")}
              </button>
              <div className="space-y-0.5">
                {list.slice(0, 3).map((it) => {
                  const prod = prodById.get(it.r.productionId)!;
                  const cl = conflictLevel(conflicts.get(it.r.id));
                  return (
                    <button
                      key={it.r.id}
                      onClick={() => onOpen(it.r.id)}
                      style={prodVars(prod.color)}
                      className={cn(
                        "flex w-full items-center gap-1 truncate rounded-md bg-[var(--pc-soft)] px-1.5 py-0.5 text-left text-[11px] text-ink hover:brightness-95",
                        rehearsalStatus(it.r) === "utkast" && "border border-dashed border-[var(--pc)] bg-transparent",
                      )}
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-[var(--pc)]" />
                      <span className="tabular text-ink-2">{fmtTime(it.data.start)}</span>
                      <span className="truncate font-medium">{it.data.title}</span>
                      {cl && <AlertTriangle className={cn("ml-auto size-3 shrink-0", cl === "error" ? "text-bad" : "text-warn")} />}
                    </button>
                  );
                })}
                {list.length > 3 && (
                  <button onClick={() => onDay(d)} className="px-1.5 text-[11px] font-medium text-ink-3 hover:text-ink">
                    +{list.length - 3} till
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline – rooms × days (resource utilisation)
// ---------------------------------------------------------------------------
export function Timeline({
  weekStartDate,
  items,
  rooms,
  productions,
  conflicts,
  now,
  onOpen,
}: {
  weekStartDate: Date;
  items: GridItem[];
  rooms: Room[];
  productions: Production[];
  conflicts: Map<ID, Conflict[]>;
  now: Date;
  onOpen: (id: ID) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const prodById = new Map(productions.map((x) => [x.id, x]));
  const H0 = 8;
  const H1 = 23;
  const span = (H1 - H0) * 60;
  return (
    <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-line bg-surface">
      <div className="min-w-[1080px]">
        <div className="grid border-b border-line bg-surface-2/50" style={{ gridTemplateColumns: "170px repeat(7, 1fr) 72px" }}>
          <div className="px-4 py-2.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Lokal</div>
          {days.map((d) => (
            <div key={d.toISOString()} className={cn("border-l border-line px-2 py-2.5 text-center text-[11px] font-semibold tracking-wide uppercase", isSameDay(d, now) ? "text-accent" : "text-ink-3")}>
              {format(d, "EEE d/M", { locale: sv })}
            </div>
          ))}
          <div className="border-l border-line px-2 py-2.5 text-center text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Beläggn.</div>
        </div>
        {rooms.map((room) => {
          const roomItems = items.filter((it) => it.data.roomId === room.id);
          const used = roomItems.reduce((a, it) => a + durationMin(it.data.start, it.data.end), 0);
          const util = used / (7 * span);
          return (
            <div key={room.id} className="grid border-b border-line last:border-b-0" style={{ gridTemplateColumns: "170px repeat(7, 1fr) 72px" }}>
              <div className="px-4 py-3">
                <div className="text-sm font-semibold">{room.name}</div>
                <div className="text-[11px] text-ink-3">{room.location}</div>
              </div>
              {days.map((d) => {
                const k = toDateKey(d);
                const list = roomItems.filter((it) => it.data.start.startsWith(k));
                return (
                  <div key={k} className={cn("relative border-l border-line", isSameDay(d, now) && "bg-accent-soft/25")}>
                    {list.map((it) => {
                      const prod = prodById.get(it.r.productionId)!;
                      const s = minutesOfDay(it.data.start) - H0 * 60;
                      const e = s + durationMin(it.data.start, it.data.end);
                      const left = Math.max(0, s / span) * 100;
                      const width = Math.max(2, (Math.min(span, e) - Math.max(0, s)) / span) * 100;
                      const cl = conflictLevel(conflicts.get(it.r.id));
                      return (
                        <button
                          key={it.r.id}
                          onClick={() => onOpen(it.r.id)}
                          title={`${prod.title}: ${it.data.title} ${fmtRange(it.data.start, it.data.end)}`}
                          aria-label={`${prod.title}: ${it.data.title} ${fmtRange(it.data.start, it.data.end)}`}
                          style={{ ...prodVars(prod.color), left: `${left}%`, width: `${width}%` }}
                          className={cn(
                            "absolute top-1/2 h-7 -translate-y-1/2 rounded-md bg-[var(--pc)] opacity-85 transition-opacity hover:opacity-100",
                            rehearsalStatus(it.r) === "utkast" && "border-2 border-dashed border-[var(--pc)] bg-[var(--pc-soft)]",
                            cl === "error" && "ring-2 ring-bad",
                          )}
                        />
                      );
                    })}
                  </div>
                );
              })}
              <div className="flex flex-col items-center justify-center border-l border-line px-2">
                <span className="text-sm font-semibold tabular">{Math.round(util * 100)}%</span>
                <span className="mt-1 h-1 w-10 overflow-hidden rounded-full bg-surface-3">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, util * 100)}%` }} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="border-t border-line px-4 py-2 text-[11px] text-ink-3">Tidsaxel per dag 08–23. Beläggning = bokad tid / tillgänglig tid (08–23).</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact list
// ---------------------------------------------------------------------------
export function ListView({
  items,
  productions,
  rooms,
  conflicts,
  onOpen,
}: {
  items: GridItem[];
  productions: Production[];
  rooms: Room[];
  conflicts: Map<ID, Conflict[]>;
  onOpen: (id: ID) => void;
}) {
  const prodById = new Map(productions.map((x) => [x.id, x]));
  const roomById = new Map(rooms.map((x) => [x.id, x]));
  const groups = new Map<string, GridItem[]>();
  [...items]
    .sort((a, b) => a.data.start.localeCompare(b.data.start))
    .forEach((it) => {
      const k = it.data.start.slice(0, 10);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(it);
    });
  if (!items.length) return <p className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-ink-3">Inga repetitioner denna vecka med valda filter.</p>;
  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([k, list]) => (
        <section key={k} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h3 className="border-b border-line bg-surface-2/50 px-4 py-2 text-[13px] font-semibold">{capitalize(fmtDayShort(p(k)))}</h3>
          <table className="w-full text-sm">
            <caption className="sr-only">Repetitioner {k}</caption>
            <tbody className="divide-y divide-line">
              {list.map((it) => {
                const prod = prodById.get(it.r.productionId)!;
                const status = rehearsalStatus(it.r);
                const cl = conflictLevel(conflicts.get(it.r.id));
                return (
                  <tr key={it.r.id} className="cursor-pointer hover:bg-surface-2/60" onClick={() => onOpen(it.r.id)}>
                    <td className="w-[110px] px-4 py-2.5 font-semibold whitespace-nowrap tabular">{fmtRange(it.data.start, it.data.end)}</td>
                    <td className="px-2 py-2.5">
                      <button className="text-left font-medium hover:underline" onClick={() => onOpen(it.r.id)}>
                        {it.data.title}
                      </button>
                      <div className="text-xs text-ink-3 sm:hidden">{roomById.get(it.data.roomId)?.name}</div>
                    </td>
                    <td className="hidden px-2 py-2.5 md:table-cell">
                      <span style={prodVars(prod.color)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--pc)]">
                        <span className="size-1.5 rounded-full bg-[var(--pc)]" /> {prod.title}
                      </span>
                    </td>
                    <td className="hidden px-2 py-2.5 text-ink-2 sm:table-cell">{roomById.get(it.data.roomId)?.name}</td>
                    <td className="hidden px-2 py-2.5 text-ink-3 lg:table-cell tabular">{it.data.participantIds.length} kallade</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {cl && <AlertTriangle className={cn("mr-2 inline size-4", cl === "error" ? "text-bad" : "text-warn")} aria-label="Konflikt" />}
                      {status === "utkast" ? (
                        <Badge tone="gold">Utkast</Badge>
                      ) : status === "andrad" ? (
                        <Badge tone="warn">Ändrad</Badge>
                      ) : status === "installd" ? (
                        <Badge tone="bad">Inställd</Badge>
                      ) : (
                        <Badge tone="ok">Publicerad</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
