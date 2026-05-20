import type { ReactNode } from "react";
import type { PortfolioResponse } from "@/types";
import { formatAddress, formatDateTime, toTitleCase } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

type DashboardShellProps = {
  children: ReactNode;
  portfolio: PortfolioResponse;
};

export function DashboardShell({ children, portfolio }: DashboardShellProps) {
  const isEmpty =
    portfolio.balances.length === 0 && portfolio.positions.length === 0 && portfolio.orders.length === 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Portfolio risk posture
          </p>
          <h2 className="mt-1 font-mono text-sm text-slate-950">{formatAddress(portfolio.wallet)}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="neutral">{toTitleCase(portfolio.network)}</StatusBadge>
          <StatusBadge tone={isEmpty ? "warning" : "success"}>
            {isEmpty ? "No active data" : "Live indexer data"}
          </StatusBadge>
          <StatusBadge tone="info">{formatDateTime(portfolio.fetchedAt)}</StatusBadge>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
            Empty portfolio
          </p>
          <h3 className="mt-3 text-xl font-semibold text-slate-950">
            No active Injective portfolio data was found for this wallet and network.
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            The scan completed, but the indexer did not return balances, derivative positions, or
            active orders. This is not an app failure; deterministic risk metrics remain available.
          </p>
        </div>
      ) : null}

      {portfolio.warnings.length > 0 ? (
        <details className="group rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                Data warnings
              </span>
              <span className="mt-1 block text-sm text-amber-700">
                {portfolio.warnings.length} pricing or indexer notes. Expand for audit details.
              </span>
            </span>
            <StatusBadge tone="warning">
              <span className="group-open:hidden">Review</span>
              <span className="hidden group-open:inline">Hide</span>
            </StatusBadge>
          </summary>
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto border-t border-amber-200 pt-3 text-sm text-amber-700">
            {portfolio.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {children}
    </section>
  );
}
