"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { buildSeed, type SeedData } from "./seed";
import type {
  Annotation,
  AttendanceResponse,
  AuditEntry,
  Dispatch,
  DispatchKind,
  ID,
  Notification,
  Preferences,
  Rehearsal,
  RehearsalData,
  RehearsalTemplate,
  Script,
} from "./types";
import { toLocalISO } from "./time";
import { computeChanges, planRecipients, workingData } from "./domain";
import { can } from "./permissions";

export const STORAGE_KEY = "stageflow-demo-v1";

export function uid(prefix: string) {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${r}`;
}

const nowISO = () => toLocalISO(new Date());

export interface DemoProgress {
  created: boolean;
  published: boolean;
  personalSeen: boolean;
  changed: boolean;
  acked: boolean;
  ackViewed: boolean;
  scriptOpened: boolean;
  rehearsalStarted: boolean;
}

export interface PublishResult {
  dispatchIds: ID[];
  notified: number;
  summary: { ny: number; andrad: number; borttagen: number };
}

interface State extends SeedData {
  controlUserId: ID;
  personalUserId: ID;
  progress: DemoProgress;
  hydrated: boolean;

  // session
  setControlUser: (id: ID) => void;
  setPersonalUser: (id: ID) => void;
  setPrefs: (p: Partial<Preferences>) => void;
  resetDemo: () => void;
  markProgress: (k: keyof DemoProgress) => void;

  // scheduling
  createRehearsal: (productionId: ID, data: RehearsalData, actorId: ID) => ID;
  saveDraft: (id: ID, data: RehearsalData, actorId: ID, kind?: "update" | "move") => void;
  discardDraft: (id: ID, actorId: ID) => void;
  deleteDraftRehearsal: (id: ID, actorId: ID) => void;
  publish: (id: ID, actorId: ID, opts: { requiresResponse: boolean; message?: string }) => PublishResult | null;
  cancelRehearsal: (id: ID, actorId: ID, opts: { message?: string }) => void;

  // notifications
  markRead: (notificationId: ID) => void;
  acknowledge: (notificationId: ID) => void;
  acknowledgeAll: (personId: ID) => void;
  respond: (notificationId: ID, response: AttendanceResponse, note?: string) => void;
  remind: (dispatchId: ID, actorId: ID) => number;

  // casting / groups / templates
  setCasting: (characterId: ID, personIds: ID[], actorId: ID) => void;
  toggleSceneCharacter: (sceneId: ID, characterId: ID, actorId: ID) => void;
  createGroup: (productionId: ID, name: string, personIds: ID[], actorId: ID) => ID;
  saveTemplate: (t: Omit<RehearsalTemplate, "id">, actorId: ID) => void;

  // scripts
  importScript: (script: Script, actorId: ID) => void;
  verifyScript: (scriptId: ID, actorId: ID) => void;
  toggleBookmark: (personId: ID, lineId: ID) => void;
  setAnnotation: (personId: ID, lineId: ID, text: string) => void;
}

const freshProgress: DemoProgress = {
  created: false,
  published: false,
  personalSeen: false,
  changed: false,
  acked: false,
  ackViewed: false,
  scriptOpened: false,
  rehearsalStarted: false,
};

function audit(
  set: (fn: (s: State) => Partial<State>) => void,
  entry: Omit<AuditEntry, "id" | "at">,
) {
  set((s) => ({ audit: [{ ...entry, id: uid("a"), at: nowISO() }, ...s.audit].slice(0, 400) }));
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      controlUserId: "p-lena",
      personalUserId: "p-sara",
      progress: freshProgress,
      hydrated: false,

      setControlUser: (id) => set({ controlUserId: id }),
      setPersonalUser: (id) => set({ personalUserId: id }),
      setPrefs: (p) => set((s) => ({ preferences: { ...s.preferences, ...p } })),
      markProgress: (k) => set((s) => (s.progress[k] ? {} : { progress: { ...s.progress, [k]: true } })),
      resetDemo: () =>
        set((s) => ({
          ...buildSeed(),
          controlUserId: "p-lena",
          personalUserId: "p-sara",
          progress: freshProgress,
          preferences: { ...buildSeed().preferences, largeText: s.preferences.largeText },
        })),

      createRehearsal: (productionId, data, actorId) => {
        if (!can(get(), actorId, "schedule.edit", productionId)) throw new Error("Behörighet saknas");
        const id = uid("r");
        const r: Rehearsal = {
          id,
          productionId,
          published: null,
          draft: data,
          cancelled: false,
          createdBy: actorId,
          createdAt: nowISO(),
          updatedAt: nowISO(),
          version: 0,
        };
        set((s) => ({ rehearsals: [...s.rehearsals, r], progress: { ...s.progress, created: true } }));
        audit(set, { actorId, action: "rehearsal.create", targetId: id, productionId, summary: `Skapade utkast: ${data.title}` });
        return id;
      },

      saveDraft: (id, data, actorId, kind = "update") => {
        const r = get().rehearsals.find((x) => x.id === id);
        if (!r || !can(get(), actorId, "schedule.edit", r.productionId)) return;
        const same = r.published && JSON.stringify(r.published) === JSON.stringify(data);
        set((s) => ({
          rehearsals: s.rehearsals.map((x) => (x.id === id ? { ...x, draft: same ? null : data, updatedAt: nowISO() } : x)),
        }));
        const before = workingData(r);
        audit(set, {
          actorId,
          action: kind === "move" ? "rehearsal.move" : "rehearsal.update",
          targetId: id,
          productionId: r.productionId,
          summary:
            kind === "move"
              ? `Flyttade ${data.title} till ${data.start.replace("T", " ")} (utkast)`
              : `Sparade ändringar i ${before.title} (utkast)`,
        });
      },

      discardDraft: (id, actorId) => {
        const r = get().rehearsals.find((x) => x.id === id);
        if (!r || !r.published) return;
        set((s) => ({ rehearsals: s.rehearsals.map((x) => (x.id === id ? { ...x, draft: null } : x)) }));
        audit(set, { actorId, action: "rehearsal.discard", targetId: id, productionId: r.productionId, summary: `Ångrade opublicerade ändringar i ${r.published.title}` });
      },

      deleteDraftRehearsal: (id, actorId) => {
        const r = get().rehearsals.find((x) => x.id === id);
        if (!r || r.published) return;
        set((s) => ({ rehearsals: s.rehearsals.filter((x) => x.id !== id) }));
        audit(set, { actorId, action: "rehearsal.discard", targetId: id, productionId: r.productionId, summary: `Raderade utkast: ${r.draft?.title}` });
      },

      publish: (id, actorId, opts) => {
        const s = get();
        const r = s.rehearsals.find((x) => x.id === id);
        if (!r || !r.draft) return null;
        if (!can(s, actorId, "schedule.publish", r.productionId)) throw new Error("Behörighet saknas");
        const before = r.published;
        const after = r.draft;
        const changes = computeChanges(before, after, s);
        const plan = planRecipients(before, after, changes);
        const createdAt = nowISO();
        const newDispatches: Dispatch[] = [];
        const newNotifications: Notification[] = [];
        const mk = (kind: DispatchKind, recipientIds: ID[], snapshot: RehearsalData, ch = changes) => {
          if (!recipientIds.length) return;
          const d: Dispatch = {
            id: uid("d"),
            rehearsalId: id,
            productionId: r.productionId,
            kind,
            createdAt,
            createdBy: actorId,
            changes: kind === "andrad" ? ch : [],
            recipientIds,
            requiresResponse: kind === "borttagen" ? false : opts.requiresResponse,
            message: opts.message?.trim() || undefined,
            snapshot,
          };
          newDispatches.push(d);
          recipientIds.forEach((pid) =>
            newNotifications.push({ id: uid("n"), dispatchId: d.id, recipientId: pid, createdAt, reminderCount: 0 }),
          );
        };
        mk("ny", plan.newlyCalled, after);
        mk("andrad", plan.changed, after);
        mk("borttagen", plan.removed, before ?? after);

        set((st) => ({
          rehearsals: st.rehearsals.map((x) =>
            x.id === id ? { ...x, published: after, draft: null, publishedAt: createdAt, version: x.version + 1, updatedAt: createdAt } : x,
          ),
          dispatches: [...newDispatches, ...st.dispatches],
          notifications: [...newNotifications, ...st.notifications],
          progress: { ...st.progress, published: true, changed: st.progress.changed || !!before },
        }));
        audit(set, {
          actorId,
          action: "rehearsal.publish",
          targetId: id,
          productionId: r.productionId,
          summary: before
            ? `Publicerade ändring i ${after.title}: ${changes.map((c) => `${c.label} ${c.before} → ${c.after}`).join("; ") || "inga synliga ändringar"}`
            : `Publicerade ny repetition: ${after.title} (${after.participantIds.length} kallade)`,
        });
        return {
          dispatchIds: newDispatches.map((d) => d.id),
          notified: newNotifications.length,
          summary: { ny: plan.newlyCalled.length, andrad: plan.changed.length, borttagen: plan.removed.length },
        };
      },

      cancelRehearsal: (id, actorId, opts) => {
        const s = get();
        const r = s.rehearsals.find((x) => x.id === id);
        if (!r || !can(s, actorId, "schedule.publish", r.productionId)) return;
        if (!r.published) {
          get().deleteDraftRehearsal(id, actorId);
          return;
        }
        const createdAt = nowISO();
        const d: Dispatch = {
          id: uid("d"),
          rehearsalId: id,
          productionId: r.productionId,
          kind: "installd",
          createdAt,
          createdBy: actorId,
          changes: [],
          recipientIds: r.published.participantIds,
          requiresResponse: false,
          message: opts.message?.trim() || undefined,
          snapshot: r.published,
        };
        set((st) => ({
          rehearsals: st.rehearsals.map((x) => (x.id === id ? { ...x, cancelled: true, draft: null, updatedAt: createdAt } : x)),
          dispatches: [d, ...st.dispatches],
          notifications: [
            ...r.published!.participantIds.map((pid) => ({ id: uid("n"), dispatchId: d.id, recipientId: pid, createdAt, reminderCount: 0 })),
            ...st.notifications,
          ],
        }));
        audit(set, { actorId, action: "rehearsal.cancel", targetId: id, productionId: r.productionId, summary: `Ställde in ${r.published.title}` });
      },

      markRead: (nid) =>
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === nid && !n.readAt ? { ...n, readAt: nowISO() } : n)) })),

      acknowledge: (nid) => {
        const n = get().notifications.find((x) => x.id === nid);
        if (!n || n.ackAt) return;
        const t = nowISO();
        set((s) => ({
          notifications: s.notifications.map((x) => (x.id === nid ? { ...x, readAt: x.readAt ?? t, ackAt: t } : x)),
          progress: { ...s.progress, acked: true },
        }));
        const d = get().dispatches.find((x) => x.id === n.dispatchId);
        audit(set, { actorId: n.recipientId, action: "notification.ack", targetId: n.dispatchId, productionId: d?.productionId, summary: `Kvitterade: ${d?.snapshot.title ?? "notis"}` });
      },

      acknowledgeAll: (personId) => {
        get()
          .notifications.filter((n) => n.recipientId === personId && !n.ackAt)
          .forEach((n) => get().acknowledge(n.id));
      },

      respond: (nid, response, note) => {
        const n = get().notifications.find((x) => x.id === nid);
        if (!n) return;
        const t = nowISO();
        set((s) => ({
          notifications: s.notifications.map((x) =>
            x.id === nid ? { ...x, response, responseNote: note?.trim() || undefined, respondedAt: t, readAt: x.readAt ?? t } : x,
          ),
        }));
        const d = get().dispatches.find((x) => x.id === n.dispatchId);
        audit(set, {
          actorId: n.recipientId,
          action: "notification.respond",
          targetId: n.dispatchId,
          productionId: d?.productionId,
          summary: `Svarade "${response === "kommer" ? "Jag kommer" : "Kan inte"}" på ${d?.snapshot.title ?? "notis"}`,
        });
      },

      remind: (dispatchId, actorId) => {
        const pending = get().notifications.filter((n) => n.dispatchId === dispatchId && !n.ackAt);
        if (!pending.length) return 0;
        const ids = new Set(pending.map((n) => n.id));
        set((s) => ({
          notifications: s.notifications.map((n) => (ids.has(n.id) ? { ...n, reminderCount: n.reminderCount + 1, lastReminderAt: nowISO() } : n)),
        }));
        const d = get().dispatches.find((x) => x.id === dispatchId);
        audit(set, { actorId, action: "notification.remind", targetId: dispatchId, productionId: d?.productionId, summary: `Skickade påminnelse till ${pending.length} person${pending.length > 1 ? "er" : ""}: ${d?.snapshot.title}` });
        return pending.length;
      },

      setCasting: (characterId, personIds, actorId) => {
        const c = get().characters.find((x) => x.id === characterId);
        if (!c || !can(get(), actorId, "casting.edit", c.productionId)) return;
        set((s) => ({ characters: s.characters.map((x) => (x.id === characterId ? { ...x, personIds } : x)) }));
        audit(set, { actorId, action: "casting.update", targetId: characterId, productionId: c.productionId, summary: `Uppdaterade rollbesättning: ${c.name}` });
      },

      toggleSceneCharacter: (sceneId, characterId, actorId) => {
        const sc = get().scenes.find((x) => x.id === sceneId);
        if (!sc || !can(get(), actorId, "casting.edit", sc.productionId)) return;
        set((s) => ({
          scenes: s.scenes.map((x) =>
            x.id === sceneId
              ? { ...x, characterIds: x.characterIds.includes(characterId) ? x.characterIds.filter((c) => c !== characterId) : [...x.characterIds, characterId] }
              : x,
          ),
        }));
      },

      createGroup: (productionId, name, personIds, actorId) => {
        const id = uid("g");
        set((s) => ({ groups: [...s.groups, { id, productionId, name, personIds }] }));
        audit(set, { actorId, action: "group.create", targetId: id, productionId, summary: `Sparade grupp "${name}" (${personIds.length} personer)` });
        return id;
      },

      saveTemplate: (t, actorId) => {
        set((s) => ({ templates: [...s.templates, { ...t, id: uid("t") }] }));
        audit(set, { actorId, action: "template.create", productionId: t.productionId, summary: `Sparade mall "${t.name}"` });
      },

      importScript: (script, actorId) => {
        if (!can(get(), actorId, "script.manage", script.productionId)) throw new Error("Behörighet saknas");
        set((s) => ({ scripts: [...s.scripts.filter((x) => x.id !== script.id), script] }));
        audit(set, { actorId, action: "script.import", targetId: script.id, productionId: script.productionId, summary: `Importerade manus "${script.title}" – väntar på verifiering` });
      },

      verifyScript: (scriptId, actorId) => {
        const target = get().scripts.find((x) => x.id === scriptId);
        if (!target || !can(get(), actorId, "script.manage", target.productionId)) return;
        // A verified import supersedes the production's previous script version.
        set((s) => ({
          scripts: s.scripts
            .filter((x) => x.id === scriptId || x.productionId !== target.productionId)
            .map((x) => (x.id === scriptId ? { ...x, status: "verifierad", verifiedBy: actorId, verifiedAt: nowISO() } : x)),
        }));
        const sc = get().scripts.find((x) => x.id === scriptId);
        audit(set, { actorId, action: "script.verify", targetId: scriptId, productionId: sc?.productionId, summary: `Verifierade manus "${sc?.title}"` });
      },

      toggleBookmark: (personId, lineId) =>
        set((s) => {
          const exists = s.bookmarks.some((b) => b.personId === personId && b.lineId === lineId);
          return {
            bookmarks: (exists
              ? s.bookmarks.filter((b) => !(b.personId === personId && b.lineId === lineId))
              : [...s.bookmarks, { personId, lineId }]) ,
          };
        }),

      setAnnotation: (personId, lineId, text) =>
        set((s) => {
          const rest = s.annotations.filter((a) => !(a.personId === personId && a.lineId === lineId));
          const next = text.trim() ? [...rest, { id: uid("an"), personId, lineId, text: text.trim(), createdAt: nowISO() }] : rest;
          return { annotations: next };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // Storage access may throw (private mode, blocked site data) – never let that break the app.
      storage: createJSONStorage(() => ({
        getItem: (k: string) => {
          try {
            return localStorage.getItem(k);
          } catch {
            return null;
          }
        },
        setItem: (k: string, v: string) => {
          try {
            localStorage.setItem(k, v);
          } catch {}
        },
        removeItem: (k: string) => {
          try {
            localStorage.removeItem(k);
          } catch {}
        },
      })),
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { hydrated, ...rest } = s;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function"));
      },
      skipHydration: true,
    },
  ),
);

/** Keep several tabs / the split-screen demo in sync. */
export function startCrossTabSync() {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) useStore.persist?.rehydrate();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
