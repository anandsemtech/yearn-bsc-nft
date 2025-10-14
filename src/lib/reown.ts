import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { bsc, bscTestnet } from "@reown/appkit/networks";

export const networks = [bsc, bscTestnet];
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID as string;

export const wagmiAdapter = new WagmiAdapter({ networks, projectId, ssr: false });
export const wagmiConfig = wagmiAdapter.wagmiConfig;
