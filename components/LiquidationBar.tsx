import { formatPct } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

type LiquidationBarProps = {
  value: number | null;
};

export function LiquidationBar({ value }: LiquidationBarProps) {
  if (value === null) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Liquidation buffer
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-50">No liquidation data available.</h2>
          </div>
          <StatusBadge tone="neutral">Unknown</StatusBadge>
        </div>
        <div className="mt-5 h-3 rounded-full bg-slate-800" />
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The scan did not return a usable liquidation distance. Deterministic metrics are still visible.
        </p>
      </section>
    );
  }

  const marker = Math.max(2, Math.min(98, value >= 20 ? 92 : (value / 20) * 92));
  const tone = value < 5 ? "critical" : value < 10 ? "danger" : value < 20 ? "warning" : "success";

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Liquidation buffer
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-50">
            Closest liquidation buffer: {formatPct(value)}
          </h2>
        </div>
        <StatusBadge tone={tone}>{riskLabel(value)}</StatusBadge>
      </div>

      <div className="relative mt-6 h-4 rounded-full bg-slate-800">
        <div className="absolute inset-y-0 left-0 w-[23%] rounded-l-full bg-rose-500" />
        <div className="absolute inset-y-0 left-[23%] w-[23%] bg-red-500" />
        <div className="absolute inset-y-0 left-[46%] w-[46%] bg-amber-300" />
        <div className="absolute inset-y-0 left-[92%] right-0 rounded-r-full bg-emerald-300" />
        <div
          className="absolute -top-2 h-8 w-1 rounded-full bg-slate-50 shadow-[0_0_18px_rgba(248,250,252,0.65)]"
          style={{ left: marker + "%" }}
        />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 sm:grid-cols-4">
        <span>0-5 critical</span>
        <span>5-10 high</span>
        <span>10-20 medium</span>
        <span className="sm:text-right">20+ safer</span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-400">
        Higher distance generally means more room before liquidation. This is a risk buffer, not a
        guarantee of safety.
      </p>
    </section>
  );
}

function riskLabel(value: number) {
  if (value < 5) return "Critical";
  if (value < 10) return "High";
  if (value < 20) return "Medium";
  return "Safer";
}
