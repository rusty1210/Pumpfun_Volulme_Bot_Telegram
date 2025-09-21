import {
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  Connection,
} from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import bs58 from "bs58";
import { PumpSwapSDK } from "./src/pumpswap";
import { getPumpSwapPool, getPoolReserves, getPrice } from "./src/pool";
import { connection, userKeypair } from "./src/config";
import { logger } from "./src/utils/logger";
import fs from "fs";
import base58 from "bs58";

const WALLETS_JSON = "wallets.json";
const LUT_JSON = "./lut.json";

const FEE_ATA_LAMPORTS = 2039280;

export class PerfectPumpfunVolumeBot {
  slippage: number;
  mint: PublicKey;
  poolAddress!: PublicKey;
  keypairs!: Keypair[];
  pumpswapSDK: PumpSwapSDK;
  lookupTableAccount!: AddressLookupTableAccount;
  distributeAmountLamports: number;
  jitoTipAmountLamports: number;

  constructor(
    CA: string,
    customDistributeAmountLamports?: number,
    customSlippage?: number
  ) {
    this.slippage = customSlippage || 0.5;
    this.mint = new PublicKey(CA);
    this.pumpswapSDK = new PumpSwapSDK(connection);
    this.distributeAmountLamports = customDistributeAmountLamports || 0.004 * LAMPORTS_PER_SOL;
    this.jitoTipAmountLamports = 1000000; // 0.001 SOL

    if (this.slippage <= 0 || this.slippage > 0.5) {
      logger.warn(`Warning: Slippage is set to ${this.slippage * 100}%. Recommended range is 0.1% to 50%.`);
    }
  }

  async getPumpData() {
    console.log("🔍 [BOT] Getting pump data for token:", this.mint.toBase58());
    try {
      const tokenAccount = await connection.getAccountInfo(this.mint);
      if (!tokenAccount) {
        throw new Error("Invalid token address: Token account does not exist");
      }
      console.log("✅ [BOT] Token account verified");

      // Get the actual pool address using the correct method
      console.log("🏊 [BOT] Finding PumpSwap pool...");
      this.poolAddress = await getPumpSwapPool(this.mint, connection);
      console.log("✅ [BOT] Pool found:", this.poolAddress.toBase58());
      
      // Get real-time pool data
      console.log("📊 [BOT] Fetching pool reserves...");
      const reserves = await getPoolReserves(this.mint, connection);
      const price = await getPrice(this.mint, connection);

      console.log("🏊 [BOT] Pool address:", this.poolAddress.toBase58());
      console.log("💰 [BOT] Pool reserves:", JSON.stringify(reserves));
      console.log("💲 [BOT] Current price:", price);
      console.log("✅ [BOT] Pump data loaded successfully!");

    } catch (error: any) {
      console.error("❌ [BOT] Error getting pump data:", error.message);
      console.error("🔍 [BOT] Full error:", error);
      throw new Error("Failed to get pump data. Please check token address and RPC.");
    }
  }

  createWallets(total = 10) {
    logger.info(`Creating ${total} new wallets...`);
    const pks = [];
    for (let i = 0; i < total; i++) {
      const wallet = Keypair.generate();
      pks.push(base58.encode(wallet.secretKey));
    }
    fs.writeFileSync(WALLETS_JSON, JSON.stringify(pks, null, 2));
    try {
      fs.chmodSync(WALLETS_JSON, 0o400);
      logger.info(`Created ${WALLETS_JSON} and set permissions to read-only for owner.`);
    } catch (chmodError) {
      logger.warn(`Could not set permissions for ${WALLETS_JSON} (this might happen on Windows): ${chmodError}`);
    }
  }

  loadWallets(total = 10) {
    if (!fs.existsSync(WALLETS_JSON)) {
      logger.info(`${WALLETS_JSON} not found. Creating new wallets.`);
      this.createWallets(total);
    }
    const keypairs = [];
    const walletsData = JSON.parse(fs.readFileSync(WALLETS_JSON, "utf8"));
    for (const walletSecret of walletsData) {
      const keypair = Keypair.fromSecretKey(base58.decode(walletSecret));
      keypairs.push(keypair);
      if (keypairs.length >= total) break;
    }

    if (keypairs.length <= 0) throw new Error("No wallets loaded or found. Create wallets.json first or ensure it's not empty.");
    logger.info(`${keypairs.length} wallets are loaded`);
    this.keypairs = keypairs;
  }

