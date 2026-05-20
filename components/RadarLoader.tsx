export function RadarLoader() {
  return (
    <section className="rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-[180px_1fr] md:items-center">
        <div className="radar-loader mx-auto" aria-hidden="true">
          <div className="radar-loader__sweep" />
          <div className="radar-loader__dot radar-loader__dot--one" />
          <div className="radar-loader__dot radar-loader__dot--two" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Live scan
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Scanning Injective portfolio
          </h2>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="scan-stream font-mono text-sm text-blue-700">
              portfolio.read → balances.sync → exposure.map → liquidation.check → risk.score →
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
