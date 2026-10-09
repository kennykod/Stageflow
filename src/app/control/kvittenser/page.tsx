"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, ChevronDown, Download, Info, UserCheck, UserX } from "lucide-react";
import { PageHeader } from "@/components/control/shell";
import { useControlData } from "@/components/control/data";
import { Avatar, Badge, Button, Card, ProgressBar, Segmented, Select, Switch } from "@/components/ui/primitives";
import { toast } from "@/components/ui/overlay";
import { ChangeList, ProductionTag } from "@/components/shared";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { capitalize, fmtDayLong, fmtRange, fmtStamp } from "@/lib/time";
import type { Dispatch, Notification } from "@/lib/types";
import { cn, plural } from "@/lib/utils";
import { DOWNLOADS_BLOCKED, DOWNLOAD_BLOCKED_MSG } from "@/lib/env";

const KIND: Record<Dispatch["kind"], { label: string; tone: "info" | "warn" | "bad" | "neutral" }> = {
  ny: { label: "Ny kallelse", tone: "info" },
  andrad: { label: "Ändring", tone: "warn" },
  installd: { label: "Inställd", tone: "bad" },
  borttagen: { label: "Borttagen", tone: "neutral" },
  paminnelse: { label: "Påminnelse", tone: "neutral" },
};

export default function AcksPage() {
  return (
    <Suspense>
      <Acks />
    </Suspense>
  );
}

function Acks() {
  const qs = useSearchParams();
  const router = useRouter();
  const tab = qs.get("flik") === "logg" ? "logg" : "utskick";
  const { meId, myProductions, allowedIds } = useControlData();
  const allowed = useCan(meId);
  const markProgress = useStore((s) => s.markProgress);
  useEffect(() => markProgress("ackViewed"), [markProgress]);

  return (
    <>
      <PageHeader
        title="Kvittenser"
        subtitle="Vem har tagit del av vad – och vem behöver en påminnelse."
        actions={
          <Segmented
            label="Flik"
            value={tab}
            onChange={(v) => router.replace(v === "logg" ? "/control/kvittenser?flik=logg" : "/control/kvittenser")}
            options={[
              { value: "utskick", label: "Utskick" },
              ...(allowed("audit.view") || allowedIds.length ? [{ value: "logg" as const, label: "Granskningslogg" }] : []),
            ]}
          />
        }
      />
      <div className="px-5 pb-12 sm:px-8">{tab === "utskick" ? <Dispatches myProductionIds={myProductions.map((p) => p.id)} /> : <AuditLog allowedIds={allowedIds} />}</div>
    </>
  );
}

