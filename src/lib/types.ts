/**
 * StageFlow domain model.
 *
 * All timestamps for scheduled items are *local wall-clock* ISO strings without
 * offset ("2026-10-09T10:00") – theatre schedules are planned in Stockholm time.
 * A production backend would store `timestamptz` + an explicit `Europe/Stockholm` zone.
 */

export type ID = string;

/** Professional function(s) a person holds. A person may hold several. */
export type Discipline =
  | "skadespelare"
  | "musiker"
  | "dansare"
  | "regissor"
  | "koreograf"
  | "produktionsledare"
  | "inspicient"
  | "tekniker"
  | "kostym"
  | "mask"
  | "dramaturg";

export type DepartmentId =
  | "ensemble"
  | "orkester"
  | "dans"
  | "regi"
  | "teknik"
  | "kostym-mask"
  | "produktion";

export interface Department {
  id: DepartmentId;
  name: string;
}

/** Organisation-level role. Production-level rights come from {@link Membership}. */
export type OrgRole = "org_admin" | "staff";

export interface Person {
  id: ID;
  name: string;
  disciplines: Discipline[];
  department: DepartmentId;
  orgRole: OrgRole;
  email: string;
  phone?: string;
  /** Hue used for the avatar (0–360). */
  hue: number;
  title: string;
}

export type ProductionRole = "producer" | "scheduler" | "member";

export interface Membership {
  personId: ID;
  productionId: ID;
  role: ProductionRole;
  /** May see the whole production schedule, not only their own calls. */
  fullSchedule: boolean;
  /** What they do in this production, e.g. "Ljuddesign" or "Ensemble". */
  function: string;
}

export interface Production {
  id: ID;
  title: string;
  subtitle: string;
  genre: string;
  stageRoomId: ID;
  premiere: string; // yyyy-MM-dd
  /** Accent colour token – one of the curated production palette keys. */
  color: ProductionColor;
  status: "planering" | "repetition" | "spelas";
  directorId: ID;
}

export type ProductionColor = "indigo" | "rose" | "teal" | "amber" | "violet";

export interface Character {
  id: ID;
  productionId: ID;
  name: string;
  description?: string;
  /** Cast assignments – several people allowed (e.g. alternates / double cast). */
  personIds: ID[];
}

export interface Scene {
  id: ID;
  productionId: ID;
  number: string; // "1:3"
  title: string;
  characterIds: ID[];
  durationMin: number;
}

export interface SavedGroup {
  id: ID;
  productionId: ID;
  name: string;
  personIds: ID[];
}

export interface Room {
  id: ID;
  name: string;
  location: string;
  capacity: number;
  kind: "scen" | "repsal" | "studio" | "musik";
}

export type RehearsalType =
  | "repetition"
  | "genomdragning"
  | "musikrep"
  | "dansrep"
  | "teknik"
  | "kostymprovning"
  | "lasning"
  | "forestallning";

/** The schedulable content of a rehearsal. Versioned as published vs draft. */
export interface RehearsalData {
  title: string;
  type: RehearsalType;
  start: string; // local ISO "yyyy-MM-ddTHH:mm"
  end: string;
  roomId: ID;
  sceneIds: ID[];
  description: string;
  participantIds: ID[];
}

export interface Rehearsal {
  id: ID;
  productionId: ID;
  /** What cast/staff currently see. `null` until first publish. */
  published: RehearsalData | null;
  /** Pending, unpublished edits (or the initial draft). `null` when in sync. */
  draft: RehearsalData | null;
  cancelled: boolean;
  createdBy: ID;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  version: number;
}

export interface FieldChange {
  field: "time" | "date" | "room" | "scenes" | "title" | "type" | "description" | "participants";
  label: string;
  before: string;
  after: string;
}

export type DispatchKind = "ny" | "andrad" | "installd" | "borttagen" | "paminnelse";

/** One publish event → one dispatch → N recipient notifications. */
export interface Dispatch {
  id: ID;
  rehearsalId: ID;
  productionId: ID;
  kind: DispatchKind;
  createdAt: string;
  createdBy: ID;
  changes: FieldChange[];
  recipientIds: ID[];
  /** Short-notice changes ask for an explicit attendance answer, separate from receipt. */
  requiresResponse: boolean;
  message?: string;
  /** Snapshot of the rehearsal as published by this dispatch. */
  snapshot: RehearsalData;
  parentDispatchId?: ID;
}

export type AttendanceResponse = "kommer" | "kan-inte";

export interface Notification {
  id: ID;
  dispatchId: ID;
  recipientId: ID;
  createdAt: string;
  /** Opened / seen in the app. */
  readAt?: string;
  /** Explicit receipt: "Jag har tagit del". NOT an approval. */
  ackAt?: string;
  /** Optional attendance answer for short-notice changes. */
  response?: AttendanceResponse;
  responseNote?: string;
  respondedAt?: string;
  reminderCount: number;
  lastReminderAt?: string;
}

export interface Unavailability {
  id: ID;
  personId: ID;
  start: string;
  end: string;
  reason: string;
}

export interface AuditEntry {
  id: ID;
  at: string;
  actorId: ID;
  action:
    | "rehearsal.create"
    | "rehearsal.update"
    | "rehearsal.move"
    | "rehearsal.publish"
    | "rehearsal.cancel"
    | "rehearsal.discard"
    | "notification.ack"
    | "notification.respond"
    | "notification.remind"
    | "casting.update"
    | "group.create"
    | "script.import"
    | "script.verify"
    | "template.create";
  targetId?: ID;
  productionId?: ID;
  summary: string;
}

export interface ScriptLine {
  id: ID;
  /** `null` = stage direction. */
  characterId: ID | null;
  text: string;
}

export interface ScriptScene {
  sceneId: ID;
  lines: ScriptLine[];
}

export interface Script {
  id: ID;
  productionId: ID;
  title: string;
  author: string;
  version: string;
  status: "verifierad" | "granskas";
  verifiedBy?: ID;
  verifiedAt?: string;
  rightsNote: string;
  source: "seed" | "pdf-import" | "text-import";
  scenes: ScriptScene[];
}

export interface Annotation {
  id: ID;
  personId: ID;
  lineId: ID;
  text: string;
  createdAt: string;
}

export interface Bookmark {
  personId: ID;
  lineId: ID;
}

export interface RehearsalTemplate {
  id: ID;
  productionId: ID;
  name: string;
  data: Omit<RehearsalData, "start" | "end"> & { durationMin: number; startTime: string };
}

export type PersonalView = "dag" | "vecka" | "agenda";
export type ControlView = "vecka" | "dag" | "manad" | "tidslinje" | "lista";

export interface Preferences {
  personalView: PersonalView;
  personalScope: "mitt" | "produktion";
  controlView: ControlView;
  largeText: boolean;
  /** Production filter in Control (empty = all permitted). */
  controlProductions: ID[];
}
