import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet2, Sparkles, Trophy, ShoppingBag } from "lucide-react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { FILTER_EVENT, NftFilter } from "./FooterBar";

type TierLite = { id: number };
type Props = {
  passAddress: Address;
  tiers: TierLite[];              // e.g. [{id:1},{id:2},...]
  className?: string;             // optional wrapper class
};

const YEARNPASS1155_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function getFilter(): NftFilter {
  return ((localStorage.getItem("nft.filter") as NftFilter) || "all");
}

export default function EmptyVault({ passAddress, tiers, className }: Props) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [filter, setFilter] = React.useState<NftFilter>(getFilter());
  const [checking, setChecking] = React.useState(false);
  const [hasAny, setHasAny] = React.useState<boolean | null>(null);

  // react to footer filter changes
  React.useEffect(() => {
    const onFilter = (e: Event) => {
      const detail = (e as CustomEvent<NftFilter>).detail;
      if (detail === "mine" || detail === "all") setFilter(detail);
    };
    window.addEventListener(FILTER_EVENT, onFilter as EventListener);
    return () => window.removeEventListener(FILTER_EVENT, onFilter as EventListener);
  }, []);

  // when on “My NFT”, check balances once
  React.useEffect(() => {
    let stop = false;
    (async () => {
      if (filter !== "mine") { setHasAny(null); return; }
      if (!isConnected || !address || !publicClient || tiers.length === 0) {
        setHasAny(false);
        return;
      }
      try {
        setChecking(true);
        // lightweight loop (multicall not required + keeps viem deps simple)
        for (const t of tiers) {
          const bal = (await publicClient.readContract({
            address: passAddress,
            abi: YEARNPASS1155_ABI,
            functionName: "balanceOf",
            args: [address, BigInt(t.id)],
          })) as bigint;
          if (bal > 0n) { if (!stop) setHasAny(true); return; }
        }
        if (!stop) setHasAny(false);
      } catch {
        if (!stop) setHasAny(false);
      } finally {
        if (!stop) setChecking(false);
      }
    })();
    return () => { stop = true; };
  }, [filter, isConnected, address, publicClient, passAddress, tiers]);

  const show = filter === "mine" && hasAny === false;

  const switchToAll = () => {
    const ev = new CustomEvent<NftFilter>(FILTER_EVENT, { detail: "all" });
    localStorage.setItem("nft.filter", "all");
    window.dispatchEvent(ev);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={className ?? "mx-auto max-w-3xl"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
        >
          <div
            className="
              relative overflow-hidden rounded-2xl p-6 md:p-8
              bg-gradient-to-br from-[#0b0f17]/90 via-[#111826]/85 to-[#0b0f17]/90
              ring-1 ring-white/10 shadow-[0_10px_40px_rgba(0,0,0,.35)]
            "
          >
            {/* subtle animated glow */}
            <motion.div
              aria-hidden
              className="absolute -inset-40 opacity-30"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
              style={{
                background:
                  "radial-gradient(600px 400px at 80% 20%, rgba(99,102,241,.25), transparent 60%), radial-gradient(500px 360px at 20% 80%, rgba(56,189,248,.22), transparent 60%)",
                filter: "blur(20px)",
              }}
            />

            <div className="relative flex flex-col items-center text-center">
              <div className="flex items-center gap-3 text-white/90">
                <motion.span
                  initial={{ scale: 0.9, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 160, damping: 12 }}
                  className="inline-flex items-center justify-center rounded-full w-12 h-12 bg-white/10 ring-1 ring-white/15"
                >
                  <Wallet2 className="w-6 h-6" />
                </motion.span>
                <motion.span
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-lg md:text-xl font-semibold"
                >
                  Your vault is empty
                </motion.span>
              </div>

              <p className="mt-3 text-sm md:text-base text-white/70 max-w-prose">
                Owning a <strong className="text-white/90">YearnTogether NFT</strong> unlocks
                perks today and evolving utilities tomorrow—early-access drops,
                member-only quests, referral boosts, and future on-chain rewards.
                It’s the right time to join in and feel proud to be part of the community.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <motion.span
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs md:text-sm bg-indigo-400/10 text-indigo-200 ring-1 ring-indigo-300/20"
                  initial={{ y: 4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  <Sparkles className="w-4 h-4" /> Early utilities
                </motion.span>
                <motion.span
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs md:text-sm bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/20"
                  initial={{ y: 4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.05 }}
                >
                  <Trophy className="w-4 h-4" /> Community status
                </motion.span>
                <motion.span
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs md:text-sm bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/20"
                  initial={{ y: 4, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <ShoppingBag className="w-4 h-4" /> Whitelist pricing
                </motion.span>
              </div>

              <motion.button
                onClick={switchToAll}
                whileTap={{ scale: 0.985 }}
                className="
                  relative mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3
                  bg-[#0b0f17]/80 text-white font-semibold ring-1 ring-indigo-400/30
                  hover:ring-indigo-300/40 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_12px_36px_rgba(99,102,241,0.20)]
                  transition
                "
              >
                Browse NFTs
              </motion.button>

              {/* tiny status line */}
              <div className="mt-2 text-xs text-white/55">
                {checking ? "Checking your vault…" : "No NFTs found in your wallet yet."}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
