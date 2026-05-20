import {
  IndexerGrpcAccountPortfolioApi,
  IndexerGrpcDerivativesApi,
  IndexerGrpcOracleApi,
  IndexerGrpcSpotApi,
  derivativeMarginFromChainMarginToFixed,
  derivativePriceFromChainPriceToFixed,
  derivativeQuantityFromChainQuantityToFixed,
  getDefaultSubaccountId,
  spotPriceFromChainPriceToFixed,
  spotQuantityFromChainQuantityToFixed,
  type AccountPortfolioV2,
  type DerivativeLimitOrder,
  type DerivativeMarket,
  type FundingRate,
  type OrderbookWithSequence,
  type Position,
  type SpotLimitOrder,
  type SpotMarket
} from "@injectivelabs/sdk-ts";
import {
  Network,
  getNetworkEndpoints,
  type Network as InjectiveNetwork
} from "@injectivelabs/networks";
import type {
  NormalizedBalance,
  NormalizedOrder,
  NormalizedPosition,
  PortfolioResponse,
  SupportedNetwork
} from "@/types";
import {
  calculateLiquidationDistancePct,
  calculateRiskMetrics,
  nullableNumber,
  safeNumber
} from "./risk";

const ORDER_PAGE_LIMIT = 20;
const POSITION_PAGE_LIMIT = 50;
const FUNDING_PAGE_LIMIT = 1;
const INJ_DECIMALS = 18;

type TokenMeta = {
  symbol: string;
  decimals: number;
};

type RawPosition = {
  position: PositionLike;
  unrealizedPnl: unknown;
  hasUpnl: boolean;
};

type PositionLike = {
  marketId: string;
  subaccountId: string;
  direction: unknown;
  quantity: unknown;
  entryPrice: unknown;
  margin: unknown;
  liquidationPrice: unknown;
  markPrice: unknown;
  ticker?: string;
};

type RawBalance = {
  denom: string;
  amount: unknown;
  source: "bank" | "subaccount";
};

type Clients = {
  portfolio: IndexerGrpcAccountPortfolioApi;
  derivatives: IndexerGrpcDerivativesApi;
  spot: IndexerGrpcSpotApi;
  oracle: IndexerGrpcOracleApi;
};

export function isValidInjectiveAddress(address: string) {
  return /^inj1[0-9a-z]{38,58}$/.test(address.trim());
}

export function normalizeNetwork(value: string | null | undefined): SupportedNetwork | null {
  if (value === "mainnet" || value === "testnet") {
    return value;
  }

  return null;
}

export function defaultNetwork(): SupportedNetwork {
  return normalizeNetwork(process.env.INJECTIVE_NETWORK) ?? "mainnet";
}

