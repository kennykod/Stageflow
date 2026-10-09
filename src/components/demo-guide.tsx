"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Compass, Monitor, Smartphone } from "lucide-react";
import { useStore, type DemoProgress } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Sheet } from "./ui/overlay";
import { Button, DemoTag, ProgressBar } from "./ui/primitives";

export interface GuideStep {
  key: keyof DemoProgress;
  title: string;
  body: string;
  experience: "control" | "personal";
  personaId: string;
  path: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    key: "created",
    title: "Planeraren skapar en repetition",
    body: "Som Lena: klicka på en tom tid i schemat eller ”Ny repetition”. Välj Fyren och scen 1:3 – StageFlow föreslår vilka som ska kallas.",
    experience: "control",
    personaId: "p-lena",
    path: "/control/repetition/ny?prod=prod-fyren",
  },
  {
    key: "created",
    title: "Välj deltagare med gruppval",
    body: "Använd snabbval: hela ensemblen, avdelningar, sparade grupper, roller eller sök. Testa ”Alla utom…”.",
    experience: "control",
    personaId: "p-lena",
    path: "/control/repetition/ny?prod=prod-fyren",
  },
  {
    key: "published",
    title: "Kontrollera konflikter och publicera",
    body: "Konflikter visas direkt. Spara som utkast, granska mottagarna och publicera – först då skickas notiser.",
    experience: "control",
    personaId: "p-lena",
    path: "/control/schema",
  },
  {
    key: "personalSeen",
    title: "Skådespelaren ser repetitionen",
    body: "Byt till Sara Lindqvist i Personal. Den nya repetitionen syns i hennes schema och som notis.",
    experience: "personal",
    personaId: "p-sara",
    path: "/me/schema",
  },
  {
    key: "changed",
    title: "Planeraren ändrar tid eller lokal",
    body: "Dra repetitionen till en ny tid i veckovyn (eller till ett annat rum i dagvyn) och publicera ändringen.",
    experience: "control",
    personaId: "p-lena",
    path: "/control/schema",
  },
  {
    key: "acked",
    title: "Berörda kvitterar ändringen",
    body: "Som Sara: öppna notisen, se exakt vad som ändrats och tryck ”Jag har tagit del”.",
    experience: "personal",
    personaId: "p-sara",
    path: "/me/notiser",
  },
  {
    key: "ackViewed",
    title: "Ledningen ser kvittensstatus",
    body: "Som Lena: se vilka som kvitterat, vilka som inte läst och skicka påminnelse.",
    experience: "control",
    personaId: "p-lena",
    path: "/control/kvittenser",
  },
  {
    key: "rehearsalStarted",
    title: "Öppna scenen och repetera repliker",
    body: "Som Sara: öppna repetitionens scen i manuset och starta repetitionsläget – AI-partnern läser motspelarnas repliker.",
    experience: "personal",
    personaId: "p-sara",
    path: "/me/manus/script-fyren?scen=s-f-13",
  },
];

export function useGuideNavigate(onNavigate?: (experience: "control" | "personal", path: string) => void) {
  const router = useRouter();
  const setControlUser = useStore((s) => s.setControlUser);
  const setPersonalUser = useStore((s) => s.setPersonalUser);
  return (step: GuideStep) => {
    if (step.experience === "control") setControlUser(step.personaId);
    else setPersonalUser(step.personaId);
    if (onNavigate) onNavigate(step.experience, step.path);
    else router.push(step.path);
  };
}

export function GuideList({ onNavigate, onDone }: { onNavigate?: (experience: "control" | "personal", path: string) => void; onDone?: () => void }) {
  const progress = useStore((s) => s.progress);
  const go = useGuideNavigate(onNavigate);
  const doneCount = GUIDE_STEPS.filter((s) => progress[s.key]).length;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <ProgressBar value={doneCount / GUIDE_STEPS.length} tone="accent" label="Demoförlopp" />
        <span className="text-xs font-medium whitespace-nowrap text-ink-3 tabular">
          {doneCount}/{GUIDE_STEPS.length}
        </span>
      </div>
      <ol className="space-y-2">
        {GUIDE_STEPS.map((s, i) => {
          const done = progress[s.key];
          return (
            <li key={i} className={cn("rounded-2xl border p-3.5 transition-colors", done ? "border-transparent bg-ok-soft/60" : "border-line bg-surface")}>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular",
                    done ? "bg-ok text-white dark:text-[#0c1a12]" : "bg-surface-3 text-ink-2",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{s.title}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{s.body}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={done ? "ghost" : "soft"}
                      onClick={() => {
                        go(s);
                        onDone?.();
                      }}
                    >
                      {s.experience === "control" ? <Monitor /> : <Smartphone />}
                      {s.experience === "control" ? "Öppna i Control" : "Öppna i Personal"}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function DemoGuideButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const progress = useStore((s) => s.progress);
  const doneCount = GUIDE_STEPS.filter((s) => progress[s.key]).length;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5",
          className,
        )}
      >
        <Compass className="size-4 text-gold" />
        Demoguide
        <span className="rounded-full bg-surface-2 px-1.5 text-[11px] text-ink-3 tabular">
          {doneCount}/{GUIDE_STEPS.length}
        </span>
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Demoguide"
        description={
          <span className="flex flex-wrap items-center gap-2">
            Hela flödet i åtta steg. <DemoTag kind="demo" />
          </span>
        }
        width={440}
      >
        <GuideList onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
