export const logger = {
    info: (data: any) => {
        const timestamp = new Date().toISOString();
        if (typeof data === 'object') {
            console.log(`ℹ️ [INFO] ${timestamp}:`, data);
        } else {
            console.log(`ℹ️ [INFO] ${timestamp}: ${data}`);
        }
    },
    error: (message: string) => {
        const timestamp = new Date().toISOString();
        console.error(`❌ [ERROR] ${timestamp}: ${message}`);
    },
    warn: (message: string) => {
        const timestamp = new Date().toISOString();
        console.warn(`⚠️ [WARN] ${timestamp}: ${message}`);
    },
    debug: (data: any) => {
        const timestamp = new Date().toISOString();
        if (typeof data === 'object') {
            console.debug(`🔍 [DEBUG] ${timestamp}:`, data);
        } else {
            console.debug(`🔍 [DEBUG] ${timestamp}: ${data}`);
        }
    },
    success: (message: string) => {
        const timestamp = new Date().toISOString();
        console.log(`✅ [SUCCESS] ${timestamp}: ${message}`);
    },
    trading: (action: string, details: any) => {
        const timestamp = new Date().toISOString();
        console.log(`📈 [TRADING] ${timestamp}: ${action}`, details);
    },
    bundle: (action: string, details: any) => {
        const timestamp = new Date().toISOString();
        console.log(`📦 [BUNDLE] ${timestamp}: ${action}`, details);
    },
    wallet: (action: string, details: any) => {
        const timestamp = new Date().toISOString();
        console.log(`👛 [WALLET] ${timestamp}: ${action}`, details);
    },
    pool: (action: string, details: any) => {
        const timestamp = new Date().toISOString();
        console.log(`🏊 [POOL] ${timestamp}: ${action}`, details);
    }
};
