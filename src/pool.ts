import { Program } from "@coral-xyz/anchor";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { IDL } from "./IDL";
import { logger } from "./utils/logger";

const PUMP_AMM_PROGRAM_ID: PublicKey = new PublicKey('pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA');
const WSOL_TOKEN_ACCOUNT: PublicKey = new PublicKey('So11111111111111111111111111111111111111112');

interface Pool {
    address: PublicKey;
    is_native_base: boolean;
    poolData: any;
}

interface PoolWithPrice extends Pool {
    price: number;
    reserves: {
        native: number;
        token: number;
    }
}

const getPoolsWithBaseMint = async (mintAddress: PublicKey, connection: Connection) => {
    try {
        const program = new Program(IDL, { connection });
        
        const response = await connection.getProgramAccounts(PUMP_AMM_PROGRAM_ID, {
            filters: [
                { "dataSize": 211 },
                {
                  "memcmp": {
                    "offset": 43,
                    "bytes": mintAddress.toBase58()
                  }
                }
              ],
            dataSlice: { offset: 0, length: 211 },
            commitment: 'confirmed'
        })

        const mappedPools = response.map((pool) => {
            try {
                const data = Buffer.from(pool.account.data);
                const poolData = program.coder.accounts.decode('pool', data);
                return {
                    address: pool.pubkey,
                    is_native_base: false,
                    poolData
                };
            } catch (error) {
                console.warn("⚠️ [POOL] Failed to decode pool data in getPoolsWithBaseMint:", pool.pubkey.toBase58());
                return null;
            }
        }).filter(pool => pool !== null);

        return mappedPools;
    } catch (error: any) {
        if (error.message.includes('deprioritized') || error.message.includes('pagination')) {
            console.log("⚠️ [POOL] getPoolsWithBaseMint: RPC rate limited");
            return [];
        }
        throw error;
    }
}

const getPoolsWithQuoteMint = async (mintAddress: PublicKey, connection: Connection) => {
    try {
        const program = new Program(IDL, { connection });
        
        const response = await connection.getProgramAccounts(PUMP_AMM_PROGRAM_ID, {
            filters: [
                { "dataSize": 211 },
                {
                  "memcmp": {
                    "offset": 75,
                    "bytes": mintAddress.toBase58()
                  }
                }
              ],
            dataSlice: { offset: 0, length: 211 },
            commitment: 'confirmed'
        })

        const mappedPools = response.map((pool) => {
            try {
                const data = Buffer.from(pool.account.data);
                const poolData = program.coder.accounts.decode('pool', data);
                return {
                    address: pool.pubkey,
                    is_native_base: true,
                    poolData
                };
            } catch (error) {
                console.warn("⚠️ [POOL] Failed to decode pool data in getPoolsWithQuoteMint:", pool.pubkey.toBase58());
                return null;
            }
        }).filter(pool => pool !== null);

        return mappedPools;
    } catch (error: any) {
        if (error.message.includes('deprioritized') || error.message.includes('pagination')) {
            console.log("⚠️ [POOL] getPoolsWithQuoteMint: RPC rate limited");
            return [];
        }
        throw error;
    }
}

