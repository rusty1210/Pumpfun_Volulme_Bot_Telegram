
import { VersionedTransaction, Keypair, PublicKey } from '@solana/web3.js';

export class Bundle {
    private transactions: VersionedTransaction[];
    private maxRetries: number;

    constructor(transactions: VersionedTransaction[], maxRetries: number = 3) {
        this.transactions = transactions;
        this.maxRetries = maxRetries;
        console.log("📦 [BUNDLE] Created bundle with", transactions.length, "transactions");
    }

    addTipTx(
        payer: Keypair,
        tipAmount: number,
        tipAccount: PublicKey,
        blockhash: string
    ) {
        console.log("💰 [BUNDLE] Adding tip transaction:", tipAmount / 1e9, "SOL");
        // Note: The actual tip transaction creation is handled in bundle.ts
        // This method is kept for compatibility but the real implementation
        // creates the tip transaction separately
    }

    addTransaction(transaction: VersionedTransaction) {
        this.transactions.push(transaction);
        console.log("➕ [BUNDLE] Added transaction to bundle. Total:", this.transactions.length);
    }

    getTransactions(): VersionedTransaction[] {
        return this.transactions;
    }

    getMaxRetries(): number {
        return this.maxRetries;
    }

    getTransactionCount(): number {
        return this.transactions.length;
    }
}
