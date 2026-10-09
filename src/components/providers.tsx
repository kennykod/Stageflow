"use client";

import { useEffect, useState } from "react";
import { startCrossTabSync, useStore } from "@/lib/store";
import { Toaster } from "@/components/ui/overlay";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Logo } from "./brand";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const largeText = useStore((s) => s.preferences.largeText);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let stop = () => {};
    (async () => {
      try {
        await useStore.persist?.rehydrate();
      } catch {
        // Storage unavailable – run in memory with fresh demo data.
      }
      const { seededAt, resetDemo } = useStore.getState();
      // Keep the demo "live": if stored data was seeded in another week, re-seed.
      if (!seededAt || Math.abs(differenceInCalendarDays(new Date(), parseISO(seededAt))) > 6) {
        resetDemo();
        setStale(true);
      }
      useStore.setState({ hydrated: true });
      stop = startCrossTabSync();
    })();
    return () => stop();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
  }, [largeText]);

  useEffect(() => {
    if (stale) console.info("[StageFlow] Demodata uppdaterades till aktuell vecka.");
  }, [stale]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas" aria-busy="true" aria-label="Laddar StageFlow">
        <div className="flex animate-fade-in flex-col items-center gap-4">
          <Logo size={44} />
          <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full w-1/2 animate-[rise_0.9s_ease-in-out_infinite_alternate] rounded-full bg-accent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
