// components/TierCard.tsx
import React from "react";
import {
  motion,
  AnimatePresence,
  useMotionTemplate,
  useTransform,
} from "framer-motion";
import {
  ShoppingCart,
  Check,
  Loader2,
  Shield,
  Sparkles as SparkIcon,
  AlertCircle,
  ExternalLink,
  Wallet2,
} from "lucide-react";
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

// Payment token constants
import {
  YEARN_TOKEN,
  YEARN_TOKEN_DECIMALS,
  YEARN_TOKEN_SYMBOL,
} from "../lib/constants";



type Props = {
  passAddress: Address;
  marketAddress: Address;
  tier: { id: number; uri: string };
  tokenAddress?: Address;   
  tokenDecimals?: number;
  tokenSymbol?: string;
};


const isZeroAddress = (a?: string) => !a || /^0x0{40}$/i.test(a);

// format bigint token to exactly 3 decimals (string-safe)
const format3 = (value: bigint, decimals: number) => {
  const str = formatUnits(value, decimals);
  const [i, d = ""] = str.split(".");
  const dec = (d + "000").slice(0, 3);
  return `${i}.${dec}`;
};

/* ──────────────────────────────────────────────────────────────
   Tx Dialog (modal with stages)
   ────────────────────────────────────────────────────────────── */
type TxStage = "hidden" | "waiting" | "confirming" | "success";
const stageCopy: Record<TxStage, { title: string; subtitle: string }> = {
  hidden: { title: "", subtitle: "" },
  waiting: { title: "Waiting…", subtitle: "Approve payment token if prompted" },
  confirming: {
    title: "Confirming…",
    subtitle: "Your transaction is being confirmed on-chain",
  },
  success: { title: "Success!", subtitle: "NFT is added to your wallet" },
};

