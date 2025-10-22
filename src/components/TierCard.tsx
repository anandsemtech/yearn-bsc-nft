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
  Copy as CopyIcon,
  ChevronDown,
} from "lucide-react";
import type { Address, EstimateContractGasParameters } from "viem";
import { formatUnits, toHex, getAddress } from "viem";
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
import { appKit } from "../lib/appkit";
import {
  YEARN_TOKEN,
  YEARN_TOKEN_DECIMALS,
  YEARN_TOKEN_SYMBOL,
} from "../lib/constants";

/* 🔧 NEW: loader assets */
import BotVideo from "../assets/BotVideoAnimation.webm";
import BotPoster from "../assets/BotVideoPosterBlur.jpg";

/* ---------- tiny logger (debug-level) ---------- */
const log = (...args: any[]) => console.debug("[TierCard]", ...args);

/* Fonts once */
const ensureOrbitronLink = (() => {
  let done = false;
  return () => {
    if (done || typeof document === "undefined") return;
    const existing = document.querySelector('link[data-font="orbitron-audiowide"]');
    if (existing) { done = true; return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("data-font", "orbitron-audiowide");
    link.href =
      "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Audiowide&display=swap";
    document.head.appendChild(link);
    done = true;
  };
})();

/** Env overrides */
const ENV_COLLECTION_URI =
  (import.meta as any)?.env?.VITE_COLLECTION_URI ||
  (import.meta as any)?.env?.COLLECTION_URI || "";
const DEFAULT_IPFS_GATEWAY =
  (import.meta as any)?.env?.VITE_IPFS_GATEWAY || "https://ipfs.io/ipfs/";
const ID_FORMAT = (
  (import.meta as any)?.env?.VITE_ERC1155_ID_FORMAT || "hex"
).toLowerCase() as "hex" | "dec";

const isMobile = () =>
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const isMetaMaskUA = () =>
  typeof window !== "undefined" && (window as any)?.ethereum?.isMetaMask === true;

const shortenMid = (v?: string, left = 10, right = 6) => {
  if (!v) return "";
  if (v.length <= left + right + 3) return v;
  return `${v.slice(0, left)}…${v.slice(-right)}`;
};

// --- Capability & platform helpers ------------------------------------------
const ua = () => (typeof navigator !== "undefined" ? navigator.userAgent : "");
const isIOS = () => /iPad|iPhone|iPod/.test(ua());
const isAndroid = () => /Android/i.test(ua());
const dataSaverOn = () => !!(navigator as any)?.connection?.saveData;

const supportsWebGL2 = () => {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
};

// quick, cached micro-benchmark (lower = faster)
const LOWEND_CACHE = "yt.lowend.v2";
async function quickBenchmarkMs(): Promise<number> {
  const t0 = performance.now();
  // simple CPU loop (kept small to avoid jank)
  let i = 0;
  while (i < 300_000) i++;
  return new Promise((resolve) =>
    requestAnimationFrame(() => resolve(performance.now() - t0))
  );
}

// Conservative heuristic with positive hints
function guessLowEndBase(): boolean {
  // Dev override
  const override = typeof localStorage !== "undefined" ? localStorage.getItem("yt.forceDevice") : null;
  if (override === "low") return true;
  if (override === "high") return false;

  // Respect explicit user setting
  if (dataSaverOn()) return true;

  const nav: any = navigator || {};
  const mem = Number.isFinite(nav.deviceMemory) ? Number(nav.deviceMemory) : undefined;
  const cores = Number.isFinite(nav.hardwareConcurrency) ? Number(nav.hardwareConcurrency) : undefined;
  const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
  const webgl2 = supportsWebGL2();

  // Treat modern iOS/Android as high-end by default if positive hints are present
  const mobileHighHints = (isIOS() || isAndroid()) && webgl2 && dpr >= 2;

  // If OS won’t tell us memory/cores but we have strong hints, assume high-end
  if (mobileHighHints && (mem === undefined || cores === undefined)) return false;

  // If we *do* have metrics, only call low-end when both are clearly small
  if (mem !== undefined && cores !== undefined) {
    if (mem <= 3 && cores <= 2) return true; // genuinely small devices
    return false;
  }

  // Fallback: if hints look weak, be cautious; otherwise assume fine
  if (!webgl2 || dpr < 2) return true;
  return false;
}

// Hook that refines the base guess with a tiny benchmark and caches the result
function useLowEnd(): boolean {
  const [low, setLow] = React.useState<boolean>(() => {
    const cached = typeof localStorage !== "undefined" ? localStorage.getItem(LOWEND_CACHE) : null;
    if (cached === "1") return true;
    if (cached === "0") return false;
    return guessLowEndBase(); // initial guess
  });

  React.useEffect(() => {
    let cancelled = false;
    // Skip if user forced an override
    const override = typeof localStorage !== "undefined" ? localStorage.getItem("yt.forceDevice") : null;
    if (override === "low" || override === "high") return;

    (async () => {
      try {
        const ms = await quickBenchmarkMs();
        // Thresholds tuned to be gentle: >45ms → likely weak; <30ms → strong
        const inferredLow = ms > 45;
        const inferredHigh = ms < 30;

        const final =
          dataSaverOn() ? true :      // user intent wins
          inferredHigh ? false :
          inferredLow ? true :
          guessLowEndBase();

        if (!cancelled) {
          setLow(final);
          try {
            localStorage.setItem(LOWEND_CACHE, final ? "1" : "0");
          } catch {}
        }
      } catch {
        // If the benchmark fails, keep the base guess
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return low;
}

const isLikelyImage = (u?: string) =>
  !!u && /\.(png|jpe?g|webp|gif|avif|svg)$/i.test((u.split("?")[0] ?? ""));

const isGif = (u?: string) => !!u && /\.gif(\?.*)?$/i.test((u.split("?")[0] ?? ""));
const isSvg = (u?: string) => !!u && /\.svg(\?.*)?$/i.test((u.split("?")[0] ?? ""));

const optimizeImageUrl = (url?: string, width = 800) => {
  if (!url || !isLikelyImage(url) || isGif(url) || isSvg(url)) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("width")) u.searchParams.set("width", String(width));
    if (!u.searchParams.has("format")) u.searchParams.set("format", "auto");
    const host = u.host.toLowerCase();
    const isPlainIpfs = /(^|\.)ipfs\.io$|(^|\.)dweb\.link$/.test(host);
    if (isPlainIpfs) {
      const original = u.toString();
      return `https://wsrv.nl/?url=${encodeURIComponent(original)}&w=${width}&output=webp&we&il`;
    }
    return u.toString();
  } catch { return url; }
};

const buildSrcSet = (url?: string) => {
  if (!url || !isLikelyImage(url) || isGif(url) || isSvg(url)) {
    return { src: url, srcSet: undefined, sizes: undefined };
  }
  const widths = [480, 800, 1200];
  const entries = widths.map((w) => `${optimizeImageUrl(url, w)} ${w}w`);
  return {
    src: optimizeImageUrl(url, 800),
    srcSet: entries.join(", "),
    sizes: "(max-width: 640px) 480px, (max-width: 1024px) 800px, 1200px",
  };
};

const CopyField: React.FC<{
  label: string;
  value: string;
  display?: string;
  mono?: boolean;
  color?: "indigo" | "cyan" | "violet";
}> = ({ label, value, display, mono, color = "indigo" }) => {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {}
  };
  const ring =
    color === "cyan"
      ? "ring-cyan-400/30 hover:bg-cyan-500/15"
      : color === "violet"
      ? "ring-violet-400/30 hover:bg-violet-500/15"
      : "ring-indigo-400/30 hover:bg-indigo-500/15";

  return (
    <div className="flex items-center gap-2 text-xs text-white/85">
      <span className="opacity-70 shrink-0">{label}:</span>
      <code
        className={`px-1.5 py-[2px] rounded bg-white/[0.06] ring-1 ring-white/10 ${
          mono ? "font-mono" : ""
        } max-w-[60%] sm:max-w-[70%] overflow-hidden text-ellipsis whitespace-nowrap`}
        title={value}
      >
        {display ?? value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className={`inline-flex items-center gap-1 px-1.5 py-1 rounded ${ring} ring-1 transition`}
        aria-label="Copy to clipboard"
      >
        <CopyIcon className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

type Props = {
  passAddress: Address;
  marketAddress: Address;
  tier: { id: number; uri: string };
  tokenAddress?: Address;
  tokenDecimals?: number;
  tokenSymbol?: string;
};

 const isZeroAddress = (a?: string) => !a || /^0x0{40}$/i.test(a.trim());


const format3 = (value: bigint, decimals: number) => {
  const str = formatUnits(value, decimals);
  const [i, d = ""] = str.split(".");
  const dec = (d + "000").slice(0, 3);
  return `${i}.${dec}`;
};
const format5 = (value: bigint, decimals = 18) => {
  const s = formatUnits(value, decimals);
  const n = Number(s);
  if (!isFinite(n) || n === 0) return "0.00000";
  if (Math.abs(n) < 0.00001) return "<0.00001";
  return n.toFixed(5);
};

const ipfsToHttp = (uri?: string, gateway = DEFAULT_IPFS_GATEWAY): string | undefined => {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) return gateway + uri.slice("ipfs://".length);
  return uri;
};

const idHex64 = (n: number) => toHex(BigInt(n)).slice(2).toLowerCase().padStart(64, "0");
const resolveTokenJsonUrl = (template: string, id: number): string => {
  if (!template) return "";
  let out = template;
  if (/{idhex}/i.test(out)) out = out.replace(/{idhex}/gi, idHex64(id));
  if (out.includes("{id}")) {
    const rep = ID_FORMAT === "dec" ? String(id) : idHex64(id);
    out = out.replace("{id}", rep);
  }
  return out;
};

type NftMeta = {
  name?: string;
  description?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
  attributes?: Array<{ trait_type?: string; value?: string }>;
};

/* Tx dialog */
type TxStage = "hidden" | "waiting" | "confirming" | "success";
const stageCopy: Record<TxStage, { title: string; subtitle: string }> = {
  hidden: { title: "", subtitle: "" },
  waiting: { title: "Waiting…", subtitle: "Approve payment token if prompted" },
  confirming: { title: "Confirming…", subtitle: "Your transaction is being confirmed on-chain" },
  success: { title: "Success!", subtitle: "NFT is added to your wallet" },
};

/* ✅ Enhanced, sticky & resumable TxDialog */
const TxDialog: React.FC<{
  stage: TxStage;
  hash?: `0x${string}` | null;
  explorerHref?: string;
  note?: string | null;
  onDismiss?: () => void;
  onForceReset?: () => void;
}> = ({ stage, hash, explorerHref, note, onDismiss, onForceReset }) => {
  if (stage === "hidden") return null;
  const { title, subtitle } = stageCopy[stage];
  const isSuccess = stage === "success";
  const isConfirming = stage === "confirming" || stage === "waiting";
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
            isSuccess ? "bg-black/40 ring-1 ring-emerald-300/20" : "bg-[#0b0f17]/90 ring-1 ring-white/12"
          } p-5 text-center`}
          initial={{ scale: 0.96, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.98, y: 4 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center justify-center mb-3">
            {isSuccess ? <Check className="w-6 h-6 text-emerald-300" /> : <Loader2 className="w-6 h-6 text-white/85 animate-spin" />}
          </div>
          <h4 className={`font-semibold ${isSuccess ? "text-emerald-200" : "text-white/90"}`}>{title}</h4>
          <p className="mt-1 text-sm text-white/70">{subtitle}</p>
          {note && <p className="mt-2 text-xs text-white/60">{note}</p>}

          {isConfirming && (
            <div className="mt-3 flex items-center justify-center gap-2 text-[12px] text-white/65">
              {explorerHref ? (
                 <a className="underline hover:no-underline" href={explorerHref} target="_blank" rel="noopener noreferrer">

                  View on explorer
                </a>
              ) : null}
              {hash ? <span className="opacity-60">•</span> : null}
              {hash ? <span className="opacity-80">{shortenMid(hash, 10, 8)}</span> : null}
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-2">
            {isConfirming && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg px-3 py-1.5 text-[12px] bg-white/8 text-white/85 ring-1 ring-white/12 hover:bg-white/12"
              >
                Hide (keep waiting)
              </button>
            )}
            {isConfirming && onForceReset && (
              <button
                type="button"
                onClick={onForceReset}
                className="rounded-lg px-3 py-1.5 text-[12px] bg-red-500/10 text-red-200 ring-1 ring-red-400/20 hover:bg-red-500/15"
                title="Only if the transaction is stuck or dropped"
              >
                Clear & retry
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* Confetti */
type ConfettiPiece = { id: number; x: number; y: number; r: number; vx: number; vy: number; s: number; d: number; delay: number; };
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
  React.useEffect(() => { if (show) setPieces(makeConfetti()); }, [show]);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="absolute inset-0 overflow-hidden z-[50] pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute block"
              style={{
                left: `${p.x}%`, top: `${p.y}%`, width: 8, height: 10,
                transformOrigin: "center", background: "white", borderRadius: 2, boxShadow: "0 0 8px rgba(255,255,255,.15)"
              }}
              initial={{ opacity: 0, scale: 0.4, rotate: p.r }}
              animate={{ opacity: [0, 1, 1, 0], x: [0, p.vx * 0.35, p.vx * 0.7], y: [0, p.vy * 0.5, p.vy], rotate: [p.r, p.r + 360], scale: [p.s, p.s * 0.9, p.s * 0.8] }}
              transition={{ delay: p.delay, duration: p.d, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const OverlayLayer: React.FC<{ blur: boolean; children?: React.ReactNode }> = ({ blur, children }) => (
  <div className="absolute inset-0 isolate z-40">
    <div className={`absolute inset-0 rounded-xl transition ${blur ? "backdrop-blur-md bg-black/35" : "backdrop-blur-0 bg-transparent"}`} />
    {children}
  </div>
);

/** Open wallet connect modal */
const openConnect = () => { try { appKit?.open?.(); } catch {} };

/** Utility */
const hasValue = (v?: bigint | null) => typeof v === "bigint" && v > 0n;



function BrandLoader({ label = "Loading NFT..." }: { label?: string }) {
  return (
    <div className="relative w-[72%] md:w-[64%] aspect-square grid place-items-center rounded-xl overflow-hidden ring-1 ring-white/10 bg-black/40">
      <img
        src={BotPoster}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-70"
        draggable={false}
        loading="eager"
      />
      <video
        // iOS that can't play WebM will just show the poster — that's fine.
        src={BotVideo}
        poster={BotPoster}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="relative w-[68%] h-auto rounded-lg shadow-[0_8px_40px_rgba(0,0,0,.35)]"
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-white/80">
        {label}
      </div>
    </div>
  );
}


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
  React.useEffect(() => { ensureOrbitronLink(); }, []);

  const lowEnd = useLowEnd(); // always render full FX; loader is independent of UA/heuristics



  const { isConnected, address, chain, status } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();

  const publicClient = usePublicClient(chain?.id ? ({ chainId: chain.id } as any) : undefined);

  React.useEffect(() => {
    log("hooks", {
      walletChainId: chain?.id,
      wagmiUseChainId: currentChainId,
      publicClientChainId: (publicClient as any)?.chain?.id,
    });
  }, [chain?.id, currentChainId, publicClient]);

  const payTokenAddress = (tokenAddress ?? YEARN_TOKEN) as Address;
  const envDecimals = Number(YEARN_TOKEN_DECIMALS);
  const payTokenDecimals =
    typeof tokenDecimals === "number" ? tokenDecimals : Number.isFinite(envDecimals) ? envDecimals : 18;
  const payTokenSymbol = tokenSymbol ?? YEARN_TOKEN_SYMBOL ?? "TOKEN";
  const connected = isConnected && !!address;

  // --- NEW: explorer + pending key helpers/state ---
  const explorerBase =
    chain?.blockExplorers?.default?.url ??
    (chain?.id === 56 ? "https://bscscan.com" : undefined);

  const pendingKey = (addr?: Address) =>
    addr ? `yt.pending.buy.${String(currentChainId)}.${String(tier.id)}.${addr}` : null;

  const txUrl = (hash?: `0x${string}` | null) =>
    hash && explorerBase ? `${explorerBase}/tx/${hash}` : undefined;

  const [pendingHash, setPendingHash] = React.useState<`0x${string}` | null>(null);
  const [resumeNote, setResumeNote] = React.useState<string | null>(null);

  // State
  const [meta, setMeta] = React.useState<NftMeta | null>(null);
  const [mediaUrl, setMediaUrl] = React.useState<string | undefined>(undefined);
  
  const [name, setName] = React.useState(`Pass #${tier.id}`);
  const [owned, setOwned] = React.useState(false);

  const [price, setPrice] = React.useState<bigint>(0n);
  const [pubPrice, setPubPrice] = React.useState<bigint>(0n);
  const [wlPrice, setWlPrice] = React.useState<bigint>(0n);
  const [isWl, setIsWl] = React.useState(false);

  const [tokenBal, setTokenBal] = React.useState<bigint>(0n);
  const [allowance, setAllowance] = React.useState<bigint>(0n);

  const [busy, setBusy] = React.useState(false);
  const [celebrate, setCelebrate] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [txStage, setTxStage] = React.useState<TxStage>("hidden");

  const [showImportHelp, setShowImportHelp] = React.useState(false);

  /* NEW: native gas fee + balance tracking */
  const [nativeBal, setNativeBal] = React.useState<bigint>(0n);
  const [nativeBalReady, setNativeBalReady] = React.useState(false);
  const [feeApprove, setFeeApprove] = React.useState<bigint | null>(null);
  const [feeBuy, setFeeBuy] = React.useState<bigint | null>(null);
  const feeSymbol = chain?.nativeCurrency?.symbol || "BNB";
  const nativeDecimals = chain?.nativeCurrency?.decimals ?? 18;


  const priceIsFree = price === 0n;
  const needsToken = !priceIsFree;
  const hasFunds = priceIsFree || tokenBal >= price;

  /** ------------------ Gas helpers ------------------ */
  const perGasRef = React.useRef<bigint>(0n);
  const lastActionRef = React.useRef<"approve" | "buy" | null>(null);

  const getPerGasFee = React.useCallback(async (): Promise<bigint> => {
    try {
      const latest = await publicClient!.getBlock({ blockTag: "latest" });
      if (latest.baseFeePerGas) {
        try {
          const fees = await publicClient!.estimateFeesPerGas();
          const per = fees.maxFeePerGas ?? fees.gasPrice ?? 0n;
          if (per > 0n) perGasRef.current = per;
          return per;
        } catch {
          const priority = 2_000_000_000n;
          const per = latest.baseFeePerGas * 2n + priority;
          perGasRef.current = per;
          return per;
        }
      }
      const gp = await publicClient!.getGasPrice();
      if (gp > 0n) perGasRef.current = gp;
      return gp;
    } catch {
      return perGasRef.current || 2_000_000_000n;
    }
  }, [publicClient]);

  const roughApproveFee = React.useCallback((): bigint => {
    const per = perGasRef.current || 2_000_000_000n;
    const gl = 160_000n;
    return per * gl;
  }, []);
  const roughBuyFee = React.useCallback((): bigint => {
    const per = perGasRef.current || 2_000_000_000n;
    const gl = 220_000n;
    return per * gl;
  }, []);

  const estimateTxFee = React.useCallback(
    async (opts: EstimateContractGasParameters) => {
      try {
        const perGas = await getPerGasFee();
        const gl = await publicClient!.estimateContractGas(opts as any);
        const total = perGas > 0n && gl > 0n ? gl * perGas : 0n;
        return total > 0n ? total : null;
      } catch { return null; }
    },
    [publicClient, getPerGasFee]
  );

  const estimateApproveFee = React.useCallback(async (): Promise<bigint | null> => {
    try {
      if (!connected || !address || !publicClient || isZeroAddress(payTokenAddress)) return null;
      const need = price;
      let sum = 0n;

      const a = (await publicClient.readContract({
        address: payTokenAddress, abi: ERC20_ABI, functionName: "allowance", args: [address, marketAddress],
      })) as bigint;

      if (a > 0n && a < need) {
        const f0 = await estimateTxFee({
          account: address, address: payTokenAddress, abi: ERC20_ABI, functionName: "approve", args: [marketAddress, 0n],
        } as unknown as EstimateContractGasParameters);
        sum += f0 ?? roughApproveFee() / 2n;
      }
      if (a < need) {
        const f1 = await estimateTxFee({
          account: address, address: payTokenAddress, abi: ERC20_ABI, functionName: "approve", args: [marketAddress, need],
        } as unknown as EstimateContractGasParameters);
        sum += f1 ?? roughApproveFee();
      }
      return sum > 0n ? sum : roughApproveFee();
    } catch { return roughApproveFee(); }
  }, [connected, address, publicClient, payTokenAddress, marketAddress, price, estimateTxFee, roughApproveFee]);

  const estimateBuyFee = React.useCallback(async (): Promise<bigint | null> => {
    try {
      if (!connected || !address || !publicClient || isZeroAddress(marketAddress)) return null;
      const f = await estimateTxFee({
        account: address, address: marketAddress, abi: MARKET_ABI, functionName: "buy", args: [BigInt(tier.id), address],
      } as unknown as EstimateContractGasParameters);
      return f ?? roughBuyFee();
    } catch { return roughBuyFee(); }
  }, [connected, address, publicClient, marketAddress, tier.id, estimateTxFee, roughBuyFee]);

  const hasEnoughFor = (needWei?: bigint | null, padBps = 800) => {
    if (!nativeBalReady) return true;
    if (!needWei || needWei <= 0n) return true;
    const padded = (needWei * BigInt(10000 + padBps)) / 10000n;
    return nativeBal >= padded;
  };

  const gasWarnLine = (needWei?: bigint | null) => {
    if (!nativeBalReady) return `Fetching ${feeSymbol} balance… please try again in a moment.`;
    const have = format5(nativeBal, nativeDecimals);
    if (!needWei || needWei <= 0n) {
      return `Looks like you might need some ${feeSymbol} for network fees. You have ~${have} ${feeSymbol}. Add a little more and try again.`;
    }
    const needNum = Number(formatUnits(needWei, nativeDecimals));

    const needPretty = !isFinite(needNum) || needNum <= 0 ? "≈0.00001" : needNum < 1e-5 ? "≈0.00001" : needNum.toFixed(5);
    return `Not enough ${feeSymbol} for network fees. You have ~${have} ${feeSymbol}, need about ~${needPretty} ${feeSymbol}. Please top up and try again.`;
  };

  
  React.useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();
    const pick = (u?: string) => (u ? ipfsToHttp(u) || u : undefined);

    (async () => {
      try {
        let base = tier.uri?.trim() || "";
        if (!base && publicClient) {
          try {
            base = (await publicClient.readContract({
              address: passAddress, abi: YEARNPASS1155_ABI, functionName: "uri", args: [BigInt(tier.id)],
            })) as string;
          } catch {}
        }
        const chosen = (base && base.length > 0 ? base : ENV_COLLECTION_URI) || "";
        const tokenJson = resolveTokenJsonUrl(chosen, tier.id);
        if (!tokenJson) return;
        const jsonUrl = pick(tokenJson);
        if (!jsonUrl) return;

        const res = await fetch(jsonUrl, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as NftMeta;
        if (aborted) return;

        setMeta(data);
        setName(data?.name || `Pass #${tier.id}`);

        const media = data?.animation_url || data?.image;
        const http = pick(media);
        setMediaUrl(http);

       
      } catch {}
    })();

    return () => { ctrl.abort(); aborted = true; };
  }, [tier.id, tier.uri, passAddress, publicClient]);

  /** Ownership / price / WL / allowance */
  React.useEffect(() => {
    let stop = false;
    (async () => {
      if (!publicClient) return;
      try {
        if (!address) {
          const pPub = (await publicClient.readContract({
            address: marketAddress, abi: MARKET_ABI, functionName: "pricePublic", args: [BigInt(tier.id)],
          })) as bigint;
          if (!stop) {
            setOwned(false); setIsWl(false); setWlPrice(0n);
            setPubPrice(pPub); setPrice(pPub); setAllowance(0n);
          }
          return;
        }

        const [bal, pYour, wl, pPub, pWl, a] = await Promise.all([
          publicClient.readContract({ address: passAddress, abi: YEARNPASS1155_ABI, functionName: "balanceOf", args: [address, BigInt(tier.id)], }) as Promise<bigint>,
          publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "priceOf", args: [BigInt(tier.id), address], }) as Promise<bigint>,
          publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "isWhitelisted", args: [BigInt(tier.id), address], }) as Promise<boolean>,
          publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "pricePublic", args: [BigInt(tier.id)], }) as Promise<bigint>,
          publicClient.readContract({ address: marketAddress, abi: MARKET_ABI, functionName: "priceWhitelist", args: [BigInt(tier.id)], }) as Promise<bigint>,
          publicClient.readContract({ address: payTokenAddress, abi: ERC20_ABI, functionName: "allowance", args: [address, marketAddress], }) as Promise<bigint>,
        ]);

        log("read-ownership/prices/allowance", {
          walletChainId: chain?.id,
          publicClientChainId: (publicClient as any)?.chain?.id,
          wagmiUseChainId: currentChainId,
          allowanceWei: a?.toString?.(),
          token: payTokenAddress,
        });

        if (!stop) {
          setOwned(bal > 0n);
          setPrice(pYour);
          setIsWl(wl);
          setPubPrice(pPub);
          setWlPrice(pWl);
          setAllowance(a);
        }
      } catch (e) {
        log("read-ownership/prices/allowance:error", e);
        if (!stop) setErr("Unable to fetch price/whitelist right now.");
      }
    })();
    return () => { stop = true; };
  }, [address, publicClient, tier.id, passAddress, marketAddress, payTokenAddress, chain?.id, currentChainId]);

  /** Reset on disconnect */
  React.useEffect(() => {
    if (status === "disconnected") {
      setOwned(false); setIsWl(false); setTokenBal(0n);
      setCelebrate(false); setTxStage("hidden"); setErr(null);
      setShowImportHelp(false); setAllowance(0n);
      setFeeApprove(null); setFeeBuy(null);
      setNativeBal(0n); setNativeBalReady(false);
      // also clear any local pending guard

      const key = address ? pendingKey(address as Address) : null;

      if (key) localStorage.removeItem(key);
      setPendingHash(null);
      setResumeNote(null);
      log("wallet-disconnected: cleared balances and state");
    }
  }, [status, address]);

  /** Token balance */
  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        if (!connected || !address || !publicClient || !needsToken || isZeroAddress(payTokenAddress)) {
          if (!stop) setTokenBal(0n);
          return;
        }
        log("read-erc20-balance:start", {
          address, token: payTokenAddress,
          walletChainId: chain?.id, publicClientChainId: (publicClient as any)?.chain?.id, wagmiUseChainId: currentChainId,
        });
        const bal = (await publicClient.readContract({
          address: payTokenAddress, abi: ERC20_ABI, functionName: "balanceOf", args: [address],
        })) as bigint;
        log("read-erc20-balance:done", { token: payTokenAddress, balanceWei: bal?.toString?.() });
        if (!stop) setTokenBal(bal);
      } catch (e) {
        log("read-erc20-balance:error", e);
        if (!stop) setTokenBal(0n);
      }
    })();
    return () => { stop = true; };
  }, [connected, address, publicClient, payTokenAddress, needsToken, price, chain?.id, currentChainId]);

  /** Native balance watcher */
  React.useEffect(() => {
    let stop = false;
    setNativeBalReady(false);
    (async () => {
      if (!connected || !address || !publicClient) {
        if (!stop) { setNativeBal(0n); setNativeBalReady(false); }
        return;
      }
      try {
        log("read-native-balance:start", {
          address, walletChainId: chain?.id, publicClientChainId: (publicClient as any)?.chain?.id, wagmiUseChainId: currentChainId,
        });
        const bal = await publicClient.getBalance({ address });
        log("read-native-balance:done", { address, balanceWei: bal?.toString?.(), feeSymbol });
        if (!stop) { setNativeBal(bal); setNativeBalReady(true); }
      } catch (e) {
        log("read-native-balance:error", e, {
          walletChainId: chain?.id, publicClientChainId: (publicClient as any)?.chain?.id,
        });
        if (!stop) { setNativeBal(0n); setNativeBalReady(true); }
      }
    })();
    return () => { stop = true; };
  }, [connected, address, publicClient, chain?.id, currentChainId, feeSymbol]);

  /** Live fee estimates */
  React.useEffect(() => {
    let stop = false;
    (async () => {
      if (!connected || !address || !publicClient) {
        if (!stop) { setFeeApprove(null); setFeeBuy(null); }
        return;
      }
      try {
        log("estimate-fees:start", {
          walletChainId: chain?.id, publicClientChainId: (publicClient as any)?.chain?.id, wagmiUseChainId: currentChainId,
        });
        const [fa, fb] = await Promise.all([estimateApproveFee(), estimateBuyFee()]);
        log("estimate-fees:done", { approveWei: fa?.toString?.(), buyWei: fb?.toString?.() });
        if (!stop) { setFeeApprove(fa); setFeeBuy(fb); }
      } catch (e) {
        log("estimate-fees:error", e);
        if (!stop) { setFeeApprove(null); setFeeBuy(null); }
      }
    })();
  }, [connected, address, publicClient, estimateApproveFee, estimateBuyFee, allowance, price, chain?.id, currentChainId]);

  /** Filter */
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

  /* -------- approve/buy with gas pre-checks + friendly errors -------- */
  const rewriteGasError = (raw?: string | null) => {
    if (!raw || !nativeBalReady) return null;
    const s = String(raw);
    const match = /exceeds the balance of the account|insufficient funds for gas|intrinsic gas too low|max fee per gas less than block base fee/i.test(s);
    if (match) {
      const op = lastActionRef.current;
      const need = op === "buy" ? (feeBuy ?? roughBuyFee()) : (feeApprove ?? roughApproveFee());
      return gasWarnLine(need);
    }
    return null;
  };


  /* ---------------- error helpers (drop near top-level helpers) ---------------- */
