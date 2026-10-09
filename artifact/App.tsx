import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { RouterCtx, type RouterState } from "./router-context";
import { Providers } from "@/components/providers";
import { ControlShell } from "@/components/control/shell";
import { PersonalShell } from "@/components/personal/shell";
import Home from "@/app/page";
import Demo from "@/app/demo/page";
import NotFound from "@/app/not-found";
import Dashboard from "@/app/control/page";
import Schedule from "@/app/control/schema/page";
import Editor from "@/app/control/repetition/[id]/page";
import Acks from "@/app/control/kvittenser/page";
import Productions from "@/app/control/produktioner/page";
import ScriptsAdmin from "@/app/control/manus/page";
import Integrations from "@/app/control/integrationer/page";
import Today from "@/app/me/page";
import PersonalSchedule from "@/app/me/schema/page";
import Notifications from "@/app/me/notiser/page";
import PersonalRehearsal from "@/app/me/repetition/[id]/page";
import Scripts from "@/app/me/manus/page";
import Reader from "@/app/me/manus/[id]/page";
import Rehearse from "@/app/me/manus/[id]/repetera/page";
import Profile from "@/app/me/profil/page";

type Shell = "control" | "personal" | null;
const ROUTES: [string, ComponentType, Shell][] = [
  ["/", Home, null],
  ["/demo", Demo, null],
  ["/control", Dashboard, "control"],
  ["/control/schema", Schedule, "control"],
  ["/control/repetition/:id", Editor, "control"],
  ["/control/kvittenser", Acks, "control"],
  ["/control/produktioner", Productions, "control"],
  ["/control/manus", ScriptsAdmin, "control"],
  ["/control/integrationer", Integrations, "control"],
  ["/me", Today, "personal"],
  ["/me/schema", PersonalSchedule, "personal"],
  ["/me/notiser", Notifications, "personal"],
  ["/me/repetition/:id", PersonalRehearsal, "personal"],
  ["/me/manus", Scripts, "personal"],
  ["/me/manus/:id", Reader, "personal"],
  ["/me/manus/:id/repetera", Rehearse, "personal"],
  ["/me/profil", Profile, "personal"],
];

function match(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  for (const [pattern, C, shell] of ROUTES) {
    const pp = pattern.split("/").filter(Boolean);
    if (pp.length !== parts.length) continue;
    const params: Record<string, string> = {};
    if (pp.every((seg, i) => (seg.startsWith(":") ? ((params[seg.slice(1)] = decodeURIComponent(parts[i]!)), true) : seg === parts[i]))) {
      return { C, shell, params };
    }
  }
  return { C: NotFound as ComponentType, shell: null as Shell, params: {} };
}

function split(to: string) {
  const [path, search = ""] = to.split("?");
  return { pathname: path || "/", search };
}

function initialPath() {
  try {
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (h.startsWith("/")) return h;
    if (h === "control") return "/control";
    if (h === "me" || h === "personal") return "/me";
    if (h === "demo") return "/demo";
  } catch {}
  return "/";
}

/** Keeps the app's .dark class in step with the viewer's theme (data-theme or OS setting). */
function useHostTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem("stageflow-theme");
      } catch {}
      const attr = root.getAttribute("data-theme");
      const dark = attr === "dark" ? true : attr === "light" ? false : stored ? stored === "dark" : mq.matches;
      root.classList.toggle("dark", dark);
    };
    apply();
    const obs = new MutationObserver((m) => m.some((x) => x.attributeName === "data-theme") && apply());
    obs.observe(root, { attributes: true });
    mq.addEventListener("change", apply);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", apply);
    };
  }, []);
}

export function App() {
  const [stack, setStack] = useState<string[]>(() => [initialPath()]);
  const current = stack[stack.length - 1]!;
  useHostTheme();

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    setStack((s) => (opts?.replace ? [...s.slice(0, -1), to] : [...s, to].slice(-50)));
  }, []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  const { pathname, search } = split(current);
  const m = useMemo(() => match(pathname), [pathname]);
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  const value: RouterState = useMemo(() => ({ pathname, search, params: m.params, navigate, back }), [pathname, search, m.params, navigate, back]);
  const page = <m.C key={pathname} />;

  return (
    <RouterCtx.Provider value={value}>
      <a href="#main" className="sr-only z-[100] rounded-lg bg-accent px-4 py-2 text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Hoppa till innehållet
      </a>
      <Providers>{m.shell === "control" ? <ControlShell>{page}</ControlShell> : m.shell === "personal" ? <PersonalShell>{page}</PersonalShell> : page}</Providers>
    </RouterCtx.Provider>
  );
}