const getPoolsWithBaseMintQuoteWSOL = async (mintAddress: PublicKey, connection: Connection) => {
    console.log("🔍 [POOL] Searching for pools with base mint:", mintAddress.toBase58());
    console.log("🔍 [POOL] Quote mint (WSOL):", WSOL_TOKEN_ACCOUNT.toBase58());
    
    try {
        const program = new Program(IDL, { connection });
        console.log("🔍 [POOL] Program initialized, searching for pools...");
        
        // Use a more targeted approach to avoid RPC limits
        console.log("🔍 [POOL] Using targeted search to avoid RPC rate limits...");
        
        try {
            // Try with smaller data slice first
            const response = await connection.getProgramAccounts(PUMP_AMM_PROGRAM_ID, {
                filters: [
                    { "dataSize": 211 },
                    {
                      "memcmp": {
                        "offset": 43,
                        "bytes": mintAddress.toBase58()
                      }
                    },
                    {
                        "memcmp": {
                          "offset": 75,
                          "bytes": WSOL_TOKEN_ACCOUNT.toBase58()
                        }
                    }
                  ],
                dataSlice: { offset: 0, length: 211 }, // Fetch full data
                commitment: 'confirmed'
            });
            
            console.log("🔍 [POOL] Found", response.length, "potential pools");
            
            if (response.length > 0) {
                const mappedPools = response.map((pool) => {
                    try {
                        const data = Buffer.from(pool.account.data);
                        const poolData = program.coder.accounts.decode('pool', data);
                        return {
                            address: pool.pubkey,
                            is_native_base: true,
                            poolData
                        };
                    } catch (error) {
                        console.warn("⚠️ [POOL] Failed to decode pool data:", pool.pubkey.toBase58());
                        return null;
                    }
                }).filter(pool => pool !== null);

                console.log("✅ [POOL] Successfully decoded", mappedPools.length, "pools");
                return mappedPools;
            }
            
        } catch (error: any) {
            if (error.message.includes('deprioritized') || error.message.includes('pagination')) {
                console.log("⚠️ [POOL] RPC rate limited, trying alternative search method...");
                
                // Alternative approach: Search for any pools with this mint first
                const altResponse = await connection.getProgramAccounts(PUMP_AMM_PROGRAM_ID, {
                    filters: [
                        { "dataSize": 211 },
                        {
                          "memcmp": {
                            "offset": 43,
                            "bytes": mintAddress.toBase58()
                          }
                        }
                      ],
                    dataSlice: { offset: 0, length: 211 },
                    commitment: 'confirmed'
                });
                
                console.log("🔍 [POOL] Found", altResponse.length, "pools with this mint");
                
                // Filter for WSOL pools
                const wsolPools = altResponse.filter((pool) => {
                    try {
                        const data = Buffer.from(pool.account.data);
                        const poolData = program.coder.accounts.decode('pool', data);
                        return poolData.quoteMint?.toBase58() === WSOL_TOKEN_ACCOUNT.toBase58();
                    } catch (error) {
                        return false;
                    }
                });
                
                console.log("🔍 [POOL] Found", wsolPools.length, "WSOL pools after filtering");
                
                const mappedPools = wsolPools.map((pool) => {
                    try {
                        const data = Buffer.from(pool.account.data);
                        const poolData = program.coder.accounts.decode('pool', data);
                        return {
                            address: pool.pubkey,
                            is_native_base: true,
                            poolData
                        };
                    } catch (error) {
                        console.warn("⚠️ [POOL] Failed to decode pool data:", pool.pubkey.toBase58());
                        return null;
                    }
                }).filter(pool => pool !== null);

                console.log("✅ [POOL] Successfully decoded", mappedPools.length, "WSOL pools");
                return mappedPools;
            } else {
                throw error;
            }
        }
        
        // If still no pools found, try the reverse (mint as quote)
        console.log("🔍 [POOL] No pools found with mint as base, trying as quote...");
        try {
            const altResponse = await connection.getProgramAccounts(PUMP_AMM_PROGRAM_ID, {
                filters: [
                    { "dataSize": 211 },
                    {
                      "memcmp": {
                        "offset": 75,
                        "bytes": mintAddress.toBase58()
                      }
                    },
                    {
                        "memcmp": {
                          "offset": 43,
                          "bytes": WSOL_TOKEN_ACCOUNT.toBase58()
                        }
                    }
                  ],
                dataSlice: { offset: 0, length: 211 },
                commitment: 'confirmed'
            });
            
            console.log("🔍 [POOL] Found", altResponse.length, "alternative pools");
            
            const altMappedPools = altResponse.map((pool) => {
                try {
                    const data = Buffer.from(pool.account.data);
                    const poolData = program.coder.accounts.decode('pool', data);
                    return {
                        address: pool.pubkey,
                        is_native_base: false,
                        poolData
                    };
                } catch (error) {
                    console.warn("⚠️ [POOL] Failed to decode pool data:", pool.pubkey.toBase58());
                    return null;
                }
            }).filter(pool => pool !== null);
            
            return altMappedPools;
        } catch (altError: any) {
            console.error("❌ [POOL] Alternative search also failed:", altError.message);
            return [];
        }
        
    } catch (error: any) {
        console.error("❌ [POOL] Error in getPoolsWithBaseMintQuoteWSOL:", error.message);
        throw error;
    }
}

const getPriceAndLiquidity = async (pool: Pool, connection: Connection) => {
    const wsolAddress = pool.poolData.poolQuoteTokenAccount;
    const tokenAddress = pool.poolData.poolBaseTokenAccount;
   
    const wsolBalance = await connection.getTokenAccountBalance(wsolAddress);
    const tokenBalance = await connection.getTokenAccountBalance(tokenAddress);

    const price = wsolBalance.value.uiAmount! / tokenBalance.value.uiAmount!;

    return {
        ...pool,
        price,
        reserves: {
            native: wsolBalance.value.uiAmount!,
            token: tokenBalance.value.uiAmount!
        }
    } as PoolWithPrice;
}

