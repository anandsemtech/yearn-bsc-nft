import { createAppKit } from "@reown/appkit";
import { networks, wagmiAdapter } from "./reown";

// Avoid URL mismatch in dev
const url =
  (typeof window !== "undefined" && window.location.origin) ||
  "http://localhost:5174";

const metadata = {
  name: "YearnPass Marketplace",
  description: "Buy community NFT passes to unlock perks",
  url,
  icons: ["https://avatars.githubusercontent.com/u/179229932?s=200&v=4"],
};

// IMPORTANT: create exactly once, export it
export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId: import.meta.env.VITE_REOWN_PROJECT_ID as string,
  themeMode: "dark",
  features: { analytics: true },
  metadata,
});
