# 🚀 Telegram Pump Volume Bot 📈

## 🌊 Welcome to Pumpfun VolumeX Bot

Pumpfun VolumeX Bot is a powerful automation tool designed for the Pumpfun platform.
It streamlines SPL token activity by:

- 💸 Distributing SOL across multiple wallets
- 🔄 Executing continuous buy & sell transactions using those wallets
- 📈 Boosting on-chain volume and liquidity for your chosen SPL tokens

With its high-speed, multi-wallet strategy, Pumpfun VolumeX Bot gives your token activity a smooth, automated edge — no manual juggling required.


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
- A Telegram bot token (user ID will be auto-captured)


## ⚡ Quick Start

1) Clone and install

```bash
git clone https://github.com/xtoshi999/Pumpfun_VolumeX_Bot_Telegram.git
cd Pumpfun_VolumeX_Bot_Telegram

npm install
```

2) Create .env

Create a `.env` file in the project root with:

```.env
RPC_URL=https://mainnet.helius-rpc.com/?api-key=e8d507be-2912-4b40-85fa-67b9b83988e4
PRIVATE_KEY=YOUR_MAIN_WALLET_PRIVATE_KEY_BS58
TELEGRAM_BOT_TOKEN=8357570116:AAFSO49Iz7e2bdbzAs1XhBzS4aeaInV3hVg // You can input your own Telegram Bot Token ID
```

3) Start the Telegram controller

```bash
npm run bot
```

4) Open Telegram and send /settings to your bot

- **First time**: The first user to interact with the bot will be automatically authorized
  - Search @Pump_VolumeX_Bot on Telegram
  - Enter /start to authorize
  - Enter /help to set configuration
- Use the inline buttons to configure and start trading:
  - SOL/Swap
  - Slippage (0.1%–50%)
  - Token (Pump.fun CA)
  - Sleep time between cycles
  - Start/Stop bot
  - Sell All Tokens
  - Collect All SOL


## 📜 Scripts

- `npm run bot` — Run the Telegram controller (`bot.ts`).
- `npm run start` — Run the standalone entry (`index.ts`) for direct testing.
- `npm run build` — TypeScript build.
- `npm run lint` — Lint the project.


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
- **Auto-capture mode** (default): The first user to interact with the bot is automatically authorized
- `TELEGRAM_ALLOWED_USER_IDS` — Optional: comma-separated numeric IDs for manual user management


## 🔬 How It Works

- `wallets.json`: Stores generated sub-wallet secret keys (base58). Created automatically when needed. Attempts to set read-only perms.
- `lut.json`: Stores the created LUT address. Used to compile v0 messages with address tables for compact transactions.
- `telegram_user_id.json`: Stores the automatically captured Telegram user ID for authorization.
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
  - The first user to interact with the bot is automatically authorized
  - If you need to change the authorized user, delete `telegram_user_id.json` and restart the bot
- Failing token validation:
  - Verify the token is a valid Pump.fun mint and reachable via your RPC.
- LUT errors:
  - Let the bot create one if `lut.json` is missing, then wait ~20–30s for chain visibility.
- Transaction too large:
  - The bot already chunks instructions, but very large sets may still exceed limits. Reduce wallets per cycle if needed.


## 🔐 Security Considerations

- Your `.env` contains the main wallet private key. Keep it secret and locked down.
- If the host is compromised, `wallets.json` sub-wallet keys can be stolen.
- The `telegram_user_id.json` file contains the authorized user ID - keep it secure.
- Jito bundles and slippage are risk mitigations, not guarantees.


## 🎯 Conclusion

This bot automates the process of buying and selling tokens on the Solana blockchain using specified parameters and cycles. It integrates with Telegram to provide a user-friendly interface for monitoring and configuring the bot.

Enjoy your trading! 🚀📈



## 📬 Contact Me

- Telegram: [@xtoshi999](https://t.me/xtoshi999)
### 🌹 You're always welcome! 🌹