export async function fetchInjectivePortfolio(
  wallet: string,
  network: SupportedNetwork
): Promise<PortfolioResponse> {
  const address = wallet.trim();
  const warnings: string[] = [];
  const clients = createClients(network);
  logSdkCall("IndexerGrpcAccountPortfolioApi.fetchAccountPortfolio", { address, network });
  const accountPortfolio = await clients.portfolio.fetchAccountPortfolio(address);
  const subaccountIds = discoverSubaccounts(address, accountPortfolio);
  const marketState = await fetchMarketState(clients, warnings);
  const rawBalances = extractBalances(accountPortfolio);
  const rawPositions = await fetchRawPositions(clients, address, accountPortfolio, subaccountIds, warnings);
  const [spotOrders, derivativeOrders] = await Promise.all([
    fetchSpotOrders(clients, subaccountIds, warnings),
    fetchDerivativeOrders(clients, subaccountIds, warnings)
  ]);
  const derivativeMarketIds = new Set<string>();

  for (const rawPosition of rawPositions) {
    derivativeMarketIds.add(rawPosition.position.marketId);
  }

  for (const order of derivativeOrders) {
    derivativeMarketIds.add(order.marketId);
  }

  await enrichDerivativeMarkets(clients, marketState.derivativeMarketsById, derivativeMarketIds, warnings);
  const fundingRates = await fetchFundingRates(clients, derivativeMarketIds, warnings);
  const balances = await normalizeBalances(clients, rawBalances, marketState, warnings);
  const positions = await normalizePositions(
    clients,
    rawPositions,
    marketState.derivativeMarketsById,
    fundingRates,
    warnings
  );
  const orders = [
    ...normalizeSpotOrders(spotOrders, marketState.spotMarketsById),
    ...normalizeDerivativeOrders(derivativeOrders, marketState.derivativeMarketsById)
  ];
  const metrics = calculateRiskMetrics(balances, positions, orders);
  const portfolio = {
    totalValue: metrics.totalKnownValueUsd,
    totalNotional: metrics.totalNotionalUsd,
    totalMargin: metrics.totalMarginUsd,
    balanceValue: Math.max(
      0,
      balances.reduce((sum, balance) => sum + (balance.valueUsd ?? 0), 0)
    ),
    unrealizedPnl: metrics.unrealizedPnlUsd
  };

  if (subaccountIds.length === 0) {
    warnings.push("No subaccounts were discovered for this wallet.");
  }

  if (positions.some((position) => position.liquidationDistancePct === null)) {
    warnings.push("Some positions are missing mark or liquidation prices, so liquidation distance is incomplete.");
  }

  return {
    wallet: address,
    network,
    fetchedAt: new Date().toISOString(),
    balances,
    positions,
    orders,
    portfolio,
    metrics,
    warnings: Array.from(new Set(warnings))
  };
}

function createClients(network: SupportedNetwork): Clients {
  const endpoint = getNetworkEndpoints(toSdkNetwork(network)).indexer;

  return {
    portfolio: new IndexerGrpcAccountPortfolioApi(endpoint),
    derivatives: new IndexerGrpcDerivativesApi(endpoint),
    spot: new IndexerGrpcSpotApi(endpoint),
    oracle: new IndexerGrpcOracleApi(endpoint)
  };
}

function toSdkNetwork(network: SupportedNetwork): InjectiveNetwork {
  return network === "testnet" ? Network.Testnet : Network.Mainnet;
}

function discoverSubaccounts(address: string, portfolio: AccountPortfolioV2) {
  const subaccounts = new Set<string>();
  const defaultSubaccountId = getDefaultSubaccountId(address);

  if (defaultSubaccountId) {
    subaccounts.add(defaultSubaccountId);
  }

  for (const subaccount of portfolio.subaccountsList ?? []) {
    if (subaccount.subaccountId) {
      subaccounts.add(subaccount.subaccountId);
    }
  }

  return Array.from(subaccounts);
}

async function fetchMarketState(clients: Clients, warnings: string[]) {
  logSdkCall("IndexerGrpcSpotApi.fetchMarkets");
  logSdkCall("IndexerGrpcDerivativesApi.fetchMarkets");
  const [spotMarkets, derivativeMarkets] = await Promise.all([
    clients.spot.fetchMarkets().catch((error: unknown) => {
      warnings.push(`Spot markets could not be loaded: ${cleanError(error)}`);
      return [] as SpotMarket[];
    }),
    clients.derivatives.fetchMarkets().catch((error: unknown) => {
      warnings.push(`Derivative markets could not be loaded: ${cleanError(error)}`);
      return [] as DerivativeMarket[];
    })
  ]);
  const spotMarketsById = new Map(spotMarkets.map((market) => [market.marketId, market]));
  const derivativeMarketsById = new Map(
    derivativeMarkets.map((market) => [market.marketId, market])
  );
  const tokenMetaByDenom = buildTokenMetaByDenom(spotMarkets, derivativeMarkets);

  return {
    spotMarkets,
    derivativeMarkets,
    spotMarketsById,
    derivativeMarketsById,
    tokenMetaByDenom,
    orderbookByMarketId: new Map<string, OrderbookWithSequence | null>()
  };
}

