import { PublicKey, Connection } from "@solana/web3.js";
import { getPoolsWithPrices } from "./src/pool";

console.log("🔍 [FIND-TOKENS] Finding valid Pump.fun tokens...");

async function findValidTokens() {
    try {
        const connection = new Connection("https://mainnet.helius-rpc.com?api-key=bf3377fd-8057-4634-906c-cc090a5c8426", {
            commitment: "confirmed",
            confirmTransactionInitialTimeout: 60000,
            disableRetryOnRateLimit: false,
            httpHeaders: {
                'User-Agent': 'PumpFun-Volume-Bot/1.0.0'
            }
        });
        
        // List of some known Pump.fun tokens to test
        const testTokens = [
            "5wVtfsFhLjxm27K9mN3ziYWCCpQwXXq7HWUiRMW7pump", // Original token
            "So11111111111111111111111111111111111111112", // WSOL (for testing)
            "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC (for testing)
            "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT (for testing)
            // Add more recent Pump.fun tokens here
        ];
        
        console.log("🔍 [FIND-TOKENS] Testing", testTokens.length, "tokens...");
        
        for (const tokenAddress of testTokens) {
            try {
                console.log(`\n📍 [FIND-TOKENS] Testing token: ${tokenAddress}`);
                
                const mint = new PublicKey(tokenAddress);
                
                // Check if token exists
                const tokenAccount = await connection.getAccountInfo(mint);
                if (!tokenAccount) {
                    console.log("❌ [FIND-TOKENS] Token does not exist");
                    continue;
                }
                
                console.log("✅ [FIND-TOKENS] Token exists");
                
                // Try to find pools (with timeout)
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 10000)
                );
                
                const poolPromise = getPoolsWithPrices(mint, connection);
                
                try {
                    const pools = await Promise.race([poolPromise, timeoutPromise]);
                    
                    // Check if pools is an array and has items
                    if (Array.isArray(pools) && pools.length > 0) {
                        console.log("🎯 [FIND-TOKENS] Found", pools.length, "pools!");
                        
                        // Check for WSOL pools
                        const wsolPools = pools.filter((pool: any) => 
                            pool.poolData && pool.poolData.quoteMint && 
                            pool.poolData.quoteMint.toBase58() === "So11111111111111111111111111111111111111112"
                        );
                        
                        if (wsolPools.length > 0) {
                            console.log("🏊 [FIND-TOKENS] Found", wsolPools.length, "WSOL pools!");
                            console.log("✅ [FIND-TOKENS] This token is VALID for the volume bot!");
                            
                            wsolPools.forEach((pool: any, index: number) => {
                                console.log(`  Pool ${index + 1}: ${pool.address.toBase58()}`);
                                console.log(`    Price: ${pool.price || 'N/A'}`);
                                console.log(`    Reserves: ${JSON.stringify(pool.reserves || {})}`);
                            });
                        } else {
                            console.log("⚠️ [FIND-TOKENS] Found pools but no WSOL pools");
                        }
                    } else {
                        console.log("❌ [FIND-TOKENS] No pools found");
                    }
                } catch (error: any) {
                    if (error.message === 'Timeout') {
                        console.log("⏰ [FIND-TOKENS] Search timed out (10s)");
                    } else {
                        console.log("❌ [FIND-TOKENS] Error searching pools:", error.message);
                    }
                }
                
            } catch (error: any) {
                console.log("❌ [FIND-TOKENS] Error testing token:", error.message);
            }
        }
        
        console.log("\n💡 [FIND-TOKENS] To find more tokens:");
        console.log("   1. Visit pump.fun website");
        console.log("   2. Look for tokens with active trading");
        console.log("   3. Copy the token address");
        console.log("   4. Test it with this script");
        
    } catch (error: any) {
        console.error("❌ [FIND-TOKENS] Error:", error.message);
    }
}

findValidTokens();
