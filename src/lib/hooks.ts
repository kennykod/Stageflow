"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "./store";
import type { ID, Notification, Dispatch, Rehearsal } from "./types";
import { can, type Action } from "./permissions";
import { p } from "./time";

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function usePeopleMap() {
  const people = useStore((s) => s.people);
  return useMemo(() => new Map(people.map((x) => [x.id, x])), [people]);
}

export function useLookups() {
  const people = useStore((s) => s.people);
  const rooms = useStore((s) => s.rooms);
  const productions = useStore((s) => s.productions);
  const scenes = useStore((s) => s.scenes);
  const characters = useStore((s) => s.characters);
  return useMemo(
    () => ({
      person: (id: ID) => people.find((x) => x.id === id),
      room: (id: ID) => rooms.find((x) => x.id === id),
      production: (id: ID) => productions.find((x) => x.id === id),
      scene: (id: ID) => scenes.find((x) => x.id === id),
      character: (id: ID) => characters.find((x) => x.id === id),
    }),
    [people, rooms, productions, scenes, characters],
  );
}

export function useCan(personId: ID) {
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  return useMemo(() => (action: Action, productionId?: ID) => can({ people, memberships }, personId, action, productionId), [people, memberships, personId]);
}

export interface InboxItem {
  notification: Notification;
  dispatch: Dispatch;
  rehearsal?: Rehearsal;
}

export function useInbox(personId: ID): InboxItem[] {
  const notifications = useStore((s) => s.notifications);
  const dispatches = useStore((s) => s.dispatches);
  const rehearsals = useStore((s) => s.rehearsals);
  return useMemo(() => {
    const dmap = new Map(dispatches.map((d) => [d.id, d]));
    return notifications
      .filter((n) => n.recipientId === personId)
      .map((n) => ({ notification: n, dispatch: dmap.get(n.dispatchId)!, rehearsal: rehearsals.find((r) => r.id === dmap.get(n.dispatchId)?.rehearsalId) }))
      .filter((x) => x.dispatch)
      .sort((a, b) => b.notification.createdAt.localeCompare(a.notification.createdAt));
  }, [notifications, dispatches, rehearsals, personId]);
}

/** Latest change dispatch per rehearsal for this person, within the last 7 days – drives "Ändrad" badges. */
export function useRecentChanges(personId: ID) {
  const inbox = useInbox(personId);
  return useMemo(() => {
    const m = new Map<ID, InboxItem>();
    const cutoff = Date.now() - 7 * 864e5;
    for (const it of inbox) {
      if (it.dispatch.kind !== "andrad" && it.dispatch.kind !== "ny") continue;
      if (p(it.dispatch.createdAt).getTime() < cutoff) continue;
      if (!m.has(it.dispatch.rehearsalId)) m.set(it.dispatch.rehearsalId, it);
    }
    return m;
  }, [inbox]);
}
