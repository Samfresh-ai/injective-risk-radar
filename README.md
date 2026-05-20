# Injective Risk Radar

Radar is a lightweight safety tool for Injective users. Paste an `inj...` wallet, scan live Injective indexer data, and get a clean readout of portfolio balances, exposure, liquidation posture, concentration risk, and AI-assisted risk notes before making a decision.

It is intentionally minimal right now. The MVP does not store data, connect wallets, execute trades, run background jobs, or require authentication. That is a product choice for the first version: the safest demo path is a read-only risk check that cannot move funds, sign transactions, collect private keys, or pretend to know more than the indexer returns.

## Why This Makes Injective Safer

Injective gives users fast access to markets, leverage, orders, and on-chain portfolio data. That speed is useful, but it also makes it easy to miss basic risk signals before taking action. Risk Radar adds a neutral review layer in front of that moment.

The tool helps users see:

- whether the wallet has known balances and priced value
- whether open positions or orders create leverage exposure
- how concentrated the tracked portfolio is
- whether liquidation distance data exists
- what parts of the wallet could not be priced reliably
- a plain-language risk summary generated from deterministic metrics

The goal is not to trade for the user. The goal is to make the wallet state easier to understand before the user makes a move.

## Current State

This is a submission-ready MVP, not a full risk platform. It proves the core safety loop:

```text
wallet address -> live Injective read -> deterministic metrics -> clear risk UI -> AI explanation
```

## Demo Flow
1. Open the app.
2. Paste an Injective wallet address.
3. Select `mainnet` or `testnet`.
4. Run `Analyze Risk`.
5. Review the wallet response tabs:
   - `Portfolio`: balance-first wallet overview, positions, balances, and orders.
   - `Analytics`: health score, Unrealized PnL, concentration exposure, liquidation posture, and AI risk report.
   - `Recent Transactions`: honest empty state until transaction-history fetching is added.

Useful test wallets:

```text
Active data: inj1eguakdadd77vanma2cd9wc2flvdurn9c9xvzyr
Empty state: inj1h4jxvx55ygdcphqgaezkdac4j3d4lgrgruft7z
```

## Features

- Fetches Injective account portfolio data on demand.
- Discovers default and portfolio subaccounts.
- Reads active spot and derivative orders for discovered subaccounts.
- Reads derivative positions from portfolio data, with an indexer fallback.
- Normalizes SDK/indexer objects into app-specific TypeScript types.
- Computes deterministic portfolio risk metrics locally.
- Uses Claude or Gemini only for interpretation, not for metric calculation.
- Renders a responsive De.Fi-style wallet console with guest mode, top wallet lookup, sidebar navigation, light/dark toggle, positions, balances, orders, exposure, liquidation distance, and AI analysis.
- Includes a compact Injective market panel in the sidebar flow.
- Keeps wallet analysis stateless: no profile login, no wallet connection, and no database.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Recharts
- `@injectivelabs/sdk-ts`
- `@injectivelabs/networks`
- `@anthropic-ai/sdk`

## Project Structure

```text
app/
  api/
    analyze/route.ts       AI narrative analysis endpoint
    portfolio/route.ts     Injective portfolio fetch endpoint
  globals.css
  layout.tsx
  page.tsx
components/                Dashboard UI components
lib/
  format.ts                Number and display formatting
  injective.ts             Injective SDK wrapper and normalization layer
  risk.ts                  Deterministic risk engine
types/
  index.ts                 Shared app contracts
```

## User Experience

- `Home` returns to the landing scan view.
- `Crypto Market` opens a compact Injective market display.
- `Quest` is intentionally disabled for the current MVP.
- `Settings` only toggles light/dark screen mode.
- `Docs` opens this README.

The app uses clear empty states instead of fake data. If the indexer cannot infer a USD value for a balance, the UI shows `Unknown`.

## Environment

Create a local env file:

```bash
cp .env.example .env.local
```

Required variables:

```bash
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-sonnet-4-20250514
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
INJECTIVE_NETWORK=mainnet
INJECTIVE_INDEXER_GRPC_ENDPOINT=
```

Notes:

- `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, and `GOOGLE_API_KEY` are read only by the server-side API route.

- `INJECTIVE_INDEXER_GRPC_ENDPOINT` is optional. If omitted, the app uses the endpoint from `@injectivelabs/networks`.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Enter a valid `inj...` address, select `mainnet` or `testnet`, and run the analysis.

## Scripts

```bash
npm run typecheck
npm run lint
npm run build
npm run start
```

## API

### `GET /api/portfolio`

Fetches and normalizes live Injective portfolio data.

Query params:

- `address`: Injective bech32 wallet address beginning with `inj`
- `network`: `mainnet` or `testnet`

Example:

```bash
curl "http://localhost:3000/api/portfolio?address=inj1...&network=mainnet"
```

Responses:

- `200`: normalized `PortfolioResponse`
- `400`: invalid address or network
- `502`: Injective SDK/indexer request failure

### `POST /api/analyze`

Requests an AI narrative analysis for a normalized portfolio.

Body:

```json
{
  "portfolio": {}
}
```

Responses:

- `200`: `AIAnalysis`
- `400`: invalid payload
- `200`: falls back to local deterministic text if no AI key is configured or the AI request fails

The route streams plain text. Claude is preferred when configured; Gemini is used next; local deterministic analysis is the final fallback.

## Risk Model

All deterministic metrics are calculated in `lib/risk.ts`.

The engine computes:

- known portfolio value
- total notional exposure
- total margin
- leverage ratio
- max concentration
- worst liquidation distance
- unrealized PnL
- health score
- risk level

The AI model is instructed to interpret these metrics only. It must not invent balances, positions, wallet activity, or alternative calculations.

## Data And Pricing Rules

- Raw SDK responses are never passed directly to UI components.
- Invalid, missing, infinite, or `NaN` values are safely normalized.
- Stablecoin-like assets are treated as 1 USD only when the symbol clearly indicates `USDT`, `USDC`, `USD`, or `USDe`.
- Non-stable balances are valued only when a reliable stable-quoted Injective spot market and top-of-book price are available.
- If a reliable value cannot be inferred, the UI shows `Unknown` instead of a fabricated price.

## Deployment

Vercel is the expected deployment target.

Set these as server environment variables:

- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `GEMINI_MODEL`
- `INJECTIVE_NETWORK`
- `INJECTIVE_INDEXER_GRPC_ENDPOINT`, if using a custom endpoint





## Known Limitations

- Stateless MVP; no database or persisted history.
- No authentication.
- No wallet connection.
- No trading, order execution, or transaction signing.
- No background jobs or WebSockets.
- Balance USD values are intentionally incomplete when reliable market data is unavailable.
- AI analysis is interpretive and informational; deterministic risk metrics are calculated locally.
- No ERC-8004 registration code is included.