const extractErrText = (e: any): string => {
  const parts = [
    e?.shortMessage, e?.message, e?.details,
    e?.cause?.shortMessage, e?.cause?.message, e?.cause?.details,
    e?.cause?.cause?.message
  ].filter(Boolean);
  return parts.join(" | ");
};

const isUserRejected = (e: any) => {
  // Walk possible codes
  const code =
    e?.code ?? e?.cause?.code ?? e?.cause?.cause?.code ?? e?.error?.code;
  if ([4001, 5000, 5001, 12003].includes(code)) return true;

  // Match common text variants across wallets/providers
  const s = extractErrText(e).toLowerCase();
  return (
    /user rejected|user denied|request rejected|request denied|action_rejected|user cancelled|user canceled|request cancelled|request canceled/.test(
      s
    ) ||
    // Some wallets bubble up a useless "unknown rpc/provider error" on cancel
    (/unknown (rpc|provider) error/.test(s) && /reject|cancel|denied/.test(s))
  );
};



  // --- NEW: ownership check & resumable watcher ---
  const alreadyOwned = React.useCallback(async () => {
    if (!publicClient || !address) return false;
    try {
      const bal = (await publicClient.readContract({
        address: passAddress,
        abi: YEARNPASS1155_ABI,
        functionName: "balanceOf",
        args: [address, BigInt(tier.id)],
      })) as bigint;
      return bal > 0n;
    } catch { return false; }
  }, [publicClient, address, passAddress, tier.id]);

  const watchPendingPurchase = React.useCallback(
    async (hash: `0x${string}`) => {
      setTxStage("confirming");
      setResumeNote("Resuming your pending purchase… this can take a while on busy networks.");
         try {
     const t0 = Date.now();
     let wait = 4500;
     for (;;) {
          if (await alreadyOwned()) {
            setOwned(true);
            setTxStage("success");
            setCelebrate(true);
            setTimeout(() => setTxStage("hidden"), 1800);
            break;
          }
          try {
            const rcpt = await publicClient!.getTransactionReceipt({ hash });
            if (rcpt) {
              if (rcpt.status === "success") {
                if (await alreadyOwned()) setOwned(true);
                setTxStage("success");
                setCelebrate(true);
                setTimeout(() => setTxStage("hidden"), 1800);
              } else {
                setErr("Transaction failed or was reverted.");
                setTxStage("hidden");
              }
              break;
            }
          } catch {
            // not yet indexed – keep waiting
          }
       await new Promise((r) => setTimeout(r, wait));
       wait = Math.min(wait * 1.3, 15000);
       if (Date.now() - t0 > 10 * 60 * 1000) { // 10 min
         setErr("Still waiting for confirmation. You can retry or check the explorer.");
         setTxStage("hidden");
         break;
       }        }
      } finally {
        const key = pendingKey(address as Address);
        if (key) localStorage.removeItem(key);
        setPendingHash(null);
        setResumeNote(null);
      }
    },
    [publicClient, alreadyOwned, address]
  );

  // --- NEW: resume pending on mount/address/chain change ---
  React.useEffect(() => {
    (async () => {
      if (!connected || !address) return;
         const key = pendingKey(address);
         let hash: `0x${string}` | null = null;
         try { hash = key ? (localStorage.getItem(key) as `0x${string}` | null) : null; } catch {}
       
      if (hash) {
        setPendingHash(hash);
        watchPendingPurchase(hash);
      }
    })();
  }, [connected, address, currentChainId, tier.id, watchPendingPurchase]);

  const doApprove = React.useCallback(async () => {
    setErr(null);
    lastActionRef.current = "approve";
    if (!connected || !address) { try { appKit?.open?.(); } catch { setErr("Connect your wallet first."); } return; }
    if (pendingHash) { setErr("A purchase is already in progress. Please wait for it to finish."); return; }
    if (!walletClient || !publicClient) { setErr("Wallet or RPC is not ready."); return; }
    if (isZeroAddress(payTokenAddress)) { setErr("Payment token address is not set."); return; }

    try {
      const est = (await estimateApproveFee()) ?? roughApproveFee();
      if (est > 0n && !hasEnoughFor(est)) { setErr(gasWarnLine(est)); return; }
    } catch {
      const rough = roughApproveFee();
      if (!hasEnoughFor(rough)) { setErr(gasWarnLine(rough)); return; }
    }

    setBusy(true);
    setTxStage("waiting");
    try {
      const required = price;
      let a = (await publicClient.readContract({
        address: payTokenAddress, abi: ERC20_ABI, functionName: "allowance", args: [address, marketAddress],
      })) as bigint;

      if (a > 0n && a < required) {
        const gas0 = await publicClient.estimateContractGas({
          account: address, address: payTokenAddress, abi: ERC20_ABI, functionName: "approve", args: [marketAddress, 0n],
        });
        const { request } = await publicClient.simulateContract({
          account: address, address: payTokenAddress, abi: ERC20_ABI, functionName: "approve", args: [marketAddress, 0n],
        });
        const h0 = await walletClient.writeContract({ ...request, gas: request.gas ?? gas0 });

        await publicClient.waitForTransactionReceipt({ hash: h0 });
        a = 0n;
      }

      if (a < required) {
        const gas = await publicClient.estimateContractGas({
          account: address, address: payTokenAddress, abi: ERC20_ABI, functionName: "approve", args: [marketAddress, required],
        });
        const { request } = await publicClient.simulateContract({
          account: address, address: payTokenAddress, abi: ERC20_ABI, functionName: "approve", args: [marketAddress, required],
        });
        const hash = await walletClient.writeContract({ ...request, gas: request.gas ?? gas });

        await publicClient.waitForTransactionReceipt({ hash });
      }

      const aNew = (await publicClient.readContract({
        address: payTokenAddress, abi: ERC20_ABI, functionName: "allowance", args: [address, marketAddress],
      })) as bigint;

      setAllowance(aNew);
      setTxStage("hidden");
    } catch (e: any) {
      if (isUserRejected(e)) {
        setErr("Transaction canceled in wallet. No funds were spent.");
        setTxStage("hidden");
      } else {
        const nice = rewriteGasError(extractErrText(e));
        setErr(nice || extractErrText(e) || "Approve failed.");
        setTxStage("hidden");
      }
    } finally { setBusy(false); }
  }, [connected, address, walletClient, publicClient, payTokenAddress, marketAddress, price, estimateApproveFee, roughApproveFee, nativeBalReady, feeApprove, pendingHash]);

  const doBuy = React.useCallback(async () => {
    setErr(null);
    lastActionRef.current = "buy";

    if (!connected || !address) { try { appKit?.open?.(); } catch { setErr("Connect your wallet first."); } return; }
    if (!walletClient || !publicClient) { setErr("Wallet or RPC is not ready."); return; }
    if (owned) return;
    if (isZeroAddress(marketAddress)) { setErr("Market address is not set."); return; }
    if (isZeroAddress(passAddress)) { setErr("Pass address is not set."); return; }

    setBusy(true);
    setTxStage("waiting");
    try {
      const targetChainId = (publicClient as any)?.chain?.id ?? chain?.id ?? currentChainId;
      if (targetChainId && chain?.id !== targetChainId && switchChainAsync) {
        try { await switchChainAsync({ chainId: targetChainId }); }
        catch { setBusy(false); setTxStage("hidden"); setErr("Please switch to the correct network."); return; }

         // ensure we’re actually on the right rpc before simulating
         const pcChain = (publicClient as any)?.chain?.id;
         if (pcChain && pcChain !== targetChainId) {
           await new Promise((r) => setTimeout(r, 50));
         }
      }

      const currentPrice = (await publicClient.readContract({
        address: marketAddress, abi: MARKET_ABI, functionName: address ? "priceOf" : "pricePublic",
        args: address ? [BigInt(tier.id), address] : [BigInt(tier.id)],
      })) as bigint;
      setPrice(currentPrice);

      if (needsToken && tokenBal < currentPrice) {
        setBusy(false); setTxStage("hidden");
        setErr(`Insufficient ${payTokenSymbol} balance to buy this NFT.`);
        return;
      }

      try {
        const est = (await estimateBuyFee()) ?? roughBuyFee();
        if (est > 0n && !hasEnoughFor(est)) {
          setBusy(false); setTxStage("hidden"); setErr(gasWarnLine(est)); return;
        }
      } catch {
        const rough = roughBuyFee();
        if (!hasEnoughFor(rough)) {
          setBusy(false); setTxStage("hidden"); setErr(gasWarnLine(rough)); return;
        }
      }

      const gas = await publicClient.estimateContractGas({
        account: address, address: marketAddress, abi: MARKET_ABI, functionName: "buy", args: [BigInt(tier.id), address],
      });
      const { request } = await publicClient.simulateContract({
        account: address, address: marketAddress, abi: MARKET_ABI, functionName: "buy", args: [BigInt(tier.id), address],
      });

      // soft wallet hint
      let walletHintTimer: ReturnType<typeof setTimeout> | null = null;
      walletHintTimer = setTimeout(() => {
        setTxStage("waiting");
        setErr("Still waiting for wallet confirmation… If your wallet is open, please approve the transaction.");
      }, 15000);

      let buyHash: `0x${string}`;
      try {
        
        buyHash = await walletClient.writeContract({ ...request, gas: request.gas ?? gas });

      } finally {
        if (walletHintTimer) clearTimeout(walletHintTimer);
        setErr(null);
      }

      // NEW: persist hash + guard, then resume watcher
      const key = pendingKey(address);
      if (key) localStorage.setItem(key, buyHash);
      setPendingHash(buyHash);

      await watchPendingPurchase(buyHash);
    } catch (e: any) {
      if (isUserRejected(e)) {
        setErr("Purchase canceled in wallet. No funds were spent.");
        setTxStage("hidden");
      } else {
        const raw = extractErrText(e);
        const nice = rewriteGasError(raw);
        setErr(nice || raw || "Transaction failed.");
        setTxStage("hidden");
      }
    } finally { setBusy(false); }
  }, [connected, address, walletClient, publicClient, owned, marketAddress, passAddress, chain?.id, currentChainId, switchChainAsync, tier.id, needsToken, tokenBal, payTokenSymbol, estimateBuyFee, roughBuyFee, nativeBalReady, feeBuy, watchPendingPurchase]);

  // Labels
  const yourPriceLabel = priceIsFree ? "Free" : `${formatUnits(price, payTokenDecimals)} ${payTokenSymbol}`;
  const pubPriceLabel = `${formatUnits(pubPrice, payTokenDecimals)} ${payTokenSymbol}`;
  const wlPriceLabel = `${formatUnits(wlPrice, payTokenDecimals)} ${payTokenSymbol}`;
  const youSave = pubPrice > price ? `${formatUnits(pubPrice - price, payTokenDecimals)} ${payTokenSymbol}` : null;

  // Tilt + glare
  const { x, y, rotateX, rotateY, onMove } = useTilt3D();
  const xPct = useTransform(x, (v: number) => v * 100);
  const yPct = useTransform(y, (v: number) => v * 100);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${xPct}% ${yPct}%, rgba(255,255,255,.12), transparent 45%)`;

  const checksumPass = React.useMemo(() => {
    try { return getAddress(passAddress); } catch { return passAddress; }
  }, [passAddress]);

  const tokenIdDec = String(tier.id);
  const tokenIdHex = `0x${idHex64(tier.id)}`;

  const haveFeeApprove = hasValue(feeApprove);
  const haveFeeBuy = hasValue(feeBuy);
  const showGasChip =
    !owned && connected && nativeBalReady &&
    ((allowance < price && haveFeeApprove && !hasEnoughFor(feeApprove)) ||
      (haveFeeBuy && !hasEnoughFor(feeBuy)));

  const optimizedSet = React.useMemo(() => buildSrcSet(mediaUrl), [mediaUrl]);

  /* ────────────────── Deferred media loader (GIF-safe) ────────────────── */
  const mediaHostRef = React.useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = React.useState(false);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const [showMedia, setShowMedia] = React.useState(false);
  const [mediaLoaded, setMediaLoaded] = React.useState(false);
  



  React.useEffect(() => {
    if (!mediaHostRef.current || typeof IntersectionObserver === "undefined") {
      setInView(true); return;
    }
    const el = mediaHostRef.current;
    const io = new IntersectionObserver(
      (entries) => { const e = entries[0]; setInView(e?.isIntersecting ?? false); },
      { rootMargin: "800px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => {
      try { io.unobserve(el); } catch {}
      try { io.disconnect(); } catch {}
    };


  }, []);

  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      setIsScrolling(true);
      if (t) clearTimeout(t);
      t = setTimeout(() => setIsScrolling(false), 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (t) clearTimeout(t); };
  }, []);

  

  // Mount media as soon as it's near and not actively scrolling (no idle gating)
  React.useEffect(() => {
    const ready = inView && !isScrolling;
    if (ready && !showMedia) {
      const id = setTimeout(() => setShowMedia(true), 0);
      return () => clearTimeout(id);
    }
  }, [inView, isScrolling, showMedia]);

  // Safety: if metadata is present but nothing mounted yet, force mount
  React.useEffect(() => {
    if (!meta || showMedia) return;
    const id = setTimeout(() => setShowMedia(true), 2500);
    return () => clearTimeout(id);
  }, [meta, showMedia]);

  // Reset on media change
  React.useEffect(() => {
    setShowMedia(false);
    setMediaLoaded(false);
  }, [mediaUrl]);

  
  // Extra guard: never let the loader hang forever
  const stallRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (!showMedia || mediaLoaded) return;
    if (stallRef.current) clearTimeout(stallRef.current);
    stallRef.current = setTimeout(() => setMediaLoaded(true), 6000);
    return () => { if (stallRef.current) clearTimeout(stallRef.current); };
  }, [showMedia, mediaLoaded]);

  /* ───────────────────────────────────────────────────────────── */

  return visible ? (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="scroll-mt-24 last:mb-28 md:last:mb-32"
    >
      <div className="relative" onMouseMove={onMove} style={{ perspective: 1200 }}>
        <motion.div layout style={{ rotateX, rotateY, transformStyle: "preserve-3d" as any }}>
          <HoloCard>
            <CursorGlow x={x} y={y} />
            {!lowEnd && <GradientMesh />}
            {!lowEnd && <Scanlines />}

            {/* MEDIA */}
            <motion.div
              ref={mediaHostRef}
              layout
              className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#0b0f17] ring-1 ring-white/8 shadow-glass"
              style={{ transform: "translateZ(30px)", contain: "content" }}
            >
              <CornerRibbon show={isWl} />
              {needsToken && !owned && (
                <div className="absolute top-3 right-3 z-30">
                  <div className="relative">
                    <div className="absolute -inset-2 blur-md bg-gradient-to-r from-indigo-400/25 to-cyan-300/20 rounded-full" />
                  </div>
                  {connected && !hasFunds && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-red-500/15 text-red-100 ring-1 ring-red-400/30 text-[11px]">
                      <AlertCircle className="w-3 h-3" />
                      Insufficient {payTokenSymbol}
                    </div>
                  )}
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 z-10 [content-visibility:auto] [contain-intrinsic-size:320px_240px]">
                {!lowEnd && <MetaverseScene />}

                {/* ───────────── Deferred media region ───────────── */}
                <div className="absolute inset-0 grid place-items-center">
                  {/* Loader (poster + tiny teaser). Shows while real media isn't ready. */}
                  {(!showMedia || !mediaLoaded) && (
                    <BrandLoader label={inView ? "Loading NFT…" : "Waiting to appear…"} />
                  )}

                  {/* Real media mounts as soon as we're ready to show it */}
                  {showMedia && mediaUrl ? (
                    isGif(mediaUrl) ? (
                      // GIF path: render immediately; fade in when loaded
                      <motion.img
                        key={mediaUrl}
                        src={mediaUrl}
                        alt={name}
                        loading="eager"          // fetch ASAP; teaser stays visible until onLoad
                        decoding="async"
                        draggable={false}
                        onLoad={() => setMediaLoaded(true)}
                        onError={() => setMediaLoaded(true)}   // don't hang; keep teaser/poster visible
                        className={`relative z-10 w-[78%] md:w-[70%] h-auto object-contain select-none ${
                          mediaLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        initial={{ scale: 0.985 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 140, damping: 18 }}
                      />
                    ) : (/\.(mp4|webm|mov|ogv)$/i.test((mediaUrl.split("?")[0] ?? ""))) ? (
                      // Video path
                      <motion.video
                        key={mediaUrl}
                        src={mediaUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload={dataSaverOn() ? "metadata" : "auto"}
                        disablePictureInPicture
                        controls={false}
                        onLoadedData={() => setMediaLoaded(true)}
                        onError={() => setMediaLoaded(true)}
                        className={`w-[78%] md:w-[70%] h-auto object-contain select-none rounded-lg ${
                          mediaLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        initial={{ scale: 0.985 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 140, damping: 18 }}
                      />
                    ) : (
                      // Static image path (non-GIF)

                      <motion.img
                        key={mediaUrl}
                        src={optimizedSet.src}
                        srcSet={optimizedSet.srcSet}
                        sizes={optimizedSet.sizes}
                        alt={name}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onLoad={() => setMediaLoaded(true)}
                        onError={() => setMediaLoaded(true)}
                        className={`w-[78%] md:w-[70%] h-auto object-contain select-none ${
                          mediaLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        initial={{ scale: 0.985 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 140, damping: 18 }}
                      />
                    )
                  ) : null}
                </div>
                {/* ───────────── /Deferred media region ───────────── */}


                <OrbitRings />
                <motion.div aria-hidden className="absolute inset-0" style={{ backgroundImage: glare }} />
                <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_120%,rgba(0,0,0,.55),transparent)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent" />
              </div>

              <OverlayLayer blur={txStage !== "hidden"}>
                <ConfettiShower show={celebrate} />
                <TxDialog
                  stage={txStage}
                  hash={pendingHash}
                  explorerHref={txUrl(pendingHash)}
                  note={resumeNote}
                  onDismiss={() => setTxStage("hidden")}
                  onForceReset={
                    pendingHash
                      ? async () => {
                          if (await alreadyOwned()) {
                            const key = pendingKey(address as Address);
                            if (key) localStorage.removeItem(key);
                            setPendingHash(null);
                            setTxStage("hidden");
                            return;
                          }
                          const key = pendingKey(address as Address);
                          if (key) localStorage.removeItem(key);
                          setPendingHash(null);
                          setTxStage("hidden");
                          setErr("Pending transaction cleared. You can retry now.");
                        }
                      : undefined
                  }
                />
              </OverlayLayer>
            </motion.div>

            {/* CONTENT */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-white/90 font-semibold truncate tracking-wide font-orbitron" title={name}>{name}</h3>
                <div className="flex items-center gap-2">
                  {connected && isWl && !owned && (
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
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-gradient-to-r from-emerald-500/20 to-teal-400/20 text-emerald-200 ring-1 ring-emerald-300/30 shadow-[0_0_20px_rgba(16,185,129,0.20)]"
                    >
                      <Shield className="w-3.5 h-3.5" /> Owned
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Price row */}
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <div className="absolute inset-0 blur-md bg-gradient-to-r from-indigo-400/20 to-cyan-300/20 rounded-full" />
                  <div className="relative rounded-full px-3 py-1 text-xs md:text-sm text-white/85 bg-black/40 ring-1 ring-white/10">
                    <span className="mr-1 opacity-80">
                      {connected && isWl ? "Your price" : connected ? "Price" : "Public price"}
                    </span>
                    <strong className="font-semibold">{yourPriceLabel}</strong>
                  </div>
                </div>

                {connected && isWl && (
                  <>
                    <span className={`text-[11px] md:text-xs ${pubPrice > price ? "line-through decoration-red-400/70 decoration-2 text-white/60" : "text-white/60"}`} title={`Public price: ${pubPriceLabel}`}>
                      Public: {pubPriceLabel}
                    </span>
                    <span className="text-[11px] md:text-xs text-indigo-200/90" title={`Whitelist price: ${wlPriceLabel}`}>
                      WL: {wlPriceLabel}
                    </span>
                  </>
                )}

                {connected && isWl && pubPrice > price && (
                  <span className="text-[11px] md:text-xs inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/20">
                    You save {youSave}
                  </span>
                )}
                {connected && isWl && priceIsFree && (
                  <span className="text-[11px] md:text-xs inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-violet-400/10 text-violet-200 ring-1 ring-violet-300/20">
                    Whitelist free NFT 🎉
                  </span>
                )}
              </div>

              {/* Balances + gas warnings */}
              {!owned && connected && needsToken && (
                <div className="mt-1 text-[11px] md:text-xs text-white/60">
                  Balance: {format3(tokenBal, payTokenDecimals)} {payTokenSymbol}
                  {connected && !hasFunds && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-red-500/10 text-red-200 ring-1 ring-red-400/20">
                      <AlertCircle className="w-3 h-3" /> Insufficient {payTokenSymbol}
                    </span>
                  )}
                </div>
              )}

              {!owned && showGasChip && (
                <div className="mt-2 text-[11px] md:text-xs inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Low {feeSymbol} for network fees. You have ~{format5(nativeBal, nativeDecimals)} {feeSymbol}.
                </div>
              )}

              {/* NEW: pending chip with explorer link */}
              {pendingHash && (
                <div className="mt-2 text-[11px] md:text-xs inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-indigo-500/10 text-indigo-200 ring-1 ring-indigo-400/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Purchase in progress…{" "}
                  {txUrl(pendingHash) ? (
                   <a className="underline hover:no-underline" href={txUrl(pendingHash)} target="_blank" rel="noopener noreferrer">

                      view tx
                    </a>
                  ) : null}
                </div>
              )}

              {/* Actions */}
              {!owned && (
                <>
                  {!connected ? (
                    <motion.button
                      onClick={openConnect}
                      whileTap={{ scale: 0.985 }}
                      className="group relative mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide focus:outline-none font-orbitron min-h-[44px] bg-[#0b0f17]/75 text-white ring-1 ring-indigo-400/30 hover:ring-indigo-300/40 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_12px_36px_rgba(99,102,241,0.20)] transition"
                    >
                      <span aria-hidden className="pointer-events-none absolute -inset-[1px] rounded-xl bg-[conic-gradient(from_0deg,rgba(129,140,248,.15),rgba(56,189,248,.12),transparent_60%,transparent)] opacity-60 blur-sm transition group-hover:opacity-80" />
                      <span className="relative flex items-center gap-2">
                        <Wallet2 className="w-4 h-4" /> Connect Wallet
                      </span>
                    </motion.button>
                  ) : (
                    <>
                      {needsToken && allowance < price ? (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            onClick={doApprove}
                            disabled={busy || !!pendingHash}
                            aria-busy={busy || !!pendingHash}
                            className="w-full rounded-xl px-4 py-3 bg-[#0b0f17]/75 text-white ring-1 ring-indigo-400/30 hover:ring-indigo-300/40 font-orbitron disabled:opacity-60 disabled:cursor-not-allowed"
                            title={pendingHash ? "Pending transaction in progress" : haveFeeApprove && !hasEnoughFor(feeApprove) ? `Need ~${format5(feeApprove!)} ${feeSymbol} for gas` : undefined}
                          >

                            {busy ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Approving…</span> : "Approve"}
                          </button>
                          <button disabled className="w-full rounded-xl px-4 py-3 bg-black/35 text-white/60 ring-1 ring-white/10 cursor-not-allowed font-orbitron" title="Approve first">
                            Buy
                          </button>
                        </div>
                      ) : (
                        <motion.button
                            onClick={doBuy}
                            disabled={busy || !!pendingHash || (!hasFunds && needsToken)}
                            aria-busy={busy || !!pendingHash}
                            whileTap={{ scale: 0.985 }}
                            className={`group relative mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide focus:outline-none font-orbitron min-h-[44px] ${((!!pendingHash || (!hasFunds && needsToken)) ? "bg-black/35 text-white/60 ring-1 ring-white/10 cursor-not-allowed" : "bg-[#0b0f17]/75 text-white ring-1 ring-indigo-400/30 hover:ring-indigo-300/40 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_12px_36px_rgba(99,102,241,0.20)] transition")}`}
                            title={pendingHash ? "Pending transaction in progress" : haveFeeBuy && !hasEnoughFor(feeBuy) ? `Need ~${format5(feeBuy!)} ${feeSymbol} for gas` : undefined}
                          >

                          <span aria-hidden className="pointer-events-none absolute -inset-[1px] rounded-xl bg-[conic-gradient(from_0deg,rgba(129,140,248,.15),rgba(56,189,248,.12),transparent_60%,transparent)] opacity-60 blur-sm transition group-hover:opacity-80" />
                          <span className="relative flex items-center gap-2">
                            {busy ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white/80" /> Processing…
                              </>
                            ) : priceIsFree ? (
                              <>
                                <SparkIcon className="w-4 h-4" /> Claim Free NFT
                              </>
                            ) : !hasFunds && needsToken ? (
                              <>
                                <AlertCircle className="w-4 h-4" /> Insufficient {payTokenSymbol}
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-4 h-4 text-indigo-200/90" /> Buy
                              </>
                            )}
                          </span>
                        </motion.button>
                      )}
                    </>
                  )}
                </>
              )}

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
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="mt-3 text-center text-emerald-200/85 text-sm">
                    <div className="flex items-center justify-center gap-2">✅ Added to your vault <Sparkles /></div>
                    <div className="mt-1 text-emerald-100/70 flex items-center justify-center gap-1 text-[12px]">

                      You can see your NFT in your wallet {txUrl(pendingHash) ? (<a href={txUrl(pendingHash)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center" title="View on explorer"><ExternalLink className="w-3.5 h-3.5 opacity-80" /></a>) : (<ExternalLink aria-hidden="true" focusable="false" className="w-3.5 h-3.5 opacity-80" />)}






                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isMobile() && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowImportHelp((s) => !s)}
                    className="w-full inline-flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] bg-black/35 ring-1 ring-white/10 hover:bg-black/45"
                  >
                    <span className="text-white/85">
                      {owned ? "How to add this NFT to MetaMask" : "Don’t see your NFT in MetaMask Mobile? Import it manually"}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition ${showImportHelp ? "rotate-180" : "rotate-0"}`} />
                  </button>

                  <div className={`acc ${showImportHelp ? "acc-open" : "acc-closed"}`}>
                    <div className="px-3 pt-3 pb-2 text-[12px] text-white/80 space-y-2 bg-black/35 ring-1 ring-white/10 rounded-lg mt-2">
                      <p className="leading-relaxed">MetaMask Mobile sometimes doesn’t auto-detect ERC-1155. Import it manually:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open <strong>MetaMask</strong> ➜ <strong>NFTs</strong> tab.</li>
                        <li>Tap <strong>Import NFTs</strong>.</li>
                        <li>Select <strong> BNB Smart Chain </strong> Network.</li>
                        <li>Paste the <em>Contract Address</em> and <em>Token ID</em>.</li>
                      </ol>

                      <div className="mt-2 space-y-2">
                        <CopyField label="Contract" value={checksumPass} display={shortenMid(checksumPass, 12, 8)} mono color="cyan" />
                        <CopyField label="Token ID (decimal)" value={tokenIdDec} mono color="indigo" />
                        <CopyField label="Token ID (hex)" value={tokenIdHex} display={shortenMid(tokenIdHex, 14, 12)} mono color="violet" />
                        {isMetaMaskUA() && isMobile() && <p className="pt-1 opacity-75">Tip: Pull down to refresh if it doesn’t appear immediately.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </HoloCard>
        </motion.div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes spin-rev { to { transform: rotate(-360deg); } }
        .font-orbitron { font-family: 'Orbitron','Audiowide',system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif; }
        .acc { overflow:hidden; transition:max-height .24s ease, opacity .24s ease; will-change:max-height, opacity; }
        .acc-closed { max-height:0; opacity:0; }
        .acc-open { max-height:420px; opacity:1; }
      `}</style>
    </motion.div>
  ) : null;
}

/* Corner ribbon */
function CornerRibbon({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 180, damping: 18 }} className="absolute top-2 left-2 z-30">
      <div
        className="px-3 py-1 text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-white bg-[linear-gradient(135deg,#6366f1_0%,#06b6d4_100%)] ring-1 ring-white/10 shadow rounded-sm"
        style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0% 100%)" }}
        title="You're whitelisted for this tier"
      >
        Whitelisted
      </div>
    </motion.div>
  );
}
