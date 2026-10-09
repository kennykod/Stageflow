"use client";

import { useState } from "react";
import { BellOff, CheckCheck } from "lucide-react";
import { usePersonalData } from "@/components/personal/data";
import { NotificationCard } from "@/components/personal/cards";
import { Button, DemoTag, Segmented } from "@/components/ui/primitives";
import { toast } from "@/components/ui/overlay";
import { useStore } from "@/lib/store";

export default function Notifications() {
  const { meId, inbox, unacked } = usePersonalData();
  const acknowledgeAll = useStore((s) => s.acknowledgeAll);
  const [filter, setFilter] = useState<"alla" | "att-gora">(unacked.length ? "att-gora" : "alla");
  // Keep just-acknowledged cards visible (with their "Kvitterad" state) until the user leaves.
  const [shown] = useState(() => new Set(unacked.map((u) => u.notification.id)));
  const list = filter === "alla" ? inbox : inbox.filter((i) => !i.notification.ackAt || shown.has(i.notification.id));

  return (
    <div className="px-5 pt-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-medium">Notiser</h1>
          <p className="text-[13px] text-ink-3">
            Leverans i appen <DemoTag kind="simulerad" className="ml-1" />
          </p>
        </div>
        {unacked.length > 1 && (
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              acknowledgeAll(meId);
              toast({ title: "Alla notiser kvitterade" });
            }}
          >
            <CheckCheck /> Kvittera alla
          </Button>
        )}
      </div>
      <Segmented
        label="Filter"
        value={filter}
        onChange={setFilter}
        className="mt-4 w-full"
        options={[
          { value: "att-gora", label: `Att kvittera (${unacked.length})` },
          { value: "alla", label: `Alla (${inbox.length})` },
        ]}
      />
      <div className="mt-4 space-y-3">
        {list.length === 0 && (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-12 text-center">
            <BellOff className="size-8 text-ink-3" />
            <p className="mt-3 font-display text-lg">{filter === "att-gora" ? "Allt är kvitterat" : "Inga notiser"}</p>
            <p className="mt-1 text-sm text-ink-3">Du får en notis när något som berör dig ändras.</p>
          </div>
        )}
        {list.map((it) => (
          <NotificationCard key={it.notification.id} item={it} />
        ))}
      </div>
    </div>
  );
}
