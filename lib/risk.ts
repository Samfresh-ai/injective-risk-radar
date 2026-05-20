import type {
  LiquidationDistance,
  NormalizedBalance,
  NormalizedOrder,
  NormalizedPosition,
  RiskLevel,
  RiskMetrics
} from "@/types";

export function safeNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : 0;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return 0;
    }

    const parsed = Number(trimmed.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function nullableNumber(value: unknown): number | null {
  const parsed = safeNumber(value);
  return parsed > 0 ? parsed : null;
}

export function calculateLiquidationDistancePct(
  markPrice: number,
  liquidationPrice: number | null
): number | null {
  if (markPrice > 0 && liquidationPrice !== null && liquidationPrice > 0) {
    return Math.abs((markPrice - liquidationPrice) / markPrice) * 100;
  }

  return null;
}

export function calculateRiskMetrics(
  balances: NormalizedBalance[],
  positions: NormalizedPosition[],
  orders: NormalizedOrder[]
): RiskMetrics {
  const knownBalanceValue = balances.reduce((sum, balance) => {
    return sum + (balance.valueUsd !== null ? safeNumber(balance.valueUsd) : 0);
  }, 0);
  const totalMarginUsd = positions.reduce((sum, position) => sum + safeNumber(position.margin), 0);
  const unrealizedPnlUsd = positions.reduce(
    (sum, position) => sum + safeNumber(position.unrealizedPnl),
    0
  );
  const positionNotional = positions.reduce(
    (sum, position) => sum + safeNumber(position.notional),
    0
  );
  const orderNotional = orders.reduce((sum, order) => sum + safeNumber(order.notional), 0);
  const totalKnownValueUsd = Math.max(0, knownBalanceValue + totalMarginUsd + unrealizedPnlUsd);
  const totalNotionalUsd = positionNotional + orderNotional;
  const leverageRatio = totalMarginUsd > 0 ? positionNotional / totalMarginUsd : 0;
  const liquidationDistances = buildLiquidationDistances(positions);
  const worstLiquidationDistancePct =
    liquidationDistances.length > 0
      ? Math.min(...liquidationDistances.map((distance) => distance.distancePct))
      : null;
  const topRisk =
    positions.length === 0
      ? "no open positions"
      : [...liquidationDistances].sort((a, b) => a.distancePct - b.distancePct)[0] ?? null;
  const concentrationRisk = calculateConcentrationRisk(balances, positions);
  const maxConcentrationPct = concentrationRisk * 100;
  const unrealizedPnlPct =
    totalKnownValueUsd > 0 ? (unrealizedPnlUsd / totalKnownValueUsd) * 100 : null;
  const healthScore = calculateHealthScore({
    hasOpenPositions: positions.length > 0,
    leverageRatio,
    concentrationRisk,
    worstLiquidationDistancePct
  });

  return {
    totalKnownValueUsd,
    totalNotionalUsd,
    totalMarginUsd,
    leverageRatio,
    concentrationRisk,
    maxConcentrationPct,
    liquidationDistances,
    topRisk,
    worstLiquidationDistancePct,
    unrealizedPnlUsd,
    unrealizedPnlPct,
    healthScore,
    riskLevel: riskLevelFromScore(healthScore)
  };
}

function buildLiquidationDistances(positions: NormalizedPosition[]): LiquidationDistance[] {
  return positions
    .map((position) => {
      const distancePct = calculateLiquidationDistancePct(
        position.markPrice,
        position.liquidationPrice
      );

      if (distancePct === null || position.liquidationPrice === null) {
        return null;
      }

      return {
        market: position.ticker || position.marketId,
        distancePct,
        liquidationPrice: position.liquidationPrice,
        currentPrice: position.markPrice,
        side: position.direction
      };
    })
    .filter((distance): distance is LiquidationDistance => distance !== null);
}

function calculateConcentrationRisk(
  balances: NormalizedBalance[],
  positions: NormalizedPosition[]
) {
  const buckets = new Map<string, number>();

  for (const position of positions) {
    addBucket(buckets, position.ticker || position.marketId, safeNumber(position.notional));
  }

  for (const balance of balances) {
    if (balance.valueUsd !== null) {
      addBucket(buckets, balance.symbol || balance.denom, safeNumber(balance.valueUsd));
    }
  }

  const totalExposure = Array.from(buckets.values()).reduce((sum, value) => sum + value, 0);

  if (totalExposure <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, Math.max(...buckets.values()) / totalExposure));
}

function calculateHealthScore({
  hasOpenPositions,
  leverageRatio,
  concentrationRisk,
  worstLiquidationDistancePct
}: Pick<RiskMetrics, "leverageRatio" | "concentrationRisk" | "worstLiquidationDistancePct"> & {
  hasOpenPositions: boolean;
}) {
  if (!hasOpenPositions) {
    return 85;
  }

  const leverageScore = clampScore(100 - (leverageRatio - 1) * 12);
  const liqScore =
    worstLiquidationDistancePct === null
      ? 50
      : clampScore(((worstLiquidationDistancePct - 2) / 28) * 100);
  const concentScore = clampScore(((0.8 - concentrationRisk) / 0.6) * 100);

  return clampScore(Math.round(0.4 * leverageScore + 0.4 * liqScore + 0.2 * concentScore));
}

function riskLevelFromScore(healthScore: number): RiskLevel {
  if (healthScore >= 80) {
    return "low";
  }

  if (healthScore >= 60) {
    return "medium";
  }

  if (healthScore >= 40) {
    return "high";
  }

  return "critical";
}

function addBucket(buckets: Map<string, number>, key: string, value: number) {
  if (value <= 0) {
    return;
  }

  buckets.set(key, (buckets.get(key) ?? 0) + value);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}
