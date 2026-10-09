"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import { sv } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, FilePen, LayoutList, Plus, Rows3, Table2, CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/control/shell";
import { useControlData } from "@/components/control/data";
import { ListView, MonthGrid, TimeGrid, Timeline, type GridColumn, type GridItem } from "@/components/control/calendar";
import { PublishDialog, RehearsalSheet } from "@/components/control/rehearsal";
import { Button, Segmented } from "@/components/ui/primitives";
import { toast } from "@/components/ui/overlay";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { rehearsalStatus, workingData } from "@/lib/domain";
import { capitalize, durationMin, toDateKey, toLocalISO, weekNumber, p, fmtRange } from "@/lib/time";
import type { ControlView, ID } from "@/lib/types";
import { cn, plural, prodVars } from "@/lib/utils";
import { can } from "@/lib/permissions";

export default function SchedulePage() {
  return (
    <Suspense>
      <Schedule />
    </Suspense>
  );
}

function Schedule() {
  const router = useRouter();
  const params = useSearchParams();
  const now = useNow();
  const { meId, myProductions, myRehearsals, conflicts } = useControlData();
  const rooms = useStore((s) => s.rooms);
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const prefs = useStore((s) => s.preferences);
  const setPrefs = useStore((s) => s.setPrefs);
  const saveDraft = useStore((s) => s.saveDraft);
  const markProgress = useStore((s) => s.markProgress);

  const anchor = params.get("d") ? p(params.get("d")!) : now;
  const view = (params.get("vy") as ControlView) || prefs.controlView;
  const [openId, setOpenId] = useState<ID | null>(params.get("r"));
  const [publishId, setPublishId] = useState<ID | null>(null);
  const [onlyUnpublished, setOnlyUnpublished] = useState(false);

  const setParam = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([k, v]) => (v === null ? sp.delete(k) : sp.set(k, v)));
    router.replace(`/control/schema?${sp.toString()}`, { scroll: false });
  };
  const setView = (v: ControlView) => {
    setPrefs({ controlView: v });
    setParam({ vy: v });
  };
  const setAnchor = (d: Date) => setParam({ d: toDateKey(d) });

  const activeProds = prefs.controlProductions.filter((id) => myProductions.some((p) => p.id === id));
  const visibleProdIds = activeProds.length ? activeProds : myProductions.map((p) => p.id);

  const range = useMemo(() => {
    if (view === "dag") return { from: toDateKey(anchor), to: toDateKey(anchor) };
    if (view === "manad") {
      return {
        from: toDateKey(startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })),
        to: toDateKey(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })),
      };
    }
    return { from: toDateKey(startOfWeek(anchor, { weekStartsOn: 1 })), to: toDateKey(endOfWeek(anchor, { weekStartsOn: 1 })) };
  }, [anchor, view]);

  const items: GridItem[] = useMemo(
    () =>
      myRehearsals
        .filter((r) => visibleProdIds.includes(r.productionId))
        .filter((r) => (view === "lista" ? true : !r.cancelled))
        .filter((r) => !onlyUnpublished || !!r.draft)
        .map((r) => ({ r, data: workingData(r), col: "" }))
        .filter((it) => it.data.start.slice(0, 10) >= range.from && it.data.start.slice(0, 10) <= range.to),
    [myRehearsals, visibleProdIds, range, view, onlyUnpublished],
  );

  const unpublished = myRehearsals.filter((r) => r.draft && !r.cancelled);
  const weekStartDate = startOfWeek(anchor, { weekStartsOn: 1 });

  const title =
    view === "dag"
      ? capitalize(format(anchor, "EEEE d MMMM", { locale: sv }))
      : view === "manad"
        ? capitalize(format(anchor, "LLLL yyyy", { locale: sv }))
        : `Vecka ${weekNumber(anchor)}`;
  const subtitle =
    view === "dag" || view === "manad"
      ? undefined
      : `${format(weekStartDate, "d MMM", { locale: sv })} – ${format(addDays(weekStartDate, 6), "d MMM yyyy", { locale: sv })}`;

  const step = (dir: 1 | -1) => {
    if (view === "dag") setAnchor(dir > 0 ? addDays(anchor, 1) : subDays(anchor, 1));
    else if (view === "manad") setAnchor(dir > 0 ? addMonths(anchor, 1) : subMonths(anchor, 1));
    else setAnchor(addDays(anchor, dir * 7));
  };

  const canEdit = (r: { productionId: string; cancelled: boolean }) => !r.cancelled && can({ people, memberships }, meId, "schedule.edit", r.productionId);

  const handleMove = (r: (typeof myRehearsals)[number], col: GridColumn, startMin: number) => {
    const d = workingData(r);
    const dur = durationMin(d.start, d.end);
    const dateKey = view === "dag" ? toDateKey(anchor) : col.dateKey;
    const start = `${dateKey}T${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
    const end = toLocalISO(new Date(p(start).getTime() + dur * 60000));
    const next = { ...d, start, end, roomId: col.roomId ?? d.roomId };
    saveDraft(r.id, next, meId, "move");
    const roomName = rooms.find((x) => x.id === next.roomId)?.name;
    toast({
      title: r.published ? "Flyttad – inte publicerad än" : "Utkastet flyttat",
      body: `${fmtRange(next.start, next.end)} · ${roomName}${r.published ? `. ${plural(r.published.participantIds.length, "person", "personer")} meddelas först när du publicerar.` : ""}`,
      tone: "info",
      action: { label: "Granska & publicera", onClick: () => setPublishId(r.id) },
    });
  };

  const handleCreate = (col: GridColumn, startMin: number) => {
    const hh = String(Math.floor(startMin / 60)).padStart(2, "0");
    const mm = String(startMin % 60).padStart(2, "0");
    const qs = new URLSearchParams({ date: view === "dag" ? toDateKey(anchor) : col.dateKey, start: `${hh}:${mm}` });
    if (col.roomId) qs.set("room", col.roomId);
    if (visibleProdIds.length === 1) qs.set("prod", visibleProdIds[0]!);
    router.push(`/control/repetition/ny?${qs.toString()}`);
  };

  const weekColumns: GridColumn[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStartDate, i);
    return {
      key: toDateKey(d),
      dateKey: toDateKey(d),
      label: format(d, "EEE", { locale: sv }),
      sub: format(d, "d/M"),
      isToday: toDateKey(d) === toDateKey(now),
    };
  });
  const dayColumns: GridColumn[] = rooms.map((r) => ({ key: r.id, roomId: r.id, dateKey: toDateKey(anchor), label: r.name, sub: undefined, isToday: false }));

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-baseline gap-3">
            {title}
            {subtitle && <span className="font-sans text-base font-normal text-ink-3">{subtitle}</span>}
          </span>
        }
        actions={
          <>
            <div className="flex items-center rounded-xl border border-line bg-surface p-0.5 shadow-[var(--shadow-soft)]">
              <Button variant="ghost" size="icon-sm" aria-label="Föregående" onClick={() => step(-1)}>
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAnchor(now)}>
                Idag
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Nästa" onClick={() => step(1)}>
                <ChevronRight />
              </Button>
            </div>
            <Segmented
              label="Vy"
              value={view}
              onChange={setView}
              options={[
                { value: "dag", label: "Dag", icon: <Rows3 /> },
                { value: "vecka", label: "Vecka", icon: <CalendarRange /> },
                { value: "manad", label: "Månad", icon: <CalendarDays /> },
                { value: "tidslinje", label: "Lokaler", icon: <Table2 /> },
                { value: "lista", label: "Lista", icon: <LayoutList /> },
              ]}
              className="max-w-full overflow-x-auto"
            />
            <Link href="/control/repetition/ny">
              <Button variant="primary">
                <Plus /> Ny repetition
              </Button>
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 px-5 pb-4 sm:px-8">
        <span className="mr-1 text-[13px] text-ink-3">Visa:</span>
        {myProductions.map((prod) => {
          const on = visibleProdIds.includes(prod.id);
          return (
            <button
              key={prod.id}
              style={prodVars(prod.color)}
              aria-pressed={on}
              onClick={() => {
                const base = activeProds.length ? activeProds : myProductions.map((x) => x.id);
                let next = on ? base.filter((x) => x !== prod.id) : [...base, prod.id];
                if (!next.length || next.length === myProductions.length) next = [];
                setPrefs({ controlProductions: next });
              }}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors",
                on ? "border-transparent bg-[var(--pc-soft)] text-ink" : "border-line text-ink-3 hover:text-ink",
              )}
            >
              <span className={cn("size-2 rounded-full", on ? "bg-[var(--pc)]" : "border border-ink-3")} />
              {prod.title}
            </button>
          );
        })}
        {unpublished.length > 0 && (
          <button
            aria-pressed={onlyUnpublished}
            onClick={() => setOnlyUnpublished((v) => !v)}
            className={cn(
              "ml-auto inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors",
              onlyUnpublished ? "border-transparent bg-gold-soft text-gold" : "border-line text-ink-2 hover:text-ink",
            )}
          >
            <FilePen className="size-3.5" /> {plural(unpublished.length, "opublicerad", "opublicerade")}
          </button>
        )}
      </div>

      <div className="px-5 pb-10 sm:px-8">
        {view === "vecka" && (
          <TimeGrid
            columns={weekColumns}
            items={items.map((it) => ({ ...it, col: it.data.start.slice(0, 10) }))}
            productions={myProductions}
            rooms={rooms}
            conflicts={conflicts}
            now={now}
            minColWidth={130}
            canEdit={canEdit}
            onOpen={setOpenId}
            onMove={handleMove}
            onCreate={handleCreate}
          />
        )}
        {view === "dag" && (
          <TimeGrid
            columns={dayColumns}
            items={items.map((it) => ({ ...it, col: it.data.roomId }))}
            productions={myProductions}
            rooms={rooms}
            conflicts={conflicts}
            now={now}
            hourPx={60}
            minColWidth={128}
            showRoom={false}
            canEdit={canEdit}
            onOpen={setOpenId}
            onMove={handleMove}
            onCreate={handleCreate}
          />
        )}
        {view === "manad" && (
          <MonthGrid
            anchor={anchor}
            items={items}
            productions={myProductions}
            conflicts={conflicts}
            now={now}
            onOpen={setOpenId}
            onDay={(d) => {
              setPrefs({ controlView: "dag" });
              setParam({ d: toDateKey(d), vy: "dag" });
            }}
          />
        )}
        {view === "tidslinje" && <Timeline weekStartDate={weekStartDate} items={items} rooms={rooms} productions={myProductions} conflicts={conflicts} now={now} onOpen={setOpenId} />}
        {view === "lista" && <ListView items={items} productions={myProductions} rooms={rooms} conflicts={conflicts} onOpen={setOpenId} />}

        {(view === "vecka" || view === "dag") && (
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
            <span>Klicka på en tom tid för att skapa · Dra för att flytta{view === "dag" ? " (även mellan lokaler)" : ""}</span>
            {view === "vecka" && visibleProdIds.length > 2 && <span className="text-ink-2">Tips: välj färre produktioner ovan för mer utrymme</span>}
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-4 rounded border border-dashed border-ink-3" /> Utkast
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-warn" /> Opublicerad ändring
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-4 rounded ring-2 ring-bad/70" /> Konflikt
            </span>
          </p>
        )}
      </div>

      <RehearsalSheet
        rehearsalId={openId}
        onOpenChange={(v) => {
          if (!v) {
            setOpenId(null);
            if (params.get("r")) setParam({ r: null });
          }
        }}
      />
      {publishId && (
        <PublishDialog
          rehearsalId={publishId}
          open={!!publishId}
          onOpenChange={(v) => !v && setPublishId(null)}
          onPublished={() => {
            const r = myRehearsals.find((x) => x.id === publishId);
            if (r?.published) markProgress("changed");
          }}
        />
      )}
      {/* status util for screen readers */}
      <span className="sr-only" aria-live="polite">
        {items.length} repetitioner visas. {items.filter((i) => rehearsalStatus(i.r) !== "publicerad").length} med opublicerade ändringar.
      </span>
    </>
  );
}
