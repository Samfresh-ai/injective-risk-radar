"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatPct, formatUsd } from "@/lib/format";
import type { NormalizedBalance, NormalizedPosition } from "@/types";

type ExposureChartProps = {
  balances: NormalizedBalance[];
  positions: NormalizedPosition[];
};

const colors = ["#34d399", "#fbbf24", "#38bdf8", "#fb7185", "#a78bfa", "#f97316", "#2dd4bf"];

export function ExposureChart({ balances, positions }: ExposureChartProps) {
  const data = buildExposureData(balances, positions);

  if (data.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Exposure map
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">No known exposure to chart.</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Positions and balances with reliable USD value will appear here after a scan.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Exposure map
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">Positions and known balances</h2>
        </div>
        <span className="text-xs text-slate-500">{data.length} buckets</span>
      </div>

      <div className="mt-4 h-72">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} layout="vertical" margin={{ bottom: 8, left: 4, right: 12, top: 8 }}>
            <XAxis
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickFormatter={(value) => formatUsd(Number(value))}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="name"
              tick={{ fill: "#475569", fontSize: 12 }}
              tickLine={false}
              type="category"
              width={112}
            />
            <Tooltip
              contentStyle={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                color: "#0f172a"
              }}
              formatter={(value, _name, item) => [
                formatUsd(Number(value)) + " (" + formatPct((item.payload as ExposureDatum).pct) + ")",
                "Exposure"
              ]}
              labelStyle={{ color: "#0f172a" }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell fill={colors[index % colors.length]} key={entry.name} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-2">
        {data.slice(0, 5).map((item, index) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={item.name}>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="truncate text-slate-700">{item.name}</span>
            </div>
            <span className="font-mono text-slate-400">{formatPct(item.pct)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

type ExposureDatum = {
  name: string;
  pct: number;
  value: number;
};

function buildExposureData(
  balances: NormalizedBalance[],
  positions: NormalizedPosition[]
): ExposureDatum[] {
  const buckets = new Map<string, number>();

  for (const position of positions) {
    addBucket(buckets, position.ticker || position.marketId, position.notional);
  }

  for (const balance of balances) {
    if (balance.valueUsd !== null) {
      addBucket(buckets, balance.symbol || balance.denom, balance.valueUsd);
    }
  }

  const total = Array.from(buckets.values()).reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    return [];
  }

  return Array.from(buckets.entries())
    .map(([name, value]) => ({ name, pct: (value / total) * 100, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function addBucket(buckets: Map<string, number>, key: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return;
  }

  buckets.set(key, (buckets.get(key) ?? 0) + value);
}
