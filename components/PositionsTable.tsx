import {
  formatLeverage,
  formatNumber,
  formatPct,
  formatSignedUsd,
  formatUsd,
  pnlClassName,
  toTitleCase
} from "@/lib/format";
import type { NormalizedPosition } from "@/types";
import { StatusBadge } from "./StatusBadge";

type PositionsTableProps = {
  positions: NormalizedPosition[];
};

export function PositionsTable({ positions }: PositionsTableProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Derivative exposure
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-50">Open positions</h2>
      </div>

      {positions.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No open derivative positions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-900/75 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Mark</th>
                <th className="px-4 py-3">Liquidation</th>
                <th className="px-4 py-3">Liq. Distance</th>
                <th className="px-4 py-3">Margin</th>
                <th className="px-4 py-3">Leverage</th>
                <th className="px-4 py-3 text-right">Unrealized PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {positions.map((position) => (
                <tr className="text-slate-300 transition hover:bg-slate-900/45" key={position.marketId + "-" + position.direction}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{position.ticker || "Unknown market"}</div>
                    <div className="mt-1 max-w-[190px] truncate font-mono text-[11px] text-slate-500">
                      {position.marketId}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={position.direction === "long" ? "success" : "danger"}>
                      {toTitleCase(position.direction)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 font-mono">{formatNumber(position.quantity, 4)}</td>
                  <td className="px-4 py-3 font-mono">{formatUsd(position.entryPrice)}</td>
                  <td className="px-4 py-3 font-mono">{formatUsd(position.markPrice)}</td>
                  <td className="px-4 py-3 font-mono">{formatUsd(position.liquidationPrice)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={liquidationTone(position.liquidationDistancePct)}>
                      {position.liquidationDistancePct === null
                        ? "No data"
                        : formatPct(position.liquidationDistancePct)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 font-mono">{formatUsd(position.margin)}</td>
                  <td className="px-4 py-3 font-mono">{formatLeverage(position.leverage)}</td>
                  <td className={"px-4 py-3 text-right font-mono " + pnlClassName(position.unrealizedPnl)}>
                    {formatSignedUsd(position.unrealizedPnl)}
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

function liquidationTone(value: number | null) {
  if (value === null) return "neutral";
  if (value < 5) return "critical";
  if (value < 10) return "danger";
  if (value < 20) return "warning";
  return "success";
}
