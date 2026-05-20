import { MetricCard } from "./MetricCard";
import { formatLeverage, formatPct, formatSignedUsd, formatUsd, pnlClassName } from "@/lib/format";
import type { RiskMetrics, NormalizedBalance } from "@/types";

type MetricsGridProps = {
  balances: NormalizedBalance[];
  metrics: RiskMetrics;
};

export function MetricsGrid({ balances, metrics }: MetricsGridProps) {
  const unknownBalanceCount = balances.filter((balance) => balance.valueUsd === null).length;
  const leverageTone = leverageToTone(metrics.leverageRatio);
  const liquidationTone = liquidationToTone(metrics.worstLiquidationDistancePct);
  const concentrationTone = concentrationToTone(metrics.maxConcentrationPct);
  const pnlTone = metrics.unrealizedPnlUsd < 0 ? "danger" : "success";

  return (
    <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      <MetricCard
        detail={
          unknownBalanceCount > 0
            ? unknownBalanceCount + " balance values could not be inferred."
            : "Known balance and margin value from the scan."
        }
        label="Known Value"
        value={formatUsd(metrics.totalKnownValueUsd)}
      />
      <MetricCard
        detail={leverageTone.detail}
        label="Leverage"
        tone={leverageTone.tone}
        value={formatLeverage(metrics.leverageRatio)}
      />
      <MetricCard
        detail={liquidationTone.detail}
        label="Liquidation Risk"
        tone={liquidationTone.tone}
        value={
          metrics.worstLiquidationDistancePct === null
            ? "No liquidation data"
            : formatPct(metrics.worstLiquidationDistancePct)
        }
      />
      <MetricCard
        detail={concentrationTone.detail}
        label="Concentration"
        tone={concentrationTone.tone}
        value={formatPct(metrics.maxConcentrationPct)}
      />
      <MetricCard
        detail={metrics.unrealizedPnlPct === null ? "No realized percentage context." : formatPct(metrics.unrealizedPnlPct)}
        label="Unrealized PnL"
        tone={pnlTone}
        value={<span className={pnlClassName(metrics.unrealizedPnlUsd)}>{formatSignedUsd(metrics.unrealizedPnlUsd)}</span>}
      />
    </section>
  );
}

function leverageToTone(value: number): { tone: "neutral" | "success" | "warning" | "danger" | "critical"; detail: string } {
  if (value <= 1) {
    return { detail: "Unlevered / low leverage", tone: "success" };
  }
  if (value <= 3) {
    return { detail: "Moderate", tone: "neutral" };
  }
  if (value <= 5) {
    return { detail: "Elevated", tone: "warning" };
  }
  return { detail: "Aggressive", tone: "critical" };
}

function liquidationToTone(value: number | null): { tone: "neutral" | "success" | "warning" | "danger" | "critical"; detail: string } {
  if (value === null) {
    return { detail: "No liquidation data", tone: "neutral" };
  }
  if (value < 5) {
    return { detail: "Critical buffer below 5%", tone: "critical" };
  }
  if (value < 10) {
    return { detail: "High risk buffer below 10%", tone: "danger" };
  }
  if (value < 20) {
    return { detail: "Medium risk buffer below 20%", tone: "warning" };
  }
  return { detail: "More room before liquidation", tone: "success" };
}

function concentrationToTone(value: number): { tone: "neutral" | "success" | "warning" | "danger" | "critical"; detail: string } {
  if (value >= 70) {
    return { detail: "Largest exposure dominates the wallet.", tone: "critical" };
  }
  if (value >= 50) {
    return { detail: "Large single-asset or market exposure.", tone: "danger" };
  }
  if (value >= 35) {
    return { detail: "Moderate concentration exposure.", tone: "warning" };
  }
  return { detail: "Exposure is comparatively distributed.", tone: "success" };
}
