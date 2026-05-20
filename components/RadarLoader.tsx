"use client";

import { useEffect, useState } from "react";

const scanSteps = [
  "portfolio.read",
  "balances.sync",
  "exposure.map",
  "liquidation.check",
  "risk.score",
  "ai.review"
];

export function RadarLoader() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % scanSteps.length);
    }, 760);

    return () => window.clearInterval(interval);
  }, []);

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
            <div className="scan-stream font-mono text-sm text-blue-700" aria-live="polite">
              <span className="scan-stream__cursor" aria-hidden="true">
                &gt;
              </span>{" "}
              <span className="scan-stream__word" key={scanSteps[activeStep]}>
                {scanSteps[activeStep]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
