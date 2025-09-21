import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import base58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

console.log("🚀 [CONFIG] Loading PUMPFUN-VOLUME-BOT configuration...");

// --- Essential Configurations - Bot will not run without these ---
if (!process.env.RPC_URL) {
    console.error("❌ [FATAL] RPC_URL not set in .env file. Please provide a Solana RPC endpoint.");
    console.log("💡 [HELP] Create a .env file with: RPC_URL=https://your-rpc-endpoint.com");
    process.exit(1);
}
export const RPC_URL = process.env.RPC_URL;
console.log("✅ [CONFIG] RPC_URL loaded:", RPC_URL);

// Create connection with better configuration for handling rate limits
export const connection = new Connection(RPC_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false,
    httpHeaders: {
        'User-Agent': 'PumpFun-Volume-Bot/1.0.0'
    }
});
console.log("✅ [CONFIG] Solana connection established with rate limit handling");

if (!process.env.PRIVATE_KEY) {
    console.error("❌ [FATAL] PRIVATE_KEY not set in .env file. Please add your main wallet's secret key.");
    console.log("💡 [HELP] Add to .env: PRIVATE_KEY=your_base58_encoded_private_key");
    process.exit(1);
}

// Validate private key format
let userKeypair: Keypair;
try {
    const decodedKey = base58.decode(process.env.PRIVATE_KEY!);
    if (decodedKey.length !== 64) {
        throw new Error("Private key must be 64 bytes (base58 encoded)");
    }
    userKeypair = Keypair.fromSecretKey(decodedKey);
    console.log("✅ [CONFIG] Private key loaded successfully");
    console.log("📍 [CONFIG] Wallet address:", userKeypair.publicKey.toBase58());
} catch (error: any) {
    console.error("❌ [FATAL] Invalid PRIVATE_KEY format:", error.message);
    console.log("💡 [HELP] Private key must be a valid base58 encoded 64-byte secret key");
    process.exit(1);
}

export { userKeypair };

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("❌ [FATAL] TELEGRAM_BOT_TOKEN not set in .env file.");
    console.log("💡 [HELP] Add to .env: TELEGRAM_BOT_TOKEN=your_telegram_bot_token");
    process.exit(1);
}
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
console.log("✅ [CONFIG] Telegram bot token loaded");



// --- Default Operational Parameters (can be overridden by Telegram bot settings) ---
export const DefaultDistributeAmountLamports = 0.004 * LAMPORTS_PER_SOL;
export const DefaultJitoTipAmountLamports = parseInt(process.env.JITO_TIP_AMOUNT_LAMPORTS || "1000000");
export const DefaultCA = '6YGUi1TCwEMLqSmFfPjT9dVp7RWGVye17kqvaqhwpump'; // Example: 6YGUi1TCwEMLqSmFfPjT9dVp7RWGVye17kqvaqhwpump
export const DefaultSlippage = 0.5;

// JITO Bundle Engine URL
export const BLOCK_ENGINE_URL = process.env.BLOCK_ENGINE_URL || 'https://mainnet.block-engine.jito.wtf';

console.log(`Default Jito Tip Amount: ${DefaultJitoTipAmountLamports} lamports`);
if (DefaultCA.includes('YOUR_DEFAULT') || DefaultCA.length < 32) {
    console.warn(`Warning: DefaultCA in src/config.ts is a placeholder ("${DefaultCA}"). The Telegram bot will require you to set a token address via /settings.`);
}