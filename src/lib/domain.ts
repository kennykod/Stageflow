import type {
  Character,
  FieldChange,
  ID,
  Membership,
  Person,
  Production,
  Rehearsal,
  RehearsalData,
  RehearsalType,
  Room,
  Scene,
  Unavailability,
} from "./types";
import { durationMin, fmtDayShort, fmtRange, fmtTime, overlaps, p } from "./time";
import { differenceInMinutes, isSameDay } from "date-fns";

export const TYPE_LABEL: Record<RehearsalType, string> = {
  repetition: "Repetition",
  genomdragning: "Genomdragning",
  musikrep: "Musikrepetition",
  dansrep: "Dansrepetition",
  teknik: "Teknisk repetition",
  kostymprovning: "Kostymprovning",
  lasning: "Läsning",
  forestallning: "Föreställning",
};

/** The version planners work with: unpublished edits win over the published one. */
export function workingData(r: Rehearsal): RehearsalData {
  return (r.draft ?? r.published)!;
}

export function rehearsalStatus(r: Rehearsal): "utkast" | "andrad" | "publicerad" | "installd" {
  if (r.cancelled) return "installd";
  if (!r.published) return "utkast";
  if (r.draft) return "andrad";
  return "publicerad";
}

// ---------------------------------------------------------------------------
// Participant suggestions
// ---------------------------------------------------------------------------

export interface Suggestion {
  personId: ID;
  reasons: string[];
}

/**
 * Suggest who should be called based on the scenes being rehearsed: everyone
 * cast in a character that appears in the scenes, plus the director and the
 * production's inspicient(s).
 */
export function suggestParticipants(
  productionId: ID,
  sceneIds: ID[],
  ctx: { scenes: Scene[]; characters: Character[]; productions: Production[]; memberships: Membership[] },
): Suggestion[] {
  const out = new Map<ID, Set<string>>();
  const add = (id: ID, reason: string) => {
    if (!out.has(id)) out.set(id, new Set());
    out.get(id)!.add(reason);
  };
  const scenes = ctx.scenes.filter((s) => sceneIds.includes(s.id) && s.productionId === productionId);
  for (const s of scenes) {
    for (const cid of s.characterIds) {
      const c = ctx.characters.find((x) => x.id === cid);
      if (!c) continue;
      for (const pid of c.personIds) add(pid, `${c.name} i ${s.number}`);
    }
  }
  if (scenes.length) {
    const prod = ctx.productions.find((x) => x.id === productionId);
    if (prod) add(prod.directorId, "Regi");
    ctx.memberships
      .filter((m) => m.productionId === productionId && m.function === "Inspicient")
      .forEach((m) => add(m.personId, "Inspicient"));
  }
  return Array.from(out.entries()).map(([personId, reasons]) => ({ personId, reasons: Array.from(reasons) }));
}

