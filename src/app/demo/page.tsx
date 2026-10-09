"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Monitor, RotateCcw, Smartphone } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/brand";
import { GuideList } from "@/components/demo-guide";
import { Button } from "@/components/ui/primitives";
import { toast } from "@/components/ui/overlay";
import { useStore } from "@/lib/store";

export default function SplitDemo() {
  const [controlSrc, setControlSrc] = useState({ path: "/control", n: 0 });
  const [personalSrc, setPersonalSrc] = useState({ path: "/me", n: 0 });
  const resetDemo = useStore((s) => s.resetDemo);

  return (
    <div className="flex h-dvh flex-col bg-surface-2">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
            <ArrowLeft className="size-4" />
          </Link>
          <Logo size={28} />
          <div>
            <div className="text-sm font-semibold">Delad demovy</div>
            <div className="text-xs text-ink-3">Ändringar i Control syns direkt i Personal – samma data, synkat mellan vyerna.</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              resetDemo();
              setControlSrc((s) => ({ path: "/control", n: s.n + 1 }));
              setPersonalSrc((s) => ({ path: "/me", n: s.n + 1 }));
              toast({ title: "Demodata återställd", tone: "info" });
            }}
          >
            <RotateCcw /> Återställ
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="hidden min-h-0 flex-1 gap-4 p-4 xl:flex">
        <aside className="scrollbar-thin w-[300px] shrink-0 overflow-y-auto pr-1">
          <GuideList
            onNavigate={(exp, path) => {
              if (exp === "control") setControlSrc((s) => ({ path, n: s.n + 1 }));
              else setPersonalSrc((s) => ({ path, n: s.n + 1 }));
            }}
          />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">
            <Monitor className="size-3.5" /> StageFlow Control
          </div>
          <iframe key={`c-${controlSrc.n}`} src={controlSrc.path} title="StageFlow Control" className="min-h-0 flex-1 rounded-2xl border border-line bg-canvas shadow-[var(--shadow-card)]" />
        </section>
        <section className="flex shrink-0 flex-col">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">
            <Smartphone className="size-3.5" /> StageFlow Personal
          </div>
          <div className="min-h-0 flex-1 rounded-[44px] border-[10px] border-[#111522] bg-[#111522] shadow-[var(--shadow-lift)]">
            <iframe key={`p-${personalSrc.n}`} src={personalSrc.path} title="StageFlow Personal" className="h-full w-[390px] rounded-[34px] bg-canvas" />
          </div>
        </section>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center xl:hidden">
        <p className="max-w-sm text-sm text-ink-2">Den delade vyn kräver en bred skärm (minst 1280 px). Öppna vyerna var för sig – de synkas mellan flikar.</p>
        <div className="flex gap-2">
          <Link href="/control">
            <Button variant="primary">
              <Monitor /> Control
            </Button>
          </Link>
          <Link href="/me">
            <Button>
              <Smartphone /> Personal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
