import type { FormEvent } from "react";
import type { SupportedNetwork } from "@/types";

type WalletInputProps = {
  address: string;
  loading: boolean;
  network: SupportedNetwork;
  onAddressChange: (address: string) => void;
  onNetworkChange: (network: SupportedNetwork) => void;
  onSubmit: () => void;
};

export function WalletInput({
  address,
  loading,
  network,
  onAddressChange,
  onNetworkChange,
  onSubmit
}: WalletInputProps) {
  const trimmedAddress = address.trim();
  const validationMessage =
    trimmedAddress.length > 0 && !/^inj1[0-9a-z]{38,58}$/.test(trimmedAddress)
      ? "Enter a valid Injective address starting with inj"
      : "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="min-w-0 space-y-5">
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Stateless wallet analysis
          </p>
          <h2 className="mt-3 break-words text-2xl font-semibold tracking-tight text-slate-950">
            Open an Injective wallet risk console.
          </h2>
          <p className="mt-3 break-words text-sm leading-6 text-slate-600">
            RADAR reads live Injective portfolio data, then opens a wallet response view with
            portfolio details, risk analytics, and recent activity sections.
          </p>
        </div>

        <div className="mt-6 grid min-w-0 gap-3 md:grid-cols-4">
          {[
            ["Wallet read", "Balances, derivative positions, active orders, and known value."],
            ["Risk scan", "Leverage, liquidation, concentration, and exposure."],
            ["AI review", "Claude reviews the risk posture after deterministic metrics load."],
            ["Guest mode", "Stateless scan session."]
          ].map(([label, copy]) => (
            <article className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4" key={label}>
              <p className="text-sm font-semibold text-slate-950">{label}</p>
              <p className="mt-2 break-words text-sm leading-5 text-slate-500">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <form
        className="min-w-0 rounded-xl border border-blue-100 bg-white p-5 shadow-sm"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Wallet scan</p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              Paste wallet address
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose a network and run a portfolio readout. Risk analysis only, no trading or financial advice.
            </p>
          </div>

          <div className="w-full space-y-3 xl:max-w-3xl">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
              <div>
                <label className="sr-only" htmlFor="scan-wallet-address">
                  Injective wallet address
                </label>
                <input
                  aria-describedby={validationMessage ? "scan-wallet-address-error" : undefined}
                  aria-invalid={Boolean(validationMessage)}
                  className="h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 font-mono text-sm text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={loading}
                  id="scan-wallet-address"
                  onChange={(event) => onAddressChange(event.target.value)}
                  placeholder="inj1..."
                  spellCheck={false}
                  value={address}
                />
                {validationMessage ? (
                  <p className="mt-2 text-sm text-rose-600" id="scan-wallet-address-error">
                    {validationMessage}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="sr-only" htmlFor="scan-network">
                  Network
                </label>
                <select
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  disabled={loading}
                  id="scan-network"
                  onChange={(event) => onNetworkChange(event.target.value as SupportedNetwork)}
                  value={network}
                >
                  <option value="mainnet">Mainnet</option>
                  <option value="testnet">Testnet</option>
                </select>
              </div>
            </div>

            <button
              className="h-12 w-full rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 md:w-auto md:min-w-40"
              disabled={loading || Boolean(validationMessage) || trimmedAddress.length === 0}
              type="submit"
            >
              {loading ? "Scanning" : "Analyze Risk"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
