import {
    Connection,
    Keypair,
    PublicKey,
    TransactionInstruction, 
    SystemProgram, 
    LAMPORTS_PER_SOL,
    ComputeBudgetProgram,
    TransactionMessage,
    VersionedTransaction
} from "@solana/web3.js";
import {
    createAssociatedTokenAccountIdempotentInstruction,
    getAssociatedTokenAddress,
    getAssociatedTokenAddressSync
} from "@solana/spl-token";
import { PumpSwap, IDL } from "./IDL";
import { sendBundle } from './jito/bundle';
import {
    getBuyTokenAmount, 
    calculateWithSlippageBuy, 
    getPumpSwapPool,
    getPoolReserves
} from "./pool";
import { logger } from "./utils/logger";

// Define static public keys
const PUMP_AMM_PROGRAM_ID: PublicKey = new PublicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA');
const ASSOCIATED_TOKEN_PROGRAM_ID: PublicKey = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const TOKEN_PROGRAM_ID: PublicKey = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const WSOL_TOKEN_ACCOUNT: PublicKey = new PublicKey('So11111111111111111111111111111111111111112');
const global = new PublicKey('ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw');
const eventAuthority = new PublicKey('GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR');
const feeRecipient = new PublicKey('62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV');
const feeRecipientAta = new PublicKey('94qWNrtmfn42h3ZjUZwWvK1MEo9uVmmrBPd2hpNjYDjb');
const BUY_DISCRIMINATOR: Uint8Array = new Uint8Array([102,6,61,18,1,218,235,234]);
const SELL_DISCRIMINATOR: Uint8Array = new Uint8Array([51,230,133,164,1,127,131,173]);

export const DEFAULT_DECIMALS = 6;

export class PumpSwapSDK {
    public connection: Connection;
    
    constructor(connection: Connection) {
        this.connection = connection;
    }

