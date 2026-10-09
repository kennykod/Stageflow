"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, LogIn, RotateCcw, ShieldAlert, Smartphone, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { PERSONAS } from "@/lib/seed/people";
import type { FieldChange, Production, Rehearsal } from "@/lib/types";
import { cn, prodVars } from "@/lib/utils";
import { rehearsalStatus } from "@/lib/domain";
import { Avatar, Badge, Button } from "./ui/primitives";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, toast } from "./ui/overlay";
import { can } from "@/lib/permissions";

export function ProductionTag({ production, className, size = "md" }: { production?: Production; className?: string; size?: "sm" | "md" }) {
  if (!production) return null;
  return (
    <span
      style={prodVars(production.color)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-[var(--pc-soft)] font-semibold text-[var(--pc)]",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-[var(--pc)]" aria-hidden />
      {production.title}
    </span>
  );
}

export function StatusBadge({ r }: { r: Rehearsal }) {
  const s = rehearsalStatus(r);
  if (s === "utkast") return <Badge tone="gold" dot>Utkast</Badge>;
  if (s === "andrad") return <Badge tone="warn" dot>Opublicerad ändring</Badge>;
  if (s === "installd") return <Badge tone="bad" dot>Inställd</Badge>;
  return <Badge tone="ok" dot>Publicerad</Badge>;
}

export function ChangeList({ changes, compact }: { changes: FieldChange[]; compact?: boolean }) {
  if (!changes.length) return null;
  return (
    <dl className={cn("grid gap-2", compact && "gap-1.5")}>
      {changes.map((c, i) => (
        <div key={i} className={cn("grid grid-cols-[84px_1fr] items-baseline gap-3 text-sm", compact && "grid-cols-[64px_1fr] text-[13px]")}>
          <dt className="text-ink-3">{c.label}</dt>
          <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-ink-3 line-through decoration-bad/60 decoration-[1.5px]">{c.before}</span>
            <ArrowRight className="size-3.5 translate-y-0.5 text-ink-3" aria-label="ändrat till" />
            <span className="rounded-md bg-warn-soft px-1.5 font-semibold text-ink">{c.after}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Persona switcher – used in both experiences. `experience` decides which session field is updated. */
export function PersonaSwitcher({ experience, compact }: { experience: "control" | "personal"; compact?: boolean }) {
  const router = useRouter();
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const currentId = useStore((s) => (experience === "control" ? s.controlUserId : s.personalUserId));
  const setUser = useStore((s) => (experience === "control" ? s.setControlUser : s.setPersonalUser));
  const resetDemo = useStore((s) => s.resetDemo);
  const me = people.find((x) => x.id === currentId)!;
  const persona = PERSONAS.find((x) => x.personId === currentId);

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-xl border border-transparent p-1.5 text-left transition-colors hover:border-line hover:bg-surface",
            compact && "w-auto",
          )}
          aria-label={`Inloggad som ${me.name}. Byt demoroll`}
        >
          <Avatar name={me.name} hue={me.hue} size={compact ? 32 : 36} />
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{me.name}</span>
              <span className="block truncate text-xs text-ink-3">{persona?.label ?? me.title}</span>
            </span>
          )}
          <ChevronDown className="size-4 text-ink-3" />
        </button>
      </MenuTrigger>
      <MenuContent align={compact ? "end" : "start"} className="w-[300px]">
        <MenuLabel>Byt demoroll</MenuLabel>
        {PERSONAS.map((p) => {
          const person = people.find((x) => x.id === p.personId)!;
          const controlOk = can({ people, memberships }, p.personId, "control.access");
          return (
            <MenuItem
              key={p.personId}
              onSelect={() => {
                setUser(p.personId);
                toast({ title: `Du är nu ${person.name}`, body: p.label, tone: "info" });
              }}
              className={cn(p.personId === currentId && "bg-accent-soft")}
            >
              <Avatar name={person.name} hue={person.hue} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{person.name}</span>
                <span className="block truncate text-xs text-ink-3">
                  {p.label}
                  {experience === "control" && !controlOk && " · ingen Control-behörighet"}
                </span>
              </span>
            </MenuItem>
          );
        })}
        <MenuSeparator />
        {experience === "control" ? (
          <MenuItem onSelect={() => router.push("/me")}>
            <Smartphone /> Öppna StageFlow Personal
          </MenuItem>
        ) : (
          <MenuItem onSelect={() => router.push("/control")}>
            <LogIn /> Öppna StageFlow Control
          </MenuItem>
        )}
        <MenuItem onSelect={() => router.push("/")}>
          <UserRound /> Demostart
        </MenuItem>
        <MenuItem
          onSelect={() => {
            resetDemo();
            toast({ title: "Demodata återställd", body: "Alla ändringar har nollställts.", tone: "info" });
          }}
        >
          <RotateCcw /> Återställ demodata
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function NoAccess({ title = "Ingen behörighet", children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-bad-soft text-bad">
        <ShieldAlert className="size-7" />
      </div>
      <h1 className="font-display text-2xl font-medium">{title}</h1>
      <div className="mt-2 text-ink-3">{children}</div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link href="/me">
          <Button variant="primary">
            <Smartphone /> Gå till StageFlow Personal
          </Button>
        </Link>
        <Link href="/">
          <Button>Välj annan demoroll</Button>
        </Link>
      </div>
      <p className="mt-6 text-xs text-ink-3">
        I produktion upprätthålls detta även i databasen (Row Level Security) – inte bara i gränssnittet.
      </p>
    </div>
  );
}

export function ProdStripe({ production, className }: { production?: Production; className?: string }) {
  if (!production) return null;
  return <span style={prodVars(production.color)} className={cn("block w-1 shrink-0 rounded-full bg-[var(--pc)]", className)} aria-hidden />;
}
