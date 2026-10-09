"use client";

import Link from "next/link";
import { Download, Mail, MessageSquare, Monitor, Moon, RotateCcw, ShieldCheck, Smartphone, Type } from "lucide-react";
import { useStore } from "@/lib/store";
import { usePersonalData } from "@/components/personal/data";
import { useTheme } from "@/components/brand";
import { Avatar, Badge, DemoTag, Segmented, Switch } from "@/components/ui/primitives";
import { toast } from "@/components/ui/overlay";
import { PERSONAS } from "@/lib/seed/people";
import type { PersonalView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DOWNLOADS_BLOCKED, DOWNLOAD_BLOCKED_MSG } from "@/lib/env";

export default function Profile() {
  const { me, meId, myProductions } = usePersonalData();
  const prefs = useStore((s) => s.preferences);
  const setPrefs = useStore((s) => s.setPrefs);
  const setPersonalUser = useStore((s) => s.setPersonalUser);
  const resetDemo = useStore((s) => s.resetDemo);
  const memberships = useStore((s) => s.memberships);
  const people = useStore((s) => s.people);
  const { dark, toggle } = useTheme();

  const exportMyData = () => {
    if (DOWNLOADS_BLOCKED) return toast({ title: "Exporten kunde inte sparas här", body: DOWNLOAD_BLOCKED_MSG, tone: "info" });
    // Data minimisation / GDPR art. 15 – export what StageFlow holds about *you*.
    const s = useStore.getState();
    const data = {
      exporteradVid: new Date().toISOString(),
      person: s.people.find((x) => x.id === meId),
      medlemskap: s.memberships.filter((m) => m.personId === meId),
      roller: s.characters.filter((c) => c.personIds.includes(meId)).map((c) => ({ roll: c.name, produktion: c.productionId })),
      kallelser: s.rehearsals.filter((r) => r.published?.participantIds.includes(meId)).map((r) => ({ id: r.id, ...r.published, participantIds: undefined })),
      notiser: s.notifications.filter((n) => n.recipientId === meId),
      anteckningar: s.annotations.filter((a) => a.personId === meId),
      bokmarken: s.bookmarks.filter((b) => b.personId === meId),
      franvaro: s.unavailability.filter((u) => u.personId === meId),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stageflow-mina-data-${meId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: "Dina data har exporterats", body: "JSON-fil med allt StageFlow lagrar om dig." });
  };

  return (
    <div className="space-y-6 px-5 pt-3">
      <div className="flex items-center gap-4">
        <Avatar name={me.name} hue={me.hue} size={60} />
        <div>
          <h1 className="font-display text-2xl font-medium">{me.name}</h1>
          <p className="text-sm text-ink-3">{me.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {myProductions.map((p) => (
              <Badge key={p.id}>
                {p.title} · {memberships.find((m) => m.personId === meId && m.productionId === p.id)?.function}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Group title="Visning">
        <Item icon={<Type />} label="Större text" hint="Ökar textstorleken i hela appen">
          <Switch checked={prefs.largeText} onChange={(v) => setPrefs({ largeText: v })} label="Större text" />
        </Item>
        <Item icon={<Moon />} label="Mörkt läge">
          <Switch checked={dark} onChange={toggle} label="Mörkt läge" />
        </Item>
        <div className="px-4 py-3.5">
          <div className="mb-2 text-sm font-medium">Standardvy för schemat</div>
          <Segmented<PersonalView>
            label="Standardvy"
            value={prefs.personalView}
            onChange={(v) => setPrefs({ personalView: v })}
            className="w-full"
            options={[
              { value: "dag", label: "Dag" },
              { value: "vecka", label: "Vecka" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
        </div>
      </Group>

      <Group title="Aviseringar">
        <Item icon={<Smartphone />} label="I appen" hint="Notiser och kvittenser">
          <Switch checked onChange={() => toast({ title: "Notiser i appen kan inte stängas av", body: "Schemaändringar måste nå dig.", tone: "info" })} label="Notiser i appen" />
        </Item>
        <Item icon={<Mail />} label="E-post" hint={<DemoTag kind="framtida" />}>
          <Switch checked={false} onChange={() => toast({ title: "E-post är en framtida integration", tone: "info" })} label="E-post" />
        </Item>
        <Item icon={<MessageSquare />} label="SMS / push" hint={<DemoTag kind="framtida" />}>
          <Switch checked={false} onChange={() => toast({ title: "SMS och push är framtida integrationer", tone: "info" })} label="SMS och push" />
        </Item>
      </Group>

      <Group title="Integritet">
        <div className="px-4 py-3.5 text-[13px] leading-relaxed text-ink-2">
          <div className="mb-1.5 flex items-center gap-2 font-semibold text-ink">
            <ShieldCheck className="size-4 text-ok" /> Dina uppgifter
          </div>
          StageFlow visar bara det du behöver: dina kallelser, roller och notiser. Dina manusanteckningar och bokmärken är privata och syns inte
          för någon annan.
        </div>
        <button onClick={exportMyData} className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-sm font-medium hover:bg-surface-2">
          <Download className="size-5 text-ink-3" /> Ladda ner mina data (JSON)
        </button>
      </Group>

      <Group title="Demo">
        <div className="px-4 py-3">
          <div className="mb-2 text-xs text-ink-3">Byt demoroll</div>
          <div className="grid gap-1.5">
            {PERSONAS.map((p) => {
              const pp = people.find((x) => x.id === p.personId)!;
              return (
                <button
                  key={p.personId}
                  onClick={() => {
                    setPersonalUser(p.personId);
                    toast({ title: `Du är nu ${pp.name}`, tone: "info" });
                  }}
                  className={cn("flex items-center gap-3 rounded-2xl px-2.5 py-2 text-left", p.personId === meId ? "bg-accent-soft" : "hover:bg-surface-2")}
                >
                  <Avatar name={pp.name} hue={pp.hue} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{pp.name}</span>
                    <span className="block text-xs text-ink-3">{p.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <Link href="/control" className="flex min-h-[52px] items-center gap-3 px-4 text-sm font-medium hover:bg-surface-2">
          <Monitor className="size-5 text-ink-3" /> Öppna StageFlow Control
        </Link>
        <button
          onClick={() => {
            resetDemo();
            toast({ title: "Demodata återställd", tone: "info" });
          }}
          className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-sm font-medium text-bad hover:bg-surface-2"
        >
          <RotateCcw className="size-5" /> Återställ demodata
        </button>
      </Group>
      <p className="pb-2 text-center text-xs text-ink-3">StageFlow · konceptprototyp · fiktiv data</p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[13px] font-semibold tracking-wide text-ink-3 uppercase">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">{children}</div>
    </section>
  );
}

function Item({ icon, label, hint, children }: { icon: React.ReactNode; label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
      <span className="text-ink-3 [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-ink-3">{hint}</span>}
      </span>
      {children}
    </div>
  );
}