/** Characters a person plays in a set of scenes (for "Du: Ingrid"). */
export function rolesFor(personId: ID, productionId: ID, characters: Character[], sceneIds?: ID[], scenes?: Scene[]) {
  let chars = characters.filter((c) => c.productionId === productionId && c.personIds.includes(personId));
  if (sceneIds && scenes && sceneIds.length) {
    const inScenes = new Set(scenes.filter((s) => sceneIds.includes(s.id)).flatMap((s) => s.characterIds));
    const filtered = chars.filter((c) => inScenes.has(c.id));
    if (filtered.length) chars = filtered;
  }
  return chars;
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

export interface Conflict {
  kind: "room" | "person" | "unavailable" | "rest" | "invalid";
  severity: "error" | "warning";
  message: string;
  personIds?: ID[];
  otherRehearsalId?: ID;
}

export interface ConflictContext {
  rehearsals: Rehearsal[];
  unavailability: Unavailability[];
  people: Person[];
  rooms: Room[];
  productions: Production[];
}

const REST_HOURS = 11;

export function detectConflicts(
  candidate: { id?: ID; productionId: ID; data: RehearsalData },
  ctx: ConflictContext,
): Conflict[] {
  const { data } = candidate;
  const conflicts: Conflict[] = [];
  const name = (id: ID) => ctx.people.find((x) => x.id === id)?.name ?? "Okänd";
  const prodTitle = (id: ID) => ctx.productions.find((x) => x.id === id)?.title ?? "";

  if (!(p(data.end) > p(data.start))) {
    return [{ kind: "invalid", severity: "error", message: "Sluttiden måste vara efter starttiden." }];
  }

  const others = ctx.rehearsals.filter((r) => r.id !== candidate.id && !r.cancelled);
  for (const r of others) {
    const o = workingData(r);
    if (!overlaps(data.start, data.end, o.start, o.end)) continue;
    const where = `${prodTitle(r.productionId)} · ${o.title} ${fmtRange(o.start, o.end)}`;
    if (o.roomId === data.roomId) {
      const room = ctx.rooms.find((x) => x.id === data.roomId)?.name;
      conflicts.push({
        kind: "room",
        severity: "error",
        message: `${room} är redan bokad: ${where}`,
        otherRehearsalId: r.id,
      });
    }
    const shared = data.participantIds.filter((id) => o.participantIds.includes(id));
    if (shared.length) {
      conflicts.push({
        kind: "person",
        severity: "warning",
        message: `${listNames(shared.map(name))} är redan inbokad${shared.length > 1 ? "e" : ""}: ${where}`,
        personIds: shared,
        otherRehearsalId: r.id,
      });
    }
  }

  for (const u of ctx.unavailability) {
    if (!data.participantIds.includes(u.personId)) continue;
    if (!overlaps(data.start, data.end, u.start, u.end)) continue;
    conflicts.push({
      kind: "unavailable",
      severity: "warning",
      message: `${name(u.personId)} är otillgänglig (${u.reason}, ${fmtDayShort(u.start)} ${fmtTime(u.start)}–${fmtTime(u.end)})`,
      personIds: [u.personId],
    });
  }

  // Dygnsvila (11 h rest between working days) – an important Swedish labour rule.
  const restIssues = new Map<ID, string>();
  for (const pid of data.participantIds) {
    for (const r of others) {
      const o = workingData(r);
      if (!o.participantIds.includes(pid)) continue;
      if (isSameDay(p(o.start), p(data.start)) && isSameDay(p(o.end), p(data.end))) continue;
      const gapBefore = differenceInMinutes(p(data.start), p(o.end));
      const gapAfter = differenceInMinutes(p(o.start), p(data.end));
      const gap = gapBefore >= 0 ? gapBefore : gapAfter >= 0 ? gapAfter : -1;
      if (gap >= 0 && gap < REST_HOURS * 60) {
        restIssues.set(pid, `${fmtDayShort(o.start)} ${fmtRange(o.start, o.end)}`);
      }
    }
  }
  if (restIssues.size) {
    const ids = Array.from(restIssues.keys());
    conflicts.push({
      kind: "rest",
      severity: "warning",
      message: `Dygnsvila under ${REST_HOURS} h för ${listNames(ids.map(name))}`,
      personIds: ids,
    });
  }

  return conflicts;
}

export function listNames(names: string[], max = 3) {
  if (names.length <= max) {
    return names.length > 1 ? `${names.slice(0, -1).join(", ")} och ${names[names.length - 1]}` : names[0] ?? "";
  }
  return `${names.slice(0, max).join(", ")} och ${names.length - max} till`;
}

// ---------------------------------------------------------------------------
// Diff + recipients
// ---------------------------------------------------------------------------

export function computeChanges(
  before: RehearsalData | null,
  after: RehearsalData,
  ctx: { rooms: Room[]; scenes: Scene[]; people: Person[] },
): FieldChange[] {
  if (!before) return [];
  const changes: FieldChange[] = [];
  const room = (id: ID) => ctx.rooms.find((r) => r.id === id)?.name ?? "–";
  const sceneLabel = (ids: ID[]) =>
    ids.length
      ? ctx.scenes
          .filter((s) => ids.includes(s.id))
          .map((s) => `${s.number} ${s.title}`)
          .join(", ")
      : "–";

  if (!isSameDay(p(before.start), p(after.start))) {
    changes.push({ field: "date", label: "Datum", before: fmtDayShort(before.start), after: fmtDayShort(after.start) });
  }
  if (fmtRange(before.start, before.end) !== fmtRange(after.start, after.end)) {
    changes.push({ field: "time", label: "Tid", before: fmtRange(before.start, before.end), after: fmtRange(after.start, after.end) });
  }
  if (before.roomId !== after.roomId) {
    changes.push({ field: "room", label: "Lokal", before: room(before.roomId), after: room(after.roomId) });
  }
  if (before.sceneIds.join() !== after.sceneIds.join()) {
    changes.push({ field: "scenes", label: "Scener", before: sceneLabel(before.sceneIds), after: sceneLabel(after.sceneIds) });
  }
  if (before.title !== after.title) changes.push({ field: "title", label: "Titel", before: before.title, after: after.title });
  if (before.type !== after.type) {
    changes.push({ field: "type", label: "Typ", before: TYPE_LABEL[before.type], after: TYPE_LABEL[after.type] });
  }
  if (before.description.trim() !== after.description.trim()) {
    changes.push({ field: "description", label: "Information", before: before.description || "–", after: after.description || "–" });
  }
  const added = after.participantIds.filter((x) => !before.participantIds.includes(x));
  const removed = before.participantIds.filter((x) => !after.participantIds.includes(x));
  if (added.length || removed.length) {
    const parts = [added.length ? `+${added.length} tillagda` : "", removed.length ? `−${removed.length} borttagna` : ""]
      .filter(Boolean)
      .join(", ");
    changes.push({
      field: "participants",
      label: "Kallade",
      before: `${before.participantIds.length} personer`,
      after: `${after.participantIds.length} personer (${parts})`,
    });
  }
  return changes;
}

export interface RecipientPlan {
  newlyCalled: ID[];
  changed: ID[];
  removed: ID[];
  unaffected: ID[];
}

/**
 * Targeted notifications: only people who are actually affected are notified.
 * If only the call list changed, people who stay on it are *not* disturbed.
 */
export function planRecipients(before: RehearsalData | null, after: RehearsalData, changes: FieldChange[]): RecipientPlan {
  if (!before) {
    return { newlyCalled: [...after.participantIds], changed: [], removed: [], unaffected: [] };
  }
  const newlyCalled = after.participantIds.filter((x) => !before.participantIds.includes(x));
  const removed = before.participantIds.filter((x) => !after.participantIds.includes(x));
  const staying = after.participantIds.filter((x) => before.participantIds.includes(x));
  const materialChange = changes.some((c) => c.field !== "participants");
  return {
    newlyCalled,
    removed,
    changed: materialChange ? staying : [],
    unaffected: materialChange ? [] : staying,
  };
}

/** Short notice = starts within 72 h. Such changes ask for an attendance answer by default. */
export function isShortNotice(now: Date, data: RehearsalData, hours = 72) {
  const mins = differenceInMinutes(p(data.start), now);
  return mins < hours * 60;
}

export function totalHours(items: RehearsalData[]) {
  return Math.round(items.reduce((acc, d) => acc + durationMin(d.start, d.end), 0) / 6) / 10;
}
