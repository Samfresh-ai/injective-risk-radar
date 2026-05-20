import { formatLeverage, formatPct, formatUsd, getRiskTone, riskLevelToLabel } from "@/lib/format";
import type { RiskMetrics } from "@/types";
import { StatusBadge } from "./StatusBadge";

type AIAnalysisPanelProps = {
  analysis: string;
  loading: boolean;
  error: string | null;
  metrics: RiskMetrics;
};

export function AIAnalysisPanel({ analysis, error, loading, metrics }: AIAnalysisPanelProps) {
  if (loading && !analysis) {
    return (
      <section className="rounded-xl border border-emerald-400/20 bg-slate-950 p-5 shadow-2xl shadow-black/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              AI risk report
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-50">
              Claude is reviewing risk posture...
            </h2>
          </div>
          <StatusBadge tone="success">Loading</StatusBadge>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-3 w-11/12 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-8/12 animate-pulse rounded bg-slate-800" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-5">
        <StatusBadge tone="warning">AI analysis unavailable</StatusBadge>
        <h2 className="mt-3 text-lg font-semibold text-amber-50">AI analysis unavailable</h2>
        <p className="mt-2 text-sm leading-6 text-amber-100/80">
          Deterministic risk metrics are still available. Retry the scan if you need an AI narrative.
        </p>
      </section>
    );
  }

  if (!analysis && !loading) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <p className="text-sm text-slate-500">AI analysis will appear after portfolio metrics load.</p>
      </section>
    );
  }

  const sections = buildAnalysisSections(analysis, metrics);
  const tone = getRiskTone(metrics.riskLevel);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            AI risk report
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-50">Risk posture review</h2>
        </div>
        <StatusBadge className={tone.className}>{riskLevelToLabel(metrics.riskLevel)}</StatusBadge>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-300">{sections.summary}</p>

      <div className="mt-5 grid gap-4">
        <AnalysisList label="Key risks" items={sections.keyRisks} />
        <AnalysisList label="Rebalancing suggestions" items={sections.suggestions} />
        <AnalysisList label="Watch items" items={sections.watchItems} />
      </div>

      <p className="mt-5 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">
        {sections.disclaimer}
      </p>
    </section>
  );
}

function AnalysisList({ items, label }: { items: string[]; label: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm leading-5 text-slate-300" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildAnalysisSections(analysis: string, metrics: RiskMetrics) {
  const clean = analysis.replace(/\s+/g, " ").trim();
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
  const summary = sentences.slice(0, 2).join(" ") || clean;
  const riskSentences = sentences.filter((sentence) =>
    /risk|liquidation|leverage|concentration|PnL|exposure|buffer/i.test(sentence)
  );
  const suggestionSentences = sentences.filter((sentence) =>
    /reduce|rebalance|hedge|consider|action|keep enough|monitor/i.test(sentence)
  );

  return {
    disclaimer: "Informational risk analysis only. No trading, execution, or financial advice.",
    keyRisks: unique([
      ...riskSentences.slice(0, 3),
      "Health score " + metrics.healthScore + "/100 with " + formatLeverage(metrics.leverageRatio) + " leverage.",
      metrics.worstLiquidationDistancePct === null
        ? "No liquidation distance was available for the current positions."
        : "Closest liquidation buffer is " + formatPct(metrics.worstLiquidationDistancePct) + "."
    ]).slice(0, 4),
    suggestions: unique([
      ...suggestionSentences.slice(0, 2),
      metrics.worstLiquidationDistancePct !== null && metrics.worstLiquidationDistancePct < 20
        ? "Review or reduce the nearest liquidation exposure before adding size."
        : "Keep enough stable balance available before increasing directional exposure.",
      metrics.maxConcentrationPct >= 50
        ? "Consider reducing the dominant exposure or offsetting it with more liquid reserves."
        : "Maintain a watch on concentration if new orders fill."
    ]).slice(0, 4),
    summary,
    watchItems: unique([
      "Unrealized PnL: " + formatUsd(metrics.unrealizedPnlUsd) + ".",
      "Concentration exposure: " + formatPct(metrics.maxConcentrationPct) + ".",
      "Refresh after any order fill or position size change."
    ])
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