function Dispatches({ myProductionIds }: { myProductionIds: string[] }) {
  const dispatches = useStore((s) => s.dispatches);
  const notifications = useStore((s) => s.notifications);
  const productions = useStore((s) => s.productions);
  const [prod, setProd] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const rows = useMemo(
    () =>
      dispatches
        .filter((d) => myProductionIds.includes(d.productionId) && (!prod || d.productionId === prod))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((d) => ({ d, ns: notifications.filter((n) => n.dispatchId === d.id) }))
        .filter((r) => !onlyOpen || r.ns.some((n) => !n.ackAt)),
    [dispatches, notifications, myProductionIds, prod, onlyOpen],
  );

  return (
    <>
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-info/20 bg-info-soft px-4 py-3 text-[13px] text-ink">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p>
          <strong>Kvittens</strong> betyder att mottagaren har tagit del av informationen – <strong>inte</strong> att hen godkänner ändringen. Vid kort
          varsel efterfrågas ett separat <strong>närvarosvar</strong> (”Jag kommer” / ”Kan inte”).
        </p>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select value={prod} onChange={(e) => setProd(e.target.value)} className="h-9 w-56" aria-label="Filtrera produktion">
          <option value="">Alla produktioner</option>
          {productions
            .filter((p) => myProductionIds.includes(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <Switch checked={onlyOpen} onChange={setOnlyOpen} label="Endast ej fullt kvitterade" /> Endast ej fullt kvitterade
        </label>
        <span className="ml-auto text-sm text-ink-3">{plural(rows.length, "utskick", "utskick")}</span>
      </div>
      <div className="space-y-3">
        {rows.length === 0 && <Card className="p-10 text-center text-sm text-ink-3">Inga utskick matchar filtret. Publicera en repetition för att skapa ett utskick.</Card>}
        {rows.map(({ d, ns }) => (
          <DispatchCard key={d.id} d={d} ns={ns} />
        ))}
      </div>
    </>
  );
}

function DispatchCard({ d, ns }: { d: Dispatch; ns: Notification[] }) {
  const L = useLookups();
  const meId = useStore((s) => s.controlUserId);
  const remind = useStore((s) => s.remind);
  const [open, setOpen] = useState(false);
  const acked = ns.filter((n) => n.ackAt).length;
  const read = ns.filter((n) => n.readAt && !n.ackAt).length;
  const unread = ns.filter((n) => !n.readAt).length;
  const yes = ns.filter((n) => n.response === "kommer").length;
  const no = ns.filter((n) => n.response === "kan-inte").length;
  const pending = ns.length - acked;
  const sender = L.person(d.createdBy);

  return (
    <Card className="overflow-hidden" data-testid={`dispatch-${d.id}`}>
      <div className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={KIND[d.kind].tone}>{KIND[d.kind].label}</Badge>
            <ProductionTag production={L.production(d.productionId)} size="sm" />
            {d.requiresResponse && <Badge tone="gold">Närvarosvar begärt</Badge>}
          </div>
          <h3 className="mt-2 text-[15px] font-semibold">{d.snapshot.title}</h3>
          <p className="text-[13px] text-ink-3">
            {capitalize(fmtDayLong(d.snapshot.start))} {fmtRange(d.snapshot.start, d.snapshot.end)} · {L.room(d.snapshot.roomId)?.name} · skickat {fmtStamp(d.createdAt)} av {sender?.name}
          </p>
          {d.changes.length > 0 && (
            <div className="mt-3 max-w-xl rounded-xl bg-surface-2 px-3 py-2">
              <ChangeList changes={d.changes} compact />
            </div>
          )}
        </div>
        <div className="w-full sm:w-64">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl font-medium tabular">
              {acked}/{ns.length}
            </span>
            <span className="text-xs text-ink-3">kvitterat</span>
          </div>
          <ProgressBar value={ns.length ? acked / ns.length : 0} tone={acked === ns.length ? "ok" : "warn"} className="mt-1.5" label="Andel kvitterade" />
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
            <Badge tone="ok">{acked} kvitterat</Badge>
            {read > 0 && <Badge tone="info">{read} läst</Badge>}
            {unread > 0 && <Badge tone="warn">{unread} ej läst</Badge>}
            {d.requiresResponse && (
              <>
                <Badge tone="ok">
                  <UserCheck className="size-3" /> {yes}
                </Badge>
                {no > 0 && (
                  <Badge tone="bad">
                    <UserX className="size-3" /> {no}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/40 px-4 py-2.5 sm:px-5">
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} /> {open ? "Dölj mottagare" : `Visa ${ns.length} mottagare`}
        </Button>
        {pending > 0 && (
          <Button
            size="sm"
            className="ml-auto"
            data-testid="remind"
            onClick={() => {
              const n = remind(d.id, meId);
              toast({ title: "Påminnelse skickad", body: `${plural(n, "person", "personer")} påmindes i appen.` });
            }}
          >
            <Bell /> Påminn {pending} ej kvitterade
          </Button>
        )}
      </div>
      {open && (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] tracking-wide text-ink-3 uppercase">
              <tr>
                <th className="px-5 py-2 font-semibold">Mottagare</th>
                <th className="px-3 py-2 font-semibold">Kvittens</th>
                {d.requiresResponse && <th className="px-3 py-2 font-semibold">Närvarosvar</th>}
                <th className="px-5 py-2 text-right font-semibold">Påminnelser</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ns
                .slice()
                .sort((a, b) => Number(!!a.ackAt) - Number(!!b.ackAt))
                .map((n) => {
                  const p = L.person(n.recipientId);
                  if (!p) return null;
                  return (
                    <tr key={n.id}>
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={p.name} hue={p.hue} size={26} />
                          <span>
                            <span className="block font-medium">{p.name}</span>
                            <span className="block text-xs text-ink-3">{p.title}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {n.ackAt ? (
                          <span className="text-ok">Kvitterat {fmtStamp(n.ackAt)}</span>
                        ) : n.readAt ? (
                          <span className="text-info">Läst {fmtStamp(n.readAt)}, ej kvitterat</span>
                        ) : (
                          <span className="font-medium text-warn">Ej läst</span>
                        )}
                      </td>
                      {d.requiresResponse && (
                        <td className="px-3 py-2.5">
                          {n.response === "kommer" ? (
                            <span className="text-ok">Kommer</span>
                          ) : n.response === "kan-inte" ? (
                            <span className="text-bad">
                              Kan inte{n.responseNote && <span className="block text-xs text-ink-3">”{n.responseNote}”</span>}
                            </span>
                          ) : (
                            <span className="text-ink-3">Inget svar</span>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-2.5 text-right text-ink-3 tabular">{n.reminderCount || "–"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AuditLog({ allowedIds }: { allowedIds: string[] }) {
  const audit = useStore((s) => s.audit);
  const L = useLookups();
  const [q, setQ] = useState("");
  const rows = audit.filter((a) => (!a.productionId || allowedIds.includes(a.productionId)) && (!q || a.summary.toLowerCase().includes(q.toLowerCase()) || (L.person(a.actorId)?.name ?? "").toLowerCase().includes(q.toLowerCase())));

  const exportCsv = () => {
    if (DOWNLOADS_BLOCKED) return toast({ title: "CSV-filen kunde inte sparas här", body: DOWNLOAD_BLOCKED_MSG, tone: "info" });
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = ["Tid;Användare;Åtgärd;Produktion;Beskrivning", ...rows.map((a) => [a.at, L.person(a.actorId)?.name ?? a.actorId, a.action, L.production(a.productionId ?? "")?.title ?? "", a.summary].map(esc).join(";"))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = "stageflow-granskningslogg.csv";
    el.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Sök i loggen"
          aria-label="Sök i loggen"
          className="h-9 w-64 rounded-xl border border-line bg-surface px-3 text-sm focus:border-ring focus:outline-none"
        />
        <Button size="sm" className="ml-auto" onClick={exportCsv}>
          <Download /> Exportera CSV
        </Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Granskningslogg</caption>
          <thead className="text-left text-[11px] tracking-wide text-ink-3 uppercase">
            <tr className="border-b border-line">
              <th className="px-5 py-2.5 font-semibold">Tid</th>
              <th className="px-3 py-2.5 font-semibold">Användare</th>
              <th className="px-3 py-2.5 font-semibold">Händelse</th>
              <th className="px-5 py-2.5 font-semibold">Produktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a) => (
              <tr key={a.id} className="align-top">
                <td className="px-5 py-2.5 whitespace-nowrap text-ink-3 tabular">{fmtStamp(a.at)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{L.person(a.actorId)?.name}</td>
                <td className="px-3 py-2.5">
                  <span className="mr-2 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3">{a.action}</span>
                  {a.summary}
                </td>
                <td className="px-5 py-2.5">{a.productionId && <ProductionTag production={L.production(a.productionId)} size="sm" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-ink-3">I produktion: append-only logg i databasen med definierad lagringstid (gallring enligt informationshanteringsplan).</p>
    </>
  );
}
