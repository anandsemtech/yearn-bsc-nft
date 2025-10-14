import { createAppKit } from "@reown/appkit";
import { networks, wagmiAdapter } from "./reown";
// ✅ use the same bsc object your adapter uses
import { bsc } from "@reown/appkit/networks";

const url =
  (typeof window !== "undefined" && window.location.origin) ||
  "http://localhost:5174";

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  // 👇 force the UI to default to BSC
  defaultNetwork: bsc,
  projectId: import.meta.env.VITE_REOWN_PROJECT_ID as string,
  themeMode: "dark",
  features: { analytics: true },
  metadata: {
    name: "YearnPass Marketplace",
    description: "Buy community NFT passes to unlock perks",
    url,
    icons: ["https://avatars.githubusercontent.com/u/179229932?s=200&v=4"],
  },
});
