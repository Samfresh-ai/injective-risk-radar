"use client";

import { useState } from "react";
import { AIAnalysisPanel } from "@/components/AIAnalysisPanel";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebar } from "@/components/AppSidebar";
import { BalancesTable } from "@/components/BalancesTable";
import { DashboardShell } from "@/components/DashboardShell";
import { ExposureChart } from "@/components/ExposureChart";
import { LiquidationBar } from "@/components/LiquidationBar";
import { MetricsGrid } from "@/components/MetricsGrid";
import { OrdersTable } from "@/components/OrdersTable";
import { PositionsTable } from "@/components/PositionsTable";
import { RadarLoader } from "@/components/RadarLoader";
import { RecentTransactionsPanel } from "@/components/RecentTransactionsPanel";
import { RiskBreakdownCard } from "@/components/RiskBreakdownCard";
import { RiskScoreCard } from "@/components/RiskScoreCard";
import { WalletInput } from "@/components/WalletInput";
import { formatPct, formatSignedUsd, formatUsd, pnlClassName } from "@/lib/format";
import type { PortfolioResponse, SupportedNetwork } from "@/types";

type ScanTarget = {
  address: string;
  network: SupportedNetwork;
};

type DashboardTab = "portfolio" | "analytics" | "transactions";
type MainView = "home" | "market";

const injectiveAddressPattern = /^inj1[0-9a-z]{38,58}$/;
const docsUrl = "https://github.com/Samfresh-ai/injective-risk-radar#readme";

