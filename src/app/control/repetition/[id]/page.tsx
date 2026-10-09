"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addDays } from "date-fns";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Clock, FileStack, LayoutTemplate, MapPin, Save, Send, Smartphone } from "lucide-react";
import { PageHeader } from "@/components/control/shell";
import { ParticipantPicker } from "@/components/control/participant-picker";
import { ConflictList, PublishDialog } from "@/components/control/rehearsal";
import { useControlData } from "@/components/control/data";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, toast } from "@/components/ui/overlay";
import { NoAccess, ProductionTag, StatusBadge } from "@/components/shared";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { TYPE_LABEL, detectConflicts, rehearsalStatus, suggestParticipants, workingData } from "@/lib/domain";
import { capitalize, durationMin, fmtDayLong, fmtRange, overlaps, p, shiftISO, toDateKey } from "@/lib/time";
import type { ID, RehearsalData, RehearsalType } from "@/lib/types";
import { cn, plural, prodVars } from "@/lib/utils";

export default function EditorPage() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}

interface FormState {
  productionId: ID;
  title: string;
  titleTouched: boolean;
  type: RehearsalType;
  date: string;
  start: string;
  end: string;
  roomId: ID;
  sceneIds: ID[];
  description: string;
  participants: Set<ID>;
}

function Editor() {
  const { id } = useParams<{ id: string }>();
  const qs = useSearchParams();
  const router = useRouter();
  const now = useNow();
  const isNew = id === "ny";
  const { meId, myProductions, conflicts: _c } = useControlData();
  void _c;
  const rehearsals = useStore((s) => s.rehearsals);
  const rooms = useStore((s) => s.rooms);
  const scenes = useStore((s) => s.scenes);
  const characters = useStore((s) => s.characters);
  const productions = useStore((s) => s.productions);
  const memberships = useStore((s) => s.memberships);
  const people = useStore((s) => s.people);
  const unavailability = useStore((s) => s.unavailability);
  const templates = useStore((s) => s.templates);
  const createRehearsal = useStore((s) => s.createRehearsal);
  const saveDraft = useStore((s) => s.saveDraft);
  const saveTemplate = useStore((s) => s.saveTemplate);

  const existing = isNew ? undefined : rehearsals.find((r) => r.id === id);

  const initial = useMemo<FormState | null>(() => {
    const fromData = (prodId: ID, d: RehearsalData, dateOverride?: string): FormState => ({
      productionId: prodId,
      title: d.title,
      titleTouched: true,
      type: d.type,
      date: dateOverride ?? d.start.slice(0, 10),
      start: d.start.slice(11, 16),
      end: d.end.slice(11, 16),
      roomId: d.roomId,
      sceneIds: [...d.sceneIds],
      description: d.description,
      participants: new Set(d.participantIds),
    });
    if (existing) return fromData(existing.productionId, workingData(existing));
    const dup = qs.get("duplicate") ? rehearsals.find((r) => r.id === qs.get("duplicate")) : undefined;
    if (dup) return fromData(dup.productionId, workingData(dup));
    const prodId = qs.get("prod") && myProductions.some((x) => x.id === qs.get("prod")) ? qs.get("prod")! : myProductions[0]?.id;
    if (!prodId) return null;
    const start = qs.get("start") ?? "10:00";
    const [h, m] = start.split(":").map(Number);
    const endH = Math.min(23, h! + 3);
    return {
      productionId: prodId,
      title: "Repetition",
      titleTouched: false,
      type: "repetition",
      date: qs.get("date") ?? toDateKey(addDays(now, 1)),
      start,
      end: `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      roomId: qs.get("room") ?? "room-repa",
      sceneIds: [],
      description: "",
      participants: new Set(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [f, setF] = useState<FormState | null>(initial);
  const [publishId, setPublishId] = useState<ID | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [attempted, setAttempted] = useState(false);
  // Guards against creating duplicates if the publish dialog is cancelled and reopened.
  const [createdId, setCreatedId] = useState<ID | null>(null);
  useEffect(() => setF(initial), [initial]);

  if (!f) {
    return <NoAccess title="Inga produktioner att planera">Din roll kan inte planera repetitioner i någon produktion.</NoAccess>;
  }
  if (!isNew && !existing) {
    return (
      <NoAccess title="Repetitionen hittades inte">Den kan ha raderats, eller så saknar du behörighet till produktionen.</NoAccess>
    );
  }
  if (existing && !myProductions.some((x) => x.id === existing.productionId)) {
    return <NoAccess>Du kan inte redigera repetitioner i den här produktionen.</NoAccess>;
  }

  const prod = productions.find((x) => x.id === f.productionId)!;
  const data: RehearsalData = {
    title: f.title.trim(),
    type: f.type,
    start: `${f.date}T${f.start}`,
    end: `${f.date}T${f.end}`,
    roomId: f.roomId,
    sceneIds: f.sceneIds,
    description: f.description,
    participantIds: Array.from(f.participants),
  };
  const ctx = { rehearsals, unavailability, people, rooms, productions };
  const conflicts = detectConflicts({ id: existing?.id ?? createdId ?? undefined, productionId: f.productionId, data }, ctx);
  const errors = conflicts.filter((c) => c.severity === "error");
  const suggestions = suggestParticipants(f.productionId, f.sceneIds, { scenes, characters, productions, memberships });
  const prodScenes = scenes.filter((s) => s.productionId === f.productionId);
  const validTime = data.end > data.start;
  const formErrors = [!data.title && "Ange en titel", !validTime && "Sluttiden måste vara efter starttiden", !data.participantIds.length && "Välj minst en deltagare"].filter(
    Boolean,
  ) as string[];
  const dirty = !existing || JSON.stringify(workingData(existing)) !== JSON.stringify(data) || (!!existing.draft && !existing.published);
  const hasUnpublished = !!existing?.draft;

  const update = (patch: Partial<FormState>) => setF((s) => (s ? { ...s, ...patch } : s));
  const setType = (t: RehearsalType) => update({ type: t, ...(f.titleTouched ? {} : { title: TYPE_LABEL[t] }) });
  const setDuration = (mins: number) => update({ end: shiftISO(`${f.date}T${f.start}`, mins).slice(11, 16) });

  const roomBusy = (roomId: ID) =>
    rehearsals.some((r) => r.id !== (existing?.id ?? createdId) && !r.cancelled && workingData(r).roomId === roomId && overlaps(data.start, data.end, workingData(r).start, workingData(r).end));

  const persist = (): ID | null => {
    setAttempted(true);
    if (formErrors.length) {
      toast({ title: "Kontrollera formuläret", body: formErrors.join(" · "), tone: "warn" });
      return null;
    }
    if (existing) {
      if (dirty) saveDraft(existing.id, data, meId);
      return existing.id;
    }
    if (createdId) {
      saveDraft(createdId, data, meId);
      return createdId;
    }
    const rid = createRehearsal(f.productionId, data, meId);
    setCreatedId(rid);
    return rid;
  };

  const applyTemplate = (tid: string) => {
    const t = templates.find((x) => x.id === tid);
    if (!t) return;
    update({
      title: t.data.title,
      titleTouched: true,
      type: t.data.type,
      roomId: t.data.roomId,
      sceneIds: [...t.data.sceneIds],
      description: t.data.description,
      participants: new Set(t.data.participantIds),
      start: t.data.startTime,
      end: shiftISO(`${f.date}T${t.data.startTime}`, t.data.durationMin).slice(11, 16),
    });
    toast({ title: `Mallen ”${t.name}” tillämpades`, tone: "info" });
  };

  const prodTemplates = templates.filter((t) => t.productionId === f.productionId);

  return (
    <div className="pb-28">
      <PageHeader
        title={isNew ? (qs.get("duplicate") ? "Duplicera repetition" : "Ny repetition") : "Redigera repetition"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/control/schema" className="inline-flex items-center gap-1 hover:text-ink">
              <ArrowLeft className="size-3.5" /> Schema
            </Link>
            {existing && <StatusBadge r={existing} />}
            {existing && rehearsalStatus(existing) !== "utkast" && <span>Version {existing.version}</span>}
          </span>
        }
        actions={
          isNew &&
          prodTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <LayoutTemplate className="size-4 text-ink-3" />
              <Select aria-label="Använd mall" defaultValue="" onChange={(e) => e.target.value && applyTemplate(e.target.value)} className="h-9 w-56">
                <option value="">Använd mall…</option>
                {prodTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          )
        }
      />

      <div className="grid gap-6 px-5 sm:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Left: details */}
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Produktion" htmlFor="f-prod">
                <Select
                  id="f-prod"
                  value={f.productionId}
                  disabled={!!existing}
                  onChange={(e) => update({ productionId: e.target.value, sceneIds: [], participants: new Set() })}
                >
                  {myProductions.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Typ" htmlFor="f-type">
                <Select id="f-type" value={f.type} onChange={(e) => setType(e.target.value as RehearsalType)}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Titel" htmlFor="f-title" className="sm:col-span-2">
                <Input
                  id="f-title"
                  value={f.title}
                  onChange={(e) => update({ title: e.target.value, titleTouched: true })}
                  aria-invalid={attempted && !data.title}
                  placeholder="T.ex. Scenrepetition akt 2"
                />
              </Field>
              <Field
                label="Datum"
                htmlFor="f-date"
                hint={
                  <span className="flex gap-1">
                    {[
                      ["+1 dag", 1],
                      ["+1 vecka", 7],
                    ].map(([label, days]) => (
                      <button
                        key={label}
                        type="button"
                        className="rounded-md bg-surface-2 px-1.5 py-0.5 font-medium text-ink-2 hover:text-ink"
                        onClick={() => update({ date: toDateKey(addDays(p(f.date), days as number)) })}
                      >
                        {label}
                      </button>
                    ))}
                  </span>
                }
              >
                <Input id="f-date" type="date" value={f.date} onChange={(e) => e.target.value && update({ date: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" htmlFor="f-start">
                  <Input
                    id="f-start"
                    type="time"
                    step={900}
                    value={f.start}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const dur = durationMin(`${f.date}T${f.start}`, `${f.date}T${f.end}`);
                      update({ start: e.target.value, end: shiftISO(`${f.date}T${e.target.value}`, Math.max(15, dur)).slice(11, 16) });
                    }}
                  />
                </Field>
                <Field label="Slut" htmlFor="f-end">
                  <Input id="f-end" type="time" step={900} value={f.end} onChange={(e) => e.target.value && update({ end: e.target.value })} aria-invalid={!validTime} />
                </Field>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-ink-3">Längd:</span>
              {[60, 120, 180, 240, 300].map((m) => {
                const active = validTime && durationMin(data.start, data.end) === m;
                return (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    className={cn("h-7 rounded-lg px-2.5 text-xs font-medium transition-colors", active ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2 hover:text-ink")}
                  >
                    {m / 60} h
                  </button>
                );
              })}
              <span className="ml-auto text-xs text-ink-3">{capitalize(fmtDayLong(p(data.start)))}</span>
            </div>

            {conflicts.length > 0 ? (
              <div className="mt-5" aria-live="polite">
                <ConflictList conflicts={conflicts} />
              </div>
            ) : (
              validTime && (
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-[13px] text-ok" aria-live="polite">
                  <CheckCircle2 className="size-4" /> Inga konflikter – lokal och kallade är lediga.
                </div>
              )
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MapPin className="size-4 text-ink-3" /> Lokal
            </h2>
            <div role="radiogroup" aria-label="Lokal" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {rooms.map((r) => {
                const busy = roomBusy(r.id);
                const active = f.roomId === r.id;
                return (
                  <button
                    key={r.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => update({ roomId: r.id })}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left transition-all",
                      active ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-line hover:border-line-strong",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold">{r.name}</span>
                      <span className={cn("size-2 shrink-0 rounded-full", busy ? "bg-bad" : "bg-ok")} aria-hidden />
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-ink-3">{busy ? "Upptagen vid vald tid" : `Ledig · ${r.capacity} pers.`}</div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <FileStack className="size-4 text-ink-3" /> Scener
            </h2>
            <p className="mb-3 text-xs text-ink-3">Valda scener ger förslag på vilka som ska kallas och länkar till manus i Personal.</p>
            {prodScenes.length ? (
              <div className="flex flex-wrap gap-1.5" style={prodVars(prod.color)}>
                {prodScenes.map((s) => {
                  const on = f.sceneIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      aria-pressed={on}
                      data-testid={`scene-${s.id}`}
                      onClick={() => update({ sceneIds: on ? f.sceneIds.filter((x) => x !== s.id) : [...f.sceneIds, s.id] })}
                      className={cn(
                        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                        on ? "border-transparent bg-[var(--pc)] text-white dark:text-[#0c101c]" : "border-line text-ink-2 hover:border-line-strong hover:text-ink",
                      )}
                    >
                      {on && <Check className="size-3.5" />}
                      <span className="tabular opacity-80">{s.number}</span> {s.title}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-ink-3">Inga scener registrerade för produktionen.</p>
            )}
          </Card>

          <Card className="p-5 sm:p-6">
            <Field label="Information till de kallade" htmlFor="f-desc" hint="Visas i Personal. Håll det kort – t.ex. vad man ska ta med.">
              <Textarea id="f-desc" value={f.description} onChange={(e) => update({ description: e.target.value })} placeholder="T.ex. Ta med manus och bekväma skor." />
            </Field>
          </Card>

          {/* Preview */}
          <div className="hidden xl:block">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
              <Smartphone className="size-3.5" /> Så ser det ut i Personal
            </div>
            <div style={prodVars(prod.color)} className="max-w-sm rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
              <ProductionTag production={prod} size="sm" />
              <div className="mt-2 font-display text-2xl font-medium tabular">{validTime ? fmtRange(data.start, data.end) : "–"}</div>
              <div className="text-sm font-semibold">{data.title || "Titel"}</div>
              <div className="mt-1 text-[13px] text-ink-3">
                {rooms.find((r) => r.id === f.roomId)?.name} · {capitalize(fmtDayLong(p(data.start)))}
              </div>
              {f.sceneIds.length > 0 && (
                <div className="mt-2 text-[12px] text-ink-2">
                  {prodScenes
                    .filter((s) => f.sceneIds.includes(s.id))
                    .map((s) => `${s.number} ${s.title}`)
                    .join(" · ")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: participants */}
        <Card className="p-5 sm:p-6 xl:sticky xl:top-6 xl:self-start">
          <h2 className="mb-4 font-display text-xl font-medium">Vilka ska kallas?</h2>
          <ParticipantPicker
            productionId={f.productionId}
            selected={f.participants}
            onChange={(s) => update({ participants: s })}
            suggestions={suggestions}
            conflicts={conflicts}
            actorId={meId}
          />
        </Card>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:left-[260px]">
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 sm:px-8">
          <div className="mr-auto flex min-w-0 items-center gap-2 text-[13px]">
            {errors.length ? (
              <Badge tone="bad">
                <AlertTriangle className="size-3" /> {plural(errors.length, "konflikt", "konflikter")}
              </Badge>
            ) : conflicts.length ? (
              <Badge tone="warn">
                <AlertTriangle className="size-3" /> {plural(conflicts.length, "varning", "varningar")}
              </Badge>
            ) : (
              <Badge tone="ok">
                <Check className="size-3" /> Inga konflikter
              </Badge>
            )}
            <span className="hidden truncate text-ink-3 sm:inline">
              <Clock className="mr-1 inline size-3.5" />
              {validTime ? fmtRange(data.start, data.end) : "–"} · {plural(f.participants.size, "kallad", "kallade")}
            </span>
            {attempted && formErrors.length > 0 && <span className="text-bad">{formErrors[0]}</span>}
          </div>
          <Button variant="ghost" onClick={() => router.back()}>
            Avbryt
          </Button>
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => setTemplateOpen(true)}>
            <LayoutTemplate /> Spara som mall
          </Button>
          <Button
            data-testid="save-draft"
            disabled={!!existing && !dirty}
            onClick={() => {
              const rid = persist();
              if (!rid) return;
              toast({
                title: existing?.published ? "Ändringen är sparad som utkast" : "Utkastet är sparat",
                body: "Ingen har meddelats ännu.",
                tone: "info",
              });
              router.push(`/control/schema?d=${f.date}&r=${rid}`);
            }}
          >
            <Save /> {existing?.published ? "Spara ändring" : "Spara utkast"}
          </Button>
          <Button
            variant="primary"
            data-testid="review-publish"
            disabled={!!existing && !dirty && !hasUnpublished}
            onClick={() => {
              const rid = persist();
              if (rid) setPublishId(rid);
            }}
          >
            <Send /> Granska & publicera
          </Button>
        </div>
      </div>

      {publishId && (
        <PublishDialog
          rehearsalId={publishId}
          open={!!publishId}
          onOpenChange={(v) => !v && setPublishId(null)}
          onPublished={() => router.push(`/control/schema?d=${f.date}`)}
        />
      )}

      <Dialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        title="Spara som mall"
        description="Typ, lokal, scener, information, deltagare, starttid och längd sparas för återanvändning."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTemplateOpen(false)}>
              Avbryt
            </Button>
            <Button
              variant="primary"
              disabled={!templateName.trim() || !validTime}
              onClick={() => {
                saveTemplate(
                  {
                    productionId: f.productionId,
                    name: templateName.trim(),
                    data: {
                      title: data.title,
                      type: data.type,
                      roomId: data.roomId,
                      sceneIds: data.sceneIds,
                      description: data.description,
                      participantIds: data.participantIds,
                      startTime: f.start,
                      durationMin: durationMin(data.start, data.end),
                    },
                  },
                  meId,
                );
                toast({ title: `Mallen ”${templateName.trim()}” är sparad` });
                setTemplateName("");
                setTemplateOpen(false);
              }}
            >
              Spara mall
            </Button>
          </>
        }
      >
        <Input autoFocus value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="T.ex. Eftermiddagsrep huvudroller" aria-label="Mallnamn" />
      </Dialog>
    </div>
  );
}
