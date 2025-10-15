// src/App.tsx
import React from "react";
import Header from "./components/Header";
import TierCard from "./components/TierCard";
import AdminPanel from "./components/AdminPanel";
import FooterBar from "./components/FooterBar";
import EmptyVault from "./components/EmptyVault";

import AppLoader from "./components/AppLoader"; // ✨ hype loader
import { useFirstVisitLoader } from "./hooks/useFirstVisitLoader"; // show once per session

import { useReadContract } from "wagmi";
import { YEARNPASS1155_ABI, ERC20_ABI } from "./lib/abi";
import {
  PASS_ADDRESS,
  MARKET_ADDRESS,
  YEARN_TOKEN,
  TIER_IDS,
} from "./lib/constants";
import { useIsAdmin } from "./hooks/useIsAdmin";

// ---- Tier info hook (contract exposes `uri(uint256)`; `getTier` is not in ABI)
function useTier(id: number) {
  return useReadContract({
    abi: YEARNPASS1155_ABI,
    address: PASS_ADDRESS,
    functionName: "uri",
    args: [BigInt(id)],
  });
}

// ---- ERC20 metadata
function useTokenMeta(addr?: `0x${string}`) {
  const decimals = useReadContract({
    abi: ERC20_ABI,
    address: addr,
    functionName: "decimals",
    // wagmi v2: use `query` object for react-query options
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
  // Hype loader: shows once per session, then hides automatically
  const [showLoader, hideLoader] = useFirstVisitLoader({ always: true });

  // Safety timeout: ensure we never get stuck (independent of AppLoader's own timer)
  React.useEffect(() => {
    if (!showLoader) return;
    const t = setTimeout(hideLoader, 3000);
    return () => clearTimeout(t);
  }, [showLoader, hideLoader]);

  // keep signature that expects (pass, market) to match your current hook usage
  const isAdmin = useIsAdmin(PASS_ADDRESS, MARKET_ADDRESS);
  const { decimals, symbol } = useTokenMeta(YEARN_TOKEN);

  // Stable map over constant TIER_IDS keeps hook order deterministic (React rules ok)
  const tiers = TIER_IDS.map((id) => {
    const { data } = useTier(id);
    const uri = (data as string) || "";
    return { id, uri };
  });

  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      {/* World-class hype loader overlay */}
      <AppLoader
        show={showLoader}
        onDone={hideLoader}
        durationMs={10600}
      />

      {/* Main app */}
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiers.map((tier) => (
            <TierCard
              key={tier.id}
              passAddress={PASS_ADDRESS}
              marketAddress={MARKET_ADDRESS}
              tier={tier}
              tokenAddress={YEARN_TOKEN}
              tokenDecimals={decimals || 18}
              tokenSymbol={symbol || "YEARN"}
            />
          ))}
        </section>

        {/* Animated empty state: shows only on “My NFT” when the wallet owns none */}
        <EmptyVault
          passAddress={PASS_ADDRESS}
          tiers={tiers.map(({ id }) => ({ id }))}
        />

        {isAdmin && (
          <section>
            <AdminPanel
              passAddress={PASS_ADDRESS}
              marketAddress={MARKET_ADDRESS}
              tokenAddress={YEARN_TOKEN}
              tierIds={[...TIER_IDS]}
            />
          </section>
        )}
      </main>

      {/* Footer is fixed; safe to render once here */}
      <FooterBar />
    </div>
  );
}