function extractBalances(portfolio: AccountPortfolioV2): RawBalance[] {
  const balances: RawBalance[] = [];

  for (const coin of portfolio.bankBalancesList ?? []) {
    balances.push({
      denom: coin.denom,
      amount: coin.amount,
      source: "bank"
    });
  }

  for (const subaccount of portfolio.subaccountsList ?? []) {
    const amount = subaccount.deposit?.availableBalance ?? subaccount.deposit?.totalBalance;

    if (amount !== undefined) {
      balances.push({
        denom: subaccount.denom,
        amount,
        source: "subaccount"
      });
    }
  }

  return balances.filter((balance) => safeNumber(balance.amount) > 0);
}

async function fetchRawPositions(
  clients: Clients,
  address: string,
  portfolio: AccountPortfolioV2,
  subaccountIds: string[],
  warnings: string[]
): Promise<RawPosition[]> {
  const portfolioPositions = (portfolio.positionsWithUpnlList ?? [])
    .filter((entry) => entry.position)
    .map((entry) => ({
      position: entry.position as Position,
      unrealizedPnl: entry.unrealizedPnl,
      hasUpnl: true
    }));

  if (portfolioPositions.length > 0) {
    return portfolioPositions;
  }

  for (const subaccountId of subaccountIds) {
    logSdkCall("IndexerGrpcDerivativesApi.fetchPositions", { subaccountId: shorten(subaccountId) });
  }

  const positionResponses = await Promise.all(
    subaccountIds.map((subaccountId) =>
      clients.derivatives
        .fetchPositions({
          subaccountId,
          pagination: { limit: POSITION_PAGE_LIMIT }
        })
        .then((response) => response.positions)
        .catch((error: unknown) => {
          warnings.push(
            `Derivative positions could not be loaded for subaccount ${shorten(subaccountId)}: ${cleanError(error)}`
          );
          return [] as Position[];
        })
    )
  );
  const fallbackPositions = positionResponses.flat().map((position) => ({
    position,
    unrealizedPnl: 0,
    hasUpnl: false
  }));

  if (fallbackPositions.length > 0) {
    warnings.push("Position unrealized PnL was unavailable from portfolio data and is shown as 0.");
    return fallbackPositions;
  }

  logSdkCall("IndexerGrpcDerivativesApi.fetchPositionsV2", { address });
  const v2Positions = await clients.derivatives
    .fetchPositionsV2({
      address,
      pagination: { limit: POSITION_PAGE_LIMIT }
    })
    .then((response) => response.positions)
    .catch((error: unknown) => {
      warnings.push(`Derivative positions V2 could not be loaded: ${cleanError(error)}`);
      return [] as PositionLike[];
    });

  return v2Positions.map((position) => ({
    position,
    unrealizedPnl: "upnl" in position ? position.upnl : 0,
    hasUpnl: "upnl" in position
  }));
}

async function fetchSpotOrders(
  clients: Clients,
  subaccountIds: string[],
  warnings: string[]
): Promise<SpotLimitOrder[]> {
  for (const subaccountId of subaccountIds) {
    logSdkCall("IndexerGrpcSpotApi.fetchOrders", { subaccountId: shorten(subaccountId) });
  }

  const responses = await Promise.all(
    subaccountIds.map((subaccountId) =>
      clients.spot
        .fetchOrders({
          subaccountId,
          pagination: { limit: ORDER_PAGE_LIMIT }
        })
        .then((response) => response.orders)
        .catch((error: unknown) => {
          warnings.push(
            `Spot orders could not be loaded for subaccount ${shorten(subaccountId)}: ${cleanError(error)}`
          );
          return [] as SpotLimitOrder[];
        })
    )
  );

  return responses.flat();
}

