import React from "react";
import { motion, AnimatePresence, useMotionTemplate } from "framer-motion";
import { ShoppingCart, Check, Loader2, Shield, Sparkles as SparkIcon, AlertCircle } from "lucide-react";
import type { Address } from "viem";
import { formatUnits, maxUint256 } from "viem";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { ERC20_ABI, YEARNPASS1155_ABI, MARKET_ABI } from "../lib/abi";
import {
  HoloCard,
  OrbitRings,
  Scanlines,
  GradientMesh,
  CursorGlow,
  Sparkles,
  useTilt3D,
} from "./fx/HoloPrimitives";
import MetaverseScene from "./fx/MetaverseScene";
import { FILTER_EVENT, NftFilter } from "./FooterBar";
import YearnChamp from "../assets/YearnChamp.gif";

type Props = {
  passAddress: Address;       // ERC1155 contract
  marketAddress: Address;     // Market contract
  tier: { id: number; uri: string };
  tokenAddress: Address;      // ERC20 currency
  tokenDecimals: number;
  tokenSymbol: string;
};

const isZeroAddress = (a?: string) => !a || /^0x0{40}$/i.test(a);

export default function TierCard({
  passAddress,
  marketAddress,
  tier,
  tokenAddress,
  tokenDecimals,
  tokenSymbol,
}: Props) {
  const { isConnected, address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();

  const [name] = React.useState(`Pass #${tier.id}`);
  const [owned, setOwned] = React.useState(false);
  const [price, setPrice] = React.useState<bigint>(0n);
  const [busy, setBusy] = React.useState(false);
  const [celebrate, setCelebrate] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  // Load ownership + dynamic price
  React.useEffect(() => {
    let stop = false;
    (async () => {
      if (!address || !publicClient) return;
      try {
        const [bal, p] = await Promise.all([
          publicClient.readContract({
            address: passAddress,
            abi: YEARNPASS1155_ABI,
            functionName: "balanceOf",
            args: [address, BigInt(tier.id)],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: "priceOf",
            args: [BigInt(tier.id), address],
          }) as Promise<bigint>,
        ]);
        if (!stop) {
          setOwned(bal > 0n);
          setPrice(p);
        }
      } catch {
        if (!stop) setErr("Unable to fetch price/balance right now.");
      }
    })();
    return () => { stop = true; };
  }, [address, publicClient, tier.id, passAddress, marketAddress]);

  // Global filter -> visibility
  React.useEffect(() => {
    const apply = (mode: NftFilter) => setVisible(mode === "all" ? true : owned);
    const initial = (localStorage.getItem("nft.filter") as NftFilter) || "all";
    apply(initial);
    const onFilter = (e: Event) => {
      const detail = (e as CustomEvent<NftFilter>).detail;
      if (detail === "mine" || detail === "all") apply(detail);
    };
    window.addEventListener(FILTER_EVENT, onFilter as EventListener);
    return () => window.removeEventListener(FILTER_EVENT, onFilter as EventListener);
  }, [owned]);

  // Buy (for MARKET.buy(uint256 id, address to) nonpayable)
  const buy = async () => {
    setErr(null);

    if (!isConnected) { setErr("Connect your wallet first."); return; }
    if (!address)     { setErr("No account found in wallet."); return; }
    if (!walletClient || !publicClient) { setErr("Wallet or RPC is not ready."); return; }
    if (owned)        { return; }
    if (isZeroAddress(marketAddress)) { setErr("Market address is not set."); return; }
    if (isZeroAddress(passAddress))   { setErr("Pass address is not set."); return; }

    setBusy(true);
    try {
      // Ensure correct chain
      const targetChainId = publicClient.chain?.id ?? chain?.id ?? currentChainId;
      if (targetChainId && chain?.id !== targetChainId && switchChainAsync) {
        try {
          await switchChainAsync({ chainId: targetChainId });
        } catch {
          setBusy(false);
          setErr("Please switch to the correct network.");
          return;
        }
      }

      // If price > 0, ensure ERC20 allowance (approve max to minimize future txs)
      if (price > 0n) {
        if (isZeroAddress(tokenAddress)) {
          setBusy(false);
          setErr("Payment token address is not set.");
          return;
        }
        const allowance = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, marketAddress],
        })) as bigint;

        if (allowance < price) {
          const approveSim = await publicClient.simulateContract({
            account: address,
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [marketAddress, maxUint256],
          });
          const approveHash = await walletClient.writeContract(approveSim.request);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      // BUY — nonpayable; ABI: buy(uint256, address). DO NOT send value.
      const buySim = await publicClient.simulateContract({
        account: address,
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: "buy",
        args: [BigInt(tier.id), address],
        // value: undefined (nonpayable)
      });
      const buyHash = await walletClient.writeContract(buySim.request);
      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      // Verify
      const bal = (await publicClient.readContract({
        address: passAddress,
        abi: YEARNPASS1155_ABI,
        functionName: "balanceOf",
        args: [address, BigInt(tier.id)],
      })) as bigint;

      const nowOwned = bal > 0n;
      setOwned(nowOwned);
      if (nowOwned) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 1800);
      }
    } catch (e: any) {
      const msg: string =
        e?.shortMessage || e?.details || e?.message || "Transaction failed.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  const label = price === 0n ? "Free" : `${formatUnits(price, tokenDecimals)} ${tokenSymbol}`;
  const { x, y, rotateX, rotateY, onMove } = useTilt3D();
  const glare = useMotionTemplate`radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,.12), transparent 45%)`;

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
    >
      <div className="relative" onMouseMove={onMove} style={{ perspective: 1200 }}>
        <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" as any }}>
          <HoloCard>
            <CursorGlow x={x} y={y} />
            <GradientMesh />
            <Scanlines />

            {/* MEDIA */}
            <div
              className="
                relative aspect-[4/3] overflow-hidden rounded-xl
                bg-[#0b0f17] ring-1 ring-white/8 shadow-glass
              "
              style={{ transform: "translateZ(30px)" }}
            >
              <MetaverseScene />
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <motion.img
                  src={YearnChamp}
                  alt={name}
                  loading="lazy"
                  draggable={false}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                  className="
                    w-[64%] md:w-[60%] h-auto object-contain select-none
                    opacity-[0.85] mix-blend-screen
                    drop-shadow-[0_10px_45px_rgba(99,102,241,0.25)]
                  "
                />
              </div>
              <div className="pointer-events-none absolute inset-0">
                <OrbitRings />
              </div>
              <motion.div aria-hidden className="absolute inset-0" style={{ backgroundImage: glare }} />
              <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_120%,rgba(0,0,0,.55),transparent)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent" />
            </div>

            {/* CONTENT */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-white/90 font-semibold truncate tracking-wide" title={name}>
                  {name}
                </h3>
                {owned && (
                  <motion.span
                    initial={{ y: -6, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/20"
                  >
                    <Shield className="w-3.5 h-3.5" /> Owned
                  </motion.span>
                )}
              </div>

              {/* Price chip */}
              <div className="mt-2 flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 blur-md bg-gradient-to-r from-indigo-400/20 to-cyan-300/20 rounded-full" />
                  <div className="relative rounded-full px-3 py-1 text-xs md:text-sm text-white/85 bg-black/40 ring-1 ring-white/10">
                    {label}
                  </div>
                </div>
                {price === 0n && (
                  <span className="text-[11px] md:text-xs text-white/55 inline-flex items-center gap-1">
                    <SparkIcon className="w-3.5 h-3.5" /> event exclusive
                  </span>
                )}
              </div>

              {/* CTA */}
              <motion.button
                onClick={buy}
                disabled={!isConnected || owned || busy}
                whileTap={{ scale: 0.985 }}
                className={`
                  group relative mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3
                  text-sm font-semibold tracking-wide focus:outline-none
                  ${owned
                    ? "bg-black/40 text-white/70 ring-1 ring-white/10 cursor-default hover:bg-black/45 transition"
                    : "bg-[#0b0f17]/75 text-white ring-1 ring-indigo-400/30 hover:ring-indigo-300/40 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_12px_36px_rgba(99,102,241,0.20)] transition"
                  }
                `}
              >
                {!owned && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-[1px] rounded-xl bg-[conic-gradient(from_0deg,rgba(129,140,248,.15),rgba(56,189,248,.12),transparent_60%,transparent)] opacity-60 blur-sm transition group-hover:opacity-80"
                  />
                )}
                <span className="relative flex items-center gap-2">
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white/80" /> Processing…
                    </>
                  ) : owned ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300/90" /> Claimed
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 text-indigo-200/90" /> Buy Now
                    </>
                  )}
                </span>
              </motion.button>

              {/* Inline error */}
              <AnimatePresence>
                {err && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 text-red-200 ring-1 ring-red-400/20 px-3 py-2 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="leading-snug">{err}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {celebrate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="mt-3 text-center text-emerald-200/85 text-sm"
                  >
                    ✅ Added to your vault
                    <Sparkles />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </HoloCard>
        </motion.div>
      </div>

      {/* keyframe safety */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spin-rev { to { transform: rotate(-360deg); } }
      `}</style>
    </motion.div>
  );
}
