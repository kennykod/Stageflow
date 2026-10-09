import type { RehearsalData, Room, Production } from "./types";
import { DOWNLOADS_BLOCKED } from "./env";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const dt = (iso: string) => iso.replace(/[-:]/g, "") + "00";

/** Builds a standards-compliant iCalendar file (Europe/Stockholm local time). */
export function buildICS(id: string, d: RehearsalData, room: Room | undefined, prod: Production | undefined) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StageFlow//Demo//SV",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${id}@stageflow-demo`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Stockholm:${dt(d.start)}`,
    `DTEND;TZID=Europe/Stockholm:${dt(d.end)}`,
    `SUMMARY:${esc(`${prod?.title ?? ""} – ${d.title}`)}`,
    `LOCATION:${esc(room ? `${room.name}, ${room.location}` : "")}`,
    `DESCRIPTION:${esc(d.description || "Från StageFlow (demo)")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** Returns false when downloads are unavailable (artifact preview). */
export function downloadICS(filename: string, content: string): boolean {
  if (DOWNLOADS_BLOCKED) return false;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
