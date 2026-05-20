import type { ReactNode } from "react";

type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "critical" | "info";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700"
};

export function StatusBadge({ children, tone = "neutral", className = "" }: StatusBadgeProps) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] " +
        toneClasses[tone] +
        " " +
        className
      }
    >
      {children}
    </span>
  );
}
