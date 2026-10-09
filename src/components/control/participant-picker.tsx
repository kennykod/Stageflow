"use client";

import { useMemo, useState } from "react";
import { BookmarkPlus, Search, Sparkles, UserMinus, Users, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { ID, Person } from "@/lib/types";
import type { Conflict, Suggestion } from "@/lib/domain";
import { cn, plural } from "@/lib/utils";
import { Avatar, Badge, Button, Checkbox, Input, Segmented, Switch } from "@/components/ui/primitives";
import { Dialog, toast } from "@/components/ui/overlay";

type Tri = "all" | "some" | "none";
function triState(ids: ID[], sel: Set<ID>): Tri {
  if (!ids.length) return "none";
  const n = ids.filter((x) => sel.has(x)).length;
  return n === 0 ? "none" : n === ids.length ? "all" : "some";
}

/**
 * Fast, scalable participant selection:
 *  - one-click group toggles (whole production, departments, saved groups, characters)
 *  - "Alla utom…" exclusion mode
 *  - searchable checkbox list grouped by department, with tri-state group headers
 *  - scene-based suggestions with reasons
 *  - live per-person conflict hints
 */
export function ParticipantPicker({
  productionId,
  selected,
  onChange,
  suggestions,
  conflicts,
  actorId,
}: {
  productionId: ID;
  selected: Set<ID>;
  onChange: (next: Set<ID>) => void;
  suggestions: Suggestion[];
  conflicts: Conflict[];
  actorId: ID;
}) {
  const people = useStore((s) => s.people);
  const memberships = useStore((s) => s.memberships);
  const departments = useStore((s) => s.departments);
  const groups = useStore((s) => s.groups);
  const characters = useStore((s) => s.characters);
  const scenes = useStore((s) => s.scenes);
  const createGroup = useStore((s) => s.createGroup);

  const [tab, setTab] = useState<"personer" | "roller">("personer");
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [includeAll, setIncludeAll] = useState(false);
  const [exceptMode, setExceptMode] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");

  const prodMembers = useMemo(() => memberships.filter((m) => m.productionId === productionId), [memberships, productionId]);
  const fnById = useMemo(() => new Map(prodMembers.map((m) => [m.personId, m.function])), [prodMembers]);
  const memberIds = useMemo(() => prodMembers.map((m) => m.personId), [prodMembers]);
  const pool: Person[] = useMemo(
    () => (includeAll ? people : people.filter((p) => memberIds.includes(p.id) || selected.has(p.id))),
    [includeAll, people, memberIds, selected],
  );
  const prodChars = characters.filter((c) => c.productionId === productionId);
  const prodGroups = groups.filter((g) => g.productionId === productionId);

  const busy = useMemo(() => {
    const m = new Map<ID, Conflict["kind"]>();
    conflicts.forEach((c) => c.personIds?.forEach((id) => !m.has(id) && m.set(id, c.kind)));
    return m;
  }, [conflicts]);

  const set = (ids: ID[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    onChange(next);
  };

  const q = query.trim().toLowerCase();
  const filtered = pool.filter((p) => {
    if (onlySelected && !selected.has(p.id)) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || (fnById.get(p.id) ?? "").toLowerCase().includes(q);
  });

  const deptGroups = departments
    .map((d) => ({ dept: d, people: filtered.filter((p) => p.department === d.id) }))
    .filter((g) => g.people.length);

  const quick = [
    { key: "all", label: "Hela produktionen", ids: memberIds },
    ...departments
      .map((d) => ({ key: d.id, label: d.name, ids: memberIds.filter((id) => people.find((p) => p.id === id)?.department === d.id) }))
      .filter((x) => x.ids.length),
  ];

  const newSuggestions = suggestions.filter((s) => !selected.has(s.personId));
  const excluded = exceptMode ? memberIds.filter((id) => !selected.has(id)) : [];

  return (
    <div className="flex h-full flex-col">
      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-ink-3" />
          <span className="text-sm font-semibold" data-testid="selected-count">
            {selected.size} kallade
          </span>
          <span className="text-xs text-ink-3">av {memberIds.length} i produktionen</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={exceptMode ? "soft" : "ghost"}
            onClick={() => {
              if (!exceptMode) {
                set(memberIds, true);
                setExceptMode(true);
                setTab("personer");
                toast({ title: "Alla utom…", body: "Alla är valda – avmarkera dem som inte ska kallas.", tone: "info" });
              } else setExceptMode(false);
            }}
          >
            <UserMinus /> Alla utom…
          </Button>
          <Button size="sm" variant="ghost" disabled={!selected.size} onClick={() => setGroupDialog(true)}>
            <BookmarkPlus /> Spara grupp
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={!selected.size}
            onClick={() => {
              onChange(new Set());
              setExceptMode(false);
            }}
          >
            Rensa
          </Button>
        </div>
      </div>

      {exceptMode && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-info-soft px-3 py-2 text-[13px] text-ink">
          <UserMinus className="size-4 text-info" />
          <span className="flex-1">
            <strong>Alla utom:</strong>{" "}
            {excluded.length ? excluded.map((id) => people.find((p) => p.id === id)?.name).join(", ") : "ingen undantagen ännu"}
          </span>
          <button className="text-xs font-semibold text-info hover:underline" onClick={() => setExceptMode(false)}>
            Klar
          </button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-3 rounded-2xl border border-gold/30 bg-gold-soft/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="size-4 text-gold" />
            <span className="text-[13px] font-semibold text-ink">Förslag utifrån valda scener</span>
            <span className="text-xs text-ink-3">{newSuggestions.length ? `${newSuggestions.length} ej valda` : "alla förslag är valda"}</span>
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="soft" disabled={!newSuggestions.length} onClick={() => set(suggestions.map((s) => s.personId), true)} data-testid="add-suggestions">
                Lägg till förslag
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onChange(new Set(suggestions.map((s) => s.personId)))}>
                Ersätt urval
              </Button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => {
              const p = people.find((x) => x.id === s.personId);
              if (!p) return null;
              const on = selected.has(p.id);
              return (
                <button
                  key={s.personId}
                  onClick={() => set([p.id], !on)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-[12px] transition-colors",
                    on ? "border-transparent bg-surface text-ink shadow-[var(--shadow-soft)]" : "border-dashed border-gold/50 text-ink-2 hover:bg-surface/60",
                  )}
                  title={s.reasons.join(", ")}
                >
                  <Avatar name={p.name} hue={p.hue} size={20} />
                  <span className="font-medium">{p.name.split(" ")[0]}</span>
                  <span className="text-ink-3">{s.reasons[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick groups */}
      <div className="mt-4">
        <div className="mb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Snabbval</div>
        <div className="flex flex-wrap gap-1.5">
          {quick.map((g) => (
            <GroupChip key={g.key} label={g.label} count={g.ids.length} state={triState(g.ids, selected)} onToggle={(on) => set(g.ids, on)} />
          ))}
          {prodGroups.map((g) => (
            <GroupChip key={g.id} label={g.name} count={g.personIds.length} state={triState(g.personIds, selected)} onToggle={(on) => set(g.personIds, on)} saved />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Segmented
          label="Välj via"
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: "personer", label: "Personer" },
            { value: "roller", label: "Roller & scener" },
          ]}
        />
        {tab === "personer" && (
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök namn, roll eller funktion" className="h-9 pl-9" aria-label="Sök personer" />
            {query && (
              <button className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink" aria-label="Rensa sökning" onClick={() => setQuery("")}>
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {tab === "personer" ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[12.5px] text-ink-2">
            <label className="flex items-center gap-2">
              <Switch checked={onlySelected} onChange={setOnlySelected} label="Visa endast valda" /> Endast valda
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={includeAll} onChange={setIncludeAll} label="Inkludera personal utanför produktionen" /> All personal
            </label>
          </div>
          <div className="scrollbar-thin mt-3 max-h-[440px] min-h-[200px] flex-1 overflow-y-auto rounded-2xl border border-line">
            {deptGroups.length === 0 && <p className="p-6 text-center text-sm text-ink-3">Ingen matchar ”{query}”.</p>}
            {deptGroups.map(({ dept, people: list }) => {
              const ids = list.map((p) => p.id);
              const st = triState(ids, selected);
              return (
                <div key={dept.id} role="group" aria-label={dept.name}>
                  <label className="sticky top-0 z-[1] flex cursor-pointer items-center gap-3 border-b border-line bg-surface-2/95 px-3 py-2 backdrop-blur">
                    <Checkbox checked={st === "all"} indeterminate={st === "some"} onChange={(v) => set(ids, v)} label={`Välj alla i ${dept.name}`} />
                    <span className="text-[12.5px] font-semibold">{dept.name}</span>
                    <span className="text-xs text-ink-3 tabular">
                      {ids.filter((x) => selected.has(x)).length}/{ids.length}
                    </span>
                  </label>
                  <ul>
                    {list.map((p) => {
                      const on = selected.has(p.id);
                      const b = busy.get(p.id);
                      const isMember = memberIds.includes(p.id);
                      return (
                        <li key={p.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 border-b border-line/60 px-3 py-2 transition-colors last:border-b-0 hover:bg-surface-2/60",
                              on && "bg-accent-soft/40",
                              exceptMode && !on && isMember && "bg-bad-soft/40",
                            )}
                          >
                            <Checkbox checked={on} onChange={(v) => set([p.id], v)} label={p.name} />
                            <Avatar name={p.name} hue={p.hue} size={28} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{p.name}</span>
                              <span className="block truncate text-xs text-ink-3">
                                {fnById.get(p.id) ?? p.title}
                                {!isMember && " · utanför produktionen"}
                              </span>
                            </span>
                            {b && on && (
                              <Badge tone={b === "unavailable" ? "bad" : "warn"}>
                                {b === "unavailable" ? "Otillgänglig" : b === "rest" ? "Vila < 11 h" : "Dubbelbokad"}
                              </Badge>
                            )}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="scrollbar-thin mt-3 max-h-[480px] overflow-y-auto rounded-2xl border border-line">
          {prodChars.length === 0 && <p className="p-6 text-center text-sm text-ink-3">Produktionen har inga roller registrerade.</p>}
          <ul>
            {prodChars.map((c) => {
              const st = triState(c.personIds, selected);
              const inScenes = scenes.filter((s) => s.characterIds.includes(c.id)).map((s) => s.number);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 border-b border-line/60 px-3 py-2.5 hover:bg-surface-2/60">
                    <Checkbox checked={st === "all"} indeterminate={st === "some"} onChange={(v) => set(c.personIds, v)} label={`Roll ${c.name}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{c.name}</span>
                      <span className="block truncate text-xs text-ink-3">
                        {c.personIds.map((id) => people.find((p) => p.id === id)?.name).join(" / ") || "Ej besatt"}
                        {c.personIds.length > 1 && " · flera besättningar"}
                      </span>
                    </span>
                    <span className="hidden flex-wrap justify-end gap-1 sm:flex">
                      {inScenes.slice(0, 4).map((n) => (
                        <Badge key={n}>{n}</Badge>
                      ))}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog
        open={groupDialog}
        onOpenChange={setGroupDialog}
        title="Spara som grupp"
        description={`${plural(selected.size, "person", "personer")} sparas som en återanvändbar grupp i produktionen.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setGroupDialog(false)}>
              Avbryt
            </Button>
            <Button
              variant="primary"
              disabled={!groupName.trim()}
              onClick={() => {
                createGroup(productionId, groupName.trim(), Array.from(selected), actorId);
                toast({ title: `Gruppen ”${groupName.trim()}” är sparad` });
                setGroupName("");
                setGroupDialog(false);
              }}
            >
              Spara grupp
            </Button>
          </>
        }
      >
        <Input autoFocus value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="T.ex. Akt 2 – kören" aria-label="Gruppnamn" />
      </Dialog>
    </div>
  );
}

function GroupChip({ label, count, state, onToggle, saved }: { label: string; count: number; state: Tri; onToggle: (on: boolean) => void; saved?: boolean }) {
  return (
    <button
      onClick={() => onToggle(state !== "all")}
      aria-pressed={state === "all" ? true : state === "some" ? "mixed" : false}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12.5px] font-medium transition-all",
        state === "all" && "border-transparent bg-accent text-accent-ink",
        state === "some" && "border-accent/40 bg-accent-soft text-accent",
        state === "none" && "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
      )}
    >
      {saved && <BookmarkPlus className="size-3.5 opacity-70" />}
      {label}
      <span className={cn("rounded-full px-1.5 text-[11px] tabular", state === "all" ? "bg-white/15" : "bg-surface-2")}>{count}</span>
    </button>
  );
}
