"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={cn("shrink-0", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="var(--accent)" />
      {/* Curtain swoops */}
      <path d="M8 10c4 0 7 3.5 7 10.5S12 31 8 31" fill="none" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
      <path d="M32 10c-4 0-7 3.5-7 10.5S28 31 32 31" fill="none" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
      {/* Flow line */}
      <path d="M14.5 25.5c2.2 2.3 8.8 2.3 11-0.2" fill="none" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" />
      {/* Spotlight */}
      <circle cx="20" cy="15.5" r="3.2" fill="var(--gold)" />
    </svg>
  );
}

export function Wordmark({ sub, className }: { sub?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={32} />
      <div className="leading-none">
        <div className="font-display text-[19px] font-semibold tracking-tight text-ink">StageFlow</div>
        {sub && <div className="mt-1 text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">{sub}</div>}
      </div>
    </div>
  );
}

const THEME_KEY = "stageflow-theme";

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
  };
  return { dark, toggle };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={cn("inline-flex size-9 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink", className)}
      aria-label={dark ? "Byt till ljust läge" : "Byt till mörkt läge"}
      title={dark ? "Ljust läge" : "Mörkt läge"}
    >
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

/** Inline, render-blocking theme script to avoid a flash of the wrong theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