const TxDialog: React.FC<{ stage: TxStage }> = ({ stage }) => {
  if (stage === "hidden") return null;
  const { title, subtitle } = stageCopy[stage];
  const isSuccess = stage === "success";
  return (
    <AnimatePresence>
      <motion.div
        key="tx-dialog"
        className="absolute inset-0 grid place-items-center z-[60] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={`pointer-events-auto relative mx-4 w-full max-w-sm rounded-2xl ${
            isSuccess
              ? "bg-black/40 ring-1 ring-emerald-300/20"
              : "bg-[#0b0f17]/85 ring-1 ring-white/10"
          } p-5 text-center`}
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.98, y: 4 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center justify-center mb-3">
            {isSuccess ? (
              <Check className="w-6 h-6 text-emerald-300" />
            ) : (
              <Loader2 className="w-6 h-6 text-white/85 animate-spin" />
            )}
          </div>
          <h4
            className={`font-semibold ${
              isSuccess ? "text-emerald-200" : "text-white/90"
            }`}
          >
            {title}
          </h4>
          <p className="mt-1 text-sm text-white/70">{subtitle}</p>
          {isSuccess && (
            <p className="mt-2 text-xs text-emerald-200/85">
              You can see your NFT in your wallet.
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ──────────────────────────────────────────────────────────────
   Confetti
   ────────────────────────────────────────────────────────────── */
type ConfettiPiece = {
  id: number;
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  s: number;
  d: number;
  delay: number;
};
const makeConfetti = (count = 110): ConfettiPiece[] =>
  Array.from({ length: count }).map((_, i) => {
    const angle = Math.random() * Math.PI - Math.PI / 2;
    const speed = 160 + Math.random() * 240;
    return {
      id: i,
      x: 50 + (Math.random() * 8 - 4),
      y: 45 + (Math.random() * 6 - 3),
      r: Math.random() * 360,
      vx: Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed - (120 + Math.random() * 100),
      s: 0.6 + Math.random() * 0.8,
      d: 1.3 + Math.random() * 0.8,
      delay: Math.random() * 0.15,
    };
  });

const ConfettiShower: React.FC<{ show: boolean }> = ({ show }) => {
  const [pieces, setPieces] = React.useState<ConfettiPiece[]>([]);
  React.useEffect(() => {
    if (show) setPieces(makeConfetti());
  }, [show]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 overflow-hidden z-[50] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute block"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: 8,
                height: 10,
                transformOrigin: "center",
                background: "white",
                borderRadius: 2,
                boxShadow: "0 0 8px rgba(255,255,255,.15)",
              }}
              initial={{ opacity: 0, scale: 0.4, rotate: p.r }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: [0, p.vx * 0.35, p.vx * 0.7],
                y: [0, p.vy * 0.5, p.vy],
                rotate: [p.r, p.r + 360],
                scale: [p.s, p.s * 0.9, p.s * 0.8],
              }}
              transition={{ delay: p.delay, duration: p.d, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ──────────────────────────────────────────────────────────────
   Overlay: BLUR → CONFETTI → DIALOG
   ────────────────────────────────────────────────────────────── */
const OverlayLayer: React.FC<{ blur: boolean; children?: React.ReactNode }> = ({
  blur,
  children,
}) => {
  return (
    <div className="absolute inset-0 isolate z-40">
      <div
        className={`absolute inset-0 rounded-xl transition ${
          blur ? "backdrop-blur-md bg-black/35" : "backdrop-blur-0 bg-transparent"
        }`}
      />
      {children}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   Corner ribbon (contained; no overflow clipping)
   ────────────────────────────────────────────────────────────── */
const CornerRibbon: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      className="absolute top-2 left-2 z-30"
    >
      <div
        className="
          px-3 py-1
          text-[10px] md:text-[11px] font-semibold uppercase tracking-wider
          text-white
          bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400
          ring-1 ring-white/10 shadow
          rounded-sm
        "
        style={{
          clipPath:
            "polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0% 100%)",
        }}
        title="You're whitelisted for this tier"
      >
        Whitelisted
      </div>
    </motion.div>
  );
};

/* ──────────────────────────────────────────────────────────────
   Main
   ────────────────────────────────────────────────────────────── */
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

  // Prefer props when provided; otherwise fall back to constants
  const payTokenAddress = (tokenAddress ?? YEARN_TOKEN) as Address;

  // YEARN_TOKEN_DECIMALS might be an env string -> convert safely
  const envDecimals = Number(YEARN_TOKEN_DECIMALS);
  const payTokenDecimals =
    typeof tokenDecimals === "number"
      ? tokenDecimals
      : Number.isFinite(envDecimals)
      ? envDecimals
      : 18;

  const payTokenSymbol = tokenSymbol ?? YEARN_TOKEN_SYMBOL ?? "TOKEN";


  const [name] = React.useState(`Pass #${tier.id}`);
  const [owned, setOwned] = React.useState(false);

  // Your price (per-user), plus full tier prices for display
  const [price, setPrice] = React.useState<bigint>(0n); // priceOf(id, address)
  const [pubPrice, setPubPrice] = React.useState<bigint>(0n);
  const [wlPrice, setWlPrice] = React.useState<bigint>(0n);
  const [isWl, setIsWl] = React.useState(false);

  const [tokenBal, setTokenBal] = React.useState<bigint>(0n);

  const [busy, setBusy] = React.useState(false);
  const [celebrate, setCelebrate] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [txStage, setTxStage] = React.useState<TxStage>("hidden");

  // Flags
  const priceIsFree = price === 0n;
  const needsToken = !priceIsFree;
  const hasFunds = priceIsFree || tokenBal >= price;

  // Load ownership + prices + whitelist status
  React.useEffect(() => {
    let stop = false;
    (async () => {
      if (!address || !publicClient) return;
      try {
        const [bal, pYour, wl, pPub, pWl] = await Promise.all([
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
          publicClient.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: "isWhitelisted",
            args: [BigInt(tier.id), address],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: "pricePublic",
            args: [BigInt(tier.id)],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: "priceWhitelist",
            args: [BigInt(tier.id)],
          }) as Promise<bigint>,
        ]);

        if (!stop) {
          setOwned(bal > 0n);
          setPrice(pYour); // Your effective price from contract
          setIsWl(wl);
          setPubPrice(pPub);
          setWlPrice(pWl);
        }
      } catch {
        if (!stop) setErr("Unable to fetch price/whitelist right now.");
      }
    })();
    return () => {
      stop = true;
    };
  }, [address, publicClient, tier.id, passAddress, marketAddress]);

  // Load token balance
  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        if (!address || !publicClient || !needsToken || isZeroAddress(payTokenAddress)) {
          if (!stop) setTokenBal(0n);
          return;
        }
        const bal = (await publicClient.readContract({
          address: payTokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        })) as bigint;
        if (!stop) setTokenBal(bal);
      } catch {
        if (!stop) setTokenBal(0n);
      }
    })();
    return () => {
      stop = true;
    };
  }, [address, publicClient, payTokenAddress, needsToken, price]);

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

  // Buy flow
  const buy = async () => {
    setErr(null);

    if (!isConnected) {
      setErr("Connect your wallet first.");
      return;
    }
    if (!address) {
      setErr("No account found in wallet.");
      return;
    }
    if (!walletClient || !publicClient) {
      setErr("Wallet or RPC is not ready.");
      return;
    }
    if (owned) {
      return;
    }
    if (isZeroAddress(marketAddress)) {
      setErr("Market address is not set.");
      return;
    }
    if (isZeroAddress(passAddress)) {
      setErr("Pass address is not set.");
      return;
    }

    setBusy(true);
    setTxStage("waiting");

    try {
      // Ensure correct chain
      const targetChainId = publicClient.chain?.id ?? chain?.id ?? currentChainId;
      if (targetChainId && chain?.id !== targetChainId && switchChainAsync) {
        try {
          await switchChainAsync({ chainId: targetChainId });
        } catch {
          setBusy(false);
          setTxStage("hidden");
          setErr("Please switch to the correct network.");
          return;
        }
      }

      // Funds + allowance
      if (needsToken) {
        if (isZeroAddress(payTokenAddress)) {
          setBusy(false);
          setTxStage("hidden");
          setErr("Payment token address is not set.");
          return;
        }
        if (!hasFunds) {
          setBusy(false);
          setTxStage("hidden");
          setErr(`Insufficient ${payTokenSymbol} balance to buy this NFT.`);
          return;
        }

        const allowance = (await publicClient.readContract({
          address: payTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, marketAddress],
        })) as bigint;

        if (allowance < price) {
          const approveSim = await publicClient.simulateContract({
            account: address,
            address: payTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [marketAddress, maxUint256],
          });
          const approveHash = await walletClient.writeContract(approveSim.request);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      // BUY — use nonpayable
      const buySim = await publicClient.simulateContract({
        account: address,
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: "buy",
        args: [BigInt(tier.id), address],
      });

      const buyHash = await walletClient.writeContract(buySim.request);
      setTxStage("confirming");

      const receipt = await publicClient.waitForTransactionReceipt({ hash: buyHash });
      if (receipt.status !== "success") throw new Error("Transaction reverted.");

      // Verify
      const bal = (await publicClient.readContract({
        address: passAddress,
        abi: YEARNPASS1155_ABI,
        functionName: "balanceOf",
        args: [address, BigInt(tier.id)],
      })) as bigint;

      const nowOwned = bal > 0n;
      setOwned(nowOwned);

      // Refresh balance
      if (needsToken) {
        try {
          const newBal = (await publicClient.readContract({
            address: payTokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address],
          })) as bigint;
          setTokenBal(newBal);
        } catch {}
      }

      if (nowOwned) {
        setTxStage("success");
        setCelebrate(true);
        setTimeout(() => {
          setTxStage("hidden");
          setCelebrate(false);
        }, 1800);
      } else {
        setTxStage("hidden");
      }
    } catch (e: any) {
      const msg: string =
        e?.shortMessage || e?.details || e?.message || "Transaction failed.";
      setErr(msg);
      setTxStage("hidden");
    } finally {
      setBusy(false);
    }
  };

  // Labels
  const yourPriceLabel = priceIsFree
    ? "Free"
    : `${formatUnits(price, payTokenDecimals)} ${payTokenSymbol}`;
  const pubPriceLabel = `${formatUnits(pubPrice, payTokenDecimals)} ${payTokenSymbol}`;
  const wlPriceLabel = `${formatUnits(wlPrice, payTokenDecimals)} ${payTokenSymbol}`;
  const youSave =
    pubPrice > price
      ? `${formatUnits(pubPrice - price, payTokenDecimals)} ${payTokenSymbol}`
      : null;

  // Tilt + glare
  const { x, y, rotateX, rotateY, onMove } = useTilt3D();
  const xPct = useTransform(x, (v: number) => v * 100);
  const yPct = useTransform(y, (v: number) => v * 100);
  const glare = useMotionTemplate`
    radial-gradient(420px circle at ${xPct}% ${yPct}%, rgba(255,255,255,.12), transparent 45%)
  `;

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
              className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#0b0f17] ring-1 ring-white/8 shadow-glass"
              style={{ transform: "translateZ(30px)" }}
            >
              {/* Whitelist ribbon (contained) */}
              <CornerRibbon show={isWl} />

              {/* Balance sticker */}
              {needsToken && (
                <div className="absolute top-3 right-3 z-30">
                  <div className="relative">
                    <div className="absolute -inset-2 blur-md bg-gradient-to-r from-indigo-400/25 to-cyan-300/20 rounded-full" />
                    
                  </div>
                  {!owned && !hasFunds && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-red-500/15 text-red-100 ring-1 ring-red-400/30 text-[11px]">
                      <AlertCircle className="w-3 h-3" />
                      Insufficient {payTokenSymbol}
                    </div>
                  )}
                </div>
              )}

              {/* Base scene */}
              <div className="pointer-events-none absolute inset-0 z-10">
                <MetaverseScene />
                <div className="absolute inset-0 grid place-items-center">
                  <motion.img
                    src={YearnChamp}
                    alt={name}
                    loading="lazy"
                    draggable={false}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    className="w-[64%] md:w-[60%] h-auto object-contain select-none opacity-[0.85]"
                  />
                </div>
                <OrbitRings />
                <motion.div aria-hidden className="absolute inset-0" style={{ backgroundImage: glare }} />
                <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_120%,rgba(0,0,0,.55),transparent)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent" />
              </div>

              {/* Overlay: blur + confetti + dialog */}
              <OverlayLayer blur={txStage !== "hidden"}>
                <ConfettiShower show={celebrate} />
                <TxDialog stage={txStage} />
              </OverlayLayer>
            </div>

            {/* CONTENT */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h3
                  className="text-white/90 font-semibold truncate tracking-wide"
                  title={name}
                >
                  {name}
                </h3>

                <div className="flex items-center gap-2">
                  {/* If you want the inline pill too, keep this; else remove */}
                  {isWl && !owned && (
                    <motion.span
                      initial={{ y: -6, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-indigo-400/10 text-indigo-200 ring-1 ring-indigo-300/20"
                      title="You're whitelisted for this tier"
                    >
                      ✓ Whitelisted
                    </motion.span>
                  )}
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
              </div>

              {/* Price area: show YOUR price + PUBLIC price always when whitelisted */}
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <div className="absolute inset-0 blur-md bg-gradient-to-r from-indigo-400/20 to-cyan-300/20 rounded-full" />
                  <div className="relative rounded-full px-3 py-1 text-xs md:text-sm text-white/85 bg-black/40 ring-1 ring-white/10">
                    <span className="mr-1 opacity-80">
                      {isWl ? "Your price" : "Price"}
                    </span>
                    <strong className="font-semibold">{yourPriceLabel}</strong>
                  </div>
                </div>

                {/* Show public reference when WL (even if equal) */}
                {isWl && (
                  <span
                    className={`text-[11px] md:text-xs ${
                      pubPrice > price
                        ? "line-through decoration-red-400/70 decoration-2 text-white/60"
                        : "text-white/60"
                    }`}
                    title={`Public price: ${pubPriceLabel}`}
                  >
                    Public: {pubPriceLabel}
                  </span>
                )}

                {/* Also show explicit WL price reference */}
                {isWl && (
                  <span
                    className="text-[11px] md:text-xs text-indigo-200/90"
                    title={`Whitelist price: ${wlPriceLabel}`}
                  >
                    WL: {wlPriceLabel}
                  </span>
                )}

                {/* Savings / free indicators */}
                {isWl && youSave && pubPrice > price && (
                  <span className="text-[11px] md:text-xs inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/20">
                    You save {youSave}
                  </span>
                )}
                {isWl && priceIsFree && (
                  <span className="text-[11px] md:text-xs inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-violet-400/10 text-violet-200 ring-1 ring-violet-300/20">
                    Whitelist free mint 🎉
                  </span>
                )}
              </div>

              {/* Subtle balance line */}
              {needsToken && (
                <div className="mt-1 text-[11px] md:text-xs text-white/60">
                  Balance: {format3(tokenBal, payTokenDecimals)} {payTokenSymbol}
                  {!owned && !hasFunds && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-red-500/10 text-red-200 ring-1 ring-red-400/20">
                      <AlertCircle className="w-3 h-3" />
                      Insufficient {payTokenSymbol}
                    </span>
                  )}
                </div>
              )}

              {/* CTA */}
              <motion.button
                onClick={buy}
                disabled={!isConnected || owned || busy || !hasFunds}
                whileTap={{ scale: 0.985 }}
                className={`group relative mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3
                  text-sm font-semibold tracking-wide focus:outline-none
                  ${
                    owned
                      ? "bg-black/40 text-white/70 ring-1 ring-white/10 cursor-default hover:bg-black/45 transition"
                      : !hasFunds && needsToken
                      ? "bg-black/35 text-white/60 ring-1 ring-white/10 cursor-not-allowed"
                      : "bg-[#0b0f17]/75 text-white ring-1 ring-indigo-400/30 hover:ring-indigo-300/40 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_12px_36px_rgba(99,102,241,0.20)] transition"
                  }`}
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
                      <Loader2 className="w-4 h-4 animate-spin text-white/80" />{" "}
                      Processing…
                    </>
                  ) : owned ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300/90" /> Claimed
                    </>
                  ) : !hasFunds && needsToken ? (
                    <>
                      <AlertCircle className="w-4 h-4" /> Insufficient {payTokenSymbol}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 text-indigo-200/90" /> Buy
                      Now
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

              {/* Success toast (mirrors dialog success) */}
              <AnimatePresence>
                {celebrate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="mt-3 text-center text-emerald-200/85 text-sm"
                  >
                    <div className="flex items-center justify-center gap-2">
                      ✅ Added to your vault <Sparkles />
                    </div>
                    <div className="mt-1 text-emerald-100/70 flex items-center justify-center gap-1 text-[12px]">
                      You can see your NFT in your wallet
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </HoloCard>
        </motion.div>
      </div>

      {/* safety keyframes */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spin-rev { to { transform: rotate(-360deg); } }
      `}</style>
    </motion.div>
  );
}
