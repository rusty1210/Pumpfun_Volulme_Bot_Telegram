import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import * as spl from "@solana/spl-token";
import {
  PUMP_FUN_PROGRAM,
  GLOBAL_CONFIG,
  SYSTEM_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM,
  ASSOC_TOKEN_ACC_PROG,
  EVENT_AUTHORITY,
} from "./constants";

// Pumpfun instruction discriminators
export const PUMP_FUN_DISCRIMINATORS = {
  BUY: Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]), // buy instruction
  SELL: Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]), // sell instruction
};

// Helper function to create buy instruction
export function createBuyInstruction(
  pool: PublicKey,
  user: PublicKey,
  globalConfig: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  userBaseTokenAccount: PublicKey,
  userQuoteTokenAccount: PublicKey,
  poolBaseTokenAccount: PublicKey,
  poolQuoteTokenAccount: PublicKey,
  protocolFeeRecipient: PublicKey,
  protocolFeeRecipientTokenAccount: PublicKey,
  baseTokenProgram: PublicKey,
  quoteTokenProgram: PublicKey,
  eventAuthority: PublicKey,
  program: PublicKey,
  baseAmountOut: number,
  maxQuoteAmountIn: number
): TransactionInstruction {
  const data = Buffer.concat([
    PUMP_FUN_DISCRIMINATORS.BUY,
    Buffer.alloc(8), // base_amount_out (u64)
    Buffer.alloc(8), // max_quote_amount_in (u64)
  ]);
  
  // Write the amounts as little-endian u64
  data.writeBigUInt64LE(BigInt(baseAmountOut), 8);
  data.writeBigUInt64LE(BigInt(maxQuoteAmountIn), 16);

  return new TransactionInstruction({
    programId: PUMP_FUN_PROGRAM,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: false },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: globalConfig, isSigner: false, isWritable: false },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: quoteMint, isSigner: false, isWritable: false },
      { pubkey: userBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: protocolFeeRecipient, isSigner: false, isWritable: false },
      { pubkey: protocolFeeRecipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: baseTokenProgram, isSigner: false, isWritable: false },
      { pubkey: quoteTokenProgram, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOC_TOKEN_ACC_PROG, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: program, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// Helper function to create sell instruction
export function createSellInstruction(
  pool: PublicKey,
  user: PublicKey,
  globalConfig: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  userBaseTokenAccount: PublicKey,
  userQuoteTokenAccount: PublicKey,
  poolBaseTokenAccount: PublicKey,
  poolQuoteTokenAccount: PublicKey,
  protocolFeeRecipient: PublicKey,
  protocolFeeRecipientTokenAccount: PublicKey,
  baseTokenProgram: PublicKey,
  quoteTokenProgram: PublicKey,
  eventAuthority: PublicKey,
  program: PublicKey,
  baseAmountIn: number,
  minQuoteAmountOut: number
): TransactionInstruction {
  const data = Buffer.concat([
    PUMP_FUN_DISCRIMINATORS.SELL,
    Buffer.alloc(8), // base_amount_in (u64)
    Buffer.alloc(8), // min_quote_amount_out (u64)
  ]);
  
  // Write the amounts as little-endian u64
  data.writeBigUInt64LE(BigInt(baseAmountIn), 8);
  data.writeBigUInt64LE(BigInt(minQuoteAmountOut), 16);

  return new TransactionInstruction({
    programId: PUMP_FUN_PROGRAM,
    keys: [
      { pubkey: pool, isSigner: false, isWritable: false },
      { pubkey: user, isSigner: true, isWritable: true },
      { pubkey: globalConfig, isSigner: false, isWritable: false },
      { pubkey: baseMint, isSigner: false, isWritable: false },
      { pubkey: quoteMint, isSigner: false, isWritable: false },
      { pubkey: userBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolBaseTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolQuoteTokenAccount, isSigner: false, isWritable: true },
      { pubkey: protocolFeeRecipient, isSigner: false, isWritable: false },
      { pubkey: protocolFeeRecipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: baseTokenProgram, isSigner: false, isWritable: false },
      { pubkey: quoteTokenProgram, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOC_TOKEN_ACC_PROG, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: program, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// Helper function to get pool address
export function getPoolAddress(
  index: number,
  creator: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey
): PublicKey {
  const [poolAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      Buffer.alloc(2), // index as u16
      creator.toBuffer(),
      baseMint.toBuffer(),
      quoteMint.toBuffer(),
    ],
    PUMP_FUN_PROGRAM
  );
  
  // Write index as little-endian u16
  const indexBuffer = Buffer.alloc(2);
  indexBuffer.writeUInt16LE(index, 0);
  
  const [correctPoolAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      indexBuffer,
      creator.toBuffer(),
      baseMint.toBuffer(),
      quoteMint.toBuffer(),
    ],
    PUMP_FUN_PROGRAM
  );
  
  return correctPoolAddress;
}

// Helper function to get pool token accounts
export function getPoolTokenAccounts(
  pool: PublicKey,
  baseMint: PublicKey,
  quoteMint: PublicKey
): { poolBaseTokenAccount: PublicKey; poolQuoteTokenAccount: PublicKey } {
  const [poolBaseTokenAccount] = PublicKey.findProgramAddressSync(
    [
      pool.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      baseMint.toBuffer(),
    ],
    ASSOC_TOKEN_ACC_PROG
  );

  const [poolQuoteTokenAccount] = PublicKey.findProgramAddressSync(
    [
      pool.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      quoteMint.toBuffer(),
    ],
    ASSOC_TOKEN_ACC_PROG
  );

  return { poolBaseTokenAccount, poolQuoteTokenAccount };
}

// Helper function to get protocol fee recipient token account
export function getProtocolFeeRecipientTokenAccount(
  protocolFeeRecipient: PublicKey,
  quoteMint: PublicKey
): PublicKey {
  const [tokenAccount] = PublicKey.findProgramAddressSync(
    [
      protocolFeeRecipient.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      quoteMint.toBuffer(),
    ],
    ASSOC_TOKEN_ACC_PROG
  );
  
  return tokenAccount;
}

// Helper function to get event authority
export function getEventAuthority(): PublicKey {
  const [eventAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    PUMP_FUN_PROGRAM
  );
  
  return eventAuthority;
}
