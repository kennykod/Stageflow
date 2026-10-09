"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpenText, CalendarDays, Monitor, Sun, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand";
import { DemoGuideButton } from "@/components/demo-guide";
import { PersonaSwitcher } from "@/components/shared";
import { usePersonalData } from "./data";

const TABS = [
  { href: "/me", label: "Idag", icon: Sun, exact: true },
  { href: "/me/schema", label: "Schema", icon: CalendarDays },
  { href: "/me/notiser", label: "Notiser", icon: Bell, badge: true },
  { href: "/me/manus", label: "Manus", icon: BookOpenText },
  { href: "/me/profil", label: "Profil", icon: UserRound },
];

export function PersonalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { unacked } = usePersonalData();
  const immersive = pathname.includes("/repetera");
  // Embedded = shown inside the split demo's phone frame (our own iframe), not just "in some frame".
  const embedded = (() => {
    try {
      return !!window.frameElement?.hasAttribute("data-sf-pane");
    } catch {
      return false;
    }
  })();

  return (
    <div className="min-h-dvh lg:grain lg:flex lg:items-start lg:justify-center lg:gap-12 lg:px-8 lg:py-8">
      {/* Desktop side panel */}
      {!embedded && (
        <aside className="sticky top-8 hidden w-[300px] shrink-0 lg:block">
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <div>
              <div className="font-display text-xl font-semibold">StageFlow</div>
              <div className="text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">Personal · mobilvy</div>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-ink-2">
            Personal är byggd för mobilen. På datorn visas den i telefonformat – öppna samma adress i mobilen eller ändra fönstrets bredd.
          </p>
          <div className="mt-6 space-y-2">
            <DemoGuideButton />
            <Link href="/control" className="flex items-center gap-2 text-sm font-medium text-ink-2 hover:text-ink">
              <Monitor className="size-4" /> Öppna StageFlow Control
            </Link>
          </div>
        </aside>
      )}

      <div
        className={cn(
          "relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col bg-canvas",
          !embedded && "lg:mx-0 lg:h-[calc(100dvh-4rem)] lg:min-h-0 scrollbar-thin lg:overflow-y-auto lg:rounded-[40px] lg:border lg:border-line lg:shadow-[var(--shadow-lift)]",
        )}
      >
        {!immersive && (
          <header className="sticky top-0 z-30 flex items-center justify-between bg-canvas/90 px-5 pt-3 pb-2 backdrop-blur">
            <Link href="/me" className="flex items-center gap-2" aria-label="StageFlow Personal – Idag">
              <Logo size={28} />
              <span className="font-display text-[17px] font-semibold">StageFlow</span>
            </Link>
            <PersonaSwitcher experience="personal" compact />
          </header>
        )}
        <main id="main" className={cn("flex-1", !immersive && "pb-28")}>
          {children}
        </main>
        {!immersive && (
          <nav
            aria-label="Personal"
            className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[460px] border-t border-line bg-surface/95 px-2 pt-1.5 backdrop-blur lg:sticky lg:inset-x-auto"
          >
            <ul className="grid grid-cols-5">
              {TABS.map((t) => {
                const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
                const Icon = t.icon;
                return (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl text-[11.5px] font-medium transition-colors",
                        active ? "text-accent" : "text-ink-3 hover:text-ink",
                      )}
                    >
                      <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-accent-soft")}>
                        <Icon className="size-[21px]" strokeWidth={active ? 2.3 : 1.9} />
                      </span>
                      {t.label}
                      {t.badge && unacked.length > 0 && (
                        <span className="absolute top-0.5 left-1/2 ml-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bad px-1 text-[10.5px] font-bold text-white ring-2 ring-surface tabular dark:text-[#1a0d0b]">
                          {unacked.length}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}

export function useMarkPersonalSeen() {
  const progress = useStore((s) => s.progress);
  const markProgress = useStore((s) => s.markProgress);
  return () => {
    if (progress.published && !progress.personalSeen) markProgress("personalSeen");
  };
}
