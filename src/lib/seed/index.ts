import { addDays, differenceInCalendarDays, getDay, subMinutes } from "date-fns";
import type {
  Annotation,
  AuditEntry,
  Bookmark,
  Dispatch,
  Notification,
  Preferences,
  Rehearsal,
  RehearsalData,
  RehearsalTemplate,
  RehearsalType,
  Unavailability,
} from "../types";
import { toDateKey, toLocalISO, weekStart } from "../time";
import { CHARACTERS, GROUPS, MEMBERSHIPS, SCENES, buildProductions } from "./productions";
import { DEPARTMENTS, PEOPLE, ROOMS } from "./people";
import { buildScripts } from "./scripts";
import { computeChanges, suggestParticipants } from "../domain";

export interface SeedData {
  seededAt: string;
  people: typeof PEOPLE;
  departments: typeof DEPARTMENTS;
  rooms: typeof ROOMS;
  productions: ReturnType<typeof buildProductions>;
  memberships: typeof MEMBERSHIPS;
  characters: typeof CHARACTERS;
  scenes: typeof SCENES;
  groups: typeof GROUPS;
  rehearsals: Rehearsal[];
  unavailability: Unavailability[];
  dispatches: Dispatch[];
  notifications: Notification[];
  audit: AuditEntry[];
  scripts: ReturnType<typeof buildScripts>;
  templates: RehearsalTemplate[];
  annotations: Annotation[];
  bookmarks: Bookmark[];
  preferences: Preferences;
}

const FYREN_TEAM = ["p-mikael", "p-johanna"];
const VINTER_BAND = ["p-per", "p-elsa", "p-johan", "p-leila", "p-mats"];
const NATT_DANCERS = ["p-noa", "p-felix", "p-saga", "p-yusuf", "p-tilda", "p-aino", "p-max"];
const HAV_CAST = ["p-helena", "p-annakarin", "p-mira", "p-maria"];

/**
 * Builds a deterministic, realistic schedule anchored to the current week so the
 * demo always looks "live", whatever day it is opened.
 */
