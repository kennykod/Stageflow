"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Columns2, Monitor, RotateCcw, Smartphone, Sparkles } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/brand";
import { Avatar, Button, Card, DemoTag } from "@/components/ui/primitives";
import { toast } from "@/components/ui/overlay";
import { GuideList } from "@/components/demo-guide";
import { PERSONAS } from "@/lib/seed/people";
import { useStore } from "@/lib/store";
import { can } from "@/lib/permissions";

export default function Home() {
  const router = useRouter();
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const setControlUser = useStore((s) => s.setControlUser);
  const setPersonalUser = useStore((s) => s.setPersonalUser);
  const resetDemo = useStore((s) => s.resetDemo);

  return (
    <div className="grain min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="font-display text-xl font-semibold tracking-tight">StageFlow</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Återställ demo"
            onClick={() => {
              resetDemo();
              toast({ title: "Demodata återställd", tone: "info" });
            }}
          >
            <RotateCcw /> <span className="hidden sm:inline">Återställ demo</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="grid gap-10 pt-6 pb-12 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:pt-14">
          <div className="animate-rise">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2 shadow-[var(--shadow-soft)]">
              <Sparkles className="size-3.5 text-gold" /> Interaktiv prototyp · fiktiv demodata
            </div>
            <h1 className="font-display text-[44px] leading-[1.02] font-medium tracking-tight text-ink sm:text-6xl lg:text-[68px]">
              Rätt person.
              <br />
              Rätt plats.
              <br />
              <span className="text-gold italic">Rätt tid.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              StageFlow samlar repetitionsplanering, personliga scheman, ändringsnotiser med kvittens och manusrepetition – för alla som får en
              föreställning att hända.
            </p>
          </div>
          <div className="grid animate-rise gap-3 [animation-delay:80ms]">
            <EntryCard
              href="/control"
              icon={<Monitor />}
              title="StageFlow Control"
              body="Desktop för produktionsledning, regi och planering."
            />
            <EntryCard href="/me" icon={<Smartphone />} title="StageFlow Personal" body="Mobil för ensemble, musiker, tekniker och all personal." />
            <EntryCard
              href="/demo"
              icon={<Columns2 />}
              title="Delad demovy"
              body="Control och Personal sida vid sida – se ändringar slå igenom direkt."
              highlight
            />
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h2 className="mb-1 font-display text-2xl font-medium">Välj demoroll</h2>
            <p className="mb-5 text-sm text-ink-3">Varje roll ser olika saker. Behörigheter styr vad som visas och vad som går att göra.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PERSONAS.map((p) => {
                const person = people.find((x) => x.id === p.personId)!;
                const control = can({ people, memberships }, p.personId, "control.access");
                return (
                  <Card key={p.personId} className="flex flex-col p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
                    <div className="flex items-center gap-3">
                      <Avatar name={person.name} hue={person.hue} size={42} />
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{person.name}</div>
                        <div className="text-xs font-medium tracking-wide text-ink-3 uppercase">{p.label}</div>
                      </div>
                    </div>
                    <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink-2">{p.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {control && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setControlUser(p.personId);
                            router.push("/control");
                          }}
                        >
                          <Monitor /> Control
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={control ? "secondary" : "primary"}
                        onClick={() => {
                          setPersonalUser(p.personId);
                          router.push("/me");
                        }}
                      >
                        <Smartphone /> Personal
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="mb-1 font-display text-2xl font-medium">Demoflödet</h2>
            <p className="mb-5 text-sm text-ink-3">Följ stegen – roller byts automatiskt. Guiden finns också i appen.</p>
            <GuideList />
          </div>
        </section>

        <section className="mt-14 grid gap-4 rounded-3xl border border-line bg-surface p-6 sm:grid-cols-3">
          <Legend title="Implementerat" tone="bg-ok">
            Planering, gruppval, konfliktkontroll, utkast → publicering, riktade notiser, kvittenser, påminnelser, behörigheter, manusläsare,
            PDF-textimport och repetitionsläge med webbläsarens talsyntes.
          </Legend>
          <Legend title="Simulerat" tone="bg-gold">
            Inloggning (rollbyte), notisleverans (i appen – ej e-post/SMS/push), datalagring (lokalt i webbläsaren). <DemoTag kind="simulerad" />
          </Legend>
          <Legend title="Framtida integration" tone="bg-ink-3">
            Yesplan-/kalenderkoppling, serverbaserad OCR och AI-tolkning, SSO, Supabase med RLS (schema finns i repot). <DemoTag kind="framtida" />
          </Legend>
        </section>
        <p className="mt-6 text-center text-xs text-ink-3">
          Konceptprototyp. Alla personer, produktioner och manus är fiktiva. Inte ansluten till några av Kulturhuset Stadsteaterns system.
        </p>
      </main>
    </div>
  );
}

function EntryCard({ href, icon, title, body, highlight }: { href: string; icon: React.ReactNode; title: string; body: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={
        "group flex items-center gap-4 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] " +
        (highlight ? "border-transparent bg-accent text-accent-ink" : "border-line bg-surface shadow-[var(--shadow-card)]")
      }
    >
      <span
        className={
          "flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5 " + (highlight ? "bg-white/10" : "bg-accent-soft text-accent")
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className={"block text-[13px] " + (highlight ? "opacity-75" : "text-ink-3")}>{body}</span>
      </span>
      <ArrowRight className="size-5 opacity-50 transition-transform group-hover:translate-x-1 group-hover:opacity-100" />
    </Link>
  );
}

function Legend({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
        <span className={"size-2 rounded-full " + tone} /> {title}
      </div>
      <p className="text-[13px] leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}
