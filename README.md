# 🚀 Xtoshi Pumpfun Volume Bot

A production-ready Pump.fun volume bot for Solana with a secure Telegram control panel. It manages a fleet of sub-wallets, builds and extends an Address Lookup Table (LUT) for compact v0 transactions, and executes randomized buy/sell cycles to generate on-chain volume. Includes safeguards, rate limits, and operational controls.


## ✨ Features

- **Telegram control panel**: Start/stop, configure SOL per swap, slippage, target token, sleep time, and trigger maintenance actions.
- **Wallet orchestration**: Create and load sub-wallets from `wallets.json` with restrictive permissions where possible.
- **LUT lifecycle**: Create, load, and extend a lookup table (`lut.json`) to fit large instruction sets into v0 transactions.
- **Jito bundle support**: Submit critical transactions via Jito for potential MEV protection and inclusion speed (with optional tip).
- **Distribution and collection**:
  - Distribute SOL from the main wallet to sub-wallets.
  - Collect SOL from sub-wallets back to the main wallet.
- **Swap engine**: Randomized buy-then-sell cycles per wallet chunk with compute budget tuning and basic guardrails.
- **Sell-all**: Attempt to liquidate all target tokens across sub-wallets.
- **Safety checks**: Slippage bounds, balance checks, simulated sends in select flows, and file permission hints.


## 📦 Requirements

- Node.js 18+
- Yarn or npm
- A Solana RPC endpoint (e.g., Helius, QuickNode, Triton, or your own)
- A funded Solana wallet private key (base58-encoded 64-byte secret key)
- A Telegram bot token and your Telegram user ID(s)


## ⚡ Quick Start

1) Clone and install

```bash
git clone https://github.com/xtoshi999/Smart_Pumpfun_Volume_Bot.git
cd Smart_Pumpfun_Volume_Bot
# Using yarn
yarn install
# or npm
# npm install
```

2) Create .env

Create a `.env` file in the project root with:

```env
RPC_URL=YOUR_SOLANA_RPC_URL
PRIVATE_KEY=YOUR_MAIN_WALLET_PRIVATE_KEY_BS58
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_ALLOWED_USER_IDS="123456789,987654321"
# Optional overrides
# JITO_TIP_AMOUNT_LAMPORTS=1000000   # default ~0.001 SOL
# NODE_ENV=development_open          # DEV ONLY: opens bot to anyone (unsafe)
```

Security tip (POSIX):
```bash
chmod 600 .env
```

3) Start the Telegram controller

```bash
yarn bot
# or
# npm run bot
```

4) Open Telegram and send /settings to your bot

- Use the inline buttons to configure:
  - SOL/Swap
  - Slippage (0.1%–50%)
  - Token (Pump.fun CA)
  - Sleep time between cycles
  - Start/Stop bot
  - Sell All Tokens
  - Collect All SOL


## 📜 Scripts

- `yarn bot` — Run the Telegram controller (`bot.ts`).
- `yarn start` — Run the standalone entry (`index.ts`) for direct testing.
- `yarn build` — TypeScript build.
- `yarn lint` — Lint the project.


## 🛠️ Configuration Reference

Defined in `src/config.ts` and overridable via Telegram UI or env vars:

- `DefaultDistributeAmountLamports` — default SOL per sub-wallet (lamports)
- `DefaultJitoTipAmountLamports` — default Jito tip (lamports)
- `DefaultSlippage` — default slippage fraction (e.g., 0.5 = 50%)
- `DefaultCA` — default target token CA placeholder

Required env vars (process will exit if missing):
- `RPC_URL`
- `PRIVATE_KEY`
- `TELEGRAM_BOT_TOKEN`

Access control:
- `TELEGRAM_ALLOWED_USER_IDS` — comma-separated numeric IDs. If empty and not in `development_open`, access is denied.


## 🔬 How It Works

- `wallets.json`: Stores generated sub-wallet secret keys (base58). Created automatically when needed. Attempts to set read-only perms.
- `lut.json`: Stores the created LUT address. Used to compile v0 messages with address tables for compact transactions.
- Swap loop:
  - Chunks sub-wallets.
  - For each wallet, computes buy and immediate sell with randomized SOL sizes, ATA creation/closure, and guardrails.
  - Uses compute-unit budget settings and optionally Jito tips.


## 🧭 Operational Guidance

- Fund your main wallet sufficiently before starting. The bot estimates costs and will warn for low balance.
- Start small. Test on mainnet with tiny amounts or on a private RPC to validate your setup.
- Keep slippage conservative. High slippage increases loss/MEV risk.
- Prefer private, reliable RPC endpoints.
- Windows note: POSIX file permissions (chmod) may not apply; handle secrets appropriately.


## 🧩 Troubleshooting

- Bot exits on startup:
  - Ensure `RPC_URL`, `PRIVATE_KEY`, and `TELEGRAM_BOT_TOKEN` exist in `.env`.
- Unauthorized in Telegram:
  - Add your numeric user ID(s) to `TELEGRAM_ALLOWED_USER_IDS`.
- Failing token validation:
  - Verify the token is a valid Pump.fun mint and reachable via your RPC.
- LUT errors:
  - Let the bot create one if `lut.json` is missing, then wait ~20–30s for chain visibility.
- Transaction too large:
  - The bot already chunks instructions, but very large sets may still exceed limits. Reduce wallets per cycle if needed.


## 🔐 Security Considerations

- Your `.env` contains the main wallet private key. Keep it secret and locked down.
- If the host is compromised, `wallets.json` sub-wallet keys can be stolen.
- Do not enable `development_open` outside local testing.
- Jito bundles and slippage are risk mitigations, not guarantees.


## ⚠️ Disclaimer

This software interacts with decentralized markets and carries inherent financial and technical risks. There are no performance guarantees. Use at your own risk and responsibility.



## 📬 Contact

- Telegram: [@xtoshi999](https://t.me/xtoshi999)
