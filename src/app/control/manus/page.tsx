"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AlertTriangle, BookOpenText, CheckCircle2, Download, FileText, FileUp, Loader2, ScanText, ShieldCheck, Upload, Users } from "lucide-react";
import { PageHeader } from "@/components/control/shell";
import { useControlData } from "@/components/control/data";
import { Badge, Button, Card, Checkbox, DemoTag, Field, Select } from "@/components/ui/primitives";
import { Dialog, Sheet, toast } from "@/components/ui/overlay";
import { ProductionTag } from "@/components/shared";
import { useStore, uid } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { parseScript, type ParseResult } from "@/lib/script-parser";
import { extractPdfText } from "@/lib/pdf-extract";
import { fmtStamp } from "@/lib/time";
import type { Script } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ScriptsAdmin() {
  const { meId, myProductions } = useControlData();
  const allowed = useCan(meId);
  const scripts = useStore((s) => s.scripts);
  const verifyScript = useStore((s) => s.verifyScript);
  const L = useLookups();
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<Script | null>(null);

  const manageable = myProductions.filter((p) => allowed("script.manage", p.id));
  const visible = scripts.filter((s) => manageable.some((p) => p.id === s.productionId));

  return (
    <>
      <PageHeader
        title="Manus"
        subtitle="Digitalisera, verifiera och koppla manus till repetitioner. Endast verifierade manus syns för ensemblen."
        actions={
          manageable.length > 0 && (
            <Button variant="primary" onClick={() => setImportOpen(true)}>
              <FileUp /> Importera manus
            </Button>
          )
        }
      />
      <div className="space-y-6 px-5 pb-12 sm:px-8">
        <div className="grid gap-3 lg:grid-cols-4">
          {[
            { icon: <Upload />, t: "1. Ladda upp", d: "PDF eller text. Kräver bekräftad rätt att digitalisera." },
            { icon: <ScanText />, t: "2. Tolka", d: "Scener, roller och repliker hittas automatiskt." },
            { icon: <ShieldCheck />, t: "3. Verifiera", d: "En människa granskar mot originalet innan publicering." },
            { icon: <Users />, t: "4. Koppla", d: "Roller kopplas till ensemblen och scener till schemat." },
          ].map((s) => (
            <Card key={s.t} className="flex gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent [&_svg]:size-[18px]">{s.icon}</span>
              <div>
                <div className="text-sm font-semibold">{s.t}</div>
                <div className="text-xs text-ink-3">{s.d}</div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((s) => {
            const lines = s.scenes.flatMap((x) => x.lines);
            const chars = new Set(lines.map((l) => l.characterId).filter(Boolean));
            return (
              <Card key={s.id} className="p-5" data-testid={`script-${s.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-surface-2 text-ink-2">
                      <BookOpenText className="size-5" />
                    </span>
                    <div>
                      <div className="font-display text-xl font-medium">{s.title}</div>
                      <div className="text-xs text-ink-3">
                        {s.version} · {s.source === "seed" ? "Inläst" : s.source === "pdf-import" ? "PDF-import" : "Textimport"}
                      </div>
                    </div>
                  </div>
                  {s.status === "verifierad" ? <Badge tone="ok">Verifierat</Badge> : <Badge tone="gold">Väntar på verifiering</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
                  <ProductionTag production={L.production(s.productionId)} size="sm" />
                  {s.scenes.length} scener · {lines.filter((l) => l.characterId).length} repliker · {chars.size} roller
                </div>
                <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-3">
                  <ShieldCheck className="mr-1 inline size-3.5" />
                  {s.rightsNote}
                </p>
                {s.verifiedBy && <p className="mt-2 text-xs text-ink-3">Verifierat av {L.person(s.verifiedBy)?.name} · {s.verifiedAt && fmtStamp(s.verifiedAt)}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setPreview(s)}>
                    <FileText /> Granska text
                  </Button>
                  {s.status === "granskas" && (
                    <Button
                      size="sm"
                      variant="primary"
                      data-testid="verify-script"
                      onClick={() => {
                        verifyScript(s.id, meId);
                        toast({ title: "Manuset är verifierat", body: "Det syns nu i Personal för produktionens medlemmar." });
                      }}
                    >
                      <CheckCircle2 /> Verifiera & publicera
                    </Button>
                  )}
                  <Link href={`/control/produktioner?p=${s.productionId}`}>
                    <Button size="sm" variant="ghost">
                      <Users /> Rollbesättning
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
          {manageable
            .filter((p) => !visible.some((s) => s.productionId === p.id))
            .map((p) => (
              <Card key={p.id} className="flex flex-col items-center justify-center border-dashed p-8 text-center">
                <ProductionTag production={p} />
                <p className="mt-3 text-sm text-ink-3">Inget digitalt manus ännu.</p>
                <Button size="sm" className="mt-3" onClick={() => setImportOpen(true)}>
                  <FileUp /> Importera
                </Button>
              </Card>
            ))}
        </div>
      </div>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} productions={manageable} actorId={meId} />
      <Sheet open={!!preview} onOpenChange={(v) => !v && setPreview(null)} title={preview?.title ?? ""} description="Skrivskyddad förhandsgranskning – jämför mot originalet före verifiering." width={600}>
        {preview?.scenes.map((sc) => (
          <section key={sc.sceneId} className="mb-6">
            <h3 className="mb-2 font-display text-lg">
              {L.scene(sc.sceneId)?.number} {L.scene(sc.sceneId)?.title}
            </h3>
            <ol className="space-y-1.5 text-sm">
              {sc.lines.map((l) => (
                <li key={l.id} className={cn(!l.characterId && "text-ink-3 italic")}>
                  {l.characterId && <span className="mr-2 text-[11px] font-bold tracking-wide uppercase">{L.character(l.characterId)?.name}</span>}
                  {l.text}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </Sheet>
    </>
  );
}

function ImportDialog({ open, onOpenChange, productions, actorId }: { open: boolean; onOpenChange: (v: boolean) => void; productions: { id: string; title: string }[]; actorId: string }) {
  const characters = useStore((s) => s.characters);
  const scenes = useStore((s) => s.scenes);
  const scripts = useStore((s) => s.scripts);
  const importScript = useStore((s) => s.importScript);
  const [step, setStep] = useState<1 | 2>(1);
  const [prodId, setProdId] = useState(productions.find((p) => p.id === "prod-hav")?.id ?? productions[0]?.id ?? "");
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [speakerMap, setSpeakerMap] = useState<Record<string, string>>({});
  const [sceneMap, setSceneMap] = useState<Record<number, string>>({});
  const [activeScene, setActiveScene] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const prodChars = characters.filter((c) => c.productionId === prodId);
  const prodScenes = scenes.filter((s) => s.productionId === prodId);
  const existing = scripts.find((s) => s.productionId === prodId);

  const reset = () => {
    setStep(1);
    setResult(null);
    setFileName("");
    setBusy(null);
    setRights(false);
  };

  const handleText = (text: string, name: string) => {
    const r = parseScript(text);
    setResult(r);
    setFileName(name);
    const sm: Record<string, string> = {};
    r.speakers.forEach((sp) => {
      const match = prodChars.find((c) => c.name.toLowerCase() === sp.name.toLowerCase());
      sm[sp.name] = match?.id ?? "";
    });
    setSpeakerMap(sm);
    // Match scenes by title first, then by order among the remaining ones.
    const scm: Record<number, string> = {};
    const used = new Set<string>();
    r.scenes.forEach((s, i) => {
      const m = prodScenes.find((ps) => ps.title.toLowerCase() === s.title.toLowerCase());
      if (m) {
        scm[i] = m.id;
        used.add(m.id);
      }
    });
    r.scenes.forEach((_, i) => {
      if (scm[i]) return;
      const next = prodScenes.find((ps) => !used.has(ps.id));
      scm[i] = next?.id ?? "";
      if (next) used.add(next.id);
    });
    setSceneMap(scm);
    setActiveScene(0);
    setStep(2);
  };

  const handleFile = async (file: File) => {
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error("Filen är större än 15 MB.");
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setBusy("Läser PDF…");
        const { text, empty, pages } = await extractPdfText(await file.arrayBuffer(), (p, t) => setBusy(`Läser sida ${p} av ${t}…`));
        if (empty) {
          setBusy(null);
          toast({ title: "Ingen text hittades", body: `PDF:en (${pages} sidor) verkar vara inskannad. OCR är en framtida serverfunktion.`, tone: "warn" });
          return;
        }
        handleText(text, file.name);
      } else if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) {
        handleText(await file.text(), file.name);
      } else {
        throw new Error("Endast PDF eller textfil stöds.");
      }
    } catch (e) {
      toast({ title: "Importen misslyckades", body: e instanceof Error ? e.message : "Okänt fel", tone: "warn" });
    } finally {
      setBusy(null);
    }
  };

  const unmappedSpeakers = result ? result.speakers.filter((s) => !speakerMap[s.name]) : [];
  const unmappedScenes = result ? result.scenes.filter((_, i) => !sceneMap[i]).length : 0;
  const lowConfidence = useMemo(() => (result ? result.scenes.reduce((a, s) => a + s.lines.filter((l) => l.confidence === "lag").length, 0) : 0), [result]);

  const save = () => {
    if (!result) return;
    const script: Script = {
      id: uid("script"),
      productionId: prodId,
      title: productions.find((p) => p.id === prodId)?.title ?? "Manus",
      author: "Importerat",
      version: `Import ${new Date().toLocaleDateString("sv-SE")} (${fileName})`,
      status: "granskas",
      rightsNote: "Uppladdat med bekräftad rätt att digitalisera för internt repetitionsbruk. Får inte spridas externt.",
      source: fileName.toLowerCase().endsWith(".pdf") ? "pdf-import" : "text-import",
      scenes: result.scenes
        .map((s, i) => ({
          sceneId: sceneMap[i]!,
          lines: s.lines.map((l, j) => ({
            id: `l-imp-${i}-${j}-${Math.random().toString(36).slice(2, 6)}`,
            characterId: l.speaker ? speakerMap[l.speaker] || null : null,
            text: l.speaker && !speakerMap[l.speaker] ? `${l.speaker.toUpperCase()}: ${l.text}` : l.text,
          })),
        }))
        .filter((s) => s.sceneId),
    };
    importScript(script, actorId);
    toast({ title: "Manuset är importerat", body: "Status: väntar på verifiering. Det syns inte för ensemblen ännu." });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      wide
      title={step === 1 ? "Importera manus" : "Granska tolkningen"}
      description={step === 1 ? "Texten tolkas lokalt i webbläsaren och sparas som utkast tills den verifierats." : `${fileName} · ${result?.scenes.length} scener · ${result?.speakers.length} talare`}
      footer={
        step === 1 ? (
          <>
            <span className="mr-auto text-xs text-ink-3">
              OCR för inskannade PDF:er <DemoTag kind="framtida" className="ml-1" />
            </span>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className="mr-auto" onClick={() => setStep(1)}>
              Tillbaka
            </Button>
            <Button variant="primary" disabled={unmappedScenes === result?.scenes.length} onClick={save} data-testid="save-import">
              Spara för verifiering
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-5">
          <Field label="Produktion" htmlFor="imp-prod">
            <Select id="imp-prod" value={prodId} onChange={(e) => setProdId(e.target.value)}>
              {productions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          {existing && (
            <p className="flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn">
              <AlertTriangle className="size-4" /> Produktionen har redan ett manus – importen ersätter det efter verifiering.
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
            <Checkbox checked={rights} onChange={setRights} label="Bekräfta rättigheter" />
            <span className="text-sm">
              <span className="font-semibold">Jag bekräftar att teatern har rätt att digitalisera detta manus</span>
              <span className="mt-0.5 block text-[13px] text-ink-3">
                Enligt avtal med upphovsrättsinnehavaren, för internt repetitionsbruk. Manuset blir endast åtkomligt för produktionens medlemmar.
              </span>
            </span>
          </label>
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              rights ? "border-line-strong bg-surface-2/50" : "border-line opacity-60",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!rights) return toast({ title: "Bekräfta rättigheterna först", tone: "warn" });
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            {busy ? (
              <>
                <Loader2 className="size-8 animate-spin text-ink-3" />
                <p className="mt-3 text-sm font-medium">{busy}</p>
              </>
            ) : (
              <>
                <FileUp className="size-8 text-ink-3" />
                <p className="mt-3 text-sm font-semibold">Dra hit en PDF eller textfil</p>
                <p className="text-xs text-ink-3">Max 15 MB</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button disabled={!rights} onClick={() => fileRef.current?.click()}>
                    Välj fil
                  </Button>
                  <Button
                    variant="soft"
                    disabled={!rights}
                    data-testid="use-sample-pdf"
                    onClick={async () => {
                      const res = await fetch("/demo/exempelmanus-kvinnorna-vid-havet.pdf");
                      const blob = await res.blob();
                      handleFile(new File([blob], "exempelmanus-kvinnorna-vid-havet.pdf", { type: "application/pdf" }));
                    }}
                  >
                    Använd exempel-PDF
                  </Button>
                </div>
                <input ref={fileRef} type="file" accept="application/pdf,.pdf,text/plain,.txt" className="sr-only" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} aria-label="Välj manusfil" />
              </>
            )}
          </div>
          <a href="/demo/exempelmanus-kvinnorna-vid-havet.pdf" download className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 hover:text-ink">
            <Download className="size-3.5" /> Ladda ner exempel-PDF:en (fiktiv)
          </a>
        </div>
      ) : (
        result && (
          <div className="space-y-5">
            {(result.warnings.length > 0 || lowConfidence > 0) && (
              <ul className="space-y-1.5">
                {result.warnings.map((w) => (
                  <li key={w} className="flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-warn">
                    <AlertTriangle className="size-4 shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <section>
                <h3 className="mb-2 text-sm font-semibold">Talare → roller</h3>
                <div className="space-y-1.5">
                  {result.speakers.map((sp) => (
                    <div key={sp.name} className="flex items-center gap-2">
                      <span className="w-28 truncate text-sm font-medium">{sp.name}</span>
                      <span className="w-10 text-xs text-ink-3 tabular">{sp.count}×</span>
                      <Select className="h-8 flex-1 text-[13px]" value={speakerMap[sp.name] ?? ""} onChange={(e) => setSpeakerMap((m) => ({ ...m, [sp.name]: e.target.value }))} aria-label={`Roll för ${sp.name}`}>
                        <option value="">Ej kopplad</option>
                        {prodChars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
                {unmappedSpeakers.length > 0 && <p className="mt-2 text-xs text-warn">{unmappedSpeakers.length} talare saknar roll – deras repliker sparas som text med namnet.</p>}
              </section>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Scener → produktionens scener</h3>
                <div className="space-y-1.5">
                  {result.scenes.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button onClick={() => setActiveScene(i)} className={cn("w-36 truncate text-left text-sm font-medium", activeScene === i && "text-accent underline")}>
                        {s.heading}
                      </button>
                      <Select className="h-8 flex-1 text-[13px]" value={sceneMap[i] ?? ""} onChange={(e) => setSceneMap((m) => ({ ...m, [i]: e.target.value }))} aria-label={`Scen för ${s.heading}`}>
                        <option value="">Hoppa över</option>
                        {prodScenes.map((ps) => (
                          <option key={ps.id} value={ps.id}>
                            {ps.number} {ps.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <section>
              <h3 className="mb-2 text-sm font-semibold">Förhandsvisning: {result.scenes[activeScene]?.heading}</h3>
              <ol className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-line p-3 text-sm">
                {result.scenes[activeScene]?.lines.map((l, i) => (
                  <li key={i} className={cn("rounded-lg px-2 py-1", l.confidence === "lag" && "bg-warn-soft", !l.speaker && "text-ink-3 italic")}>
                    {l.speaker && <span className={cn("mr-2 text-[11px] font-bold uppercase", speakerMap[l.speaker] ? "text-ink" : "text-warn")}>{l.speaker}</span>}
                    {l.text}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )
      )}
    </Dialog>
  );
}
