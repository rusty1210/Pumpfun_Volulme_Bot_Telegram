import { PublicKey, SystemProgram } from "@solana/web3.js";

// Pumpfun AMM Program Constants - CORRECT ADDRESSES
export const PUMP_FUN_PROGRAM = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"
);

// Global config PDA - CORRECT ADDRESS
export const GLOBAL_CONFIG = new PublicKey(
  "ADyA8hdefvWN2dbGGWFotbzWxrAvLW83WG6QCVXvJKqw"
);

// System program constants
export const SYSTEM_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111111"
);
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
export const TOKEN_2022_PROGRAM = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);
export const ASSOC_TOKEN_ACC_PROG = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
export const RENT = new PublicKey(
  "SysvarRent111111111111111111111111111111111"
);

// Event authority PDA - CORRECT ADDRESS
export const EVENT_AUTHORITY = new PublicKey(
  "GS4CU59F31iL7aR2Q8zVS8DRrcRnXX1yjQ66TqNVQnaR"
);

// CORRECT FEE RECIPIENTS
export const FEE_RECIPIENT = new PublicKey(
  "62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV"
);
export const FEE_RECIPIENT_ATA = new PublicKey(
  "94qWNrtmfn42h3ZjUZwWvK1MEo9uVmmrBPd2hpNjYDjb"
);

// Legacy constants for backward compatibility
export const GLOBAL = GLOBAL_CONFIG;
export const FEE_VAULT = new PublicKey(
  "DyVSLTLXm7G8QKn84Zaz3PxcorNuw39NvE4C8Ag873L2"
);
export const PUMP_FUN_ACCOUNT = EVENT_AUTHORITY;
export const MAX_LIMIT = 5;