async function fetchDerivativeOrders(
  clients: Clients,
  subaccountIds: string[],
  warnings: string[]
): Promise<DerivativeLimitOrder[]> {
  for (const subaccountId of subaccountIds) {
    logSdkCall("IndexerGrpcDerivativesApi.fetchOrders", { subaccountId: shorten(subaccountId) });
  }

  const responses = await Promise.all(
    subaccountIds.map((subaccountId) =>
      clients.derivatives
        .fetchOrders({
          subaccountId,
          pagination: { limit: ORDER_PAGE_LIMIT }
        })
        .then((response) => response.orders)
        .catch((error: unknown) => {
          warnings.push(
            `Derivative orders could not be loaded for subaccount ${shorten(subaccountId)}: ${cleanError(error)}`
          );
          return [] as DerivativeLimitOrder[];
        })
    )
  );

  return responses.flat();
}

async function enrichDerivativeMarkets(
  clients: Clients,
  marketMap: Map<string, DerivativeMarket>,
  marketIds: Set<string>,
  warnings: string[]
) {
  await Promise.all(
    Array.from(marketIds)
      .filter((marketId) => !marketMap.has(marketId))
      .map((marketId) =>
        clients.derivatives
          .fetchMarket(marketId)
          .then((market) => {
            marketMap.set(marketId, market);
          })
          .catch((error: unknown) => {
            warnings.push(`Derivative market ${shorten(marketId)} could not be loaded: ${cleanError(error)}`);
          })
      )
  );
}

async function fetchFundingRates(
  clients: Clients,
  marketIds: Set<string>,
  warnings: string[]
) {
  const fundingRatesByMarket = new Map<string, FundingRate>();

  await Promise.all(
    Array.from(marketIds).map((marketId) =>
      clients.derivatives
        .fetchFundingRates({
          marketId,
          pagination: { limit: FUNDING_PAGE_LIMIT }
        })
        .then((response) => {
          const [rate] = response.fundingRates;

          if (rate) {
            fundingRatesByMarket.set(marketId, rate);
          }
        })
        .catch((error: unknown) => {
          warnings.push(`Funding rate for ${shorten(marketId)} could not be loaded: ${cleanError(error)}`);
        })
    )
  );

  return fundingRatesByMarket;
}

async function normalizeBalances(
  clients: Clients,
  rawBalances: RawBalance[],
  marketState: Awaited<ReturnType<typeof fetchMarketState>>,
  warnings: string[]
): Promise<NormalizedBalance[]> {
  const balances = await Promise.all(
    rawBalances.map(async (rawBalance) => {
      const tokenMeta = marketState.tokenMetaByDenom.get(rawBalance.denom) ?? defaultTokenMeta(rawBalance.denom);
      const symbol = tokenMeta?.symbol ?? symbolFromDenom(rawBalance.denom);
      const amount = toDisplayAmount(rawBalance.amount, tokenMeta?.decimals ?? null);
      const valueUsd = await inferBalanceUsdValue(
        clients,
        rawBalance.denom,
        symbol,
        amount,
        marketState,
        warnings
      );

      return {
        denom: rawBalance.denom,
        symbol,
        amount,
        valueUsd,
        source: rawBalance.source
      };
    })
  );

  return balances.filter((balance) => balance.amount > 0);
}

async function inferBalanceUsdValue(
  clients: Clients,
  denom: string,
  symbol: string,
  amount: number,
  marketState: Awaited<ReturnType<typeof fetchMarketState>>,
  warnings: string[]
) {
  if (amount <= 0) {
    return 0;
  }

  if (isStableSymbol(symbol)) {
    return amount;
  }

  const marketMatch = findStableQuotedSpotMarket(denom, marketState.spotMarkets);

  if (!marketMatch) {
    warnings.push(`${symbol} balance value could not be inferred from a reliable stable-quoted spot market.`);
    return null;
  }

  const orderbook = await fetchOrderbook(clients, marketMatch.market.marketId, marketState, warnings);

  if (!orderbook) {
    warnings.push(`${symbol} balance value could not be inferred because no orderbook was available.`);
    return null;
  }

  const midPrice = topOfBookMid(orderbook, marketMatch.market);

  if (midPrice === null) {
    warnings.push(`${symbol} balance value could not be inferred because the orderbook had no usable top-of-book price.`);
    return null;
  }

  return marketMatch.denomRole === "base" ? amount * midPrice : amount / midPrice;
}

