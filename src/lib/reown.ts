// src/lib/reown.ts
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { bsc } from "@reown/appkit/networks";
import { http } from "wagmi";

/* -------------------------------------------------------------------------- */
/*                             Network configuration                           */
/* -------------------------------------------------------------------------- */

// Derive a concrete network type from the actual export
export type Network = typeof bsc;

// ✅ Create a MUTABLE array; do not use `as const`
export const networks: Network[] = [{ ...bsc }];

/**
 * Use a strict custom RPC for BSC (NodeReal / Ankr / PublicNode / etc.)
 * Keep env reading for RPC here.
 */
const BSC_RPC = import.meta.env.VITE_BSC_RPC_URL?.toString().trim();
if (!BSC_RPC) {
  throw new Error(
    "[reown] Missing VITE_BSC_RPC_URL in .env — this app is configured to use a strict custom RPC."
  );
}

/* -------------------------------------------------------------------------- */
/*                        Adapter factory (single source ID)                   */
/* -------------------------------------------------------------------------- */

/**
 * Construct a WagmiAdapter with the caller-provided projectId.
 * This avoids reading projectId in multiple places.
 */
export function makeWagmiAdapter(projectId: string) {
  if (!projectId?.trim()) {
    throw new Error("[reown] makeWagmiAdapter(projectId) requires a non-empty projectId.");
  }

  return new WagmiAdapter({
    projectId,
    networks, // ✅ mutable array
    ssr: false,
    transports: {
      [bsc.id]: http(BSC_RPC), // Force all viem/wagmi calls to your custom RPC
    },
  });
}
