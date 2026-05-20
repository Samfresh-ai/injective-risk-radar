import { formatNumber, formatUsd, toTitleCase } from "@/lib/format";
import type { NormalizedOrder } from "@/types";
import { StatusBadge } from "./StatusBadge";

type OrdersTableProps = {
  orders: NormalizedOrder[];
};

export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Resting intent
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-50">Active orders</h2>
      </div>

      {orders.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No active orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-900/75 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Notional</th>
                <th className="px-4 py-3">Reduce Only</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {orders.map((order, index) => (
                <tr className="text-slate-300 transition hover:bg-slate-900/45" key={order.marketId + "-" + order.side + "-" + index}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{order.ticker}</div>
                    <div className="mt-1 max-w-[190px] truncate font-mono text-[11px] text-slate-500">
                      {order.marketId}
                    </div>
                  </td>
                  <td className="px-4 py-3">{toTitleCase(order.marketType)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={/buy|long/i.test(order.side) ? "success" : "danger"}>
                      {order.side}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 font-mono">{formatUsd(order.price)}</td>
                  <td className="px-4 py-3 font-mono">{formatNumber(order.quantity, 4)}</td>
                  <td className="px-4 py-3 font-mono">{formatUsd(order.notional)}</td>
                  <td className="px-4 py-3">{order.reduceOnly ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