  async collectSOL() {
    logger.info("Collecting SOL from sub-wallets...");
    if (!this.keypairs || this.keypairs.length === 0) {
      throw new Error("No wallets loaded to collect SOL from.");
    }
    if (!this.lookupTableAccount) {
      await this.loadLUT();
      if (!this.lookupTableAccount) {
        throw new Error("Lookup table not loaded and could not be loaded. Please create LUT first.");
      }
    }
    
    let remainKeypairs = [];
    for (const keypair of this.keypairs) {
      const solBalance = await connection.getBalance(keypair.publicKey);
      if (solBalance > 0) {
        remainKeypairs.push(keypair);
      }
    }
    this.keypairs = remainKeypairs;
    
    const chunkedKeypairs = this.chunkArray(this.keypairs, 8);
    const rawTxns = [];
    
    for (let i = 0; i < chunkedKeypairs.length; i++) {
      const keypairsInChunk = chunkedKeypairs[i];
      const instructions: TransactionInstruction[] = [];

      for (const keypair of keypairsInChunk) {
        const solBalance = await connection.getBalance(keypair.publicKey);
        if (solBalance > 0) {
          const amountToTransfer = (keypair.publicKey.equals(userKeypair.publicKey))
            ? 0
            : solBalance;

          if (amountToTransfer > 0) {
            const transferIns = SystemProgram.transfer({
              fromPubkey: keypair.publicKey,
              toPubkey: userKeypair.publicKey,
              lamports: amountToTransfer,
            });
            instructions.push(transferIns);
          }
        }
      }

      if (instructions.length === 0) continue;

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: userKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message([this.lookupTableAccount]);

      const vTxn = new VersionedTransaction(messageV0);

      const signers = keypairsInChunk.filter(kp =>
        instructions.some(ix =>
          ix.keys.some(k => k.isSigner && k.pubkey.equals(kp.publicKey))
        )
      );
      vTxn.sign([userKeypair, ...signers]);

      const rawTxn = vTxn.serialize();
      logger.info(`Collect SOL Txn length: ${rawTxn.length}`);
      if (rawTxn.length > 1232) {
        logger.error("Collect SOL Transaction too large, trying smaller chunks might be needed.");
        continue;
      }

      try {
        const sig = await connection.sendRawTransaction(rawTxn, {
          skipPreflight: true,
          maxRetries: 3,
          preflightCommitment: 'confirmed'
        });
        logger.info(`Sent regular SOL collection tx: ${sig}`);
      } catch (simError: any) {
        logger.error(`Error during Collect SOL: ${simError.message}`);
        continue;
      }
    }
  }

