"use client";

import { useState } from "react";
import { CalendarDays, Check, Database, FileScan, KeyRound, Mail, Minus, PlugZap, ShieldCheck, Speech, X } from "lucide-react";
import { PageHeader } from "@/components/control/shell";
import { Badge, Button, Card, DemoTag, SectionTitle } from "@/components/ui/primitives";
import { NoAccess } from "@/components/shared";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { can, type Action } from "@/lib/permissions";
import { PERSONAS } from "@/lib/seed/people";
import { MockVenueAdapter, type ExternalBooking } from "@/lib/integrations/adapters";
import { toDateKey, fmtRange } from "@/lib/time";

const INTEGRATIONS = [
  { icon: <PlugZap />, name: "Yesplan", status: "framtida", body: "Adaptergränssnitt finns (VenuePlanningAdapter). Ingen anslutning är gjord eller verifierad. Föreslås: läsande import av bokningar för konfliktkontroll, därefter ev. tvåvägssynk efter avtal och API-granskning." },
  { icon: <CalendarDays />, name: "Kalender (iCal)", status: "delvis", body: "Implementerat: .ics-export per repetition i Personal. Framtida: personlig prenumerationslänk med signerad token." },
  { icon: <Mail />, name: "E-post, SMS, push", status: "framtida", body: "Notiser levereras i appen i demon. Kanalgränssnitt finns; leverantör (t.ex. inom EU) väljs vid upphandling." },
  { icon: <KeyRound />, name: "Inloggning (SSO)", status: "framtida", body: "Demon använder rollbyte. Produktion: SSO mot organisationens IdP (OIDC/SAML) och MFA." },
  { icon: <Database />, name: "Databas med RLS", status: "designad", body: "Postgres/Supabase-schema med Row Level Security finns i supabase/migrations. Demon lagrar data lokalt i webbläsaren." },
  { icon: <Speech />, name: "AI-röster", status: "simulerad", body: "Webbläsarens talsyntes läser exakt manustext. Produktion: neural TTS inom EU, utan lagring eller träning på manus." },
  { icon: <FileScan />, name: "OCR / AI-tolkning", status: "framtida", body: "Textbaserade PDF:er tolkas lokalt idag. Inskannade manus kräver OCR på server med signerade, tidsbegränsade fillänkar." },
] as const;

const ACTIONS: { a: Action; label: string; prod?: boolean }[] = [
  { a: "control.access", label: "Öppna Control" },
  { a: "schedule.edit", label: "Planera Fyren", prod: true },
  { a: "schedule.publish", label: "Publicera Vinterresan", prod: true },
  { a: "schedule.viewFull", label: "Se hela Fyrens schema", prod: true },
  { a: "script.read", label: "Läsa Fyrens manus", prod: true },
  { a: "audit.view", label: "Granskningslogg" },
];
const PROD_FOR: Partial<Record<Action, string>> = {
  "schedule.edit": "prod-fyren",
  "schedule.publish": "prod-vinter",
  "schedule.viewFull": "prod-fyren",
  "script.read": "prod-fyren",
};

