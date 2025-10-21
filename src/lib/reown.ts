// src/lib/reown.ts
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { bsc } from "@reown/appkit/networks";
import { http } from "wagmi";

/* -------------------------------------------------------------------------- */
/*                             Network configuration                           */
/* -------------------------------------------------------------------------- */

// Derive a concrete network type from the actual export
type Network = typeof bsc;

// ✅ Create a MUTABLE array; do not use `as const`
export const networks: Network[] = [{ ...bsc }];

// Required project ID (Reown / WalletConnect)
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;

// Custom RPC (NodeReal, Ankr, PublicNode, etc.)
const BSC_RPC = import.meta.env.VITE_BSC_RPC_URL as string;
if (!BSC_RPC) {
  throw new Error(
    "[reown] Missing VITE_BSC_RPC_URL in .env — this app is configured to use a strict custom RPC."
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Adapter init                                */
/* -------------------------------------------------------------------------- */

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks, // ✅ mutable array
  ssr: false,
  // Force all viem/wagmi calls to your custom RPC
  transports: {
    [bsc.id]: http(BSC_RPC),
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
