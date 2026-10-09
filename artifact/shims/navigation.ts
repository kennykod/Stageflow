// Stand-in for next/navigation in the standalone artifact build.
import { useMemo } from "react";
import { useRouterState } from "../router-context";

export function useRouter() {
  const r = useRouterState();
  return useMemo(
    () => ({
      push: (to: string) => r.navigate(to),
      replace: (to: string, _opts?: unknown) => r.navigate(to, { replace: true }),
      back: () => r.back(),
      refresh: () => {},
      prefetch: () => {},
      forward: () => {},
    }),
    [r],
  );
}

export function usePathname() {
  return useRouterState().pathname;
}

export function useSearchParams() {
  const { search } = useRouterState();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return useRouterState().params as T;
}

export function notFound(): never {
  throw new Error("not found");
}
