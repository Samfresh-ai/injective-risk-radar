import { getRiskTone, riskLevelToLabel } from "@/lib/format";
import type { RiskLevel, RiskMetrics } from "@/types";
import { StatusBadge } from "./StatusBadge";

type RiskScoreCardProps = {
  metrics: RiskMetrics;
};

const riskCopy: Record<RiskLevel, string> = {
  critical: "Portfolio is close to severe risk thresholds.",
  high: "Material risk signals detected.",
  low: "Portfolio risk appears controlled.",
  medium: "Some exposure needs monitoring."
};

const scoreAccent: Record<RiskLevel, string> = {
  critical: "bg-rose-500",
  high: "bg-red-500",
  low: "bg-emerald-500",
  medium: "bg-amber-400"
};

export function RiskScoreCard({ metrics }: RiskScoreCardProps) {
  const tone = getRiskTone(metrics.riskLevel);
  const scoreWidth = Math.max(4, Math.min(100, metrics.healthScore));

  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={"absolute inset-x-0 top-0 h-1 " + scoreAccent[metrics.riskLevel]} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Health score
            </p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-7xl font-semibold leading-none tracking-normal text-slate-950">
                {metrics.healthScore}
              </span>
              <span className="pb-2 text-lg text-slate-400">/100</span>
            </div>
          </div>
          <StatusBadge className={tone.className}>{riskLevelToLabel(metrics.riskLevel)}</StatusBadge>
        </div>

        <div className="mt-6 h-2 rounded-full bg-slate-100">
          <div
            className={"h-2 rounded-full transition-all duration-500 " + scoreAccent[metrics.riskLevel]}
            style={{ width: scoreWidth + "%" }}
          />
        </div>

        <div className="mt-5">
          <p className="text-lg font-semibold text-slate-950">{tone.label} risk</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{riskCopy[metrics.riskLevel]}</p>
        </div>
      </div>
    </section>
  );
}
