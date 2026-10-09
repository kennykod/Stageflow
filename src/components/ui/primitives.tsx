"use client";

import * as React from "react";
import { cn, initials } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "soft" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover shadow-[var(--shadow-soft)]",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2 shadow-[var(--shadow-soft)]",
  outline: "border border-line-strong text-ink hover:bg-surface-2",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-2",
  soft: "bg-accent-soft text-accent hover:brightness-[0.97] dark:hover:brightness-110",
  danger: "bg-bad text-white hover:brightness-95 dark:text-[#1a0d0b]",
};
const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium transition-[background,color,border,box-shadow,transform,filter] duration-150 select-none active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]", className)} {...props} />;
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[13px] font-semibold tracking-wide text-ink-3 uppercase">{children}</h2>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
type Tone = "neutral" | "ok" | "warn" | "bad" | "info" | "accent" | "gold" | "prod";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  ok: "bg-ok-soft text-ok border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  bad: "bg-bad-soft text-bad border-transparent",
  info: "bg-info-soft text-info border-transparent",
  accent: "bg-accent-soft text-accent border-transparent",
  gold: "bg-gold-soft text-gold border-transparent",
  prod: "bg-[var(--pc-soft)] text-[var(--pc)] border-transparent",
};
export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] leading-[18px] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
export function Avatar({ name, hue, size = 32, className, ring }: { name: string; hue: number; size?: number; className?: string; ring?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none", ring && "ring-2 ring-surface", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.36),
        background: `hsl(${hue} 45% 88%)`,
        color: `hsl(${hue} 45% 26%)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people, max = 5, size = 26 }: { people: { id: string; name: string; hue: number }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5" aria-label={`${people.length} personer`}>
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} hue={p.hue} size={size} ring />
      ))}
      {rest > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold text-ink-2 ring-2 ring-surface"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Checkbox (tri-state, native input for full a11y)
// ---------------------------------------------------------------------------
export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  className,
  id,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  const on = checked || indeterminate;
  return (
    <span className={cn("relative inline-flex size-[18px] shrink-0", className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        disabled={disabled}
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-line-strong bg-surface transition-colors checked:border-accent checked:bg-accent indeterminate:border-accent indeterminate:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
      />
      {on && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-accent-ink">
          {checked ? <Check className="size-3.5" strokeWidth={3} /> : <Minus className="size-3.5" strokeWidth={3} />}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Switch
// ---------------------------------------------------------------------------
export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-accent" : "bg-surface-3 border border-line-strong",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-surface shadow transition-transform dark:bg-canvas",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-xl bg-surface-2 p-1", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-all [&_svg]:size-4",
              size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-8 px-3 text-[13px]",
              active ? "bg-surface text-ink shadow-[var(--shadow-soft)]" : "text-ink-3 hover:text-ink",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form fields
// ---------------------------------------------------------------------------
export function Field({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 transition-colors hover:border-line-strong focus:border-ring focus:outline-none focus:ring-3 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(inputBase, "h-10", className)} {...p} />;
});

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputBase,
        "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7080%22 stroke-width=%222.5%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8",
        className,
      )}
      {...p}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-[84px] py-2.5 leading-relaxed", className)} {...p} />;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1 font-sans text-[11px] text-ink-3">
      {children}
    </kbd>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-3 [&_svg]:size-6">{icon}</div>
      <h3 className="font-display text-lg font-medium text-ink">{title}</h3>
      {children && <div className="mt-1.5 max-w-sm text-sm text-ink-3">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone = "ok", className, label }: { value: number; tone?: "ok" | "warn" | "bad" | "accent"; className?: string; label?: string }) {
  const color = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", accent: "bg-accent" }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

/** Small label used to be honest about simulated / future features. */
export function DemoTag({ kind = "simulerad", className }: { kind?: "simulerad" | "framtida" | "experimentell" | "demo"; className?: string }) {
  const map = {
    simulerad: { t: "Simulerad", c: "bg-gold-soft text-gold" },
    framtida: { t: "Framtida", c: "bg-surface-3 text-ink-2" },
    experimentell: { t: "Experimentell", c: "bg-info-soft text-info" },
    demo: { t: "Demodata", c: "bg-gold-soft text-gold" },
  }[kind];
  return <span className={cn("inline-flex items-center rounded-md px-1.5 py-px text-[10.5px] font-semibold tracking-wide uppercase", map.c, className)}>{map.t}</span>;
}
