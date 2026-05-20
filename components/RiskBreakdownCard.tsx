import { formatLeverage, formatPct } from "@/lib/format";
import type { RiskMetrics } from "@/types";
import { StatusBadge } from "./StatusBadge";

type RiskBreakdownCardProps = {
  metrics: RiskMetrics;
};

type Severity = "low" | "medium" | "high" | "critical" | "unknown";

export function RiskBreakdownCard({ metrics }: RiskBreakdownCardProps) {
  const rows = [
    leveragePressure(metrics.leverageRatio),
    liquidationPressure(metrics.worstLiquidationDistancePct),
    concentrationPressure(metrics.maxConcentrationPct),
    pnlPressure(metrics.unrealizedPnlPct)
  ];

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Score drivers
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-50">Risk breakdown</h2>
        </div>
        <StatusBadge tone="neutral">{metrics.healthScore}/100</StatusBadge>
      </div>

      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-100">{row.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{row.explanation}</p>
              </div>
              <StatusBadge tone={severityTone(row.severity)}>{row.severity}</StatusBadge>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-800">
              <div
                className={"h-1.5 rounded-full " + severityBar(row.severity)}
                style={{ width: row.width + "%" }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function leveragePressure(value: number) {
  const severity: Severity = value <= 1 ? "low" : value <= 3 ? "medium" : value <= 5 ? "high" : "critical";
  return {
    explanation: formatLeverage(value) + " leverage ratio across open positions.",
    label: "Leverage pressure",
    severity,
    width: clamp(value * 16)
  };
}

function liquidationPressure(value: number | null) {
  if (value === null) {
    return {
      explanation: "No liquidation distance was returned for open positions.",
      label: "Liquidation pressure",
      severity: "unknown" as Severity,
      width: 35
    };
  }

  const severity: Severity = value < 5 ? "critical" : value < 10 ? "high" : value < 20 ? "medium" : "low";
  return {
    explanation: "Closest liquidation buffer is " + formatPct(value) + ".",
    label: "Liquidation pressure",
    severity,
    width: clamp(100 - value * 3)
  };
}

function concentrationPressure(value: number) {
  const severity: Severity = value >= 70 ? "critical" : value >= 50 ? "high" : value >= 35 ? "medium" : "low";
  return {
    explanation: "Largest known exposure is " + formatPct(value) + " of the tracked portfolio.",
    label: "Concentration pressure",
    severity,
    width: clamp(value)
  };
}

function pnlPressure(value: number | null) {
  const severity: Severity =
    value === null || value >= 0 ? "low" : value <= -20 ? "critical" : value <= -10 ? "high" : value <= -5 ? "medium" : "low";
  return {
    explanation: value === null ? "No PnL percentage context available." : "Unrealized PnL is " + formatPct(value) + ".",
    label: "PnL pressure",
    severity,
    width: value === null ? 12 : clamp(Math.abs(value) * 4)
  };
}

function severityTone(severity: Severity) {
  if (severity === "critical") return "critical";
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  if (severity === "unknown") return "neutral";
  return "success";
}

function severityBar(severity: Severity) {
  if (severity === "critical") return "bg-rose-400";
  if (severity === "high") return "bg-red-400";
  if (severity === "medium") return "bg-amber-300";
  if (severity === "unknown") return "bg-slate-500";
  return "bg-emerald-300";
}

function clamp(value: number) {
  return Math.max(8, Math.min(100, value));
}
