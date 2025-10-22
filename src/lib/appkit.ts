// src/lib/appkit.ts
import { createAppKit } from "@reown/appkit";
import { bsc } from "@reown/appkit/networks";
import { makeWagmiAdapter, networks as reownNetworks, type Network } from "./reown";

// Always pass a non-empty tuple to AppKit
const networks = (reownNetworks.length ? reownNetworks : [bsc]) as [Network, ...Network[]];

// Read & validate projectId ONCE here
const raw = import.meta.env.VITE_REOWN_PROJECT_ID;
const projectId = (typeof raw === "string" ? raw.trim() : "");
if (!projectId) {
  throw new Error("[appkit] VITE_REOWN_PROJECT_ID is missing or empty after trim().");
}

// Build the wagmi adapter with the same projectId
const wagmiAdapter = makeWagmiAdapter(projectId);

// SSR-safe site URL for metadata
const url =
  (typeof window !== "undefined" && window.location.origin) || "http://localhost:5173";

// Export wagmiConfig if other files need it
export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Create AppKit (do this exactly once in the app lifecycle)
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,                 // same source of truth
  networks,
  defaultNetwork: networks[0],
  allowUnsupportedChain: false,
  themeMode: "dark",
  features: { analytics: true, swaps: true, onramp: true },
  metadata: {
    name: "YearnPass Marketplace",
    description: "Buy community NFT passes to unlock perks",
    url,
    icons: ["https://avatars.githubusercontent.com/u/179229932?s=200&v=4"],
  },
});
