import { PerfectPumpfunVolumeBot } from "./index";
import { connection } from "./src/config";

console.log("🚀 [EXAMPLE] Starting PUMPFUN-VOLUME-BOT example...");
console.log("=".repeat(60));

// Example usage of the Perfect Pump.fun Volume Bot
async function example() {
    try {
        console.log("🎯 [EXAMPLE] Initializing bot with token address...");
        
        // Initialize the bot with a token address
        // Note: The original token might not have an active Pump.fun pool
        // You can replace this with any valid Pump.fun token address
        const tokenAddress = "5wVtfsFhLjxm27K9mN3ziYWCCpQwXXq7HWUiRMW7pump";
        console.log("📍 [EXAMPLE] Token address:", tokenAddress);
        console.log("💡 [EXAMPLE] If this token fails, try using a different Pump.fun token with an active WSOL pool");
        
        const bot = new PerfectPumpfunVolumeBot(tokenAddress);
        console.log("✅ [EXAMPLE] Bot initialized successfully!");

        console.log("\n🔍 [EXAMPLE] Step 1: Getting pump data...");
        // Get pump data (finds the correct pool automatically)
        await bot.getPumpData();
        console.log("🏊 [EXAMPLE] Pool address:", bot.poolAddress.toBase58());

        console.log("\n👛 [EXAMPLE] Step 2: Creating and loading wallets...");
        // Create and load wallets
        bot.createWallets(10);
        bot.loadWallets();
        console.log("✅ [EXAMPLE] Wallets created and loaded!");

        console.log("\n📋 [EXAMPLE] Step 3: Creating and extending lookup table...");
        // Create and extend lookup table
        await bot.createLUT();
        await bot.extendLUT();
        console.log("✅ [EXAMPLE] Lookup table created and extended!");

        console.log("\n💰 [EXAMPLE] Step 4: Distributing SOL to wallets...");
        // Distribute SOL to wallets
        await bot.distributeSOL();
        console.log("✅ [EXAMPLE] SOL distributed to wallets!");

        console.log("\n🔄 [EXAMPLE] Step 5: Performing volume trading...");
        // Perform volume trading
        await bot.swap();
        console.log("✅ [EXAMPLE] Volume trading completed!");

        console.log("\n💸 [EXAMPLE] Step 6: Selling all tokens...");
        // Sell all tokens when done
        await bot.sellAllTokensFromWallets();
        console.log("✅ [EXAMPLE] All tokens sold!");

        console.log("\n🔄 [EXAMPLE] Step 7: Collecting remaining SOL...");
        // Collect remaining SOL
        await bot.collectSOL();
        console.log("✅ [EXAMPLE] SOL collection completed!");

        console.log("\n🎉 [EXAMPLE] Volume bot operations completed successfully!");
        console.log("=".repeat(60));

    } catch (error: any) {
        console.error("❌ [EXAMPLE] Error:", error.message);
        console.error("🔍 [EXAMPLE] Full error:", error);
        console.log("\n💡 [EXAMPLE] Make sure you have:");
        console.log("   - Valid RPC_URL in .env file");
        console.log("   - Valid PRIVATE_KEY in .env file");
        console.log("   - Valid TELEGRAM_BOT_TOKEN in .env file");
        console.log("   - Sufficient SOL balance in your wallet");
        console.log("   - Valid token address with active Pump.fun pool");
    }
}

// Check environment variables before running
if (!process.env.RPC_URL || !process.env.PRIVATE_KEY || !process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ [EXAMPLE] Missing required environment variables!");
    console.log("💡 [EXAMPLE] Please create a .env file with:");
    console.log("   RPC_URL=https://your-rpc-endpoint.com");
    console.log("   PRIVATE_KEY=your_base58_encoded_private_key");
    console.log("   TELEGRAM_BOT_TOKEN=your_telegram_bot_token");
    console.log("   JITO_TIP_AMOUNT_LAMPORTS=1000000");
    console.log("   BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf");
    process.exit(1);
}

example();
