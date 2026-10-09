"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { detectConflicts, workingData, type Conflict } from "@/lib/domain";
import { editableProductionIds } from "@/lib/permissions";
import type { ID, Rehearsal } from "@/lib/types";

/** Data scoped to what the current Control user may plan. */
export function useControlData() {
  const meId = useStore((s) => s.controlUserId);
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const productions = useStore((s) => s.productions);
  const rehearsals = useStore((s) => s.rehearsals);
  const unavailability = useStore((s) => s.unavailability);
  const rooms = useStore((s) => s.rooms);

  const allowedIds = useMemo(
    () => editableProductionIds({ people, memberships }, meId, productions.map((p) => p.id)),
    [people, memberships, meId, productions],
  );
  const myProductions = useMemo(() => productions.filter((p) => allowedIds.includes(p.id)), [productions, allowedIds]);
  const myRehearsals = useMemo(() => rehearsals.filter((r) => allowedIds.includes(r.productionId)), [rehearsals, allowedIds]);

  /**
   * Conflicts are computed against *all* rehearsals (rooms and people are shared
   * across productions) but only reported for the ones this user can plan.
   */
  const conflicts = useMemo(() => {
    const m = new Map<ID, Conflict[]>();
    const ctx = { rehearsals, unavailability, people, rooms, productions };
    for (const r of myRehearsals) {
      if (r.cancelled) continue;
      const c = detectConflicts({ id: r.id, productionId: r.productionId, data: workingData(r) }, ctx);
      if (c.length) m.set(r.id, c);
    }
    return m;
  }, [myRehearsals, rehearsals, unavailability, people, rooms, productions]);

  return { meId, myProductions, myRehearsals, conflicts, allowedIds };
}

export function conflictLevel(c?: Conflict[]) {
  if (!c?.length) return null;
  return c.some((x) => x.severity === "error") ? "error" : "warning";
}

export function isUpcoming(r: Rehearsal) {
  return !r.cancelled;
}
