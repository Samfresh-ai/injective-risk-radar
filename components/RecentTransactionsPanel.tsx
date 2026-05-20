import { formatAddress, formatDateTime } from "@/lib/format";
import type { PortfolioResponse } from "@/types";
import { StatusBadge } from "./StatusBadge";

type RecentTransactionsPanelProps = {
  portfolio: PortfolioResponse;
};

export function RecentTransactionsPanel({ portfolio }: RecentTransactionsPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Recent transactions
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">No transaction feed in this scan.</h2>
        </div>
        <StatusBadge tone="neutral">Indexer payload</StatusBadge>
      </div>

      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <p className="text-sm leading-6 text-slate-600">
          The current stateless portfolio endpoint returned balances, positions, active orders, risk metrics,
          and AI analysis for <span className="font-mono text-slate-900">{formatAddress(portfolio.wallet)}</span>.
          It does not return wallet transaction history yet, so this tab stays empty instead of showing fake activity.
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Last portfolio scan: {formatDateTime(portfolio.fetchedAt)}
        </p>
      </div>
    </section>
  );
}
