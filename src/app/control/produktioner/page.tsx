"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { differenceInCalendarDays, format } from "date-fns";
import { sv } from "date-fns/locale";
import { CalendarRange, Check, Plus, Users, X } from "lucide-react";
import { PageHeader } from "@/components/control/shell";
import { useControlData } from "@/components/control/data";
import { Avatar, Badge, Button, Card, SectionTitle, Select } from "@/components/ui/primitives";
import { toast } from "@/components/ui/overlay";
import { useStore } from "@/lib/store";
import { useLookups, useNow } from "@/lib/hooks";
import { p } from "@/lib/time";
import { cn, prodVars } from "@/lib/utils";

export default function ProductionsPage() {
  return (
    <Suspense>
      <Productions />
    </Suspense>
  );
}

function Productions() {
  const qs = useSearchParams();
  const router = useRouter();
  const now = useNow();
  const L = useLookups();
  const { meId, myProductions } = useControlData();
  const memberships = useStore((s) => s.memberships);
  const characters = useStore((s) => s.characters);
  const scenes = useStore((s) => s.scenes);
  const groups = useStore((s) => s.groups);
  const departments = useStore((s) => s.departments);
  const people = useStore((s) => s.people);
  const setCasting = useStore((s) => s.setCasting);
  const toggleSceneCharacter = useStore((s) => s.toggleSceneCharacter);
  const [tab, setTab] = useState<"roller" | "scener" | "team" | "grupper">("roller");

  const prod = myProductions.find((x) => x.id === qs.get("p")) ?? myProductions[0];
  if (!prod) return null;
  const members = memberships.filter((m) => m.productionId === prod.id);
  const chars = characters.filter((c) => c.productionId === prod.id);
  const prodScenes = scenes.filter((s) => s.productionId === prod.id);
  const days = differenceInCalendarDays(p(prod.premiere), now);

  return (
    <>
      <PageHeader
        title="Produktioner"
        subtitle="Ensemble, rollbesättning, scener och grupper – grunden för smarta förslag vid planering."
        actions={
          <Link href={`/control/schema?vy=vecka`}>
            <Button>
              <CalendarRange /> Till schemat
            </Button>
          </Link>
        }
      />
      <div className="px-5 pb-12 sm:px-8">
        <div className="no-scrollbar -mx-1 mb-6 flex gap-3 overflow-x-auto px-1 pb-1">
          {myProductions.map((x) => {
            const active = x.id === prod.id;
            return (
              <button
                key={x.id}
                onClick={() => router.replace(`/control/produktioner?p=${x.id}`)}
                style={prodVars(x.color)}
                aria-pressed={active}
                className={cn(
                  "relative min-w-[200px] overflow-hidden rounded-2xl border p-4 text-left transition-all",
                  active ? "border-transparent bg-surface shadow-[var(--shadow-lift)] ring-2 ring-[var(--pc)]" : "border-line bg-surface hover:shadow-[var(--shadow-card)]",
                )}
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-[var(--pc)]" />
                <div className="font-display text-lg font-medium">{x.title}</div>
                <div className="text-xs text-ink-3">{x.subtitle}</div>
              </button>
            );
          })}
        </div>

        <Card style={prodVars(prod.color)} className="mb-6 grid gap-4 p-5 sm:grid-cols-4">
          <Info label="Premiär" value={format(p(prod.premiere), "d MMMM yyyy", { locale: sv })} sub={days >= 0 ? `om ${days} dagar` : `för ${-days} dagar sedan`} />
          <Info label="Scen" value={L.room(prod.stageRoomId)?.name ?? "–"} sub={prod.genre} />
          <Info label="Regi" value={L.person(prod.directorId)?.name ?? "–"} sub={`${members.length} medverkande`} />
          <Info label="Roller" value={`${chars.length} roller`} sub={`${prodScenes.length} scener`} />
        </Card>

        <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
          {(
            [
              ["roller", "Rollbesättning"],
              ["scener", "Scener × roller"],
              ["team", "Ensemble & team"],
              ["grupper", "Sparade grupper"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("h-8 rounded-lg px-3 text-[13px] font-medium", tab === k ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-3 hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "roller" && (
          <Card className="divide-y divide-line">
            {chars.length === 0 && <p className="p-6 text-sm text-ink-3">Inga roller registrerade.</p>}
            {chars.map((c) => {
              const candidates = members.filter((m) => !c.personIds.includes(m.personId));
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="w-48 min-w-0">
                    <div className="font-semibold">{c.name}</div>
                    {c.description && <div className="truncate text-xs text-ink-3">{c.description}</div>}
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {c.personIds.map((pid) => {
                      const pp = L.person(pid);
                      if (!pp) return null;
                      return (
                        <span key={pid} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pr-1 pl-0.5 text-[13px]">
                          <Avatar name={pp.name} hue={pp.hue} size={22} />
                          {pp.name}
                          <button
                            className="rounded-full p-0.5 text-ink-3 hover:bg-surface-2 hover:text-bad"
                            aria-label={`Ta bort ${pp.name} från ${c.name}`}
                            onClick={() => setCasting(c.id, c.personIds.filter((x) => x !== pid), meId)}
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      );
                    })}
                    {c.personIds.length > 1 && <Badge tone="info">Flera besättningar</Badge>}
                  </div>
                  <Select
                    aria-label={`Lägg till person i rollen ${c.name}`}
                    className="h-8 w-48 text-[13px]"
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setCasting(c.id, [...c.personIds, e.target.value], meId);
                      toast({ title: `${L.person(e.target.value)?.name} besatt som ${c.name}` });
                    }}
                  >
                    <option value="">+ Lägg till…</option>
                    {candidates.map((m) => (
                      <option key={m.personId} value={m.personId}>
                        {L.person(m.personId)?.name} ({m.function})
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
          </Card>
        )}

        {tab === "scener" && (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Vilka roller som medverkar i vilka scener</caption>
              <thead>
                <tr className="border-b border-line">
                  <th className="sticky left-0 bg-surface px-5 py-3 text-left text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Scen</th>
                  {chars.map((c) => (
                    <th key={c.id} className="px-2 py-3 text-center text-[11.5px] font-semibold whitespace-nowrap">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {prodScenes.map((s) => (
                  <tr key={s.id}>
                    <td className="sticky left-0 bg-surface px-5 py-2.5 whitespace-nowrap">
                      <span className="text-ink-3 tabular">{s.number}</span> <span className="font-medium">{s.title}</span>
                    </td>
                    {chars.map((c) => {
                      const on = s.characterIds.includes(c.id);
                      return (
                        <td key={c.id} className="px-2 py-1.5 text-center">
                          <button
                            style={prodVars(prod.color)}
                            onClick={() => toggleSceneCharacter(s.id, c.id, meId)}
                            aria-pressed={on}
                            aria-label={`${c.name} i ${s.number} ${s.title}`}
                            className={cn("inline-flex size-8 items-center justify-center rounded-lg transition-colors", on ? "bg-[var(--pc)] text-white dark:text-[#0c101c]" : "bg-surface-2 text-transparent hover:text-ink-3")}
                          >
                            <Check className="size-4" />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-line px-5 py-2.5 text-xs text-ink-3">Klicka i en cell för att ändra. Matrisen styr deltagarförslagen när du väljer scener i en repetition.</p>
          </Card>
        )}

        {tab === "team" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departments.map((d) => {
              const list = members.filter((m) => people.find((x) => x.id === m.personId)?.department === d.id);
              if (!list.length) return null;
              return (
                <Card key={d.id} className="p-4">
                  <SectionTitle>
                    {d.name} · {list.length}
                  </SectionTitle>
                  <ul className="space-y-2">
                    {list.map((m) => {
                      const pp = L.person(m.personId)!;
                      return (
                        <li key={m.personId} className="flex items-center gap-2.5">
                          <Avatar name={pp.name} hue={pp.hue} size={28} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{pp.name}</span>
                            <span className="block truncate text-xs text-ink-3">{m.function}</span>
                          </span>
                          {m.role !== "member" && <Badge tone="accent">{m.role === "producer" ? "Produktionsledning" : "Planerare"}</Badge>}
                          {m.role === "member" && m.fullSchedule && <Badge>Ser hela schemat</Badge>}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "grupper" && (
          <div className="grid gap-3 md:grid-cols-2">
            {groups
              .filter((g) => g.productionId === prod.id)
              .map((g) => (
                <Card key={g.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                      <Users className="size-4 text-ink-3" /> {g.name}
                    </div>
                    <Badge>{g.personIds.length}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {g.personIds.map((pid) => (
                      <span key={pid} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-0.5 pr-2.5 pl-0.5 text-xs">
                        <Avatar name={L.person(pid)?.name ?? "?"} hue={L.person(pid)?.hue ?? 0} size={20} /> {L.person(pid)?.name}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            <Card className="flex flex-col items-center justify-center border-dashed p-6 text-center text-sm text-ink-3">
              <Plus className="mb-2 size-5" />
              Skapa grupper direkt i deltagarväljaren med ”Spara grupp”.
              <Link href={`/control/repetition/ny?prod=${prod.id}`} className="mt-3">
                <Button size="sm">Ny repetition</Button>
              </Link>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{label}</div>
      <div className="mt-1 font-display text-lg font-medium">{value}</div>
      {sub && <div className="text-xs text-ink-3">{sub}</div>}
    </div>
  );
}
