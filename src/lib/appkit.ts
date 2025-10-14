// src/lib/appkit.ts
import { createAppKit } from "@reown/appkit";
import { bsc } from "@reown/appkit/networks";
import { networks as baseNetworks, wagmiAdapter } from "./reown";

// Derive the network type from the concrete `bsc` export
type NetworkType = typeof bsc;

// Make sure `networks` is a non-empty tuple as AppKit expects
const networks = baseNetworks as [NetworkType, ...NetworkType[]];

// Project ID (WalletConnect / AppKit)
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;
if (!projectId) {
  // Prefer warn over hard-throw to not crash dev by default
  // eslint-disable-next-line no-console
  console.warn("[appkit] VITE_REOWN_PROJECT_ID is missing");
}

// SSR-safe site URL
const url =
  (typeof window !== "undefined" && window.location.origin) ||
  "http://localhost:5173";

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,            // tuple-typed via NetworkType above
  defaultNetwork: bsc, // same type as NetworkType
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
