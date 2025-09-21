import { 
    Connection,
    PublicKey, 
    Keypair, 
    VersionedTransaction, 
    MessageV0,
    LAMPORTS_PER_SOL,
    SystemProgram,
    TransactionMessage,
    ComputeBudgetProgram
} from '@solana/web3.js';
import { Bundle } from './types';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import {
    ChannelCredentials,
    ChannelOptions,
    ClientReadableStream,
    ServiceError,
} from '@grpc/grpc-js';
import { SearcherServiceClient } from 'jito-ts/dist/gen/block-engine/searcher'
import { SearcherClient } from "./searcher-client";
import { logger } from '../utils/logger';

const blockEngineUrl = process.env.BLOCK_ENGINE_URL || 'https://mainnet.block-engine.jito.wtf';
console.log("🔗 [JITO] Block Engine URL:", blockEngineUrl);

export const searcherClientAdv = (
    url: string,
    authKeypair: Keypair | undefined,
    grpcOptions?: Partial<ChannelOptions>
): SearcherServiceClient => {
    console.log("🔧 [JITO] Creating searcher client...");
    const client: SearcherServiceClient = new SearcherServiceClient(
        url,
        ChannelCredentials.createSsl(),
        { ...grpcOptions }
    );
    
    return client;
}

// build a searcher client
const searcher_client: any = searcherClientAdv(blockEngineUrl, undefined, {
    "grpc.max_receive_message_length": 64 * 1024 * 1024, // 64MiB
});

// construct a searcher bot
const searcher_bot = new SearcherClient(searcher_client);

// Get Tip Accounts
let tipAccounts: string[] = [];
(async () => {
    try {
        tipAccounts = await searcher_bot.getTipAccounts();
        console.log("✅ [JITO] Tip accounts loaded:", tipAccounts.length);
    } catch (error) {
        console.error("❌ [JITO] Failed to load tip accounts:", error);
    }
})();

// Send bundle to Jito
export async function sendBundle(
    isSell: boolean, 
    latestBlockhash: string, 
    transaction: VersionedTransaction, 
    poolId: PublicKey, 
    masterKeypair: Keypair
) {
    try {
        console.log(`🚀 [JITO] Sending ${isSell ? 'SELL' : 'BUY'} bundle to JITO...`);
        console.log("📍 [JITO] Pool ID:", poolId.toBase58());
        console.log("👤 [JITO] User:", masterKeypair.publicKey.toBase58());
        
        if (tipAccounts.length === 0) {
            console.warn("⚠️ [JITO] No tip accounts available, using fallback");
            tipAccounts = [
                "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
                "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
                "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY"
            ];
        }
        
        const _tipAccount = tipAccounts[Math.floor(Math.random() * tipAccounts.length)];
        const tipAccount = new PublicKey(_tipAccount);
        console.log("💰 [JITO] Selected tip account:", tipAccount.toBase58());
        
        const b: Bundle = new Bundle([transaction], 4);
        let jito_tips = 0.001; // Increased tip amount for better inclusion
        
        console.log("💸 [JITO] Adding tip transaction:", jito_tips, "SOL");
        
        // Create tip transaction
        const tipInstruction = SystemProgram.transfer({
            fromPubkey: masterKeypair.publicKey,
            toPubkey: tipAccount,
            lamports: jito_tips * LAMPORTS_PER_SOL,
        });
        
        const tipMessageV0 = new TransactionMessage({
            payerKey: masterKeypair.publicKey,
            recentBlockhash: latestBlockhash,
            instructions: [
                ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 }),
                tipInstruction
            ],
        }).compileToV0Message();
        
        const tipTransaction = new VersionedTransaction(tipMessageV0);
        tipTransaction.sign([masterKeypair]);
        
        b.addTipTx(
            masterKeypair,
            jito_tips * LAMPORTS_PER_SOL,    
            tipAccount,
            latestBlockhash
        );
        
        console.log("📦 [JITO] Bundle prepared with", b.getTransactions().length, "transactions");
        
        const uuid = await searcher_bot.sendBundle(b);
        
        console.log("✅ [JITO] Bundle sent successfully!");
        console.log("🔗 [JITO] Bundle UUID:", uuid);
        console.log("📊 [JITO] DexScreener:", `https://dexscreener.com/solana/${poolId.toBase58()}?maker=${masterKeypair.publicKey.toBase58()}`);
        
        return uuid;
    } catch (error: any) {
        console.error("❌ [JITO] Error sending bundle:", error.message);
        console.error("🔍 [JITO] Full error:", error);
        return ""; 
    }
}
