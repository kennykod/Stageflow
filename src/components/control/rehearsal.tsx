"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Bell,
  CalendarClock,
  Copy,
  MapPin,
  Mail,
  MessageSquareText,
  Pencil,
  Send,
  Smartphone,
  Undo2,
  Users,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups, useNow } from "@/lib/hooks";
import { TYPE_LABEL, computeChanges, isShortNotice, planRecipients, rehearsalStatus, workingData, type Conflict } from "@/lib/domain";
import { capitalize, fmtDayLong, fmtRange, fmtStamp } from "@/lib/time";
import type { ID, Rehearsal } from "@/lib/types";
import { cn, plural } from "@/lib/utils";
import { Dialog, Sheet, toast } from "@/components/ui/overlay";
import { Avatar, Badge, Button, Checkbox, DemoTag, ProgressBar, Textarea } from "@/components/ui/primitives";
import { ChangeList, ProductionTag, StatusBadge } from "@/components/shared";
import { useControlData } from "./data";

export function ConflictList({ conflicts, className }: { conflicts: Conflict[]; className?: string }) {
  if (!conflicts.length) return null;
  return (
    <ul className={cn("space-y-1.5", className)}>
      {conflicts.map((c, i) => (
        <li
          key={i}
          className={cn(
            "flex items-start gap-2 rounded-xl px-3 py-2 text-[13px] leading-snug",
            c.severity === "error" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn",
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="text-ink">
            <span className={cn("font-semibold", c.severity === "error" ? "text-bad" : "text-warn")}>
              {{ room: "Lokalkrock", person: "Dubbelbokning", unavailable: "Otillgänglig", rest: "Dygnsvila", invalid: "Ogiltig tid" }[c.kind]}:
            </span>{" "}
            {c.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Publish review dialog – draft → review → publish
// ---------------------------------------------------------------------------
export function PublishDialog({ rehearsalId, open, onOpenChange, onPublished }: { rehearsalId: ID; open: boolean; onOpenChange: (v: boolean) => void; onPublished?: () => void }) {
  const r = useStore((s) => s.rehearsals.find((x) => x.id === rehearsalId));
  const publish = useStore((s) => s.publish);
  const meId = useStore((s) => s.controlUserId);
  const rooms = useStore((s) => s.rooms);
  const scenes = useStore((s) => s.scenes);
  const people = useStore((s) => s.people);
  const L = useLookups();
  const now = useNow();
  const { conflicts } = useControlData();
  const [message, setMessage] = useState("");
  const [requires, setRequires] = useState<boolean | null>(null);

  const calc = useMemo(() => {
    if (!r?.draft) return null;
    const changes = computeChanges(r.published, r.draft, { rooms, scenes, people });
    const plan = planRecipients(r.published, r.draft, changes);
    return { changes, plan, short: isShortNotice(now, r.draft) };
  }, [r, rooms, scenes, people, now]);

  if (!r || !r.draft || !calc) return null;
  const d = r.draft;
  const requiresResponse = requires ?? calc.short;
  const total = calc.plan.newlyCalled.length + calc.plan.changed.length + calc.plan.removed.length;
  const myConflicts = conflicts.get(r.id) ?? [];

  const group = (label: string, ids: ID[], tone: "ok" | "warn" | "bad" | "neutral", hint: string) =>
    ids.length > 0 && (
      <div className="rounded-2xl border border-line p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Badge tone={tone}>{ids.length}</Badge> {label}
          </div>
          <span className="text-xs text-ink-3">{hint}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id) => {
            const p = L.person(id)!;
            return (
              <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-0.5 pr-2.5 pl-0.5 text-[12.5px]">
                <Avatar name={p.name} hue={p.hue} size={20} /> {p.name}
              </span>
            );
          })}
        </div>
      </div>
    );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={r.published ? "Granska och publicera ändring" : "Granska och publicera"}
      description="Inga notiser skickas förrän du publicerar. Endast berörda personer meddelas."
      footer={
        <>
          <span className="mr-auto hidden text-xs text-ink-3 sm:block">
            I appen <DemoTag kind="simulerad" className="ml-1" /> · E-post/SMS <DemoTag kind="framtida" className="ml-1" />
          </span>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            variant="primary"
            data-testid="confirm-publish"
            onClick={() => {
              const res = publish(r.id, meId, { requiresResponse, message });
              onOpenChange(false);
              setMessage("");
              setRequires(null);
              if (res) {
                toast({
                  title: r.published ? "Ändringen är publicerad" : "Repetitionen är publicerad",
                  body: res.notified ? `${plural(res.notified, "person", "personer")} har fått en notis.` : "Ingen behövde meddelas.",
                });
              }
              onPublished?.();
            }}
          >
            <Send /> Publicera{total ? ` och meddela ${total}` : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ProductionTag production={L.production(r.productionId)} size="sm" />
            <Badge>{TYPE_LABEL[d.type]}</Badge>
            <StatusBadge r={r} />
          </div>
          <div className="mt-2 font-display text-xl font-medium">{d.title}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="size-4 text-ink-3" /> {capitalize(fmtDayLong(d.start))} · {fmtRange(d.start, d.end)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-ink-3" /> {L.room(d.roomId)?.name}
            </span>
          </div>
        </div>

        {calc.changes.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Detta ändras</h3>
            <div className="rounded-2xl border border-line p-4">
              <ChangeList changes={calc.changes} />
            </div>
          </div>
        )}

        {myConflicts.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Varningar</h3>
            <ConflictList conflicts={myConflicts} />
            <p className="mt-2 text-xs text-ink-3">Du kan publicera ändå – konflikter loggas och syns för planerare.</p>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Mottagare</h3>
          <div className="space-y-2">
            {group("Nyinkallade", calc.plan.newlyCalled, "ok", "Får notis om ny repetition")}
            {group("Berörda av ändringen", calc.plan.changed, "warn", "Får notis med före/efter")}
            {group("Borttagna från kallelsen", calc.plan.removed, "bad", "Får besked att de inte behövs")}
            {calc.plan.unaffected.length > 0 && (
              <p className="rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-2">
                {plural(calc.plan.unaffected.length, "person", "personer")} är redan kallade och påverkas inte – de störs inte i onödan.
              </p>
            )}
            {total === 0 && <p className="text-sm text-ink-3">Ingen behöver meddelas.</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-3.5">
            <Checkbox checked={requiresResponse} onChange={setRequires} label="Be om närvarosvar" />
            <span>
              <span className="block text-sm font-semibold">Be om närvarosvar</span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-3">
                {calc.short ? "Kort varsel (< 72 h) – rekommenderas. " : ""}
                Mottagarna svarar ”Jag kommer” eller ”Kan inte”, separat från kvittensen.
              </span>
            </span>
          </label>
          <div>
            <label htmlFor="pub-msg" className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
              <MessageSquareText className="size-4" /> Meddelande (valfritt)
            </label>
            <Textarea id="pub-msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="T.ex. orsak till ändringen" className="min-h-[72px]" />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Cancel dialog
// ---------------------------------------------------------------------------
function CancelDialog({ r, open, onOpenChange }: { r: Rehearsal; open: boolean; onOpenChange: (v: boolean) => void }) {
  const cancel = useStore((s) => s.cancelRehearsal);
  const meId = useStore((s) => s.controlUserId);
  const [message, setMessage] = useState("");
  const d = workingData(r);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={r.published ? "Ställ in repetitionen?" : "Radera utkastet?"}
      description={
        r.published
          ? `${plural(r.published.participantIds.length, "person", "personer")} får en notis om att ${d.title} är inställd.`
          : "Utkastet har aldrig publicerats. Ingen notis skickas."
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Behåll
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              cancel(r.id, meId, { message });
              onOpenChange(false);
              toast({ title: r.published ? "Repetitionen är inställd" : "Utkastet är raderat", tone: "warn" });
            }}
          >
            <Ban /> {r.published ? "Ställ in och meddela" : "Radera utkast"}
          </Button>
        </>
      }
    >
      {r.published ? (
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Meddelande till de kallade (valfritt)" />
      ) : (
        <p className="text-sm text-ink-2">Åtgärden loggas i granskningsloggen.</p>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Rehearsal detail sheet
// ---------------------------------------------------------------------------
export function RehearsalSheet({ rehearsalId, onOpenChange }: { rehearsalId: ID | null; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const r = useStore((s) => s.rehearsals.find((x) => x.id === rehearsalId));
  const meId = useStore((s) => s.controlUserId);
  const discardDraft = useStore((s) => s.discardDraft);
  const remind = useStore((s) => s.remind);
  const notifications = useStore((s) => s.notifications);
  const dispatches = useStore((s) => s.dispatches);
  const rooms = useStore((s) => s.rooms);
  const scenes = useStore((s) => s.scenes);
  const people = useStore((s) => s.people);
  const L = useLookups();
  const { conflicts } = useControlData();
  const [publishOpen, setPublishOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const latestDispatch = useMemo(
    () => (r ? dispatches.filter((d) => d.rehearsalId === r.id && d.kind !== "borttagen").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined),
    [dispatches, r],
  );
  const ackById = useMemo(() => {
    const m = new Map<ID, (typeof notifications)[number]>();
    if (latestDispatch) notifications.filter((n) => n.dispatchId === latestDispatch.id).forEach((n) => m.set(n.recipientId, n));
    return m;
  }, [notifications, latestDispatch]);

  if (!r) return null;
  const d = workingData(r);
  const status = rehearsalStatus(r);
  const pending = r.draft && r.published ? computeChanges(r.published, r.draft, { rooms, scenes, people }) : [];
  const c = conflicts.get(r.id) ?? [];
  const acked = latestDispatch ? latestDispatch.recipientIds.filter((id) => ackById.get(id)?.ackAt).length : 0;

  return (
    <>
      <Sheet
        open={!!rehearsalId}
        onOpenChange={onOpenChange}
        width={520}
        title={d.title}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <ProductionTag production={L.production(r.productionId)} size="sm" />
            <StatusBadge r={r} />
            <Badge>{TYPE_LABEL[d.type]}</Badge>
          </div>
        }
        footer={
          status === "installd" ? (
            <p className="text-sm text-ink-3">Inställd repetition – endast historik.</p>
          ) : (
            <>
              {r.draft && (
                <Button variant="primary" onClick={() => setPublishOpen(true)} data-testid="sheet-publish">
                  <Send /> Granska & publicera
                </Button>
              )}
              <Link href={`/control/repetition/${r.id}`}>
                <Button>
                  <Pencil /> Redigera
                </Button>
              </Link>
              <Link href={`/control/repetition/ny?duplicate=${r.id}`}>
                <Button variant="ghost">
                  <Copy /> Duplicera
                </Button>
              </Link>
              {status === "andrad" && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    discardDraft(r.id, meId);
                    toast({ title: "Ändringen är ångrad", tone: "info" });
                  }}
                >
                  <Undo2 /> Ångra ändring
                </Button>
              )}
              <Button variant="ghost" className="ml-auto text-bad hover:bg-bad-soft hover:text-bad" onClick={() => setCancelOpen(true)}>
                <Ban /> {r.published ? "Ställ in" : "Radera"}
              </Button>
            </>
          )
        }
      >
        <div className="space-y-6">
          <div className="grid gap-3 rounded-2xl bg-surface-2 p-4 text-sm">
            <div className="flex items-center gap-3">
              <CalendarClock className="size-4 text-ink-3" />
              <span>
                {capitalize(fmtDayLong(d.start))} · <span className="font-semibold tabular">{fmtRange(d.start, d.end)}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="size-4 text-ink-3" />
              <span>
                {L.room(d.roomId)?.name} <span className="text-ink-3">· {L.room(d.roomId)?.location}</span>
              </span>
            </div>
            {d.sceneIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-7">
                {d.sceneIds.map((id) => {
                  const s = L.scene(id);
                  return s ? (
                    <Badge key={id}>
                      {s.number} {s.title}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
            {d.description && <p className="pl-7 text-ink-2">{d.description}</p>}
          </div>

          {pending.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                Opublicerade ändringar <Badge tone="warn">Syns inte för ensemblen ännu</Badge>
              </h3>
              <div className="rounded-2xl border border-warn/30 bg-warn-soft/40 p-4">
                <ChangeList changes={pending} />
              </div>
            </section>
          )}

          {c.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Konflikter</h3>
              <ConflictList conflicts={c} />
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="size-4 text-ink-3" /> Kallade ({d.participantIds.length})
              </h3>
              {latestDispatch && (
                <span className="text-xs text-ink-3">
                  Senaste utskick {fmtStamp(latestDispatch.createdAt)} · {acked}/{latestDispatch.recipientIds.length} kvitterat
                </span>
              )}
            </div>
            {latestDispatch && <ProgressBar value={acked / Math.max(1, latestDispatch.recipientIds.length)} className="mb-3" label="Kvitterat" />}
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {d.participantIds.map((id) => {
                const p = L.person(id);
                if (!p) return null;
                const n = ackById.get(id);
                return (
                  <li key={id} className="flex items-center gap-3 px-3 py-2">
                    <Avatar name={p.name} hue={p.hue} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="truncate text-xs text-ink-3">{p.title}</div>
                    </div>
                    {latestDispatch && latestDispatch.recipientIds.includes(id) ? (
                      n?.ackAt ? (
                        <Badge tone="ok">Kvitterat</Badge>
                      ) : n?.readAt ? (
                        <Badge tone="info">Läst</Badge>
                      ) : (
                        <Badge tone="warn">Ej läst</Badge>
                      )
                    ) : r.draft && !r.published?.participantIds.includes(id) ? (
                      <Badge tone="gold">Ny – ej meddelad</Badge>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {latestDispatch && acked < latestDispatch.recipientIds.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const n = remind(latestDispatch.id, meId);
                    toast({ title: "Påminnelse skickad", body: `${plural(n, "person", "personer")} påmindes.` });
                  }}
                >
                  <Bell /> Påminn ej kvitterade
                </Button>
                <Button size="sm" variant="ghost" onClick={() => router.push("/control/kvittenser")}>
                  Alla kvittenser
                </Button>
              </div>
            )}
          </section>

          <p className="flex items-center gap-2 text-xs text-ink-3">
            <Smartphone className="size-3.5" /> Deltagarna ser repetitionen i StageFlow Personal efter publicering.
            <Mail className="size-3.5" /> E-post <DemoTag kind="framtida" />
          </p>
        </div>
      </Sheet>
      {r.draft && <PublishDialog rehearsalId={r.id} open={publishOpen} onOpenChange={setPublishOpen} />}
      <CancelDialog r={r} open={cancelOpen} onOpenChange={setCancelOpen} />
    </>
  );
}