  async distributeSOL() {
    logger.info("Distributing SOL to sub-wallets...");
    if (this.distributeAmountLamports <= FEE_ATA_LAMPORTS) {
      logger.error(
        `Distribute SOL amount per wallet should be larger than ${
          (FEE_ATA_LAMPORTS / LAMPORTS_PER_SOL).toFixed(5)
        } SOL to cover potential fees.`
      );
      throw new Error("Distribution amount too low.");
    }
    if (!this.keypairs || this.keypairs.length === 0) {
      throw new Error("No wallets loaded to distribute SOL to.");
    }
    if (!this.lookupTableAccount) {
      await this.loadLUT();
      if (!this.lookupTableAccount) {
        throw new Error("Lookup table not loaded and could not be loaded. Please create LUT first.");
      }
    }

    const walletsToDistribute = this.keypairs.filter(kp => !kp.publicKey.equals(userKeypair.publicKey));
    if (walletsToDistribute.length === 0) {
      logger.info("No sub-wallets (excluding main wallet) to distribute SOL to.");
      return;
    }
    
    const totalSolRequired: number = this.distributeAmountLamports * walletsToDistribute.length + this.jitoTipAmountLamports;

    const instructions: TransactionInstruction[] = [];
    const solBal = await connection.getBalance(userKeypair.publicKey);
    if (solBal < totalSolRequired) {
      logger.error(
        `Insufficient SOL balance in main wallet: Need ${
          (totalSolRequired / LAMPORTS_PER_SOL).toFixed(5)
        } SOL, have ${(solBal / LAMPORTS_PER_SOL).toFixed(5)} SOL`
      );
      throw new Error("Insufficient SOL in main wallet for distribution.");
    }

    for (const keypair of walletsToDistribute) {
      const transferIns = SystemProgram.transfer({
        fromPubkey: userKeypair.publicKey,
        toPubkey: keypair.publicKey,
        lamports: this.distributeAmountLamports,
      });
      instructions.push(transferIns);
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: userKeypair.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message([this.lookupTableAccount]);

    const vTxn = new VersionedTransaction(messageV0);
    vTxn.sign([userKeypair]);
    const rawTxn = vTxn.serialize();
    logger.info(`Distribute SOL Txn length: ${rawTxn.length}`);
    if (rawTxn.length > 1232) {
      throw new Error("Distribute SOL transaction too large. Try reducing number of wallets or use multiple transactions.");
    }

    try {
      const sig = await connection.sendRawTransaction(rawTxn, {
        skipPreflight: true,
        maxRetries: 3,
        preflightCommitment: 'confirmed'
      });
      logger.info(`Sent regular SOL distribution tx: ${sig}`);
      const confirmation = await connection.confirmTransaction({
        signature: sig,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight
      }, "confirmed");
    } catch (e: any) {
      logger.error(`Error distributing SOL: ${e.message}`);
      throw new Error("Failed to distribute SOL.");
    }
  }

  async createLUT() {
    try {
      logger.info("Creating new lookup table...");
      const solBalance = await connection.getBalance(userKeypair.publicKey);
      const estimatedCost = 0.0025 * LAMPORTS_PER_SOL + this.jitoTipAmountLamports;

      if (solBalance < estimatedCost) {
        throw new Error(
          `Insufficient SOL balance. Need at least ${estimatedCost / LAMPORTS_PER_SOL} SOL for LUT creation. Current balance: ${solBalance / LAMPORTS_PER_SOL} SOL`
        );
      }

      let slot = await connection.getSlot("finalized");
      slot = slot > 20 ? slot - 20 : slot;
      logger.info(`Using slot for LUT creation: ${slot}`);

      const [createTi, lutAddress] = AddressLookupTableProgram.createLookupTable({
        authority: userKeypair.publicKey,
        payer: userKeypair.publicKey,
        recentSlot: slot,
      });

      let { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const messageV0 = new TransactionMessage({
        payerKey: userKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions: [createTi],
      }).compileToV0Message();

      const vTxn = new VersionedTransaction(messageV0);
      vTxn.sign([userKeypair]);
      const rawTxn = vTxn.serialize();

      logger.info(`Create LUT Txn length: ${rawTxn.length}`);
      if (rawTxn.length > 1232) throw new Error("Create LUT transaction too large");

      const sig = await connection.sendTransaction(vTxn, { skipPreflight: true });
      logger.info(`Sent regular LUT creation tx: ${sig}`);
      const confirmation = await connection.confirmTransaction({
        signature: sig,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight
      }, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`Regular LUT creation transaction failed confirmation: ${JSON.stringify(confirmation.value.err)}`);
      }
      logger.info(`Regular LUT creation transaction confirmed: ${sig}`);

      fs.writeFileSync(LUT_JSON, JSON.stringify(lutAddress.toBase58()));
      try {
        fs.chmodSync(LUT_JSON, 0o600);
        logger.info(`Created ${LUT_JSON} and set permissions.`);
      } catch (chmodError) {
        logger.warn(`Could not set permissions for ${LUT_JSON}: ${chmodError}`);
      }

      logger.info("Waiting for LUT to be confirmed and retrievable...");
      await this.sleepTime(25000);

      const lutAccount = await connection.getAddressLookupTable(lutAddress);
      if (!lutAccount.value) {
        throw new Error(
          "LUT creation failed - account not found after creation and delay. Check explorer."
        );
      }
      this.lookupTableAccount = lutAccount.value;
      logger.info(`LUT created successfully: ${lutAddress.toBase58()}`);

    } catch (e: any) {
      logger.error(`Error creating LUT: ${e.message}`);
      throw new Error(`Failed to create Lookup Table.`);
    }
  }

  async extendLUT() {
    try {
      logger.info("Extending lookup table...");
      if (!fs.existsSync(LUT_JSON)) {
        throw new Error(
          "LUT.json not found. Please create LUT first using the bot or manually."
        );
      }

      const lutAddressString = JSON.parse(fs.readFileSync(LUT_JSON, "utf8"));
      const lutPubkey = new PublicKey(lutAddressString);
      logger.info(`Extending LUT: ${lutPubkey.toBase58()}`);

      const lutAccountCheck = await connection.getAddressLookupTable(lutPubkey);
      if (!lutAccountCheck.value) {
        throw new Error(
          "Lookup Table account not found. Please create LUT first."
        );
      }
      this.lookupTableAccount = lutAccountCheck.value;

      if (!this.keypairs || this.keypairs.length === 0) {
        this.loadWallets();
      }
      if (!this.mint || !this.poolAddress) {
        await this.getPumpData();
        if (!this.mint || !this.poolAddress) throw new Error("Cannot extend LUT: Mint CA or pool data not loaded.");
      }

      logger.info(`Preparing to add up to ${this.keypairs.length} sub-wallets and their ATAs to LUT.`);

      const ataTokenPayer = await spl.getAssociatedTokenAddress(
        this.mint,
        userKeypair.publicKey
      );
      const ataWSOLPayer = await spl.getAssociatedTokenAddress(
        spl.NATIVE_MINT,
        userKeypair.publicKey
      );

      let accountsToAddSet = new Set<string>();

      [userKeypair.publicKey, ataTokenPayer, ataWSOLPayer, this.mint,
      this.poolAddress, spl.NATIVE_MINT, SystemProgram.programId, 
      spl.TOKEN_PROGRAM_ID, spl.ASSOCIATED_TOKEN_PROGRAM_ID
      ].forEach(acc => accountsToAddSet.add(acc.toBase58()));

      for (const keypair of this.keypairs) {
        const ataToken = await spl.getAssociatedTokenAddress(
          this.mint,
          keypair.publicKey
        );
        const ataWSOL = await spl.getAssociatedTokenAddress(
          spl.NATIVE_MINT,
          keypair.publicKey
        );
        accountsToAddSet.add(keypair.publicKey.toBase58());
        accountsToAddSet.add(ataToken.toBase58());
        accountsToAddSet.add(ataWSOL.toBase58());
      }

      const existingAddresses = new Set(this.lookupTableAccount.state.addresses.map(addr => addr.toBase58()));
      let finalAccountsToAdd = Array.from(accountsToAddSet).filter(accB58 => !existingAddresses.has(accB58)).map(b58 => new PublicKey(b58));

      if (finalAccountsToAdd.length === 0) {
        logger.info("No new unique accounts to add to the LUT.");
        return;
      }

      // Calculate how many more addresses we can add
      const currentLength = this.lookupTableAccount.state.addresses.length;
      const remainingSlots = 256 - currentLength;

      if (remainingSlots <= 0) {
        logger.info("LUT is already at maximum capacity (256 addresses). Cannot add more addresses.");
        return;
      }

      // Only add up to the remaining slots
      finalAccountsToAdd = finalAccountsToAdd.slice(0, remainingSlots);
      logger.info(`Found ${finalAccountsToAdd.length} new unique accounts to add to LUT (${remainingSlots} slots remaining).`);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const accountChunks = this.chunkArray(finalAccountsToAdd, 10);

      for (let i = 0; i < accountChunks.length; i++) {
        const chunk = accountChunks[i];
        const extendIx = AddressLookupTableProgram.extendLookupTable({
          lookupTable: lutPubkey,
          authority: userKeypair.publicKey,
          payer: userKeypair.publicKey,
          addresses: chunk,
        });

        const messageV0 = new TransactionMessage({
          payerKey: userKeypair.publicKey,
          recentBlockhash: blockhash,
          instructions: [extendIx],
        }).compileToV0Message();

        const vTxn = new VersionedTransaction(messageV0);
        vTxn.sign([userKeypair]);
        const rawTxnItem = vTxn.serialize();
        if (rawTxnItem.length > 1232) {
          logger.error(`Extend LUT transaction too large. Chunk: ${i}`);
          continue;
        }

        try {
          const sig = await connection.sendRawTransaction(rawTxnItem, {
            skipPreflight: true,
            maxRetries: 3,
            preflightCommitment: 'confirmed'
          });
          logger.info(`Sent extend LUT tx: ${sig}`);
        } catch (e: any) {
          logger.error(`Error extending LUT: ${e.message}`);
          continue;
        }
      }

    } catch (e: any) {
      logger.error(`Error extending LUT: ${e.message}`);
      throw new Error(`Failed to extend Lookup Table.`);
    }
  }

  async loadLUT() {
    logger.info("Loading lookup table...");
    if (!fs.existsSync(LUT_JSON)) {
      logger.warn(
        `${LUT_JSON} not found. Bot will attempt to create one if needed.`
      );
      this.lookupTableAccount = undefined!;
      return;
    }
    const lutAddressString = JSON.parse(fs.readFileSync(LUT_JSON, "utf8"));
    if (!lutAddressString) {
      logger.error("LUT address in lut.json is empty or invalid.");
      this.lookupTableAccount = undefined!;
      return;
    }
    logger.info(`LUT address from file: ${lutAddressString}`);
    const lutPubkey = new PublicKey(lutAddressString);

    const lookupTableAccountResult = await connection.getAddressLookupTable(
      lutPubkey
    );

    if (lookupTableAccountResult.value === null) {
      logger.error(`Lookup table account ${lutPubkey.toBase58()} not found on-chain!`);
      this.lookupTableAccount = undefined!;
      return;
    }
    this.lookupTableAccount = lookupTableAccountResult.value;
    logger.info(`Lookup table loaded successfully. Last extended slot: ${this.lookupTableAccount.state.lastExtendedSlot}`);
  }

  async swap() {
    try {
      console.log("🔄 [BOT] Starting BUY/SELL swap cycle...");
      console.log("📊 [BOT] Total wallets:", this.keypairs?.length || 0);
      
      if (!this.keypairs || this.keypairs.length === 0) throw new Error("Wallets not loaded.");
      if (!this.lookupTableAccount) {
        console.log("🔍 [BOT] Loading lookup table...");
        await this.loadLUT();
        if (!this.lookupTableAccount) throw new Error("LUT not loaded and could not be loaded.");
      }
      if (!this.mint || !this.poolAddress) {
        console.log("🔍 [BOT] Loading pump data...");
        await this.getPumpData();
        if (!this.mint || !this.poolAddress) throw new Error("Pump data could not be loaded.");
      }

      const chunkedKeypairs = this.chunkArray(this.keypairs, 3);
      console.log("📦 [BOT] Processing", chunkedKeypairs.length, "chunks of wallets");

      for (let i = 0; i < chunkedKeypairs.length; i++) {
        const keypairsInChunk = chunkedKeypairs[i];
        console.log(`🔄 [BOT] Processing chunk ${i + 1}/${chunkedKeypairs.length} (${keypairsInChunk.length} wallets)`);

        for (const keypair of keypairsInChunk) {
          const walletShort = keypair.publicKey.toBase58().substring(0, 8);
          const solBalance = await connection.getBalance(keypair.publicKey);
          const requiredForFees = FEE_ATA_LAMPORTS;

          console.log(`👛 [BOT] Wallet ${walletShort}: ${(solBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`);

          if (solBalance <= requiredForFees) {
            console.log(`⚠️ [BOT] Skipping wallet ${walletShort}: Insufficient balance for swap`);
            continue;
          } else if (solBalance >= 0.5 * LAMPORTS_PER_SOL) {
            // Transfer excess SOL to main wallet
            console.log(`💸 [BOT] Transferring excess SOL from wallet ${walletShort}`);
            const transferAmount = solBalance - 0.005 * LAMPORTS_PER_SOL;
            const transferIns = SystemProgram.transfer({
              fromPubkey: keypair.publicKey,
              toPubkey: userKeypair.publicKey,
              lamports: transferAmount,
            });
            
            const { blockhash } = await connection.getLatestBlockhash();
            const messageV0 = new TransactionMessage({
              payerKey: keypair.publicKey,
              recentBlockhash: blockhash,
              instructions: [transferIns],
            }).compileToV0Message([this.lookupTableAccount]);

            const vTxn = new VersionedTransaction(messageV0);
            vTxn.sign([keypair]);
            
            try {
              const sig = await connection.sendRawTransaction(vTxn.serialize(), {
                skipPreflight: true,
                maxRetries: 3,
                preflightCommitment: 'confirmed'
              });
              console.log(`✅ [BOT] Transfer excess SOL tx: ${sig}`);
            } catch (e: any) {
              console.error(`❌ [BOT] Error transferring excess SOL: ${e.message}`);
            }
          } else {
            const availableForSwap = solBalance - requiredForFees;
            const solAmountForSwap = Math.floor(availableForSwap * (0.6 + Math.random() * 0.2));

            if (solAmountForSwap <= 1000) {
              console.log(`⚠️ [BOT] Skipping wallet ${walletShort}: Amount too low for swap`);
              continue;
            }

            console.log(`🚀 [BOT] Starting swap cycle for wallet ${walletShort}`);
            console.log(`💰 [BOT] SOL amount for swap: ${(solAmountForSwap / LAMPORTS_PER_SOL).toFixed(6)}`);

            try {
              // Use the correct PumpSwapSDK for buy
              console.log(`🛒 [BOT] Executing BUY for wallet ${walletShort}...`);
              await this.pumpswapSDK.buy(this.mint, keypair, solAmountForSwap / LAMPORTS_PER_SOL);
              
              // Wait a bit before selling
              const waitTime = 1000 + Math.random() * 2000;
              console.log(`⏳ [BOT] Waiting ${waitTime}ms before selling...`);
              await this.sleepTime(waitTime);
              
              // Sell all tokens (100% of holdings)
              console.log(`💸 [BOT] Executing SELL for wallet ${walletShort}...`);
              await this.pumpswapSDK.sell_percentage(this.mint, keypair, 1.0);
              
              console.log(`✅ [BOT] Completed buy/sell cycle for wallet ${walletShort}`);
              
            } catch (error: any) {
              console.error(`❌ [BOT] Error in swap cycle for wallet ${walletShort}: ${error.message}`);
            }
          }
        }
      }
      console.log("🎉 [BOT] Swap cycle completed!");
    } catch (error: any) {
      console.error("❌ [BOT] Error during swap cycle:", error.message);
      console.error("🔍 [BOT] Full error:", error);
    }
  }

  async sellAllTokensFromWallets() {
    logger.info("Selling all tokens from sub-wallets...");
    if (!this.keypairs || this.keypairs.length === 0) throw new Error("Wallets not loaded.");
    if (!this.lookupTableAccount) {
      await this.loadLUT();
      if (!this.lookupTableAccount) throw new Error("LUT not loaded and could not be loaded.");
    }
    if (!this.mint || !this.poolAddress) {
      await this.getPumpData();
      if (!this.mint || !this.poolAddress) throw new Error("Pump data could not be loaded for selling.");
    }

    for (const keypair of this.keypairs) {
      try {
        // Use the correct PumpSwapSDK for selling
        await this.pumpswapSDK.sell_percentage(this.mint, keypair, 1.0);
        logger.info(`Sold all tokens for wallet ${keypair.publicKey.toBase58().substring(0, 5)}`);
      } catch (error: any) {
        logger.error(`Error selling tokens for wallet ${keypair.publicKey.toBase58().substring(0, 5)}: ${error.message}`);
      }
    }
  }

  // Utility functions
  private chunkArray<T>(array: T[], size: number): T[][] {
    if (size <= 0) {
      throw new Error("Chunk size must be greater than 0.");
    }
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
      array.slice(i * size, i * size + size)
    );
  }

  private async sleepTime(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}