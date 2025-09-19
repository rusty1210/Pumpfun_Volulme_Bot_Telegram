import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import base58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

// --- Essential Configurations - Bot will not run without these ---
if (!process.env.RPC_URL) {
    console.error("FATAL: RPC_URL not set in .env file. Please provide a Solana RPC endpoint.");
    process.exit(1);
}
export const RPC_URL = process.env.RPC_URL;
export const connection = new Connection(RPC_URL!, "confirmed");

if (!process.env.PRIVATE_KEY) {
    console.error("FATAL: PRIVATE_KEY not set in .env file. Please add your main wallet's secret key.");
    process.exit(1);
}
export const userKeypair = Keypair.fromSecretKey(base58.decode(process.env.PRIVATE_KEY!));
// Export private key string for debugging/logging
// export const privateKeyString = base58.encode(userKeypair.secretKey);

if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("FATAL: TELEGRAM_BOT_TOKEN not set in .env file.");
    process.exit(1);
}
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Auto-capture first user ID functionality
let capturedUserId: number | null = null;
const USER_ID_FILE = 'telegram_user_id.json';

// Function to load captured user ID from file
export function loadCapturedUserId(): number | null {
    try {
        if (require('fs').existsSync(USER_ID_FILE)) {
            const data = require('fs').readFileSync(USER_ID_FILE, 'utf8');
            const parsed = JSON.parse(data);
            capturedUserId = parsed.userId;
            console.log(`Loaded captured Telegram user ID: ${capturedUserId}`);
            return capturedUserId;
        }
    } catch (error) {
        console.error("Error loading captured user ID:", error);
    }
    return null;
}

// Function to save captured user ID to file
export function saveCapturedUserId(userId: number): void {
    try {
        const data = JSON.stringify({ userId, timestamp: new Date().toISOString() });
        require('fs').writeFileSync(USER_ID_FILE, data);
        capturedUserId = userId;
        console.log(`Captured and saved Telegram user ID: ${userId}`);
    } catch (error) {
        console.error("Error saving captured user ID:", error);
    }
}

// Function to get current captured user ID
export function getCapturedUserId(): number | null {
    return capturedUserId;
}

// Load user ID on startup
loadCapturedUserId();

// Legacy support for manual user ID setting (optional)
const rawAllowedUserIds = process.env.TELEGRAM_ALLOWED_USER_IDS || "";
const manualUserIds = rawAllowedUserIds
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id) && id > 0);

if (manualUserIds.length > 0) {
    console.log("Manual Telegram user IDs from .env:", manualUserIds);
    if (capturedUserId === null) {
        capturedUserId = manualUserIds[0];
        saveCapturedUserId(capturedUserId);
    }
} else if (capturedUserId === null) {
    console.log("No Telegram user ID configured. The first user to interact with the bot will be automatically authorized.");
}


// --- Default Operational Parameters (can be overridden by Telegram bot settings) ---
export const DefaultDistributeAmountLamports = 0.004 * LAMPORTS_PER_SOL;
export const DefaultJitoTipAmountLamports = parseInt(process.env.JITO_TIP_AMOUNT_LAMPORTS || "1000000");
export const DefaultCA = 'YOUR_DEFAULT_PUMP_FUN_TOKEN_CA_HERE_OR_LEAVE_AS_EXAMPLE'; // Example: 6YGUi1TCwEMLqSmFfPjT9dVp7RWGVye17kqvaqhwpump
export const DefaultSlippage = 0.5;

console.log(`Default Jito Tip Amount: ${DefaultJitoTipAmountLamports} lamports`);
if (DefaultCA.includes('YOUR_DEFAULT') || DefaultCA.length < 32) {
    console.warn(`Warning: DefaultCA in src/config.ts is a placeholder ("${DefaultCA}"). The Telegram bot will require you to set a token address via /settings.`);
}