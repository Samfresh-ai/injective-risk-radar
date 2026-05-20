export type SupportedNetwork = "mainnet" | "testnet";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type NormalizedBalance = {
  denom: string;
  symbol: string;
  amount: number;
  valueUsd: number | null;
  source: "bank" | "subaccount";
};

export type NormalizedPosition = {
  marketId: string;
  ticker: string;
  direction: "long" | "short" | string;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  liquidationPrice: number | null;
  margin: number;
  notional: number;
  leverage: number;
  unrealizedPnl: number;
  fundingRate: number | null;
  liquidationDistancePct: number | null;
};

export type LiquidationDistance = {
  market: string;
  distancePct: number;
  liquidationPrice: number;
  currentPrice: number;
  side: string;
};

export type NormalizedOrder = {
  marketId: string;
  ticker: string;
  marketType: "spot" | "derivative";
  side: string;
  price: number;
  quantity: number;
  notional: number;
  reduceOnly?: boolean;
};

export type RiskMetrics = {
  totalKnownValueUsd: number;
  totalNotionalUsd: number;
  totalMarginUsd: number;
  leverageRatio: number;
  concentrationRisk: number;
  maxConcentrationPct: number;
  liquidationDistances: LiquidationDistance[];
  topRisk: LiquidationDistance | "no open positions" | null;
  worstLiquidationDistancePct: number | null;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number | null;
  healthScore: number;
  riskLevel: RiskLevel;
};

export type PortfolioSummary = {
  totalValue: number;
  totalNotional: number;
  totalMargin: number;
  balanceValue: number;
  unrealizedPnl: number;
};

export type PortfolioResponse = {
  wallet: string;
  network: SupportedNetwork;
  fetchedAt: string;
  balances: NormalizedBalance[];
  positions: NormalizedPosition[];
  orders: NormalizedOrder[];
  portfolio: PortfolioSummary;
  metrics: RiskMetrics;
  warnings: string[];
};

export type AIAnalysis = {
  summary: string;
  riskLevel: RiskLevel;
  keyRisks: string[];
  rebalancingSuggestions: string[];
  watchItems: string[];
  confidence: "low" | "medium" | "high";
  disclaimer: string;
};
