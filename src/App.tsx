// src/App.tsx
import React from "react";
import Header from "./components/Header";
import TierCard from "./components/TierCard";
import AdminPanel from "./components/AdminPanel";
import FooterBar from "./components/FooterBar";
import EmptyVault from "./components/EmptyVault";

import AppLoader from "./components/AppLoader"; // ✨ hype loader
import TutorialOverlay from "./components/TutorialOverlay"; // ⬅ full-screen tutorial
import { useFirstVisitLoader } from "./hooks/useFirstVisitLoader";

import { useReadContract } from "wagmi";
import { YEARNPASS1155_ABI, ERC20_ABI } from "./lib/abi";
import {
  PASS_ADDRESS,
  MARKET_ADDRESS,
  YEARN_TOKEN,
  TIER_IDS,
} from "./lib/constants";
import { useIsAdmin } from "./hooks/useIsAdmin";

/* -----------------------------
   Hook: read tier URI from ERC-1155
------------------------------ */
function useTier(id: number) {
  return useReadContract({
    abi: YEARNPASS1155_ABI,
    address: PASS_ADDRESS,
    functionName: "uri",
    args: [BigInt(id)],
  });
}

/* -----------------------------
   Hook: read ERC20 decimals/symbol
------------------------------ */
function useTokenMeta(addr?: `0x${string}`) {
  const decimalsQ = useReadContract({
    abi: ERC20_ABI,
    address: addr,
    functionName: "decimals",
    query: { enabled: !!addr },
  });
  const symbolQ = useReadContract({
    abi: ERC20_ABI,
    address: addr,
    functionName: "symbol",
    query: { enabled: !!addr },
  });
  return {
    decimals: Number(decimalsQ.data ?? 18),
    symbol: String(symbolQ.data ?? "YEARN"),
  };
}

export default function App() {
  // 1) Loader shows first
  const [showLoader, hideLoader] = useFirstVisitLoader({ always: true });

  // 2) Then full-screen tutorial
  const [tutorialDone, setTutorialDone] = React.useState(false);

  // Safety: never get stuck on loader
  React.useEffect(() => {
    if (!showLoader) return;
    const t = setTimeout(hideLoader, 3000);
    return () => clearTimeout(t);
  }, [showLoader, hideLoader]);

  // Permissions/admin + token meta
  const isAdmin = useIsAdmin(PASS_ADDRESS, MARKET_ADDRESS);
  const { decimals, symbol } = useTokenMeta(YEARN_TOKEN);

  // Resolve tiers deterministically
  const tiers = TIER_IDS.map((id) => {
    const { data } = useTier(id);
    const uri = (data as string) || "";
    return { id, uri };
  });

  // While loader OR tutorial is up, hide the rest of the app
  const showTutorial = !showLoader && !tutorialDone;

  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      {/* Hype loader */}
      <AppLoader show={showLoader} onDone={hideLoader} durationMs={10600} />

      {/* Full-screen tutorial (blocks app) */}
      <TutorialOverlay open={showTutorial} onDone={() => setTutorialDone(true)} />

      {/* Real application (revealed after tutorial completes) */}
      {!showTutorial && (
        <>
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

            {/* Animated empty state for "My NFT" view */}
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

          <FooterBar />
        </>
      )}
    </div>
  );
}
