"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpenText, CalendarPlus, Clock, History, MapPin, Phone, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups, useNow } from "@/lib/hooks";
import { usePersonalData } from "@/components/personal/data";
import { addToCalendar, useScriptForProduction } from "@/components/personal/cards";
import { TYPE_LABEL, rolesFor } from "@/lib/domain";
import { capitalize, dayLabel, fmtDayLong, fmtRange, fmtStamp, relativeTo } from "@/lib/time";
import { visibleInPersonal } from "@/lib/permissions";
import { cn, prodVars } from "@/lib/utils";
import { Avatar, Badge, Button } from "@/components/ui/primitives";
import { ChangeList, ProductionTag } from "@/components/shared";

export default function PersonalRehearsal() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const now = useNow();
  const L = useLookups();
  const { meId } = usePersonalData();
  const r = useStore((s) => s.rehearsals.find((x) => x.id === id));
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const characters = useStore((s) => s.characters);
  const scenes = useStore((s) => s.scenes);
  const dispatches = useStore((s) => s.dispatches);
  const notifications = useStore((s) => s.notifications);
  const script = useScriptForProduction(r?.productionId ?? "");

  // Authorization: only published rehearsals you're called to (or full-schedule rights).
  // "produktion" scope = participant OR holds full-schedule rights for this production.
  if (!r || !visibleInPersonal({ people, memberships }, meId, r, "produktion")) {
    return (
      <div className="px-5 pt-10 text-center">
        <h1 className="font-display text-2xl">Repetitionen kan inte visas</h1>
        <p className="mt-2 text-sm text-ink-3">Den finns inte, är inte publicerad ännu, eller så saknar du behörighet.</p>
        <Link href="/me/schema" className="mt-5 inline-block">
          <Button>Till schemat</Button>
        </Link>
      </div>
    );
  }

  const d = r.published!;
  const prod = L.production(r.productionId)!;
  const room = L.room(d.roomId);
  const mine = d.participantIds.includes(meId);
  const myRoles = rolesFor(meId, r.productionId, characters, d.sceneIds, scenes);
  const history = dispatches
    .filter((x) => x.rehearsalId === r.id && x.recipientIds.includes(meId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const inspicient = memberships.find((m) => m.productionId === r.productionId && m.function === "Inspicient");
  const insp = inspicient ? L.person(inspicient.personId) : undefined;
  const director = L.person(prod.directorId);

  return (
    <div style={prodVars(prod.color)}>
      <div className="bg-gradient-to-b from-[var(--pc-soft)] to-transparent px-5 pt-2 pb-6">
        <button onClick={() => router.back()} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> Tillbaka
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ProductionTag production={prod} />
          <Badge>{TYPE_LABEL[d.type]}</Badge>
          {r.cancelled && <Badge tone="bad">Inställd</Badge>}
          {!mine && <Badge>Du är inte kallad</Badge>}
        </div>
        <h1 className={cn("mt-3 font-display text-[30px] leading-tight font-medium", r.cancelled && "line-through")}>{d.title}</h1>
        <p className="mt-1 text-sm font-medium text-ink-2">{relativeTo(now, d.start, d.end)}</p>
      </div>

      <div className="space-y-5 px-5">
        <div className="divide-y divide-line rounded-3xl border border-line bg-surface">
          <Row icon={<Clock />} label="Tid">
            <span className="text-lg font-semibold tabular">{fmtRange(d.start, d.end)}</span>
            <span className="block text-sm text-ink-3">{capitalize(fmtDayLong(d.start))}</span>
          </Row>
          <Row icon={<MapPin />} label="Plats">
            <span className="font-semibold">{room?.name}</span>
            <span className="block text-sm text-ink-3">{room?.location}</span>
          </Row>
          {d.sceneIds.length > 0 && (
            <Row icon={<BookOpenText />} label="Scener">
              <ul className="space-y-1.5">
                {d.sceneIds.map((sid) => {
                  const s = L.scene(sid);
                  const hasText = script?.scenes.some((x) => x.sceneId === sid);
                  return (
                    <li key={sid} className="flex items-center justify-between gap-2">
                      <span>
                        <span className="text-ink-3 tabular">{s?.number}</span> <span className="font-medium">{s?.title}</span>
                      </span>
                      {hasText && (
                        <Link href={`/me/manus/${script!.id}?scen=${sid}`} className="rounded-lg px-2 py-1 text-sm font-semibold text-accent hover:bg-accent-soft">
                          Läs
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              {myRoles.length > 0 && <p className="mt-1.5 text-sm text-ink-3">Du spelar {myRoles.map((c) => c.name).join(", ")}</p>}
            </Row>
          )}
        </div>

        {d.description && <p className="rounded-3xl bg-surface-2 px-4 py-3.5 text-[15px] leading-relaxed text-ink-2">{d.description}</p>}

        {!r.cancelled && (
          <Button size="lg" className="w-full" onClick={() => addToCalendar(r, L)}>
            <CalendarPlus /> Lägg till i min kalender
          </Button>
        )}

        <section>
          <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-ink-3 uppercase">
            <Users className="size-4" /> Kallade ({d.participantIds.length})
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {d.participantIds.map((pid) => {
              const pp = L.person(pid);
              if (!pp) return null;
              return (
                <span key={pid} className={cn("inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-3 pl-0.5 text-[13px]", pid === meId ? "border-accent bg-accent-soft font-semibold" : "border-line bg-surface")}>
                  <Avatar name={pp.name} hue={pp.hue} size={24} />
                  {pid === meId ? "Du" : pp.name}
                </span>
              );
            })}
          </div>
        </section>

        {(insp || director) && (
          <section>
            <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-ink-3 uppercase">Kontakt</h2>
            <div className="divide-y divide-line rounded-3xl border border-line bg-surface">
              {[insp && { p: insp, role: "Inspicient" }, director && { p: director, role: "Regi" }].filter(Boolean).map((x) => {
                const c = x as { p: NonNullable<typeof insp>; role: string };
                return (
                  <div key={c.p.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={c.p.name} hue={c.p.hue} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{c.p.name}</div>
                      <div className="text-xs text-ink-3">{c.role}</div>
                    </div>
                    {c.p.phone && (
                      <a href={`tel:${c.p.phone.replace(/\s/g, "")}`} className="inline-flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-label={`Ring ${c.p.name}`}>
                        <Phone className="size-5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {history.length > 0 && (
          <section className="pb-4">
            <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-ink-3 uppercase">
              <History className="size-4" /> Historik
            </h2>
            <ol className="space-y-2">
              {history.map((h) => {
                const n = notifications.find((x) => x.dispatchId === h.id && x.recipientId === meId);
                return (
                  <li key={h.id} className="rounded-2xl border border-line bg-surface px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{{ ny: "Kallelse", andrad: "Ändring", installd: "Inställd", borttagen: "Borttagen", paminnelse: "Påminnelse" }[h.kind]}</span>
                      <span className="text-xs text-ink-3">{fmtStamp(h.createdAt)}</span>
                    </div>
                    {h.changes.length > 0 && (
                      <div className="mt-2">
                        <ChangeList changes={h.changes} compact />
                      </div>
                    )}
                    <div className="mt-1.5 text-xs text-ink-3">{n?.ackAt ? `Kvitterad ${fmtStamp(n.ackAt)}` : "Ej kvitterad"}</div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
        <p className="pb-4 text-center text-xs text-ink-3">{dayLabel(now, d.start)} · version {r.version}</p>
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 px-4 py-3.5">
      <span className="mt-0.5 text-ink-3 [&_svg]:size-5">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="sr-only">{label}: </span>
        <div>{children}</div>
      </div>
    </div>
  );
}
