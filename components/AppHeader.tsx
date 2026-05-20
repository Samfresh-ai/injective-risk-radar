"use client";

import { formatAddress, formatDateTime, formatUsd, toTitleCase } from "@/lib/format";
import type { PortfolioResponse, SupportedNetwork } from "@/types";
import { StatusBadge } from "./StatusBadge";

type AppHeaderProps = {
  address: string;
  network: SupportedNetwork;
  portfolio: PortfolioResponse | null;
  copied: boolean;
  docsUrl: string;
  loading: boolean;
  refreshing: boolean;
  onAddressChange: (address: string) => void;
  onCopyWallet: () => void;
  onNewScan: () => void;
  onOpenWallet: () => void;
  onRefresh: () => void;
};

export function AppHeader({
  address,
  copied,
  docsUrl,
  loading,
  network,
  onAddressChange,
  onCopyWallet,
  onNewScan,
  onOpenWallet,
  onRefresh,
  portfolio,
  refreshing
}: AppHeaderProps) {
  const trimmedAddress = address.trim();
  const hasValidAddress = /^inj1[0-9a-z]{38,58}$/.test(trimmedAddress);
  const validationMessage =
    trimmedAddress.length > 0 && !hasValidAddress
      ? "Enter a valid Injective address starting with inj"
      : "";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <form
          className="min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (hasValidAddress) {
              onOpenWallet();
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <div className="relative min-w-0 flex-1">
              <label className="sr-only" htmlFor="header-wallet-address">
                Injective wallet address
              </label>
              <span className="pointer-events-none absolute left-3 top-3 text-slate-400">⌕</span>
              <input
                aria-describedby={validationMessage ? "header-wallet-address-error" : undefined}
                aria-invalid={Boolean(validationMessage)}
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-24 font-mono text-sm text-slate-950 shadow-sm outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                disabled={loading}
                id="header-wallet-address"
                onChange={(event) => onAddressChange(event.target.value)}
                placeholder="Paste Injective wallet address"
                spellCheck={false}
                value={address}
              />
              <span className="pointer-events-none absolute right-3 top-2.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500">
                INJ
              </span>
              {validationMessage ? (
                <p className="mt-1 text-sm text-rose-600" id="header-wallet-address-error">
                  {validationMessage}
                </p>
              ) : null}
            </div>

            {hasValidAddress ? (
              <button
                className="w-fit rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 font-mono text-xs font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
                type="submit"
              >
                Open {formatAddress(trimmedAddress)}
              </button>
            ) : null}
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <a
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
            href={docsUrl}
            rel="noreferrer"
            target="_blank"
          >
            Docs
          </a>
          <StatusBadge tone={network === "mainnet" ? "success" : "info"}>{toTitleCase(network)}</StatusBadge>
          <StatusBadge tone="neutral">Guest mode</StatusBadge>
          {portfolio ? (
            <>
              <button
                aria-label="Copy wallet address"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100"
                onClick={onCopyWallet}
                type="button"
              >
                {copied ? "Copied" : formatAddress(portfolio.wallet)}
              </button>
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm">
                {formatDateTime(portfolio.fetchedAt)}
              </span>
              <button
                aria-label="Refresh current wallet scan"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={refreshing}
                onClick={onRefresh}
                type="button"
              >
                {refreshing ? "Refreshing" : "Refresh"}
              </button>
              <button
                aria-label="Start a new wallet scan"
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-100"
                onClick={onNewScan}
                type="button"
              >
                New scan
              </button>
            </>
          ) : (
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm">
              Total value {formatUsd(0)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