export default function IntegrationsPage() {
  const meId = useStore((s) => s.controlUserId);
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const rooms = useStore((s) => s.rooms);
  const allowed = useCan(meId);
  const L = useLookups();
  const [bookings, setBookings] = useState<ExternalBooking[] | null>(null);

  if (!allowed("integrations.view")) return <NoAccess>Integrationer och säkerhet hanteras av produktionsledning.</NoAccess>;

  return (
    <>
      <PageHeader title="Integrationer & säkerhet" subtitle="Ärlig status: vad som är byggt, vad som är simulerat och vad som återstår." />
      <div className="space-y-10 px-5 pb-12 sm:px-8">
        <section>
          <SectionTitle>Integrationer</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {INTEGRATIONS.map((i) => (
              <Card key={i.name} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2.5 font-semibold">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-ink-2 [&_svg]:size-[18px]">{i.icon}</span>
                    {i.name}
                  </span>
                  {i.status === "framtida" ? (
                    <DemoTag kind="framtida" />
                  ) : i.status === "simulerad" ? (
                    <DemoTag kind="simulerad" />
                  ) : i.status === "designad" ? (
                    <Badge tone="info">Designad</Badge>
                  ) : (
                    <Badge tone="ok">Delvis</Badge>
                  )}
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{i.body}</p>
              </Card>
            ))}
          </div>
          <Card className="mt-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Testa adaptergränssnittet</div>
                <div className="text-xs text-ink-3">Kör MockVenueAdapter – returnerar fiktiva bokningar. Ingen extern förfrågan görs.</div>
              </div>
              <Button size="sm" onClick={async () => setBookings(await new MockVenueAdapter().listBookings(toDateKey(new Date()), toDateKey(new Date())))}>
                Hämta mock-bokningar
              </Button>
            </div>
            {bookings && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {bookings.map((b) => (
                  <li key={b.externalId} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                    <Badge tone="gold">{b.source}</Badge>
                    <span className="font-medium">{b.title}</span>
                    <span className="text-ink-3">
                      {b.roomName} · {fmtRange(b.start, b.end)} · {new MockVenueAdapter().mapRoom(b.roomName, rooms) ? "matchad mot lokal" : "ingen matchande lokal"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section>
          <SectionTitle>Behörighetsmatris (levande – beräknas av samma regler som appen)</SectionTitle>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Behörigheter per demoroll</caption>
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-ink-3 uppercase">
                  <th className="px-5 py-3 font-semibold">Roll</th>
                  {ACTIONS.map((x) => (
                    <th key={x.a} className="px-3 py-3 text-center font-semibold">
                      {x.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PERSONAS.map((p) => (
                  <tr key={p.personId}>
                    <td className="px-5 py-2.5">
                      <div className="font-medium">{L.person(p.personId)?.name}</div>
                      <div className="text-xs text-ink-3">{p.label}</div>
                    </td>
                    {ACTIONS.map((x) => {
                      const ok = can({ people, memberships }, p.personId, x.a, PROD_FOR[x.a]);
                      return (
                        <td key={x.a} className="px-3 py-2.5 text-center">
                          {ok ? <Check className="mx-auto size-4 text-ok" aria-label="Tillåtet" /> : <X className="mx-auto size-4 text-ink-3" aria-label="Ej tillåtet" />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section>
          <SectionTitle>Säkerhet & integritet</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-3">
            <Control title="I prototypen" tone="ok" items={["Rollbaserad åtkomst per produktion i alla vyer", "Utkast syns aldrig i Personal", "Riktade notiser – endast berörda", "Granskningslogg för alla ändringar", "Privata anteckningar per person", "Export av egna data (JSON)", "React-escaping, inga osäkra HTML-injektioner", "Säkerhetsheaders (nosniff, frame-options, referrer, permissions)"]} />
            <Control title="Designat, ej driftsatt" tone="info" items={["RLS-policyer per organisation och produktion", "Tenant-isolering via organization_id", "Append-only audit_log", "Signerade, tidsbegränsade länkar till manusfiler", "Gallring av notiser och loggar enligt plan"]} />
            <Control title="Krävs för produktion" tone="warn" items={["SSO + MFA, sessionshantering", "Servervalidering (zod) i alla mutationer", "CSRF-skydd och rate limiting", "DPIA, personuppgiftsbiträdesavtal", "Penetrationstest och WCAG-revision", "Backup, övervakning, incidentrutin"]} />
          </div>
        </section>
      </div>
    </>
  );
}

function Control({ title, tone, items }: { title: string; tone: "ok" | "info" | "warn"; items: string[] }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className={tone === "ok" ? "size-4 text-ok" : tone === "info" ? "size-4 text-info" : "size-4 text-warn"} />
        {title}
      </div>
      <ul className="space-y-1.5 text-[13px] text-ink-2">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            {tone === "ok" ? <Check className="mt-0.5 size-3.5 shrink-0 text-ok" /> : <Minus className="mt-0.5 size-3.5 shrink-0 text-ink-3" />}
            {i}
          </li>
        ))}
      </ul>
    </Card>
  );
}
