"use client";

import Link from "next/link";
import { BookOpenText, ChevronRight, Lock, Mic } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups, useNow } from "@/lib/hooks";
import { usePersonalData, upcoming } from "@/components/personal/data";
import { can } from "@/lib/permissions";
import { dayLabel, fmtTime } from "@/lib/time";
import { prodVars } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";

export default function Scripts() {
  const now = useNow();
  const L = useLookups();
  const { meId, myProductions, visible } = usePersonalData("mitt");
  const scripts = useStore((s) => s.scripts);
  const characters = useStore((s) => s.characters);
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);

  const readable = scripts.filter((s) => s.status === "verifierad" && can({ people, memberships }, meId, "script.read", s.productionId));
  const next = upcoming(visible, now).filter((r) => r.published!.sceneIds.length);

  return (
    <div className="space-y-6 px-5 pt-3">
      <div>
        <h1 className="font-display text-[28px] font-medium">Manus</h1>
        <p className="text-[13px] text-ink-3">Läs, markera och repetera dina repliker.</p>
      </div>

      {readable.length === 0 && (
        <div className="rounded-3xl border border-dashed border-line px-6 py-10 text-center">
          <Lock className="mx-auto size-7 text-ink-3" />
          <p className="mt-3 font-display text-lg">Inga manus tillgängliga</p>
          <p className="mt-1 text-sm text-ink-3">Manus visas för medlemmar i produktioner som har ett verifierat, digitaliserat manus.</p>
        </div>
      )}

      {readable.map((s) => {
        const prod = L.production(s.productionId)!;
        const myChars = characters.filter((c) => c.productionId === s.productionId && c.personIds.includes(meId));
        const nextForProd = next.find((r) => r.productionId === s.productionId && r.published!.sceneIds.some((sid) => s.scenes.some((x) => x.sceneId === sid)));
        const nextScene = nextForProd?.published!.sceneIds.find((sid) => s.scenes.some((x) => x.sceneId === sid));
        const myLines = s.scenes.flatMap((sc) => sc.lines).filter((l) => l.characterId && myChars.some((c) => c.id === l.characterId)).length;
        return (
          <article key={s.id} style={prodVars(prod.color)} className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-soft)]">
            <Link href={`/me/manus/${s.id}`} className="block p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--pc-soft)] text-[var(--pc)]">
                  <BookOpenText className="size-6" />
                </div>
                <Badge tone="ok">Verifierat</Badge>
              </div>
              <h2 className="mt-3 font-display text-2xl font-medium">{s.title}</h2>
              <p className="text-sm text-ink-3">
                {s.version} · {s.scenes.length} scener
              </p>
              {myChars.length > 0 ? (
                <p className="mt-2 text-sm text-ink-2">
                  Du spelar <span className="font-semibold text-ink">{myChars.map((c) => c.name).join(", ")}</span> · {myLines} repliker
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-3">Du har ingen roll – läsbehörighet som produktionsmedlem.</p>
              )}
            </Link>
            {nextForProd && nextScene && (
              <Link
                href={`/me/manus/${s.id}?scen=${nextScene}`}
                className="flex items-center gap-3 border-t border-line bg-surface-2/60 px-5 py-3.5 hover:bg-surface-2"
              >
                <Mic className="size-5 text-gold" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Förbered nästa repetition</span>
                  <span className="block truncate text-xs text-ink-3">
                    {dayLabel(now, nextForProd.published!.start)} {fmtTime(nextForProd.published!.start)} · {L.scene(nextScene)?.number} {L.scene(nextScene)?.title}
                  </span>
                </span>
                <ChevronRight className="size-4 text-ink-3" />
              </Link>
            )}
          </article>
        );
      })}

      {myProductions
        .filter((p) => !readable.some((s) => s.productionId === p.id))
        .map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-3xl border border-dashed border-line px-5 py-4 text-sm text-ink-3">
            <Lock className="size-4" /> {p.title}: inget digitalt manus ännu
          </div>
        ))}
    </div>
  );
}
