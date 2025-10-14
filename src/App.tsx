import React from "react";
import Header from "./components/Header";
import TierCard from "./components/TierCard";
import AdminPanel from "./components/AdminPanel";
import { useReadContract } from "wagmi";
import { YEARNPASS1155_ABI, ERC20_ABI } from "./lib/abi";
import { PASS_ADDRESS, MARKET_ADDRESS, YEARN_TOKEN, TIER_IDS } from "./lib/constants";
import { useIsAdmin } from "./hooks/useIsAdmin";
import FooterBar from "./components/FooterBar";


function useTier(id: number) {
  return useReadContract({
    abi: YEARNPASS1155_ABI,
    address: PASS_ADDRESS,
    functionName: "getTier",
    args: [BigInt(id)],
  });
}
function useTokenMeta(addr?: `0x${string}`) {
  const decimals = useReadContract({
    abi: ERC20_ABI,
    address: addr,
    functionName: "decimals",
    query: { enabled: !!addr },
  });
  const symbol = useReadContract({
    abi: ERC20_ABI,
    address: addr,
    functionName: "symbol",
    query: { enabled: !!addr },
  });
  return {
    decimals: Number(decimals.data ?? 18),
    symbol: String(symbol.data ?? "YEARN"),
  };
}

export default function App() {
  const isAdmin = useIsAdmin(PASS_ADDRESS, MARKET_ADDRESS);
  const { decimals, symbol } = useTokenMeta(YEARN_TOKEN);

  const tiers = TIER_IDS.map((id) => {
    const { data } = useTier(id);
    let uri = "";
    if (data) {
      uri = (data as any).uri as string;
      // If your contract uses collection URI with {id}, this will still resolve in TierCard
    }
    return { id, uri };
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiers.map((tier) => (
            <TierCard
              key={tier.id}
              passAddress={PASS_ADDRESS}
              marketAddress={MARKET_ADDRESS}
              tier={tier}                        // only id + uri needed
              tokenAddress={YEARN_TOKEN}         // approve/buy token
              tokenDecimals={decimals || 18}
              tokenSymbol={symbol || "YEARN"}
            />
          ))}
        </section>

        {isAdmin && (
          <section>
            <AdminPanel passAddress={PASS_ADDRESS} tierIds={[...TIER_IDS]} />
          </section>
        )}
        <FooterBar />

        
      </main>
    </div>
  );
}
