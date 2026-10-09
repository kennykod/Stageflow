import { beforeEach, describe, expect, test } from "vitest";
import { can, editableProductionIds, visibleInPersonal } from "@/lib/permissions";
import { buildSeed } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { parseScript } from "@/lib/script-parser";

const seed = buildSeed(new Date(2026, 9, 9, 9, 12));
const ctx = { people: seed.people, memberships: seed.memberships };

describe("permissions (RBAC per production)", () => {
  test("production manager can plan everything", () => {
    expect(editableProductionIds(ctx, "p-lena", seed.productions.map((p) => p.id))).toHaveLength(4);
  });
  test("director can only plan their own production", () => {
    expect(editableProductionIds(ctx, "p-mikael", seed.productions.map((p) => p.id))).toEqual(["prod-fyren"]);
    expect(can(ctx, "p-mikael", "schedule.publish", "prod-vinter")).toBe(false);
  });
  test("cast cannot access Control", () => {
    expect(can(ctx, "p-sara", "control.access")).toBe(false);
    expect(can(ctx, "p-elsa", "control.access")).toBe(false);
  });
  test("full schedule visibility is opt-in per membership", () => {
    expect(can(ctx, "p-amir", "schedule.viewFull", "prod-fyren")).toBe(true);
    expect(can(ctx, "p-sara", "schedule.viewFull", "prod-fyren")).toBe(false);
  });
  test("scripts are readable only by production members", () => {
    expect(can(ctx, "p-sara", "script.read", "prod-fyren")).toBe(true);
    expect(can(ctx, "p-elsa", "script.read", "prod-fyren")).toBe(false);
  });
  test("drafts are never visible in Personal", () => {
    const draft = seed.rehearsals.find((r) => !r.published)!;
    expect(visibleInPersonal(ctx, "p-sara", draft, "produktion")).toBe(false);
  });
  test("unknown person has no rights", () => {
    expect(can(ctx, "p-nobody", "control.access")).toBe(false);
  });
});

describe("store: create → publish → change → acknowledge", () => {
  beforeEach(() => useStore.getState().resetDemo());

  test("full workflow with targeted notifications", () => {
    const st = useStore.getState();
    const id = st.createRehearsal(
      "prod-fyren",
      { title: "Extra", type: "repetition", start: "2026-10-22T08:00", end: "2026-10-22T09:00", roomId: "room-las", sceneIds: ["s-f-13"], description: "", participantIds: ["p-sara", "p-oskar"] },
      "p-lena",
    );
    // Draft: no notifications yet.
    expect(useStore.getState().notifications.filter((n) => n.recipientId === "p-sara" && useStore.getState().dispatches.find((d) => d.id === n.dispatchId)?.rehearsalId === id)).toHaveLength(0);

    const res = useStore.getState().publish(id, "p-lena", { requiresResponse: false })!;
    expect(res.notified).toBe(2);

    // Move room → both are notified with a diff.
    const r = useStore.getState().rehearsals.find((x) => x.id === id)!;
    useStore.getState().saveDraft(id, { ...r.published!, roomId: "room-repc" }, "p-lena", "move");
    const res2 = useStore.getState().publish(id, "p-lena", { requiresResponse: true })!;
    expect(res2.summary.andrad).toBe(2);
    const d = useStore.getState().dispatches.find((x) => x.id === res2.dispatchIds[0])!;
    expect(d.changes[0]).toMatchObject({ field: "room", before: "Läsrummet", after: "Repsal C" });

    // Sara acknowledges; this is receipt only – the attendance answer stays empty.
    const n = useStore.getState().notifications.find((x) => x.dispatchId === d.id && x.recipientId === "p-sara")!;
    useStore.getState().acknowledge(n.id);
    const after = useStore.getState().notifications.find((x) => x.id === n.id)!;
    expect(after.ackAt).toBeTruthy();
    expect(after.response).toBeUndefined();

    // Reminder only targets the one who has not acknowledged.
    expect(useStore.getState().remind(d.id, "p-lena")).toBe(1);
  });

  test("a director cannot create rehearsals in another production", () => {
    expect(() =>
      useStore.getState().createRehearsal(
        "prod-vinter",
        { title: "X", type: "repetition", start: "2026-10-22T08:00", end: "2026-10-22T09:00", roomId: "room-las", sceneIds: [], description: "", participantIds: [] },
        "p-mikael",
      ),
    ).toThrow();
  });
});

describe("script parser", () => {
  test("parses scene headings, inline dialogue, name-only lines and directions", () => {
    const r = parseScript(`AKT 1 – Bryggan
(Sommarkväll.)
AGNES: Det är femtio år sedan.
RUTH:
Fyrtionio. Du har alltid
avrundat uppåt.
3
AKT 2 – Natten
HEDDA: Jag skrev brevet.`);
    expect(r.scenes.map((s) => s.title)).toEqual(["Bryggan", "Natten"]);
    expect(r.scenes[0]!.lines[0]).toMatchObject({ speaker: null, text: "Sommarkväll." });
    expect(r.scenes[0]!.lines[2]).toMatchObject({ speaker: "Ruth", text: "Fyrtionio. Du har alltid avrundat uppåt." });
    expect(r.speakers.map((s) => s.name)).toEqual(expect.arrayContaining(["Agnes", "Ruth", "Hedda"]));
  });
  test("never alters dialogue text", () => {
    const line = "INGRID: Jag grät för att jag trodde att jag hade tänt hela havet.";
    expect(parseScript(`SCEN 1:2 Lampan\n${line}`).scenes[0]!.lines[0]!.text).toBe("Jag grät för att jag trodde att jag hade tänt hela havet.");
  });
});