export default function Home() {
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState<SupportedNetwork>("mainnet");
  const [activeTab, setActiveTab] = useState<DashboardTab>("portfolio");
  const [mainView, setMainView] = useState<MainView>("home");
  const [darkMode, setDarkMode] = useState(false);
  const [lastScan, setLastScan] = useState<ScanTarget | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function runScan(target?: ScanTarget) {
    const nextTarget = target ?? {
      address: address.trim(),
      network
    };

    if (!injectiveAddressPattern.test(nextTarget.address)) {
      setPortfolioError("Enter a valid Injective address starting with inj");
      return;
    }

    setLastScan(nextTarget);
    setMainView("home");
    setPortfolioLoading(true);
    setAnalysisLoading(false);
    setPortfolioError(null);
    setAnalysisError(null);
    setAnalysis("");
    setPortfolio(null);
    setActiveTab("portfolio");

    let nextPortfolio: PortfolioResponse;

    try {
      const response = await fetch(
        "/api/portfolio?address=" +
          encodeURIComponent(nextTarget.address) +
          "&network=" +
          nextTarget.network
      );
      const payload = (await response.json()) as PortfolioResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Portfolio fetch failed");
      }

      nextPortfolio = payload as PortfolioResponse;
      setPortfolio(nextPortfolio);
    } catch (error) {
      setPortfolio(null);
      setPortfolioError(safeErrorMessage(error, "Injective indexer request failed"));
      return;
    } finally {
      setPortfolioLoading(false);
    }

    setAnalysisLoading(true);

    try {
      const aiResponse = await fetch("/api/analyze", {
        body: JSON.stringify({ portfolio: nextPortfolio }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (!aiResponse.ok) {
        throw new Error("AI analysis unavailable");
      }

      if (!aiResponse.body) {
        throw new Error("AI analysis stream unavailable");
      }

      const reader = aiResponse.body.getReader();
      const decoder = new TextDecoder();
      let nextAnalysis = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        nextAnalysis += decoder.decode(value, { stream: true });
        setAnalysis(nextAnalysis);
      }

      const trailing = decoder.decode();

      if (trailing) {
        nextAnalysis += trailing;
        setAnalysis(nextAnalysis);
      }
    } catch (error) {
      setAnalysisError(safeErrorMessage(error, "AI analysis unavailable"));
    } finally {
      setAnalysisLoading(false);
    }
  }

  function resetScan() {
    setPortfolio(null);
    setPortfolioError(null);
    setAnalysis("");
    setAnalysisError(null);
    setAnalysisLoading(false);
    setCopied(false);
    setActiveTab("portfolio");
  }

  function refreshCurrentScan() {
    const target = portfolio
      ? { address: portfolio.wallet, network: portfolio.network }
      : lastScan ?? { address: address.trim(), network };

    setAddress(target.address);
    setNetwork(target.network);
    void runScan(target);
  }

  function openWalletLookup() {
    const targetAddress = address.trim();

    if (portfolio?.wallet === targetAddress && portfolio.network === network) {
      setActiveTab("portfolio");
      return;
    }

    void runScan({ address: targetAddress, network });
  }

  async function copyWallet() {
    if (!portfolio) {
      return;
    }

    try {
      await navigator.clipboard.writeText(portfolio.wallet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  const activeNetwork = portfolio?.network ?? network;
  const totalValue = portfolio ? portfolio.metrics.totalKnownValueUsd : 0;

  return (
    <main className={(darkMode ? "theme-dark " : "") + "wallet-console min-h-screen overflow-x-hidden bg-slate-50 text-slate-950"}>
      <AppSidebar
        activeView={mainView}
        darkMode={darkMode}
        onNavigate={(view) => {
          setMainView(view);
          if (view === "home" && portfolio) {
            setActiveTab("portfolio");
          }
        }}
        onToggleTheme={() => setDarkMode((current) => !current)}
      />
      <div className="min-h-screen min-w-0 lg:pl-64">
        <AppHeader
          address={address}
          copied={copied}
          docsUrl={docsUrl}
          loading={portfolioLoading}
          network={activeNetwork}
          onAddressChange={setAddress}
          onCopyWallet={copyWallet}
          onNewScan={resetScan}
          onOpenWallet={openWalletLookup}
          onRefresh={refreshCurrentScan}
          portfolio={portfolio}
          refreshing={portfolioLoading}
        />

        <section className="border-b border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total Value</p>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {formatUsd(totalValue)}
                </h1>
                {portfolio ? (
                  <button
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    onClick={copyWallet}
                    type="button"
                  >
                    {copied ? "Copied" : "Copy wallet"}
                  </button>
                ) : null}
              </div>
            </div>

            {portfolio ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {(["portfolio", "analytics", "transactions"] as DashboardTab[]).map((tab) => (
                  <button
                    className={
                      "rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-100 " +
                      (activeTab === tab
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")
                    }
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    type="button"
                  >
                    {tab === "portfolio" ? "Portfolio" : tab === "analytics" ? "Analytics" : "Recent Transactions"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <div className="min-w-0 space-y-6 px-4 py-6">
          {mainView === "market" ? <CryptoMarketPanel /> : null}

          {mainView === "home" && portfolioLoading ? <RadarLoader /> : null}

          {mainView === "home" && portfolioError ? (
            <ErrorCard
              message={portfolioError}
              onRetry={() => {
                if (lastScan) {
                  void runScan(lastScan);
                } else {
                  void runScan();
                }
              }}
            />
          ) : null}

          {mainView === "home" && !portfolio && !portfolioLoading ? (
            <WalletInput
              address={address}
              loading={portfolioLoading}
              network={network}
              onAddressChange={setAddress}
              onNetworkChange={setNetwork}
              onSubmit={() => void runScan()}
            />
          ) : null}

          {mainView === "home" && portfolio ? (
            <DashboardShell portfolio={portfolio}>
              {activeTab === "portfolio" ? (
                <div className="space-y-5">
                  <BalanceOverview portfolio={portfolio} />
                  <PositionsTable positions={portfolio.positions} />
                  <BalancesTable balances={portfolio.balances} />
                  <OrdersTable orders={portfolio.orders} />
                </div>
              ) : null}

              {activeTab === "analytics" ? (
                <div className="space-y-5">
                  <AnalyticsOverview portfolio={portfolio} />
                  <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <RiskScoreCard metrics={portfolio.metrics} />
                    <MetricsGrid balances={portfolio.balances} metrics={portfolio.metrics} />
                  </div>
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
                    <div className="space-y-5">
                    <AIAnalysisPanel
                      analysis={analysis}
                      error={analysisError}
                      loading={analysisLoading}
                      metrics={portfolio.metrics}
                    />
                    <ExposureChart balances={portfolio.balances} positions={portfolio.positions} />
                    </div>
                    <div className="space-y-5">
                      <LiquidationBar value={portfolio.metrics.worstLiquidationDistancePct} />
                      <RiskBreakdownCard metrics={portfolio.metrics} />
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "transactions" ? <RecentTransactionsPanel portfolio={portfolio} /> : null}
            </DashboardShell>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Scan failed</p>
      <h2 className="mt-2 text-lg font-semibold text-rose-950">Unable to fetch Injective portfolio data.</h2>
      <p className="mt-2 text-sm leading-6 text-rose-700">{message}</p>
      <button
        className="mt-4 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-100"
        onClick={onRetry}
        type="button"
      >
        Retry scan
      </button>
    </section>
  );
}

function safeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function BalanceOverview({ portfolio }: { portfolio: PortfolioResponse }) {
  const knownBalances = portfolio.balances.filter((balance) => balance.valueUsd !== null);
  const unknownBalances = portfolio.balances.length - knownBalances.length;
  const topBalances = [...knownBalances]
    .sort((left, right) => (right.valueUsd ?? 0) - (left.valueUsd ?? 0))
    .slice(0, 4);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Balance overview
          </p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
            {formatUsd(portfolio.metrics.totalKnownValueUsd)}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {portfolio.balances.length} balances tracked. {unknownBalances} unknown USD values.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl">
          {topBalances.length > 0 ? (
            topBalances.map((balance) => (
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={balance.denom + balance.source}>
                <p className="text-sm font-semibold text-slate-950">{balance.symbol}</p>
                <p className="mt-2 font-mono text-xl font-semibold text-slate-950">
                  {formatUsd(balance.valueUsd)}
                </p>
              </article>
            ))
          ) : (
            <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <p className="text-sm font-semibold text-slate-950">No known balance value</p>
              <p className="mt-2 text-sm text-slate-500">The wallet scanned, but no priced balances were returned.</p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

function AnalyticsOverview({ portfolio }: { portfolio: PortfolioResponse }) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Unrealized PnL</p>
        <p className={"mt-3 text-4xl font-semibold tracking-tight " + pnlClassName(portfolio.metrics.unrealizedPnlUsd)}>
          {formatSignedUsd(portfolio.metrics.unrealizedPnlUsd)}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {portfolio.metrics.unrealizedPnlPct === null ? "No percentage context available." : formatPct(portfolio.metrics.unrealizedPnlPct)}
        </p>
      </article>
      <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Concentration exposure</p>
        <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          {formatPct(portfolio.metrics.maxConcentrationPct)}
        </p>
        <p className="mt-2 text-sm text-slate-500">Largest known exposure in the tracked portfolio.</p>
      </article>
    </section>
  );
}

const injectiveMarkets = [
  ["INJ", "$21.84", "+3.2%"],
  ["USDT", "$1.00", "+0.0%"],
  ["USDC", "$1.00", "+0.0%"],
  ["TIA", "$6.42", "-1.1%"],
  ["WETH", "$3.8K", "+1.8%"]
];

function CryptoMarketPanel() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Injective markets</p>
      </div>
      <div className="divide-y divide-slate-200">
        {injectiveMarkets.map(([symbol, price, change]) => (
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4" key={symbol}>
            <p className="font-semibold text-slate-950">{symbol}</p>
            <p className="font-mono text-sm text-slate-700">{price}</p>
            <p className={"font-mono text-sm font-semibold " + (change.startsWith("-") ? "text-rose-600" : "text-emerald-600")}>
              {change}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
