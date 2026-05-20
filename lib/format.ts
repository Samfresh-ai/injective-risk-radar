import type { RiskLevel } from "@/types";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  notation: "compact"
});

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

function fixedFormatter(decimals: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

export function formatUsd(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1_000) {
    return sign + "$" + compactNumberFormatter.format(absolute);
  }

  const decimals = absolute > 0 && absolute < 1 ? 4 : absolute >= 100 ? 0 : 2;
  return (
    sign +
    new Intl.NumberFormat("en-US", {
      currency: "USD",
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
      style: "currency"
    }).format(absolute)
  );
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  if (Math.abs(value) >= 1_000) {
    return compactNumberFormatter.format(value);
  }

  if (Number.isInteger(value) || decimals === 0) {
    return integerFormatter.format(value);
  }

  return fixedFormatter(decimals).format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  const decimals = Math.abs(value) >= 10 ? 1 : 2;
  return fixedFormatter(decimals).format(value) + "%";
}

export function formatLeverage(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  return fixedFormatter(value >= 10 ? 1 : 2).format(value) + "x";
}

export function formatAddress(address: string): string {
  if (address.length <= 16) {
    return address;
  }

  return address.slice(0, 8) + "..." + address.slice(-6);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

export function riskLevelToLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    critical: "Critical",
    high: "High",
    low: "Low",
    medium: "Medium"
  };

  return labels[level];
}

export function getRiskTone(level: RiskLevel): { label: string; className: string } {
  const tones: Record<RiskLevel, { label: string; className: string }> = {
    low: {
      label: "Low",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700"
    },
    medium: {
      label: "Medium",
      className: "border-amber-200 bg-amber-50 text-amber-700"
    },
    high: {
      label: "High",
      className: "border-orange-200 bg-orange-50 text-orange-700"
    },
    critical: {
      label: "Critical",
      className: "border-rose-200 bg-rose-50 text-rose-700"
    }
  };

  return tones[level];
}

export function formatSignedUsd(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) {
    return "—";
  }

  return (value > 0 ? "+" : "") + formatUsd(value);
}

export function pnlClassName(value: number | null | undefined): string {
  if (!isFiniteNumber(value) || value === 0) {
    return "text-slate-700";
  }

  return value > 0 ? "text-emerald-600" : "text-rose-600";
}

export function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