export const getPoolsWithPrices = async (mintAddress: PublicKey, connection: Connection) => {
    try {
        console.log("🔍 [POOL] getPoolsWithPrices: Starting search for pools...");
        
        let poolsWithBaseMint: any[] = [];
        let poolsWithQuoteMint: any[] = [];
        
        try {
            poolsWithBaseMint = await getPoolsWithBaseMint(mintAddress, connection);
            console.log("🔍 [POOL] getPoolsWithPrices: Found", poolsWithBaseMint.length, "pools with base mint");
        } catch (error: any) {
            console.log("⚠️ [POOL] getPoolsWithPrices: Error getting base mint pools:", error.message);
            poolsWithBaseMint = [];
        }
        
        try {
            poolsWithQuoteMint = await getPoolsWithQuoteMint(mintAddress, connection);
            console.log("🔍 [POOL] getPoolsWithPrices: Found", poolsWithQuoteMint.length, "pools with quote mint");
        } catch (error: any) {
            console.log("⚠️ [POOL] getPoolsWithPrices: Error getting quote mint pools:", error.message);
            poolsWithQuoteMint = [];
        }
        
        const pools = [...poolsWithBaseMint, ...poolsWithQuoteMint];
        console.log(`🔍 [POOL] getPoolsWithPrices: Total candidate pools = ${pools.length}`);

        if (pools.length === 0) {
            console.log("⚠️ [POOL] getPoolsWithPrices: No pools found");
            return [];
        }

        const results = await Promise.all(pools.map(pool => getPriceAndLiquidity(pool, connection)));
        console.log("✅ [POOL] getPoolsWithPrices: Successfully processed", results.length, "pools");
        return results;
        
    } catch (error: any) {
        console.error("❌ [POOL] getPoolsWithPrices: Error:", error.message);
        return [];
    }
}

export const getPumpSwapPool = async (mint: PublicKey, connection: Connection) => {
  console.log("🔍 [POOL] Starting pool discovery for mint:", mint.toBase58());
  
  try {
    const pools = await getPoolsWithBaseMintQuoteWSOL(mint, connection);
    
    if (!pools || pools.length === 0) {
      console.error("❌ [POOL] No pools found with WSOL quote");
      
      // Try to find any pools for this mint (not just WSOL)
      console.log("🔍 [POOL] Trying to find any pools for this mint...");
      const allPools = await getPoolsWithPrices(mint, connection);
      
      if (allPools && allPools.length > 0) {
        console.log("⚠️ [POOL] Found", allPools.length, "pools but none with WSOL quote");
        console.log("💡 [POOL] Available pools:", allPools.map(p => ({
          address: p.address.toBase58(),
          quoteMint: p.poolData.quoteMint?.toBase58() || 'unknown'
        })));
        
        throw new Error(`Found ${allPools.length} pools for this mint, but none have WSOL as quote token. This token may not be compatible with Pump.fun volume bot.`);
      } else {
        console.error("❌ [POOL] No pools found at all for this mint");
        
        // Check if the token exists
        const tokenAccount = await connection.getAccountInfo(mint);
        if (!tokenAccount) {
          throw new Error(`Token ${mint.toBase58()} does not exist on Solana. Please verify the token address.`);
        }
        
        throw new Error(`No PumpSwap pools found for mint ${mint.toBase58()}. This token may not be a Pump.fun token or may not have an active pool. Please verify the token address and ensure it's a valid Pump.fun token with an active WSOL pool.`);
      }
    }
    
    const selectedPool = pools[0];
    console.log("✅ [POOL] Pool found successfully!");
    console.log("🏊 [POOL] Pool address:", selectedPool.address.toBase58());
    console.log("📍 [POOL] Base mint:", selectedPool.poolData.baseMint?.toBase58() || 'unknown');
    console.log("📍 [POOL] Quote mint:", selectedPool.poolData.quoteMint?.toBase58() || 'unknown');
    console.log("📊 [POOL] Selected pool from", pools.length, "candidates");
    
    return selectedPool.address;
    
  } catch (error: any) {
    console.error("❌ [POOL] Error in getPumpSwapPool:", error.message);
    throw error;
  }
}

export const getBuyTokenAmount = async (solAmount: bigint, mint: PublicKey, connection: Connection) => {
    const pool_detail = await getPoolsWithPrices(mint, connection);
    if (!pool_detail || pool_detail.length === 0) {
        throw new Error(`No PumpSwap pools found for mint ${mint.toBase58()} when estimating buy amount.`);
    }
    const sol_reserve = BigInt(pool_detail[0].reserves.native * LAMPORTS_PER_SOL);
    const token_reserve = BigInt(pool_detail[0].reserves.token * 10**6);
    const product = sol_reserve * token_reserve;
    let new_sol_reserve = sol_reserve + solAmount;
    let new_token_reserve = product / new_sol_reserve + 1n;
    let amount_to_be_purchased = token_reserve - new_token_reserve;

    return amount_to_be_purchased;
}

export const calculateWithSlippageBuy = (
    amount: bigint,
    basisPoints: bigint
) => {
    return amount - (amount * basisPoints) / 10000n;
};

export const getPrice = async (mint: PublicKey, connection: Connection) => {
    const pools = await getPoolsWithPrices(mint, connection);
    if (!pools || pools.length === 0) {
        throw new Error(`No PumpSwap pools found for mint ${mint.toBase58()} to compute price.`);
    }
    return pools[0].price;
}

export const getPoolReserves = async (mint: PublicKey, connection: Connection) => {
    const pools = await getPoolsWithPrices(mint, connection);
    if (!pools || pools.length === 0) {
        throw new Error(`No PumpSwap pools found for mint ${mint.toBase58()} to read reserves.`);
    }
    return pools[0].reserves;
}