async function fetchOrderbook(
  clients: Clients,
  marketId: string,
  marketState: Awaited<ReturnType<typeof fetchMarketState>>,
  warnings: string[]
) {
  if (marketState.orderbookByMarketId.has(marketId)) {
    return marketState.orderbookByMarketId.get(marketId) ?? null;
  }

  try {
    logSdkCall("IndexerGrpcSpotApi.fetchOrderbookV2", { marketId: shorten(marketId) });
    const orderbook = await clients.spot.fetchOrderbookV2(marketId);
    marketState.orderbookByMarketId.set(marketId, orderbook);
    return orderbook;
  } catch (error) {
    warnings.push(`Spot orderbook ${shorten(marketId)} could not be loaded: ${cleanError(error)}`);
    marketState.orderbookByMarketId.set(marketId, null);
    return null;
  }
}

async function normalizePositions(
  clients: Clients,
  rawPositions: RawPosition[],
  marketMap: Map<string, DerivativeMarket>,
  fundingRates: Map<string, FundingRate>,
  warnings: string[]
): Promise<NormalizedPosition[]> {
  return Promise.all(
    rawPositions.map(async ({ position, unrealizedPnl }) => {
      const market = marketMap.get(position.marketId);
      const oracleMarkPrice = await fetchOracleMarkPriceIfNeeded(clients, position, market, warnings);
      const markPrice = safeNumber(position.markPrice) || oracleMarkPrice || 0;
      const liquidationPrice = nullableNumber(toDerivativePrice(position.liquidationPrice, market));
      const quantity = Math.abs(toDerivativeQuantity(position.quantity));
      const margin = toDerivativeMargin(position.margin, market);
      const notional = Math.abs(quantity * markPrice);
      const leverage = margin > 0 ? notional / margin : 0;
      const fundingRate = fundingRates.has(position.marketId)
        ? safeNumber(fundingRates.get(position.marketId)?.rate)
        : null;

      return {
        marketId: position.marketId,
        ticker: position.ticker || market?.ticker || shorten(position.marketId),
        direction: normalizeDirection(position.direction),
        quantity,
        entryPrice: toDerivativePrice(position.entryPrice, market),
        markPrice,
        liquidationPrice,
        margin,
        notional,
        leverage,
        unrealizedPnl: safeNumber(unrealizedPnl),
        fundingRate,
        liquidationDistancePct: calculateLiquidationDistancePct(markPrice, liquidationPrice)
      };
    })
  );
}

async function fetchOracleMarkPriceIfNeeded(
  clients: Clients,
  position: PositionLike,
  market: DerivativeMarket | undefined,
  warnings: string[]
) {
  if (safeNumber(position.markPrice) > 0 || !market || !hasOracleFields(market)) {
    return 0;
  }

  try {
    logSdkCall("IndexerGrpcOracleApi.fetchOraclePrice", { market: market.ticker });
    const response = await clients.oracle.fetchOraclePrice({
      baseSymbol: market.oracleBase,
      quoteSymbol: market.oracleQuote,
      oracleType: market.oracleType,
      oracleScaleFactor: market.oracleScaleFactor
    });

    return safeNumber(response.price);
  } catch (error) {
    warnings.push(`Oracle price for ${market.ticker} could not be loaded: ${cleanError(error)}`);
    return 0;
  }
}

