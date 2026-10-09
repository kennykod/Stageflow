import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ProductionColor } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");
}

/** Inline style helpers for production accent colours (CSS variables keep dark mode correct). */
export function prodVars(color: ProductionColor) {
  return {
    "--pc": `var(--p-${color})`,
    "--pc-soft": `var(--p-${color}-soft)`,
  } as React.CSSProperties;
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
