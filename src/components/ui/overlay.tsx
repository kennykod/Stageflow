"use client";

import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import * as M from "@radix-ui/react-dropdown-menu";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { create } from "zustand";

// ---------------------------------------------------------------------------
// Dialog (centered) & Sheet (side / bottom on mobile)
// ---------------------------------------------------------------------------
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  wide,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[#0b1020]/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <D.Content
          className={cn(
            "fixed inset-x-3 bottom-3 z-50 flex max-h-[min(88dvh,820px)] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-lift)] outline-none data-[state=open]:animate-pop sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2",
            wide ? "sm:max-w-3xl" : "sm:max-w-lg",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
            <div>
              <D.Title className="font-display text-xl font-medium text-ink">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-ink-3">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">Dialog</D.Description>
              )}
            </div>
            <D.Close asChild>
              <button className="-mt-1 -mr-2 rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Stäng">
                <X className="size-5" />
              </button>
            </D.Close>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2/50 px-6 py-4">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[#0b1020]/30 data-[state=open]:animate-fade-in" />
        <D.Content
          style={{ ["--w" as string]: `${width}px` }}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl border border-line bg-surface shadow-[var(--shadow-lift)] outline-none data-[state=open]:animate-slide-up sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[var(--w)] sm:max-w-[100vw] sm:rounded-none sm:rounded-l-3xl sm:data-[state=open]:animate-slide-in-right"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
            <div className="min-w-0">
              <D.Title className="font-display text-xl font-medium text-ink">{title}</D.Title>
              {description ? (
                <D.Description asChild>
                  <div className="mt-1 text-sm text-ink-3">{description}</div>
                </D.Description>
              ) : (
                <D.Description className="sr-only">Panel</D.Description>
              )}
            </div>
            <D.Close asChild>
              <button className="-mr-2 rounded-lg p-2 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Stäng">
                <X className="size-5" />
              </button>
            </D.Close>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-6 pb-6">{children}</div>
          {footer && <div className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

// ---------------------------------------------------------------------------
// Dropdown menu
// ---------------------------------------------------------------------------
export const Menu = M.Root;
export const MenuTrigger = M.Trigger;
export function MenuContent({ children, align = "end", className }: { children: React.ReactNode; align?: "start" | "end" | "center"; className?: string }) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        className={cn("z-50 min-w-[220px] rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)] data-[state=open]:animate-pop", className)}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}
export function MenuItem({ children, onSelect, className, danger }: { children: React.ReactNode; onSelect?: () => void; className?: string; danger?: boolean }) {
  return (
    <M.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink outline-none select-none data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-ink-3",
        danger && "text-bad [&_svg]:text-bad",
        className,
      )}
    >
      {children}
    </M.Item>
  );
}
export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <M.Label className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{children}</M.Label>;
}
export function MenuSeparator() {
  return <M.Separator className="my-1 h-px bg-line" />;
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
interface Toast {
  id: number;
  title: string;
  body?: string;
  tone?: "ok" | "info" | "warn";
  action?: { label: string; onClick: () => void };
}
const useToasts = create<{ toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), t.action ? 7000 : 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (t: Omit<Toast, "id">) => useToasts.getState().push(t);

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:top-auto sm:right-5 sm:bottom-5 sm:left-auto sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-lift)]"
        >
          <span
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", t.tone === "warn" ? "bg-warn" : t.tone === "info" ? "bg-info" : "bg-ok")}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink">{t.title}</div>
            {t.body && <div className="mt-0.5 text-[13px] text-ink-3">{t.body}</div>}
          </div>
          {t.action && (
            <button
              className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-semibold text-accent hover:bg-accent-soft"
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="shrink-0 rounded-md p-1 text-ink-3 hover:text-ink" aria-label="Stäng notis" onClick={() => dismiss(t.id)}>
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