function normalizeSpotOrders(
  orders: SpotLimitOrder[],
  marketMap: Map<string, SpotMarket>
): NormalizedOrder[] {
  return orders.map((order) => {
    const market = marketMap.get(order.marketId);
    const quantity = toSpotQuantity(order.unfilledQuantity || order.quantity, market);
    const price = toSpotPrice(order.price, market);

    return {
      marketId: order.marketId,
      ticker: market?.ticker ?? shorten(order.marketId),
      marketType: "spot",
      side: String(order.orderSide),
      price,
      quantity,
      notional: Math.abs(price * quantity)
    };
  });
}

function normalizeDerivativeOrders(
  orders: DerivativeLimitOrder[],
  marketMap: Map<string, DerivativeMarket>
): NormalizedOrder[] {
  return orders.map((order) => {
    const market = marketMap.get(order.marketId);
    const quantity = toDerivativeQuantity(order.unfilledQuantity || order.quantity);
    const price = toDerivativePrice(order.price, market);

    return {
      marketId: order.marketId,
      ticker: market?.ticker ?? shorten(order.marketId),
      marketType: "derivative",
      side: String(order.orderSide),
      price,
      quantity,
      notional: Math.abs(price * quantity),
      reduceOnly: order.isReduceOnly
    };
  });
}

function buildTokenMetaByDenom(spotMarkets: SpotMarket[], derivativeMarkets: DerivativeMarket[]) {
  const tokenMetaByDenom = new Map<string, TokenMeta>();

  for (const market of spotMarkets) {
    addTokenMeta(tokenMetaByDenom, market.baseDenom, market.baseToken);
    addTokenMeta(tokenMetaByDenom, market.quoteDenom, market.quoteToken);
  }

  for (const market of derivativeMarkets) {
    addTokenMeta(tokenMetaByDenom, market.quoteDenom, market.quoteToken);
  }

  tokenMetaByDenom.set("inj", { symbol: "INJ", decimals: INJ_DECIMALS });

  return tokenMetaByDenom;
}

function addTokenMeta(
  tokenMetaByDenom: Map<string, TokenMeta>,
  denom: string,
  token: { symbol?: string; decimals?: number } | undefined
) {
  if (!denom || !token?.symbol || typeof token.decimals !== "number") {
    return;
  }

  tokenMetaByDenom.set(denom, {
    symbol: token.symbol,
    decimals: token.decimals
  });
}

function defaultTokenMeta(denom: string): TokenMeta | null {
  if (denom === "inj") {
    return { symbol: "INJ", decimals: INJ_DECIMALS };
  }

  return null;
}

function toDisplayAmount(value: unknown, decimals: number | null) {
  const asString = typeof value === "string" ? value.trim() : String(value ?? "");
  const parsed = safeNumber(value);

  if (parsed <= 0) {
    return 0;
  }

  if (decimals !== null && decimals > 0 && /^\d+$/.test(asString)) {
    return parsed / 10 ** decimals;
  }

  return parsed;
}

function symbolFromDenom(denom: string) {
  if (denom === "inj") {
    return "INJ";
  }

  const segment = denom.split("/").filter(Boolean).pop() ?? denom;

  if (segment.length > 14) {
    return `${segment.slice(0, 6).toUpperCase()}...${segment.slice(-4).toUpperCase()}`;
  }

  return segment.toUpperCase();
}

function isStableSymbol(symbol: string) {
  const normalized = symbol.toUpperCase();
  return ["USDT", "USDC", "USD", "USDE"].some(
    (stable) => normalized === stable || normalized.includes(stable)
  );
}

function findStableQuotedSpotMarket(denom: string, markets: SpotMarket[]) {
  for (const market of markets) {
    const quoteSymbol = market.quoteToken?.symbol ?? symbolFromDenom(market.quoteDenom);
    const baseSymbol = market.baseToken?.symbol ?? symbolFromDenom(market.baseDenom);

    if (market.baseDenom === denom && isStableSymbol(quoteSymbol)) {
      return { market, denomRole: "base" as const };
    }

    if (market.quoteDenom === denom && isStableSymbol(baseSymbol)) {
      return { market, denomRole: "quote" as const };
    }
  }

  return null;
}

