import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { LiquidationDistance, PortfolioResponse } from "@/types";

export const runtime = "nodejs";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const encoder = new TextEncoder();

const systemPrompt =
  "You are Injective Risk Radar, a concise DeFi risk analyst for Injective traders. Use only the wallet data in the prompt. Name the specific tokens, markets, percentages, and USD values that drive your read. If there are no open positions, analyze balance composition and do not say you cannot analyze the wallet. Include at least one concrete rebalance or risk-reduction action. This is informational, not financial advice.";

export async function POST(request: Request) {
  const body = await safeJson(request);
  const portfolio = isPortfolioResponse(body?.portfolio) ? body.portfolio : null;

  if (!portfolio) {
    return NextResponse.json({ error: "Invalid portfolio payload" }, { status: 400 });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return streamAnthropicAnalysis(portfolio);
  }

  if (getGeminiApiKey()) {
    const analysis = await buildGeminiAnalysis(portfolio);
    return streamText(analysis);
  }

  return streamText(buildLocalAnalysis(portfolio));
}

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

async function safeJson(request: Request): Promise<{ portfolio?: unknown } | null> {
  try {
    return (await request.json()) as { portfolio?: unknown };
  } catch {
    return null;
  }
}

function isPortfolioResponse(value: unknown): value is PortfolioResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const portfolio = value as Partial<PortfolioResponse>;
  return (
    typeof portfolio.wallet === "string" &&
    (portfolio.network === "mainnet" || portfolio.network === "testnet") &&
    typeof portfolio.fetchedAt === "string" &&
    Array.isArray(portfolio.balances) &&
    Array.isArray(portfolio.positions) &&
    Array.isArray(portfolio.orders) &&
    typeof portfolio.portfolio === "object" &&
    portfolio.portfolio !== null &&
    typeof portfolio.portfolio.totalValue === "number" &&
    typeof portfolio.metrics === "object" &&
    portfolio.metrics !== null &&
    Array.isArray(portfolio.metrics.liquidationDistances) &&
    Array.isArray(portfolio.warnings)
  );
}

function streamAnthropicAnalysis(portfolio: PortfolioResponse) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let wroteText = false;
      const messageStream = anthropic.messages.stream({
        model: process.env.CLAUDE_MODEL || DEFAULT_MODEL,
        max_tokens: 700,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: buildPrompt(portfolio)
          }
        ]
      });

      messageStream.on("text", (textDelta) => {
        wroteText = true;
        controller.enqueue(encoder.encode(textDelta));
      });

      messageStream.on("error", (error) => {
        console.error("Claude analysis stream failed", error);
        if (!wroteText) {
          controller.enqueue(encoder.encode(buildLocalAnalysis(portfolio)));
        }
        controller.close();
      });

      messageStream.on("end", () => {
        controller.close();
      });
    }
  });

  return textStreamResponse(stream);
}

async function buildGeminiAnalysis(portfolio: PortfolioResponse) {
  const apiKey = getGeminiApiKey();
  const models = unique([
    process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ]);

  for (const model of models) {
    const text = await requestGeminiAnalysis(portfolio, apiKey, model);
    if (text) {
      return text;
    }
  }

  return buildLocalAnalysis(portfolio);
}

async function requestGeminiAnalysis(portfolio: PortfolioResponse, apiKey: string, model: string) {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(portfolio) }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 700,
            temperature: 0.2,
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      }
    );

    if (!response.ok) {
      console.error("Gemini analysis failed", response.status, await response.text());
      return null;
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    return payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim() || null;
  } catch (error) {
    console.error("Gemini analysis request failed", error);
    return null;
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function streamText(text: string) {
  const words = text.split(/(\s+)/);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(encoder.encode(word));
        await new Promise((resolve) => setTimeout(resolve, 8));
      }
      controller.close();
    }
  });

  return textStreamResponse(stream);
}

function textStreamResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

