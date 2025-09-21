# Perfect Pump.fun Volume Bot

A **PERFECT** volume bot for Pump.fun tokens that uses the correct PumpSwapSDK and JITO bundles for accurate and efficient transaction processing.

## ✅ **FIXED ISSUES**

This bot has been completely rewritten to fix all the critical issues found in the original implementation:

- ✅ **Correct Pool Discovery**: Uses proper `getPoolsWithBaseMintQuoteWSOL()` to find actual pools
- ✅ **Real-time Price Calculation**: Uses `getBuyTokenAmount()` with actual pool reserves
- ✅ **Proper Slippage**: Uses `calculateWithSlippageBuy()` with basis points
- ✅ **Correct Constants**: Uses proper Pump.fun addresses and discriminators
- ✅ **JITO Bundle Integration**: Uses `jito-ts` library with proper bundle handling
- ✅ **IDL Integration**: Uses proper Anchor IDL for type safety
- ✅ **Accurate Swap Logic**: Implements correct bonding curve mechanics

## 🚀 **Features**

- **Perfect PumpSwapSDK Integration**: Uses the correct SDK implementation
- **JITO Bundle Support**: MEV protection and faster transaction processing
- **Real-time Pool Data**: Fetches actual pool reserves and prices
- **Telegram Bot Control**: Remote control via Telegram with real-time status
- **Multi-Wallet Management**: Efficient wallet distribution and collection
- **Lookup Table Optimization**: Uses Address Lookup Tables for efficiency
- **Accurate Price Calculations**: Proper bonding curve math implementation
- **Slippage Protection**: Configurable slippage with basis points

## 📋 **Prerequisites**

- Node.js (v18 or higher)
- A Solana RPC endpoint
- A Telegram bot token
- SOL for gas fees and trading

## 🛠 **Installation**

1. Clone the repository:
```bash
git clone <repository-url>
cd Smart_Pumpfun_Volume_Bot
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file with your configuration:
```env
RPC_URL=https://your-solana-rpc-endpoint.com
PRIVATE_KEY=your_base58_encoded_private_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
JITO_TIP_AMOUNT_LAMPORTS=1000000
BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
```

## 🎯 **Usage**

### Telegram Bot Control

1. Start the Telegram bot:
```bash
npm run bot
```

2. Send `/start` to your Telegram bot to begin

3. Use the following commands:
   - `/help` - Show available commands
   - `/settings` - Configure bot parameters
   - `/start_bot` - Start volume operations
   - `/stop_bot` - Stop volume operations
   - `/status` - Check bot status

### Direct Usage

```typescript
import { PerfectPumpfunVolumeBot } from './index';

const bot = new PerfectPumpfunVolumeBot('YOUR_TOKEN_ADDRESS');
await bot.getPumpData(); // Finds correct pool automatically
bot.createWallets(10);
bot.loadWallets();
await bot.createLUT();
await bot.distributeSOL();
await bot.swap(); // Uses correct PumpSwapSDK
```

## ⚙️ **Configuration**

### Environment Variables

- `RPC_URL`: Your Solana RPC endpoint
- `PRIVATE_KEY`: Your wallet's private key (base58 encoded)
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `JITO_TIP_AMOUNT_LAMPORTS`: JITO tip amount in lamports (default: 1000000)
- `BLOCK_ENGINE_URL`: JITO block engine URL

### Bot Parameters

- **Slippage**: Configurable slippage tolerance (0.1% - 50%)
- **SOL Amount**: Amount of SOL to distribute to each wallet
- **Sleep Time**: Delay between swap cycles
- **Wallet Count**: Number of wallets to use for volume generation

## 🏗 **Architecture**

### Core Components

1. **PerfectPumpfunVolumeBot**: Main bot class with correct implementation
2. **PumpSwapSDK**: Correct SDK implementation with proper pool discovery
3. **JITO Bundle Service**: Manages JITO bundle transactions
4. **Pool Manager**: Handles pool discovery and price calculations
5. **Telegram Controller**: Handles Telegram bot interactions

### Transaction Flow

1. **Pool Discovery**: Automatically finds the correct Pump.fun pool using `getPoolsWithBaseMintQuoteWSOL()`
2. **Real-time Data**: Fetches actual pool reserves and prices
3. **Wallet Setup**: Creates and funds multiple wallets
4. **LUT Creation**: Creates and extends Address Lookup Tables
5. **Volume Generation**: Performs accurate buy/sell cycles using correct SDK
6. **SOL Collection**: Collects remaining SOL back to main wallet

## 🔒 **Safety Features**

- **Accurate Price Calculations**: Uses real pool data instead of placeholders
- **Proper Slippage Protection**: Implements basis points slippage calculation
- **Balance Validation**: Ensures sufficient funds before operations
- **Error Handling**: Comprehensive error handling and recovery
- **Transaction Simulation**: Simulates transactions before execution
- **Pool Validation**: Validates pool existence and trading status

## 📊 **Monitoring**

The bot provides real-time monitoring through:
- Console logs with detailed operation status
- Telegram notifications for important events
- Transaction signatures for tracking
- Real-time pool data and price information
- Balance updates and warnings

## 🔧 **Troubleshooting**

### Common Issues

1. **Pool Not Found**
   - Ensure the token is a valid Pump.fun token
   - Check if the token has an active pool

2. **Insufficient SOL Balance**
   - Ensure your main wallet has enough SOL for gas fees and trading
   - Check the estimated cost in the bot logs

3. **RPC Connection Issues**
   - Verify your RPC endpoint is working
   - Consider using a premium RPC service for better reliability

4. **Transaction Failures**
   - Check network congestion
   - Verify token address is valid
   - Ensure sufficient gas fees

### Logs

The bot provides detailed logging for debugging:
- Operation status updates
- Pool discovery information
- Transaction signatures
- Error messages with context
- Real-time balance information

## 📈 **Key Improvements**

### Before (Broken Implementation)
- ❌ Hardcoded pool index 0
- ❌ Placeholder virtual reserves
- ❌ Incorrect price calculation
- ❌ Wrong constants and addresses
- ❌ No proper pool discovery

### After (Perfect Implementation)
- ✅ Dynamic pool discovery
- ✅ Real-time pool reserves
- ✅ Accurate price calculations
- ✅ Correct constants and addresses
- ✅ Proper PumpSwapSDK integration

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details

## ⚠️ **Disclaimer**

This bot is for educational purposes only. Trading cryptocurrencies involves risk. Use at your own discretion and never invest more than you can afford to lose.

## 🆘 **Support**

For support and questions:
- Check the troubleshooting section
- Review the logs for error details
- Open an issue on GitHub

---

**Note**: This bot has been completely rewritten to fix all critical issues. Always test with small amounts first and ensure you understand the risks involved in automated trading.