    public async buy(mint: PublicKey, user: Keypair, solToBuy: number) {
        try {
            console.log("🛒 [PUMPFUN] Starting BUY operation...");
            console.log("📍 [PUMPFUN] Token:", mint.toBase58());
            console.log("👤 [PUMPFUN] User:", user.publicKey.toBase58());
            console.log("💰 [PUMPFUN] SOL to buy:", solToBuy);
            
            const bought_token_amount = await getBuyTokenAmount(
                BigInt(solToBuy * LAMPORTS_PER_SOL), 
                mint, 
                this.connection
            );
            console.log("🎯 [PUMPFUN] Expected token amount:", bought_token_amount.toString());
            
            const amount_after_slippage = calculateWithSlippageBuy(bought_token_amount, 500n);
            console.log("📊 [PUMPFUN] Amount after slippage:", amount_after_slippage.toString());
            
            console.log("🔍 [PUMPFUN] Finding pumpswap pool for", mint.toBase58());
            
            const pool = await getPumpSwapPool(mint, this.connection);
            console.log("✅ [PUMPFUN] Pool found:", pool.toBase58());
            
            const pumpswap_buy_tx = await this.createBuyInstruction(
                pool, 
                user.publicKey, 
                mint, 
                amount_after_slippage, 
                BigInt(solToBuy * LAMPORTS_PER_SOL)
            );
            console.log("🔧 [PUMPFUN] Buy instruction created");
            
            const ata = getAssociatedTokenAddressSync(mint, user.publicKey);
            console.log("🏦 [PUMPFUN] Associated token account:", ata.toBase58());
            
            const ix_list: TransactionInstruction[] = [
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200000, // Increased compute units
                }),
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 1000000 // Increased priority fee
                }),
                createAssociatedTokenAccountIdempotentInstruction(
                    user.publicKey,
                    ata,
                    user.publicKey,
                    mint
                ),
                pumpswap_buy_tx
            ];

            console.log("📝 [PUMPFUN] Transaction instructions prepared:", ix_list.length);
            
            const latestBlockhash = await this.connection.getLatestBlockhash();
            console.log("🕐 [PUMPFUN] Latest blockhash:", latestBlockhash.blockhash.substring(0, 8) + "...");

            const messageV0 = new TransactionMessage({
                payerKey: user.publicKey,
                recentBlockhash: latestBlockhash.blockhash,
                instructions: ix_list,
            }).compileToV0Message();
            
            const transaction = new VersionedTransaction(messageV0);
            transaction.sign([user]);
            console.log("✍️ [PUMPFUN] Transaction signed");
            
            console.log("🚀 [PUMPFUN] Sending buy transaction via JITO bundle...");
            const bundleId = await sendBundle(false, latestBlockhash.blockhash, transaction, pool, user);
            console.log("✅ [PUMPFUN] Buy transaction submitted! Bundle ID:", bundleId);
            
            return bundleId;
            
        } catch (error: any) {
            console.error("❌ [PUMPFUN] Error in buy operation:", error.message);
            console.error("🔍 [PUMPFUN] Full error:", error);
            throw error;
        }
    }

    public async sell_exactAmount(mint: PublicKey, user: Keypair, tokenAmount: number) {
        try {
            const sell_token_amount = tokenAmount;
            
            logger.info({
                status: `finding pumpswap pool for ${mint.toBase58()}`
            });
            
            const pool = await getPumpSwapPool(mint, this.connection);
            const pumpswap_sell_tx = await this.createSellInstruction(
                pool, 
                user.publicKey, 
                mint, 
                BigInt(Math.floor(sell_token_amount * 10**6)), 
                BigInt(0)
            );
            
            const ata = getAssociatedTokenAddressSync(mint, user.publicKey);
            const ix_list: TransactionInstruction[] = [
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 70000,
                }),
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 696969
                }),
                createAssociatedTokenAccountIdempotentInstruction(
                    user.publicKey,
                    ata,
                    user.publicKey,
                    mint
                ),
                pumpswap_sell_tx
            ];

            const latestBlockhash = await this.connection.getLatestBlockhash();
            const messageV0 = new TransactionMessage({
                payerKey: user.publicKey,
                recentBlockhash: latestBlockhash.blockhash,
                instructions: ix_list,
            }).compileToV0Message();
            
            const transaction = new VersionedTransaction(messageV0);
            transaction.sign([user]);
            
            sendBundle(false, latestBlockhash.blockhash, transaction, pool, user);
            
        } catch (error: any) {
            logger.error(`Error in sell_exactAmount: ${error.message}`);
            throw error;
        }
    }

    public async sell_percentage(mint: PublicKey, user: Keypair, percentage_to_sell: number) {
        try {
            console.log("💸 [PUMPFUN] Starting SELL operation...");
            console.log("📍 [PUMPFUN] Token:", mint.toBase58());
            console.log("👤 [PUMPFUN] User:", user.publicKey.toBase58());
            console.log("📊 [PUMPFUN] Percentage to sell:", (percentage_to_sell * 100).toFixed(2) + "%");
            
            // Get token balance
            const ata = getAssociatedTokenAddressSync(mint, user.publicKey);
            console.log("🏦 [PUMPFUN] Checking token account:", ata.toBase58());
            
            const tokenAccountInfo = await this.connection.getTokenAccountBalance(ata);
            const holding_token_amount = tokenAccountInfo.value.uiAmount || 0;
            const sell_token_amount = percentage_to_sell * holding_token_amount;
            
            console.log("💰 [PUMPFUN] Current token balance:", holding_token_amount);
            console.log("🎯 [PUMPFUN] Tokens to sell:", sell_token_amount);
            
            if (sell_token_amount <= 0) {
                console.log("⚠️ [PUMPFUN] No tokens to sell, skipping...");
                return "";
            }
            
            console.log("🔍 [PUMPFUN] Finding pumpswap pool for", mint.toBase58());
            
            const pool = await getPumpSwapPool(mint, this.connection);
            console.log("✅ [PUMPFUN] Pool found:", pool.toBase58());
            
            const pumpswap_sell_tx = await this.createSellInstruction(
                pool, 
                user.publicKey, 
                mint, 
                BigInt(Math.floor(sell_token_amount * 10**6)), 
                BigInt(0)
            );
            console.log("🔧 [PUMPFUN] Sell instruction created");
            
            const ix_list: TransactionInstruction[] = [
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200000, // Increased compute units
                }),
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 1000000 // Increased priority fee
                }),
                createAssociatedTokenAccountIdempotentInstruction(
                    user.publicKey,
                    ata,
                    user.publicKey,
                    mint
                ),
                pumpswap_sell_tx
            ];

            console.log("📝 [PUMPFUN] Transaction instructions prepared:", ix_list.length);

            const latestBlockhash = await this.connection.getLatestBlockhash();
            console.log("🕐 [PUMPFUN] Latest blockhash:", latestBlockhash.blockhash.substring(0, 8) + "...");
            
            const messageV0 = new TransactionMessage({
                payerKey: user.publicKey,
                recentBlockhash: latestBlockhash.blockhash,
                instructions: ix_list,
            }).compileToV0Message();
            
            const transaction = new VersionedTransaction(messageV0);
            transaction.sign([user]);
            console.log("✍️ [PUMPFUN] Transaction signed");
            
            console.log("🚀 [PUMPFUN] Sending sell transaction via JITO bundle...");
            const bundleId = await sendBundle(true, latestBlockhash.blockhash, transaction, pool, user);
            console.log("✅ [PUMPFUN] Sell transaction submitted! Bundle ID:", bundleId);
            
            return bundleId;
            
        } catch (error: any) {
            console.error("❌ [PUMPFUN] Error in sell_percentage:", error.message);
            console.error("🔍 [PUMPFUN] Full error:", error);
            throw error;
        }
    }

    async createBuyInstruction(
        poolId: PublicKey,
        user: PublicKey,
        mint: PublicKey,
        baseAmountOut: bigint,
        maxQuoteAmountIn: bigint
    ): Promise<TransactionInstruction> {
        
        // Compute associated token account addresses
        const userBaseTokenAccount = await getAssociatedTokenAddress(mint, user);
        const userQuoteTokenAccount = await getAssociatedTokenAddress(WSOL_TOKEN_ACCOUNT, user);
        const poolBaseTokenAccount = await getAssociatedTokenAddress(mint, poolId, true);
        const poolQuoteTokenAccount = await getAssociatedTokenAddress(WSOL_TOKEN_ACCOUNT, poolId, true);
    
        // Define the accounts for the instruction
        const accounts = [
            { pubkey: poolId, isSigner: false, isWritable: false }, // pool_id (readonly)
            { pubkey: user, isSigner: true, isWritable: true }, // user (signer)
            { pubkey: global, isSigner: false, isWritable: false }, // global (readonly)
            { pubkey: mint, isSigner: false, isWritable: false }, // mint (readonly)
            { pubkey: WSOL_TOKEN_ACCOUNT, isSigner: false, isWritable: false }, // WSOL_TOKEN_ACCOUNT (readonly)
            { pubkey: userBaseTokenAccount, isSigner: false, isWritable: true }, // user_base_token_account
            { pubkey: userQuoteTokenAccount, isSigner: false, isWritable: true }, // user_quote_token_account
            { pubkey: poolBaseTokenAccount, isSigner: false, isWritable: true }, // pool_base_token_account
            { pubkey: poolQuoteTokenAccount, isSigner: false, isWritable: true }, // pool_quote_token_account
            { pubkey: feeRecipient, isSigner: false, isWritable: false }, // fee_recipient (readonly)
            { pubkey: feeRecipientAta, isSigner: false, isWritable: true }, // fee_recipient_ata
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // TOKEN_PROGRAM_ID (readonly)
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // TOKEN_PROGRAM_ID (readonly, duplicated as in Rust)
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System Program (readonly)
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // ASSOCIATED_TOKEN_PROGRAM_ID (readonly)
            { pubkey: eventAuthority, isSigner: false, isWritable: false }, // event_authority (readonly)
            { pubkey: PUMP_AMM_PROGRAM_ID, isSigner: false, isWritable: false }, // PUMP_AMM_PROGRAM_ID (readonly)
        ];
    
        // Pack the instruction data: discriminator (8 bytes) + base_amount_in (8 bytes) + min_quote_amount_out (8 bytes)
        const data = Buffer.alloc(8 + 8 + 8); // 24 bytes total
        data.set(BUY_DISCRIMINATOR, 0); 
        data.writeBigUInt64LE(BigInt(baseAmountOut), 8); // Write base_amount_in as little-endian u64
        data.writeBigUInt64LE(BigInt(maxQuoteAmountIn), 16); // Write min_quote_amount_out as little-endian u64
    
        // Create the transaction instruction
        return new TransactionInstruction({
            keys: accounts,
            programId: PUMP_AMM_PROGRAM_ID,
            data: data,
        });
    }

    async createSellInstruction(
        poolId: PublicKey,
        user: PublicKey,
        mint: PublicKey,
        baseAmountIn: bigint,
        minQuoteAmountOut: bigint
    ): Promise<TransactionInstruction> {
        // Compute associated token account addresses
        const userBaseTokenAccount = await getAssociatedTokenAddress(mint, user);
        const userQuoteTokenAccount = await getAssociatedTokenAddress(WSOL_TOKEN_ACCOUNT, user);
        const poolBaseTokenAccount = await getAssociatedTokenAddress(mint, poolId, true);
        const poolQuoteTokenAccount = await getAssociatedTokenAddress(WSOL_TOKEN_ACCOUNT, poolId, true);
    
        // Define the accounts for the instruction
        const accounts = [
            { pubkey: poolId, isSigner: false, isWritable: false }, // pool_id (readonly)
            { pubkey: user, isSigner: true, isWritable: true }, // user (signer)
            { pubkey: global, isSigner: false, isWritable: false }, // global (readonly)
            { pubkey: mint, isSigner: false, isWritable: false }, // mint (readonly)
            { pubkey: WSOL_TOKEN_ACCOUNT, isSigner: false, isWritable: false }, // WSOL_TOKEN_ACCOUNT (readonly)
            { pubkey: userBaseTokenAccount, isSigner: false, isWritable: true }, // user_base_token_account
            { pubkey: userQuoteTokenAccount, isSigner: false, isWritable: true }, // user_quote_token_account
            { pubkey: poolBaseTokenAccount, isSigner: false, isWritable: true }, // pool_base_token_account
            { pubkey: poolQuoteTokenAccount, isSigner: false, isWritable: true }, // pool_quote_token_account
            { pubkey: feeRecipient, isSigner: false, isWritable: false }, // fee_recipient (readonly)
            { pubkey: feeRecipientAta, isSigner: false, isWritable: true }, // fee_recipient_ata
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // TOKEN_PROGRAM_ID (readonly)
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // TOKEN_PROGRAM_ID (readonly, duplicated as in Rust)
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System Program (readonly)
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // ASSOCIATED_TOKEN_PROGRAM_ID (readonly)
            { pubkey: eventAuthority, isSigner: false, isWritable: false }, // event_authority (readonly)
            { pubkey: PUMP_AMM_PROGRAM_ID, isSigner: false, isWritable: false }, // PUMP_AMM_PROGRAM_ID (readonly)
        ];
    
        // Pack the instruction data: discriminator (8 bytes) + base_amount_in (8 bytes) + min_quote_amount_out (8 bytes)
        const data = Buffer.alloc(8 + 8 + 8); // 24 bytes total
        data.set(SELL_DISCRIMINATOR, 0); 
        data.writeBigUInt64LE(BigInt(baseAmountIn), 8); // Write base_amount_in as little-endian u64
        data.writeBigUInt64LE(BigInt(minQuoteAmountOut), 16); // Write min_quote_amount_out as little-endian u64
    
        // Create the transaction instruction
        return new TransactionInstruction({
            keys: accounts,
            programId: PUMP_AMM_PROGRAM_ID,
            data: data,
        });
    }
}
