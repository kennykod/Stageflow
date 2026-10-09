import { createContext, useContext } from "react";

export interface RouterState {
  pathname: string;
  search: string;
  params: Record<string, string>;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
  back: () => void;
}

export const RouterCtx = createContext<RouterState | null>(null);

export function useRouterState() {
  const r = useContext(RouterCtx);
  if (!r) throw new Error("Router missing");
  return r;
}
