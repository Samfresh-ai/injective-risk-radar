import { NextResponse } from "next/server";
import {
  defaultNetwork,
  fetchInjectivePortfolio,
  isValidInjectiveAddress,
  normalizeNetwork
} from "@/lib/injective";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";
  const networkParam = searchParams.get("network");
  const network = networkParam ? normalizeNetwork(networkParam) : defaultNetwork();

  if (!isValidInjectiveAddress(address)) {
    return NextResponse.json({ error: "Invalid Injective address" }, { status: 400 });
  }

  if (!network) {
    return NextResponse.json({ error: "Invalid network" }, { status: 400 });
  }

  try {
    const portfolio = await fetchInjectivePortfolio(address, network);
    return NextResponse.json(portfolio);
  } catch (error) {
    console.error("Injective portfolio request failed", error);
    return NextResponse.json(
      { error: "Injective indexer request failed" },
      { status: 502 }
    );
  }
}
