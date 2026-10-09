import type { ID, Membership, Person, Rehearsal } from "./types";

/**
 * Client-side authorization model for the demo.
 *
 * IMPORTANT: In production the same rules MUST be enforced server-side (Row Level
 * Security in Postgres – see supabase/migrations). The client check only shapes
 * the UI; it is never a security boundary on its own.
 */
export type Action =
  | "control.access"
  | "schedule.edit"
  | "schedule.publish"
  | "schedule.viewFull"
  | "acks.view"
  | "casting.edit"
  | "script.read"
  | "script.manage"
  | "audit.view"
  | "integrations.view";

export interface AuthContext {
  people: Person[];
  memberships: Membership[];
}

export function membershipOf(ctx: AuthContext, personId: ID, productionId: ID) {
  return ctx.memberships.find((m) => m.personId === personId && m.productionId === productionId);
}

export function can(ctx: AuthContext, personId: ID, action: Action, productionId?: ID): boolean {
  const person = ctx.people.find((p) => p.id === personId);
  if (!person) return false;
  const isAdmin = person.orgRole === "org_admin";
  const mine = ctx.memberships.filter((m) => m.personId === personId);
  const m = productionId ? mine.find((x) => x.productionId === productionId) : undefined;
  const isScheduler = (x?: Membership) => !!x && (x.role === "producer" || x.role === "scheduler");

  switch (action) {
    case "control.access":
      return isAdmin || mine.some(isScheduler);
    case "audit.view":
    case "integrations.view":
      return isAdmin || mine.some((x) => x.role === "producer");
    case "schedule.edit":
    case "schedule.publish":
    case "acks.view":
    case "casting.edit":
      if (!productionId) return isAdmin || mine.some(isScheduler);
      return isAdmin || isScheduler(m);
    case "schedule.viewFull":
      if (!productionId) return false;
      return isAdmin || !!m?.fullSchedule;
    case "script.read":
      if (!productionId) return false;
      return isAdmin || !!m;
    case "script.manage":
      if (!productionId) return isAdmin || mine.some((x) => isScheduler(x) || x.function === "Dramaturg");
      return isAdmin || isScheduler(m) || m?.function === "Dramaturg";
  }
}

/** Productions a person may plan in StageFlow Control. */
export function editableProductionIds(ctx: AuthContext, personId: ID, allProductionIds: ID[]) {
  return allProductionIds.filter((id) => can(ctx, personId, "schedule.edit", id));
}

/** Productions a person belongs to (for StageFlow Personal). */
export function memberProductionIds(ctx: AuthContext, personId: ID) {
  return Array.from(new Set(ctx.memberships.filter((m) => m.personId === personId).map((m) => m.productionId)));
}

/**
 * What an ensemble member may see: only *published* data, and only rehearsals
 * they are called to – unless they hold full-schedule rights and asked for it.
 * Drafts are never visible in Personal.
 */
export function visibleInPersonal(
  ctx: AuthContext,
  personId: ID,
  r: Rehearsal,
  scope: "mitt" | "produktion",
): boolean {
  if (!r.published) return false;
  if (r.published.participantIds.includes(personId)) return true;
  if (scope === "produktion" && can(ctx, personId, "schedule.viewFull", r.productionId)) return true;
  return false;
}
