// Generates public/demo/exempelmanus-kvinnorna-vid-havet.pdf – a short, ORIGINAL fictional script
// used to demonstrate PDF import. Run: npm run demo:pdf
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync, mkdirSync } from "node:fs";

const content = [
  ["title", "KVINNORNA VID HAVET"],
  ["sub", "Fiktivt demomanus för StageFlow – fri att använda i demon"],
  ["gap"],
  ["scene", "AKT 1 – Bryggan"],
  ["dir", "(Sommarkväll. Fyra kvinnor sitter på en brygga med fötterna i vattnet.)"],
  ["line", "AGNES: Det är femtio år sedan vi satt här sist."],
  ["line", "RUTH: Fyrtionio. Du har alltid avrundat uppåt."],
  ["line", "LISEN: Hon avrundade sin ålder nedåt, det minns jag."],
  ["line", "HEDDA: Var tysta. Hör ni? Det är samma lom som då."],
  ["line", "AGNES: Lommar blir inte femtio år gamla, Hedda."],
  ["line", "HEDDA: Den här blev det. Den väntade på oss."],
  ["dir", "(Paus. RUTH tar fram en termos.)"],
  ["line", "RUTH: Jag tog med kaffe. Och konjak, för den som behöver mod."],
  ["line", "LISEN: Mod till vad?"],
  ["line", "RUTH: Till att säga det vi aldrig sa."],
  ["gap"],
  ["scene", "AKT 2 – Natten"],
  ["dir", "(Midnatt. Bryggan i månsken. HEDDA står längst ut.)"],
  ["line", "HEDDA: Jag var den som skrev brevet. Inte Agnes."],
  ["line", "AGNES: Det vet jag. Jag har alltid vetat det."],
  ["line", "HEDDA: Varför sa du ingenting?"],
  ["line", "AGNES: För att du behövde någon att vara arg på. Och jag tålde det."],
  ["line", "LISEN: Så vi har burit på fel sorg i femtio år."],
  ["line", "RUTH: Fyrtionio."],
  ["dir", "(De skrattar. Ljuset går långsamt ned.)"],
];

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
let page = pdf.addPage([595, 842]);
let y = 780;
const left = 64;
const write = (text, f, size, color = rgb(0.08, 0.1, 0.17)) => {
  if (y < 70) {
    page = pdf.addPage([595, 842]);
    y = 780;
  }
  page.drawText(text, { x: left, y, size, font: f, color });
  y -= size + 9;
};
for (const [kind, text] of content) {
  if (kind === "title") write(text, bold, 22);
  else if (kind === "sub") write(text, italic, 10, rgb(0.4, 0.42, 0.48));
  else if (kind === "gap") y -= 14;
  else if (kind === "scene") {
    y -= 6;
    write(text, bold, 13);
  } else if (kind === "dir") write(text, italic, 11, rgb(0.35, 0.37, 0.43));
  else write(text, font, 11.5);
}
mkdirSync("public/demo", { recursive: true });
writeFileSync("public/demo/exempelmanus-kvinnorna-vid-havet.pdf", await pdf.save());
console.log("Wrote public/demo/exempelmanus-kvinnorna-vid-havet.pdf");
