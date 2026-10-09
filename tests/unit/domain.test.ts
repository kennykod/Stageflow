import { describe, expect, test } from "vitest";
import { buildSeed } from "@/lib/seed";
import { computeChanges, detectConflicts, isShortNotice, planRecipients, suggestParticipants, workingData } from "@/lib/domain";
import type { RehearsalData } from "@/lib/types";

const NOW = new Date(2026, 9, 9, 9, 12); // Fri 9 Oct 2026
const seed = buildSeed(NOW);
const ctx = { rehearsals: seed.rehearsals, unavailability: seed.unavailability, people: seed.people, rooms: seed.rooms, productions: seed.productions };

const base: RehearsalData = {
  title: "Test",
  type: "repetition",
  start: "2026-10-20T08:00",
  end: "2026-10-20T09:00",
  roomId: "room-las",
  sceneIds: [],
  description: "",
  participantIds: ["p-bengt"],
};

describe("suggestParticipants", () => {
  test("suggests cast for characters in the scenes plus director and inspicient", () => {
    const s = suggestParticipants("prod-fyren", ["s-f-13"], seed);
    const ids = s.map((x) => x.personId);
    expect(ids).toEqual(expect.arrayContaining(["p-sara", "p-oskar", "p-maria", "p-mikael", "p-johanna"]));
    expect(ids).not.toContain("p-bengt");
    expect(s.find((x) => x.personId === "p-sara")!.reasons[0]).toBe("Ingrid i 1:3");
  });
  test("double-cast roles suggest every assigned performer", () => {
    const ids = suggestParticipants("prod-fyren", ["s-f-22"], seed).map((x) => x.personId);
    expect(ids).toEqual(expect.arrayContaining(["p-alva", "p-lo"]));
  });
  test("no scenes → no suggestions", () => {
    expect(suggestParticipants("prod-fyren", [], seed)).toEqual([]);
  });
});

describe("detectConflicts", () => {
  test("flags room double-booking as an error", () => {
    const c = detectConflicts({ productionId: "prod-natt", data: { ...base, start: "2026-10-13T10:30", end: "2026-10-13T11:30", roomId: "room-repa", participantIds: [] } }, ctx);
    expect(c.some((x) => x.kind === "room" && x.severity === "error")).toBe(true);
  });
  test("flags a person already called elsewhere", () => {
    const c = detectConflicts({ productionId: "prod-vinter", data: { ...base, start: "2026-10-13T10:30", end: "2026-10-13T11:00", participantIds: ["p-sara"] } }, ctx);
    expect(c.some((x) => x.kind === "person" && x.personIds?.includes("p-sara"))).toBe(true);
  });
  test("flags registered unavailability", () => {
    const c = detectConflicts({ productionId: "prod-fyren", data: { ...base, start: "2026-10-13T09:30", end: "2026-10-13T09:45", participantIds: ["p-oskar"] } }, ctx);
    expect(c.some((x) => x.kind === "unavailable")).toBe(true);
  });
  test("flags less than 11 h rest between working days", () => {
    // Kvinnorna vid havet performance ends 21:15 on Tue 13 Oct → 07:00 next day is < 11 h.
    const c = detectConflicts({ productionId: "prod-fyren", data: { ...base, start: "2026-10-14T07:00", end: "2026-10-14T07:45", participantIds: ["p-helena"] } }, ctx);
    expect(c.some((x) => x.kind === "rest")).toBe(true);
  });
  test("rejects end before start", () => {
    const c = detectConflicts({ productionId: "prod-fyren", data: { ...base, end: "2026-10-20T07:00" } }, ctx);
    expect(c[0]!.kind).toBe("invalid");
  });
  test("a free slot has no conflicts", () => {
    expect(detectConflicts({ productionId: "prod-fyren", data: base }, ctx)).toEqual([]);
  });
  test("an existing rehearsal does not conflict with itself", () => {
    const r = seed.rehearsals.find((x) => x.productionId === "prod-natt" && x.published)!;
    const c = detectConflicts({ id: r.id, productionId: r.productionId, data: workingData(r) }, ctx);
    expect(c.filter((x) => x.otherRehearsalId === r.id)).toEqual([]);
  });
});

describe("computeChanges & planRecipients", () => {
  const after: RehearsalData = { ...base, start: "2026-10-20T08:30", end: "2026-10-20T09:30", roomId: "room-repb" };
  test("describes time and room changes in Swedish with before/after", () => {
    const ch = computeChanges(base, after, seed);
    expect(ch.map((c) => c.field)).toEqual(["time", "room"]);
    expect(ch[0]).toMatchObject({ label: "Tid", before: "08:00–09:00", after: "08:30–09:30" });
    expect(ch[1]).toMatchObject({ before: "Läsrummet", after: "Repsal B" });
  });
  test("new rehearsal notifies all participants", () => {
    expect(planRecipients(null, base, []).newlyCalled).toEqual(["p-bengt"]);
  });
  test("call-list-only change does not disturb people who stay", () => {
    const next = { ...base, participantIds: ["p-bengt", "p-sara"] };
    const plan = planRecipients(base, next, computeChanges(base, next, seed));
    expect(plan.newlyCalled).toEqual(["p-sara"]);
    expect(plan.changed).toEqual([]);
    expect(plan.unaffected).toEqual(["p-bengt"]);
  });
  test("material change notifies stayers; removed people get their own notice", () => {
    const next = { ...after, participantIds: ["p-sara"] };
    const plan = planRecipients({ ...base, participantIds: ["p-bengt", "p-sara"] }, next, computeChanges(base, next, seed));
    expect(plan.changed).toEqual(["p-sara"]);
    expect(plan.removed).toEqual(["p-bengt"]);
  });
  test("short notice is < 72 h", () => {
    expect(isShortNotice(NOW, { ...base, start: "2026-10-10T10:00" })).toBe(true);
    expect(isShortNotice(NOW, { ...base, start: "2026-10-20T10:00" })).toBe(false);
  });
});

describe("seed", () => {
  test("is anchored to the current week and has drafts that are not published", () => {
    expect(seed.rehearsals.some((r) => r.published?.start.startsWith("2026-10-09"))).toBe(true);
    expect(seed.rehearsals.filter((r) => !r.published && r.draft).length).toBe(1);
    expect(seed.rehearsals.filter((r) => r.published && r.draft).length).toBe(1);
  });
});
