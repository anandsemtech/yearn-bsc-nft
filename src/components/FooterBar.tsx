import React, { useEffect, useState } from "react";
import { Wallet, FolderOpen, Layers } from "lucide-react";
import { appKit } from "../lib/appkit";

// The filter event name used across the app
export type NftFilter = "mine" | "all";
export const FILTER_EVENT = "nft:filter" as const;

const FooterBar: React.FC = () => {
  const [active, setActive] = useState<NftFilter>(() => {
    return (localStorage.getItem("nft.filter") as NftFilter) || "all";
  });

  const setFilter = (f: NftFilter) => {
    setActive(f);
    try {
      localStorage.setItem("nft.filter", f);
    } catch {}
    // broadcast to listeners (e.g., TierCard)
    window.dispatchEvent(
      new CustomEvent<NftFilter>(FILTER_EVENT, { detail: f } as CustomEventInit<NftFilter>)
    );
  };

  useEffect(() => {
    // Fire once on mount so listeners know current state
    window.dispatchEvent(
      new CustomEvent<NftFilter>(FILTER_EVENT, { detail: active } as CustomEventInit<NftFilter>)
    );
  }, []); // eslint-disable-line

  const openWallet = () => appKit.open();

  return (
    <>
      <footer className="fixed bottom-0 inset-x-0 z-40 md:hidden pointer-events-none">
        <div className="relative mx-auto max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+10px)]">
          <div className="pointer-events-auto bg-gradient-to-t from-[#0b0d12]/95 to-[#151822]/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.45)] rounded-t-[28px]">
            <nav className="flex items-center justify-between px-6 pt-4 pb-5">
              {/* My NFT */}
              <button
                onClick={() => setFilter("mine")}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 active:scale-95 transition-all ${
                  active === "mine"
                    ? "text-white bg-white/[0.10]"
                    : "text-white/80 hover:text-white hover:bg-white/[0.06]"
                }`}
                aria-label="Open My NFT"
                title="My NFT"
              >
                <FolderOpen className="w-5 h-5" />
                <span className="text-[11px] font-medium">My NFT</span>
              </button>

              <div className="w-16" />

              {/* All NFT */}
              <button
                onClick={() => setFilter("all")}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 active:scale-95 transition-all ${
                  active === "all"
                    ? "text-white bg-white/[0.10]"
                    : "text-white/80 hover:text-white hover:bg-white/[0.06]"
                }`}
                aria-label="Open All NFT"
                title="All NFT"
              >
                <Layers className="w-5 h-5" />
                <span className="text-[11px] font-medium">All NFT</span>
              </button>
            </nav>
          </div>

          {/* Wallet Floating Action Button */}
          <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-5">
            <button
              onClick={openWallet}
              aria-label="Open wallet"
              title="Wallet"
              className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-indigo-300 shadow-[0_12px_30px_rgba(99,102,241,0.45)] ring-4 ring-[#0b0d12] flex items-center justify-center active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span className="pointer-events-none absolute inset-0 rounded-full blur-xl bg-indigo-400/35 opacity-60" />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};

export default FooterBar;