function buildPrompt(portfolio: PortfolioResponse) {
  const topBalances = topBalancesWithValues(portfolio);

  return [
    "Wallet: " + portfolio.wallet,
    "Network: " + portfolio.network,
    "Health score: " + portfolio.metrics.healthScore + "/100",
    "Leverage ratio: " + portfolio.metrics.leverageRatio.toFixed(2) + "x",
    "Portfolio total value: $" + portfolio.portfolio.totalValue.toFixed(2),
    "Concentration risk: " + (portfolio.metrics.concentrationRisk * 100).toFixed(2) + "%",
    "Liquidation distances: " + JSON.stringify(portfolio.metrics.liquidationDistances, null, 2),
    "Open positions: " + JSON.stringify(portfolio.positions, null, 2),
    "Top balances: " + JSON.stringify(topBalances, null, 2),
    "Active orders: " + JSON.stringify(portfolio.orders, null, 2),
    "Warnings: " + JSON.stringify(portfolio.warnings, null, 2)
  ].join("\n");
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

function buildLocalAnalysis(portfolio: PortfolioResponse) {
  const topBalances = topBalancesWithValues(portfolio);
  const topBalance = topBalances[0];
  const closest = nearestLiquidation(portfolio.metrics.topRisk);
  const totalValue = usd(portfolio.portfolio.totalValue);
  const leverage = portfolio.metrics.leverageRatio.toFixed(2) + "x";
  const concentration = pct(portfolio.metrics.concentrationRisk * 100);

  if (portfolio.positions.length === 0) {
    const balanceLine = topBalance
      ? topBalance.symbol + " is the largest priced balance at " + usd(topBalance.valueUsd ?? 0) + "."
      : "No balance has a reliable USD mark, so the risk read is based on raw balance composition.";

    return [
      "Health score " + portfolio.metrics.healthScore + "/100 with " + totalValue + " in priced value and " + leverage + " leverage because this wallet has no open derivative positions.",
      balanceLine + " Concentration risk is " + concentration + ", so balance mix matters more than liquidation risk here.",
      topBalance
        ? "Concrete action: keep enough INJ for gas, then consider moving part of the " + topBalance.symbol + " exposure into USDT or USDC if this wallet is meant to stay defensive."
        : "Concrete action: add a reliable stable balance or reduce dust assets before using this as an active trading wallet.",
      "Watch item: new perpetual positions would change the score immediately because liquidation distance is currently not part of the risk profile."
    ].join("\n\n");
  }

  const closestLine = closest
    ? closest.market + " " + closest.side + " is closest to liquidation at " + pct(closest.distancePct) + " from mark " + usd(closest.currentPrice) + " versus liquidation " + usd(closest.liquidationPrice) + "."
    : "At least one open position is missing usable mark or liquidation pricing, so liquidation distance is incomplete.";
  const largestBalanceLine = topBalance
    ? "Largest priced balance: " + topBalance.symbol + " at " + usd(topBalance.valueUsd ?? 0) + "."
    : "No priced spot balance is available for the top-balance read.";
  const positionSuggestion = closest
    ? "Concrete action: reduce or hedge the " + closest.market + " " + closest.side + " first, because it is the nearest liquidation point."
    : "Concrete action: refresh market pricing before increasing position size; missing liquidation data makes the open risk harder to trust.";

  return [
    "Health score " + portfolio.metrics.healthScore + "/100 on " + totalValue + " known value with " + leverage + " leverage and " + concentration + " concentration risk.",
    closestLine,
    largestBalanceLine,
    positionSuggestion,
    "Watch item: compare this read after any new order fills; leverage and the nearest liquidation distance are the fastest-moving risk inputs."
  ].join("\n\n");
}

function topBalancesWithValues(portfolio: PortfolioResponse) {
  return portfolio.balances
    .filter((balance) => balance.valueUsd !== null)
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
    .slice(0, 8);
}

function nearestLiquidation(value: PortfolioResponse["metrics"]["topRisk"]): LiquidationDistance | null {
  return typeof value === "object" && value !== null ? value : null;
}

function usd(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2,
    style: "currency"
  }).format(value);
}

function pct(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value) + "%";
}
