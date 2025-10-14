export const PASS_ADDRESS = (import.meta.env.VITE_PASS_ADDRESS as `0x${string}`);
export const MARKET_ADDRESS = (import.meta.env.VITE_MARKETPLACE_ADDRESS as `0x${string}`);
export const YEARN_TOKEN = (import.meta.env.VITE_YEARN_TOKEN as `0x${string}`);

export const YEARN_TOKEN_DECIMALS = (import.meta.env.VITE_YEARN_TOKEN_DECIMALS as `0x${string}`);
export const YEARN_TOKEN_SYMBOL = (import.meta.env.VITE_YEARN_TOKEN_SYMBOL as `0x${string}`);

// Your deployment configured tiers 1..10
export const TIER_IDS = [1,2,3,4,5,6,7,8,9,10] as const;
