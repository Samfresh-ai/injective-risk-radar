import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "critical";
};

const toneClasses = {
  critical: "border-rose-200 bg-rose-50",
  danger: "border-red-200 bg-red-50",
  neutral: "border-slate-200 bg-white",
  success: "border-emerald-200 bg-emerald-50",
  warning: "border-amber-200 bg-amber-50"
};

export function MetricCard({ detail, label, tone = "neutral", value }: MetricCardProps) {
  return (
    <article className={"min-h-[132px] min-w-0 rounded-lg border p-4 " + toneClasses[tone]}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="mt-3 break-words text-[1.35rem] font-semibold leading-tight tracking-normal text-slate-950 sm:text-2xl">
        {value}
      </div>
      <p className="mt-3 text-sm leading-5 text-slate-500">{detail}</p>
    </article>
  );
}