export function buildSeed(now: Date = new Date()): SeedData {
  const monday = weekStart(now);
  const todayIdx = differenceInCalendarDays(now, monday);
  const day = (offset: number) => toDateKey(addDays(monday, offset));
  const at = (offset: number, hhmm: string) => `${day(offset)}T${hhmm}`;
  const productions = buildProductions((d) => toDateKey(addDays(now, d)));
  const ctx = { scenes: SCENES, characters: CHARACTERS, productions, memberships: MEMBERSHIPS };

  const rehearsals: Rehearsal[] = [];
  const createdAt = toLocalISO(addDays(monday, -10));
  let n = 0;
  const add = (
    productionId: string,
    offset: number,
    start: string,
    end: string,
    roomId: string,
    type: RehearsalType,
    title: string,
    sceneIds: string[],
    extra: string[] = [],
    description = "",
    opts: { id?: string; draftOnly?: boolean } = {},
  ) => {
    const suggested = suggestParticipants(productionId, sceneIds, ctx).map((s) => s.personId);
    const data: RehearsalData = {
      title,
      type,
      start: at(offset, start),
      end: at(offset, end),
      roomId,
      sceneIds,
      description,
      participantIds: Array.from(new Set([...suggested, ...extra])),
    };
    const id = opts.id ?? `r-${++n}`;
    rehearsals.push({
      id,
      productionId,
      published: opts.draftOnly ? null : data,
      draft: opts.draftOnly ? data : null,
      cancelled: false,
      createdBy: "p-lena",
      createdAt,
      updatedAt: createdAt,
      publishedAt: opts.draftOnly ? undefined : createdAt,
      version: 1,
    });
    return id;
  };

  // --- Fyren -----------------------------------------------------------------
  const rotation: [string[], string[]][] = [
    [["s-f-11", "s-f-12"], ["s-f-13"]],
    [["s-f-14"], ["s-f-21"]],
    [["s-f-22"], ["s-f-23"]],
    [["s-f-24"], ["s-f-13", "s-f-23"]],
  ];
  const tech = ["p-amir", "p-linnea", "p-viktor", "p-kim"];
  for (let off = -7; off <= 20; off++) {
    const dow = getDay(addDays(monday, off)); // 0 = sön
    if (dow === 0) continue;
    if (off >= 14 && dow !== 6) {
      add("prod-fyren", off, "13:00", "21:00", "room-klara", "teknik", "Teknisk repetition", ["s-f-21", "s-f-22", "s-f-23", "s-f-24"], [...tech, "p-rebecka"], "Ljus- och ljudprogrammering. Kostym från kl. 17.");
      continue;
    }
    if (dow === 6) {
      if (off < 14) add("prod-fyren", off, "11:00", "15:00", "room-repa", "repetition", "Lördagsrepetition", ["s-f-23", "s-f-24"], [], "Fokus på slutscenerna.");
      continue;
    }
    if (dow === 5) {
      const act = off % 2 === 0 ? "akt 1" : "akt 2";
      const scenes = act === "akt 1" ? ["s-f-11", "s-f-12", "s-f-13", "s-f-14"] : ["s-f-21", "s-f-22", "s-f-23", "s-f-24"];
      add("prod-fyren", off, "10:00", "15:00", "room-klara", "genomdragning", `Genomdragning ${act}`, scenes, ["p-ida", "p-amir", "p-linnea"], "Hela ensemblen. Markerad scenografi på plats.");
      continue;
    }
    const [am, pm] = off === todayIdx ? [["s-f-13"], ["s-f-21"]] : rotation[(off + 7) % rotation.length];
    add("prod-fyren", off, "10:00", "13:00", "room-repa", "repetition", "Scenrepetition", am, [], "");
    add("prod-fyren", off, "14:00", "17:00", "room-repa", "repetition", "Scenrepetition", pm, [], "");
  }
  // Monday next week has a published time change (see dispatches below).
  const fyrenMonNext = rehearsals.find((r) => r.productionId === "prod-fyren" && r.published?.start === at(7, "10:00"))!;

  // --- Vinterresan -------------------------------------------------------------
  let vinterMonNextScen = "";
  for (let off = -7; off <= 20; off++) {
    const dow = getDay(addDays(monday, off));
    if (dow === 0 || dow === 6) continue;
    add("prod-vinter", off, "10:00", "13:00", "room-musik", "musikrep", "Bandrepetition", [], VINTER_BAND, "Genomspelning av akt 1. Ta med egna stämmor.");
    if (dow === 2 || dow === 4) {
      add("prod-vinter", off, "13:30", "16:30", "room-dans", "dansrep", "Dansrepetition – resenärer", [], ["p-noa", "p-emma", "p-ali", "p-erik"], "Koreografi nummer 3 och 9. Ombyteskläder och dansskor.");
    }
    // Evening scene work pauses during Fyren's tech week (shared cast).
    if ((dow === 1 || dow === 3) && off < 14) {
      const id = add("prod-vinter", off, "18:00", "20:30", "room-repb", "repetition", "Scenrepetition", ["s-v-11", "s-v-12"], ["p-leila"], "Med pianist.");
      if (off === 7) vinterMonNextScen = id;
    }
  }
  // Intentional seeded conflict: solo vocal rehearsal overlapping Fyren next Thursday.
  add("prod-vinter", 10, "15:00", "17:00", "room-musik", "musikrep", "Sångrepetition – solister", [], ["p-sara", "p-olle", "p-birgitta", "p-per", "p-leila"], "Stämgenomgång inför bandrep.");

  // --- Nattfjärilar ------------------------------------------------------------
  for (let off = -7; off <= 20; off++) {
    const dow = getDay(addDays(monday, off));
    if (dow === 0 || dow === 6) continue;
    add("prod-natt", off, "09:00", "12:30", "room-dans", "dansrep", dow === 5 ? "Genomdans" : "Dansrepetition", dow === 5 ? ["s-n-1", "s-n-2", "s-n-3"] : [dow % 2 ? "s-n-2" : "s-n-3"], NATT_DANCERS, "Uppvärmning 09:00–09:45.");
  }

  // --- Kvinnorna vid havet (spelas – sista föreställning om två veckor) -------------
  for (let off = -7; off <= 13; off++) {
    const dow = getDay(addDays(monday, off));
    if (dow < 2) continue; // tis–lör
    add("prod-hav", off, "19:00", "21:15", "room-studion", "forestallning", "Föreställning", ["s-h-1", "s-h-2"], ["p-viktor", "p-sofia", "p-petra"], "Samling 18:00. Mask från 18:15.");
    if (dow === 3) add("prod-hav", off, "16:00", "17:00", "room-studion", "repetition", "Noteringar efter föreställning", [], [...HAV_CAST, "p-karin"], "");
  }

  // --- Drafts --------------------------------------------------------------------
  add("prod-fyren", 9, "13:00", "14:00", "room-repc", "kostymprovning", "Kostymprovning Ingrid & Gösta", [], ["p-sara", "p-bengt", "p-rebecka"], "Andra provningen. Skor från förrådet.", { draftOnly: true });
  // Pending (unpublished) change to Vinterresan next Monday evening: 18:00 → 17:30
  const vmon = rehearsals.find((r) => r.id === vinterMonNextScen);
  if (vmon?.published) {
    vmon.draft = { ...vmon.published, start: at(7, "17:30"), end: at(7, "20:00") };
    vmon.updatedAt = toLocalISO(subMinutes(now, 95));
  }

  // --- Unavailability ---------------------------------------------------------
  const unavailability: Unavailability[] = [
    { id: "u-1", personId: "p-amir", start: at(todayIdx + 3, "00:00"), end: at(todayIdx + 3, "23:59"), reason: "Föräldraledig" },
    { id: "u-2", personId: "p-oskar", start: at(8, "09:00"), end: at(8, "12:00"), reason: "Extern inspelning" },
    { id: "u-3", personId: "p-bengt", start: at(9, "08:00"), end: at(9, "10:30"), reason: "Läkarbesök" },
    { id: "u-4", personId: "p-sara", start: at(11, "17:00"), end: at(11, "23:00"), reason: "Ledig (beviljad)" },
  ];

  // --- Dispatches & notifications (history) ---------------------------------------
  const dispatches: Dispatch[] = [];
  const notifications: Notification[] = [];
  const audit: AuditEntry[] = [];
  const seedCtx = { rooms: ROOMS, scenes: SCENES, people: PEOPLE };

  const iso = (d: Date) => toLocalISO(d);
  const yesterday1612 = new Date(addDays(now, -1));
  yesterday1612.setHours(16, 12, 0, 0);

  // D1: Fyren next Monday 10:00 → 10:30 (published yesterday)
  if (fyrenMonNext?.published) {
    const before = fyrenMonNext.published;
    const after: RehearsalData = { ...before, start: at(7, "10:30"), end: at(7, "13:00") };
    fyrenMonNext.published = after;
    fyrenMonNext.version = 2;
    fyrenMonNext.publishedAt = iso(yesterday1612);
    const changes = computeChanges(before, after, seedCtx);
    const d1 = {
      id: "d-1",
      rehearsalId: fyrenMonNext.id,
      productionId: "prod-fyren",
      kind: "andrad" as const,
      createdAt: iso(yesterday1612),
      createdBy: "p-mikael",
      changes,
      recipientIds: after.participantIds,
      requiresResponse: false,
      message: "Vi börjar en halvtimme senare p.g.a. bygg i Repsal A.",
      snapshot: after,
    };
    dispatches.push(d1);
    after.participantIds.forEach((pid, i) => {
      const unread = pid === "p-oskar" || pid === "p-tomas";
      const readOnly = pid === "p-maria";
      notifications.push({
        id: `n-1-${pid}`,
        dispatchId: d1.id,
        recipientId: pid,
        createdAt: d1.createdAt,
        readAt: unread ? undefined : iso(addDays(yesterday1612, 0)),
        ackAt: unread || readOnly ? undefined : toLocalISO(new Date(yesterday1612.getTime() + (i + 3) * 7 * 60000)),
        reminderCount: 0,
      });
    });
    audit.push({ id: "a-1", at: d1.createdAt, actorId: "p-mikael", action: "rehearsal.publish", targetId: fyrenMonNext.id, productionId: "prod-fyren", summary: "Publicerade ändrad tid för Scenrepetition (10:00 → 10:30)" });
  }

  // D2: brand-new Vinterresan extra rehearsal (published this morning) – Sara has not seen it yet.
  const morning = new Date(now);
  morning.setHours(Math.min(now.getHours(), 8), 5, 0, 0);
  const extraId = add("prod-vinter", 8, "18:00", "20:00", "room-musik", "musikrep", "Extra sångrepetition – solister", [], ["p-sara", "p-olle", "p-birgitta", "p-per", "p-leila"], "Inför bandrepetitionen på torsdag. Ta med noter för nummer 4 och 7.");
  const extra = rehearsals.find((r) => r.id === extraId)!;
  extra.publishedAt = iso(morning);
  extra.createdBy = "p-hanna";
  const d2: Dispatch = {
    id: "d-2",
    rehearsalId: extraId,
    productionId: "prod-vinter",
    kind: "ny",
    createdAt: iso(morning),
    createdBy: "p-hanna",
    changes: [],
    recipientIds: extra.published!.participantIds,
    requiresResponse: false,
    snapshot: extra.published!,
  };
  dispatches.push(d2);
  extra.published!.participantIds.forEach((pid) => {
    notifications.push({
      id: `n-2-${pid}`,
      dispatchId: d2.id,
      recipientId: pid,
      createdAt: d2.createdAt,
      readAt: ["p-olle", "p-per", "p-birgitta"].includes(pid) ? iso(morning) : undefined,
      ackAt: ["p-olle", "p-per"].includes(pid) ? iso(morning) : undefined,
      reminderCount: 0,
    });
  });
  audit.push({ id: "a-2", at: d2.createdAt, actorId: "p-hanna", action: "rehearsal.publish", targetId: extraId, productionId: "prod-vinter", summary: "Publicerade ny repetition: Extra sångrepetition – solister" });

  // D3: Kvinnorna – notes moved 16:00 → 15:00 this week Wednesday (or next if passed)
  const wedOff = todayIdx <= 2 ? 2 : 9;
  const note = rehearsals.find((r) => r.productionId === "prod-hav" && r.published?.start === at(wedOff, "16:00"));
  if (note?.published) {
    const before = note.published;
    const after = { ...before, start: at(wedOff, "15:00"), end: at(wedOff, "16:00") };
    note.published = after;
    note.version = 2;
    const twoDaysAgo = addDays(now, -2);
    twoDaysAgo.setHours(11, 40, 0, 0);
    const d3: Dispatch = {
      id: "d-3",
      rehearsalId: note.id,
      productionId: "prod-hav",
      kind: "andrad",
      createdAt: iso(twoDaysAgo),
      createdBy: "p-karin",
      changes: computeChanges(before, after, seedCtx),
      recipientIds: after.participantIds,
      requiresResponse: true,
      snapshot: after,
    };
    dispatches.push(d3);
    after.participantIds.forEach((pid) => {
      const late = pid === "p-mira";
      notifications.push({
        id: `n-3-${pid}`,
        dispatchId: d3.id,
        recipientId: pid,
        createdAt: d3.createdAt,
        readAt: late ? undefined : iso(twoDaysAgo),
        ackAt: late ? undefined : iso(twoDaysAgo),
        response: late ? undefined : pid === "p-annakarin" ? "kan-inte" : "kommer",
        responseNote: pid === "p-annakarin" ? "Har tandläkare 15:00 – kan komma 15:30." : undefined,
        respondedAt: late ? undefined : iso(twoDaysAgo),
        reminderCount: late ? 1 : 0,
      });
    });
    audit.push({ id: "a-3", at: d3.createdAt, actorId: "p-karin", action: "rehearsal.publish", targetId: note.id, productionId: "prod-hav", summary: "Publicerade ändrad tid för Noteringar (16:00 → 15:00)" });
  }

  audit.push(
    { id: "a-4", at: toLocalISO(subMinutes(now, 95)), actorId: "p-hanna", action: "rehearsal.move", targetId: vinterMonNextScen, productionId: "prod-vinter", summary: "Flyttade Scenrepetition 18:00 → 17:30 (utkast, ej publicerat)" },
    { id: "a-5", at: toLocalISO(addDays(now, -3)), actorId: "p-ida", action: "script.verify", targetId: "script-fyren", productionId: "prod-fyren", summary: "Verifierade manus Fyren v3 mot original" },
    { id: "a-6", at: toLocalISO(addDays(now, -4)), actorId: "p-lena", action: "rehearsal.create", productionId: "prod-fyren", summary: "Skapade utkast: Kostymprovning Ingrid & Gösta" },
  );

  const templates: RehearsalTemplate[] = [
    {
      id: "t-1",
      productionId: "prod-fyren",
      name: "Scenrepetition förmiddag",
      data: { title: "Scenrepetition", type: "repetition", roomId: "room-repa", sceneIds: [], description: "", participantIds: [...FYREN_TEAM], durationMin: 180, startTime: "10:00" },
    },
    {
      id: "t-2",
      productionId: "prod-vinter",
      name: "Bandrepetition",
      data: { title: "Bandrepetition", type: "musikrep", roomId: "room-musik", sceneIds: [], description: "Ta med egna stämmor.", participantIds: [...VINTER_BAND], durationMin: 180, startTime: "10:00" },
    },
  ];

  return {
    seededAt: toLocalISO(now),
    people: PEOPLE,
    departments: DEPARTMENTS,
    rooms: ROOMS,
    productions,
    memberships: MEMBERSHIPS,
    characters: CHARACTERS,
    scenes: SCENES,
    groups: GROUPS,
    rehearsals,
    unavailability,
    dispatches,
    notifications,
    audit: audit.sort((a, b) => b.at.localeCompare(a.at)),
    scripts: buildScripts(toLocalISO(addDays(now, -3))),
    templates,
    annotations: [],
    bookmarks: [],
    preferences: {
      personalView: "agenda",
      personalScope: "mitt",
      controlView: "vecka",
      largeText: false,
      controlProductions: [],
    },
  };
}
