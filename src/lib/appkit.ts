// src/lib/appkit.ts
import { createAppKit } from "@reown/appkit";
import { bsc } from "@reown/appkit/networks";
import { wagmiAdapter, networks as reownNetworks } from "./reown";

// Derive the network type from the concrete `bsc` export
type Network = typeof bsc;

// ✅ AppKit expects a non-empty tuple; re-cast the mutable array to a tuple type
const networks = reownNetworks as [Network, ...Network[]];

// Project ID (WalletConnect / AppKit)
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;
if (!projectId) {
  // Keep dev server running if env is missing
  // eslint-disable-next-line no-console
  console.warn("[appkit] VITE_REOWN_PROJECT_ID is missing");
}

// SSR-safe site URL
const url =
  (typeof window !== "undefined" && window.location.origin) ||
  "http://localhost:5173";

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,                     // ✅ correct tuple type
  defaultNetwork: networks[0],  // ✅ same type as `Network`
  allowUnsupportedChain: false,
  projectId,
  themeMode: "dark",
  features: { analytics: true },
  metadata: {
    name: "YearnPass Marketplace",
    description: "Buy community NFT passes to unlock perks",
    url,
    icons: ["https://avatars.githubusercontent.com/u/179229932?s=200&v=4"],
  },
});
