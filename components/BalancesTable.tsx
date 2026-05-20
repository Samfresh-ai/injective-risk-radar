import { formatNumber, formatUsd } from "@/lib/format";
import type { NormalizedBalance } from "@/types";

type BalancesTableProps = {
  balances: NormalizedBalance[];
};

export function BalancesTable({ balances }: BalancesTableProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Spot and account balances
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-50">Balances</h2>
      </div>

      {balances.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No balances found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-900/75 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Known USD Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {balances.map((balance, index) => (
                <tr className="text-slate-300 transition hover:bg-slate-900/45" key={balance.denom + "-" + balance.source + "-" + index}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{balance.symbol}</div>
                    <div className="mt-1 max-w-[220px] truncate font-mono text-[11px] text-slate-500">
                      {balance.denom}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">{formatNumber(balance.amount, 4)}</td>
                  <td className="px-4 py-3">
                    {balance.valueUsd === null ? <span className="text-slate-400">Unknown</span> : (
                      <span className="font-mono text-slate-100">{formatUsd(balance.valueUsd)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