function topOfBookMid(orderbook: OrderbookWithSequence, market: SpotMarket) {
  const bestBid = orderbook.buys[0] ? toSpotPrice(orderbook.buys[0].price, market) : 0;
  const bestAsk = orderbook.sells[0] ? toSpotPrice(orderbook.sells[0].price, market) : 0;

  if (bestBid > 0 && bestAsk > 0) {
    return (bestBid + bestAsk) / 2;
  }

  if (bestBid > 0) {
    return bestBid;
  }

  if (bestAsk > 0) {
    return bestAsk;
  }

  return null;
}

function toDerivativePrice(value: unknown, market: DerivativeMarket | undefined) {
  const quoteDecimals = market?.quoteToken?.decimals;

  if (typeof quoteDecimals !== "number") {
    return safeNumber(value);
  }

  try {
    return safeNumber(
      derivativePriceFromChainPriceToFixed({
        value: String(value ?? "0"),
        quoteDecimals
      })
    );
  } catch {
    return safeNumber(value);
  }
}

function toDerivativeMargin(value: unknown, market: DerivativeMarket | undefined) {
  const quoteDecimals = market?.quoteToken?.decimals;

  if (typeof quoteDecimals !== "number") {
    return safeNumber(value);
  }

  try {
    return safeNumber(
      derivativeMarginFromChainMarginToFixed({
        value: String(value ?? "0"),
        quoteDecimals
      })
    );
  } catch {
    return safeNumber(value);
  }
}

function toDerivativeQuantity(value: unknown) {
  try {
    return safeNumber(
      derivativeQuantityFromChainQuantityToFixed({
        value: String(value ?? "0")
      })
    );
  } catch {
    return safeNumber(value);
  }
}

function toSpotPrice(value: unknown, market: SpotMarket | undefined) {
  const baseDecimals = market?.baseToken?.decimals;
  const quoteDecimals = market?.quoteToken?.decimals;

  if (typeof baseDecimals !== "number" || typeof quoteDecimals !== "number") {
    return safeNumber(value);
  }

  try {
    return safeNumber(
      spotPriceFromChainPriceToFixed({
        value: String(value ?? "0"),
        baseDecimals,
        quoteDecimals
      })
    );
  } catch {
    return safeNumber(value);
  }
}

function toSpotQuantity(value: unknown, market: SpotMarket | undefined) {
  const baseDecimals = market?.baseToken?.decimals;

  if (typeof baseDecimals !== "number") {
    return safeNumber(value);
  }

  try {
    return safeNumber(
      spotQuantityFromChainQuantityToFixed({
        value: String(value ?? "0"),
        baseDecimals
      })
    );
  } catch {
    return safeNumber(value);
  }
}

function normalizeDirection(value: unknown): "long" | "short" | string {
  const direction = String(value ?? "").toLowerCase();

  if (direction.includes("long") || direction.includes("buy")) {
    return "long";
  }

  if (direction.includes("short") || direction.includes("sell")) {
    return "short";
  }

  return direction || "unknown";
}

function hasOracleFields(market: DerivativeMarket): market is DerivativeMarket & {
  oracleBase: string;
  oracleQuote: string;
  oracleScaleFactor: number;
  oracleType: string;
} {
  return (
    "oracleBase" in market &&
    "oracleQuote" in market &&
    "oracleType" in market &&
    typeof market.oracleBase === "string" &&
    typeof market.oracleQuote === "string" &&
    typeof market.oracleType === "string"
  );
}

function shorten(value: string) {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function cleanError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "indexer request failed";
}

function logSdkCall(method: string, details?: Record<string, string>) {
  console.info("[injective] @injectivelabs/sdk-ts", method, details ?? {});
}
