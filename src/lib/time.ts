import {
  addMinutes,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import { sv } from "date-fns/locale";

/** Local wall-clock ISO without offset: "2026-10-09T10:00". */
export function toLocalISO(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}
export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
export function p(s: string): Date {
  return parseISO(s);
}

export const fmtTime = (s: string) => format(p(s), "HH:mm");
export const fmtRange = (start: string, end: string) => `${fmtTime(start)}–${fmtTime(end)}`;
export const fmtDayLong = (s: string | Date) => format(typeof s === "string" ? p(s) : s, "EEEE d MMMM", { locale: sv });
export const fmtDayShort = (s: string | Date) => format(typeof s === "string" ? p(s) : s, "EEE d MMM", { locale: sv });
export const fmtWeekday = (s: string | Date) => format(typeof s === "string" ? p(s) : s, "EEE", { locale: sv });
export const fmtStamp = (s: string) => format(p(s), "d MMM HH:mm", { locale: sv });
export const fmtMonth = (d: Date) => format(d, "LLLL yyyy", { locale: sv });

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekStart(d: Date) {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function weekNumber(d: Date) {
  return format(d, "I");
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return p(aStart) < p(bEnd) && p(bStart) < p(aEnd);
}

export function durationMin(start: string, end: string) {
  return differenceInMinutes(p(end), p(start));
}

export function minutesOfDay(s: string) {
  const d = p(s);
  return d.getHours() * 60 + d.getMinutes();
}

export function setTimeOnDate(dateKey: string, hhmm: string) {
  return `${dateKey}T${hhmm}`;
}

export function shiftISO(s: string, minutes: number) {
  return toLocalISO(addMinutes(p(s), minutes));
}

/** "om 2 tim 15 min", "pågår nu", "för 3 tim sedan". */
export function relativeTo(now: Date, start: string, end?: string) {
  const s = p(start);
  if (end && now >= s && now < p(end)) return "Pågår nu";
  const mins = differenceInMinutes(s, now);
  const days = differenceInCalendarDays(s, now);
  if (mins < 0) return "Har passerat";
  if (days === 0) {
    if (mins < 60) return `Om ${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `Om ${h} tim ${m} min` : `Om ${h} tim`;
  }
  if (days === 1) return "I morgon";
  return `Om ${days} dagar`;
}

export function dayLabel(now: Date, s: string) {
  const d = p(s);
  if (isSameDay(d, now)) return "Idag";
  const diff = differenceInCalendarDays(d, now);
  if (diff === 1) return "I morgon";
  if (diff === -1) return "I går";
  return capitalize(fmtDayLong(d));
}

export function greeting(now: Date) {
  const h = now.getHours();
  if (h < 5) return "God natt";
  if (h < 10) return "God morgon";
  if (h < 17) return "Hej";
  return "God kväll";
}
