"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpenText, CalendarRange, CheckCheck, LayoutDashboard, Menu as MenuIcon, PlugZap, Plus, Theater } from "lucide-react";
import { Wordmark, ThemeToggle } from "@/components/brand";
import { PersonaSwitcher, NoAccess } from "@/components/shared";
import { DemoGuideButton } from "@/components/demo-guide";
import { Sheet } from "@/components/ui/overlay";
import { Button } from "@/components/ui/primitives";
import { useStore } from "@/lib/store";
import { useCan } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/control", label: "Översikt", icon: LayoutDashboard, exact: true },
  { href: "/control/schema", label: "Schema", icon: CalendarRange },
  { href: "/control/kvittenser", label: "Kvittenser", icon: CheckCheck, badge: "acks" as const },
  { href: "/control/produktioner", label: "Produktioner", icon: Theater },
  { href: "/control/manus", label: "Manus", icon: BookOpenText },
  { href: "/control/integrationer", label: "Integrationer & säkerhet", icon: PlugZap, perm: "integrations.view" as const },
];

function usePendingAcks(meId: string) {
  const notifications = useStore((s) => s.notifications);
  const dispatches = useStore((s) => s.dispatches);
  const allowed = useCan(meId);
  const dmap = new Map(dispatches.map((d) => [d.id, d]));
  return notifications.filter((n) => !n.ackAt && allowed("acks.view", dmap.get(n.dispatchId)?.productionId)).length;
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const meId = useStore((s) => s.controlUserId);
  const allowed = useCan(meId);
  const pending = usePendingAcks(meId);
  return (
    <nav aria-label="Huvudmeny" className="flex flex-col gap-0.5">
      {NAV.filter((n) => !n.perm || allowed(n.perm)).map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        const Icon = n.icon;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
              active ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-2 hover:bg-surface/60 hover:text-ink",
            )}
          >
            <Icon className={cn("size-[18px]", active ? "text-accent" : "text-ink-3 group-hover:text-ink-2")} />
            <span className="flex-1">{n.label}</span>
            {n.badge === "acks" && pending > 0 && (
              <span className="rounded-full bg-warn-soft px-1.5 text-[11px] font-semibold text-warn tabular">{pending}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function ControlShell({ children }: { children: React.ReactNode }) {
  const meId = useStore((s) => s.controlUserId);
  const allowed = useCan(meId);
  const [mobileNav, setMobileNav] = useState(false);
  const hasAccess = allowed("control.access");

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface-2/60 px-4 py-5 lg:flex">
        <Link href="/control" className="mb-7 px-2">
          <Wordmark sub="Control" />
        </Link>
        {hasAccess && (
          <Link href="/control/repetition/ny" className="mb-5">
            <Button variant="primary" className="w-full">
              <Plus /> Ny repetition
            </Button>
          </Link>
        )}
        {hasAccess && <Nav />}
        <div className="mt-auto space-y-3">
          <DemoGuideButton className="w-full justify-center" />
          <div className="flex items-center gap-1 border-t border-line pt-3">
            <div className="min-w-0 flex-1">
              <PersonaSwitcher experience="control" />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Top bar (mobile/tablet) */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Öppna meny" onClick={() => setMobileNav(true)}>
            <MenuIcon className="size-5" />
          </Button>
          <Wordmark sub="Control" />
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <PersonaSwitcher experience="control" compact />
        </div>
      </div>
      <Sheet open={mobileNav} onOpenChange={setMobileNav} title="Meny" width={320}>
        {hasAccess && (
          <Link href="/control/repetition/ny" className="mb-4 block" onClick={() => setMobileNav(false)}>
            <Button variant="primary" className="w-full">
              <Plus /> Ny repetition
            </Button>
          </Link>
        )}
        {hasAccess && <Nav onNavigate={() => setMobileNav(false)} />}
        <div className="mt-6">
          <DemoGuideButton />
        </div>
      </Sheet>

      <main id="main" className="min-w-0">
        {hasAccess ? (
          children
        ) : (
          <NoAccess>
            Din roll har inte behörighet till StageFlow Control. Du ser dina egna repetitioner, notiser och manus i StageFlow Personal.
          </NoAccess>
        )}
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-5 sm:px-8 lg:pt-8", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight font-medium tracking-tight text-ink sm:text-[32px]">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-ink-3">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
