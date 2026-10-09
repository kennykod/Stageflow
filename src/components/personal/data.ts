"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useInbox, useRecentChanges } from "@/lib/hooks";
import { memberProductionIds, visibleInPersonal, can } from "@/lib/permissions";
import { p } from "@/lib/time";
import type { Rehearsal } from "@/lib/types";

/** Everything StageFlow Personal shows is derived from *published* data only. */
export function usePersonalData(scopeOverride?: "mitt" | "produktion") {
  const meId = useStore((s) => s.personalUserId);
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const rehearsals = useStore((s) => s.rehearsals);
  const productions = useStore((s) => s.productions);
  const prefScope = useStore((s) => s.preferences.personalScope);
  const scope = scopeOverride ?? prefScope;
  const ctx = useMemo(() => ({ people, memberships }), [people, memberships]);

  const me = people.find((x) => x.id === meId)!;
  const myProdIds = useMemo(() => memberProductionIds(ctx, meId), [ctx, meId]);
  const myProductions = productions.filter((x) => myProdIds.includes(x.id));
  const canFull = myProdIds.some((id) => can(ctx, meId, "schedule.viewFull", id));

  const visible: Rehearsal[] = useMemo(
    () =>
      rehearsals
        .filter((r) => visibleInPersonal(ctx, meId, r, scope))
        .sort((a, b) => a.published!.start.localeCompare(b.published!.start)),
    [rehearsals, ctx, meId, scope],
  );
  const inbox = useInbox(meId);
  const changes = useRecentChanges(meId);
  const unacked = inbox.filter((i) => !i.notification.ackAt);

  return { meId, me, scope, canFull, myProductions, visible, inbox, unacked, changes };
}

export function isMine(r: Rehearsal, meId: string) {
  return !!r.published?.participantIds.includes(meId);
}

export function upcoming(list: Rehearsal[], now: Date) {
  return list.filter((r) => !r.cancelled && p(r.published!.end) > now);
}
