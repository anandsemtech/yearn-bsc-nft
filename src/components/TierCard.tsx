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
  (import.meta as any)?.env?.COLLECTION_URI ||
  "";
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

const CopyField: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <div className="flex items-center gap-2 text-xs text-white/80">
      <span className="opacity-70">{label}:</span>
      <code
        className={`px-1.5 py-[2px] rounded bg-white/5 ring-1 ring-white/10 ${
          mono ? "font-mono" : ""
        } max-w-full overflow-x-auto whitespace-nowrap`}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1 px-1.5 py-1 rounded ring-1 ring-white/10 hover:bg-white/10"
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

const isZeroAddress = (a?: string) => !a || /^0x0{40}$/i.test(a);

/** Format bigint token to exactly 3 decimals */
const format3 = (value: bigint, decimals: number) => {
  const str = formatUnits(value, decimals);
  const [i, d = ""] = str.split(".");
  const dec = (d + "000").slice(0, 3);
  return `${i}.${dec}`;
};
/** Format native balance/fee to 5 dp (for gas) */
const format5 = (value: bigint, decimals = 18) => {
  const str = formatUnits(value, decimals);
  const [i, d = ""] = str.split(".");
  const dec = (d + "00000").slice(0, 5);
  return `${i}.${dec}`;
};

/** IPFS helper */
const ipfsToHttp = (uri?: string, gateway = DEFAULT_IPFS_GATEWAY): string | undefined => {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) return gateway + uri.slice("ipfs://".length);
  return uri;
};

/** ERC-1155 placeholder resolver */
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

/* Confetti */
type ConfettiPiece = {
  id: number; x: number; y: number; r: number; vx: number; vy: number; s: number; d: number; delay: number;
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
                transformOrigin: "center", background: "white", borderRadius: 2,
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

const OverlayLayer: React.FC<{ blur: boolean; children?: React.ReactNode }> = ({ blur, children }) => (
  <div className="absolute inset-0 isolate z-40">
    <div className={`absolute inset-0 rounded-xl transition ${blur ? "backdrop-blur-md bg-black/35" : "backdrop-blur-0 bg-transparent"}`} />
    {children}
  </div>
);

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

  const { isConnected, address, chain, status } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const currentChainId = useChainId();

  // Payment token env
  const payTokenAddress = (tokenAddress ?? YEARN_TOKEN) as Address;
  const envDecimals = Number(YEARN_TOKEN_DECIMALS);
  const payTokenDecimals = typeof tokenDecimals === "number" ? tokenDecimals : Number.isFinite(envDecimals) ? envDecimals : 18;
  const payTokenSymbol = tokenSymbol ?? YEARN_TOKEN_SYMBOL ?? "TOKEN";
  const connected = isConnected && !!address;

  // State
  const [meta, setMeta] = React.useState<NftMeta | null>(null);
  const [mediaUrl, setMediaUrl] = React.useState<string | undefined>(undefined);
  const [isVideo, setIsVideo] = React.useState(false);
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
  const [feeApprove, setFeeApprove] = React.useState<bigint | null>(null);
  const [feeBuy, setFeeBuy] = React.useState<bigint | null>(null);
  const feeSymbol = chain?.nativeCurrency?.symbol || "BNB";

  const priceIsFree = price === 0n;
  const needsToken = !priceIsFree;
  const hasFunds = priceIsFree || tokenBal >= price;

  /** ------------------ Gas helpers (EIP-1559 aware) ------------------ */

  const getPerGasFee = React.useCallback(async (): Promise<bigint> => {
    try {
      const latest = await publicClient!.getBlock({ blockTag: "latest" });
      if (latest.baseFeePerGas) {
        try {
          const fees = await publicClient!.estimateFeesPerGas();
          return fees.maxFeePerGas ?? fees.gasPrice ?? 0n;
        } catch {
          const priority = 2_000_000_000n;
          return latest.baseFeePerGas * 2n + priority;
        }
      }
      return await publicClient!.getGasPrice();
    } catch {
      return 0n;
    }
  }, [publicClient]);

  const estimateTxFee = React.useCallback(
    async (opts: EstimateContractGasParameters) => {
      try {
        const perGas = await getPerGasFee();
        const gl = await publicClient!.estimateContractGas(opts as any);
        const total = perGas > 0n && gl > 0n ? gl * perGas : 0n;
        return total > 0n ? total : null;
      } catch {
        return null;
      }
    },
    [publicClient, getPerGasFee]
  );

  const estimateApproveFee = React.useCallback(async (): Promise<bigint | null> => {
    try {
      if (!connected || !address || !publicClient || isZeroAddress(payTokenAddress)) return null;
      const need = price;
      let sum = 0n;

      const a = (await publicClient.readContract({
        address: payTokenAddress, abi: ERC20_ABI, functionName: "allowance",
        args: [address, marketAddress],
      })) as bigint;

      if (a > 0n && a < need) {
        const f0 = await estimateTxFee({
          account: address,
          address: payTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [marketAddress, 0n],
        } as unknown as EstimateContractGasParameters);
        if (f0) sum += f0;
      }
      if (a < need) {
        const f1 = await estimateTxFee({
          account: address,
          address: payTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [marketAddress, need],
        } as unknown as EstimateContractGasParameters);
        if (f1) sum += f1;
      }
      return sum > 0n ? sum : null;
    } catch { return null; }
  }, [connected, address, publicClient, payTokenAddress, marketAddress, price, estimateTxFee]);

  const estimateBuyFee = React.useCallback(async (): Promise<bigint | null> => {
    try {
      if (!connected || !address || !publicClient || isZeroAddress(marketAddress)) return null;
      const f = await estimateTxFee({
        account: address,
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: "buy",
        args: [BigInt(tier.id), address],
      } as unknown as EstimateContractGasParameters);
      return f;
    } catch { return null; }
  }, [connected, address, publicClient, marketAddress, tier.id, estimateTxFee]);

  const hasEnoughFor = (needWei?: bigint | null, padBps = 800) => {
    if (!needWei || needWei <= 0n) return true;
    const padded = (needWei * BigInt(10000 + padBps)) / 10000n;
    return nativeBal >= padded;
  };

  const gasWarnLine = (needWei?: bigint | null) => {
    const have = format5(nativeBal);
    if (!needWei || needWei <= 0n) {
      return `Looks like you might need some ${feeSymbol} for network fees. You have ~${have} ${feeSymbol}. Add a little more and try again.`;
    }
    const need = format5(needWei);
    return `Not enough ${feeSymbol} for network fees. You have ~${have} ${feeSymbol}, need about ~${need} ${feeSymbol}. Please top up and try again.`;
  };

  /** Metadata */
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
              address: passAddress,
              abi: YEARNPASS1155_ABI,
              functionName: "uri",
              args: [BigInt(tier.id)],
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
        const isVid =
          !!http &&
          (/\.(mp4|webm|mov|ogv)$/i.test(http) ||
            (!!data?.animation_url &&
              !/\.(png|jpe?g|gif|webp|svg)$/i.test(http)));
        setIsVideo(isVid);
      } catch {}
    })();

    return () => { aborted = true; ctrl.abort(); };
  }, [tier.id, tier.uri, passAddress, publicClient]);

  /** Ownership / price / WL / allowance */
  React.useEffect(() => {
    let stop = false;
    (async () => {
      if (!publicClient) return;
      try {
        if (!address) {
          const pPub = (await publicClient.readContract({
            address: marketAddress,
            abi: MARKET_ABI,
            functionName: "pricePublic",
            args: [BigInt(tier.id)],
          })) as bigint;
          if (!stop) {
            setOwned(false); setIsWl(false); setWlPrice(0n);
            setPubPrice(pPub); setPrice(pPub); setAllowance(0n);
          }
          return;
        }

        const [bal, pYour, wl, pPub, pWl, a] = await Promise.all([
          publicClient.readContract({
            address: passAddress, abi: YEARNPASS1155_ABI, functionName: "balanceOf",
            args: [address, BigInt(tier.id)],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: marketAddress, abi: MARKET_ABI, functionName: "priceOf",
            args: [BigInt(tier.id), address],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: marketAddress, abi: MARKET_ABI, functionName: "isWhitelisted",
            args: [BigInt(tier.id), address],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: marketAddress, abi: MARKET_ABI, functionName: "pricePublic",
            args: [BigInt(tier.id)],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: marketAddress, abi: MARKET_ABI, functionName: "priceWhitelist",
            args: [BigInt(tier.id)],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: payTokenAddress, abi: ERC20_ABI, functionName: "allowance",
            args: [address, marketAddress],
          }) as Promise<bigint>,
        ]);

        if (!stop) {
          setOwned(bal > 0n);
          setPrice(pYour);
          setIsWl(wl);
          setPubPrice(pPub);
          setWlPrice(pWl);
          setAllowance(a);
        }
      } catch {
        if (!stop) setErr("Unable to fetch price/whitelist right now.");
      }
    })();
    return () => { stop = true; };
  }, [address, publicClient, tier.id, passAddress, marketAddress, payTokenAddress]);

  /** Reset on disconnect */
  React.useEffect(() => {
    if (status === "disconnected") {
      setOwned(false); setIsWl(false); setTokenBal(0n);
      setCelebrate(false); setTxStage("hidden"); setErr(null);
      setShowImportHelp(false); setAllowance(0n);
      setFeeApprove(null); setFeeBuy(null); setNativeBal(0n);
    }
  }, [status]);

  /** Token balance */
  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        if (!connected || !address || !publicClient || !needsToken || isZeroAddress(payTokenAddress)) {
          if (!stop) setTokenBal(0n);
          return;
        }
        const bal = (await publicClient.readContract({
          address: payTokenAddress, abi: ERC20_ABI, functionName: "balanceOf", args: [address],
        })) as bigint;
        if (!stop) setTokenBal(bal);
      } catch {
        if (!stop) setTokenBal(0n);
      }
    })();
    return () => { stop = true; };
  }, [connected, address, publicClient, payTokenAddress, needsToken, price]);

  /** Native balance watcher */
  React.useEffect(() => {
    let stop = false;
    (async () => {
      if (!connected || !address || !publicClient) {
        if (!stop) setNativeBal(0n);
        return;
      }
      try {
        const bal = await publicClient.getBalance({ address });
        if (!stop) setNativeBal(bal);
      } catch {
        if (!stop) setNativeBal(0n);
      }
    })();
    return () => { stop = true; };
  }, [connected, address, publicClient]);

  /** Live fee estimates */
  React.useEffect(() => {
    let stop = false;
    (async () => {
      if (!connected || !address || !publicClient) {
        if (!stop) { setFeeApprove(null); setFeeBuy(null); }
        return;
      }
      try {
        const [fa, fb] = await Promise.all([estimateApproveFee(), estimateBuyFee()]);
        if (!stop) { setFeeApprove(fa); setFeeBuy(fb); }
      } catch {
        if (!stop) { setFeeApprove(null); setFeeBuy(null); }
      }
    })();
  }, [connected, address, publicClient, estimateApproveFee, estimateBuyFee, allowance, price, chain?.id]);

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
    if (!raw) return null;
    const s = String(raw);
    const match = /exceeds the balance of the account|insufficient funds for gas|intrinsic gas too low/i.test(s);
    if (match) {
      const need = feeBuy ?? feeApprove ?? null;
      return gasWarnLine(need);
    }
    return null;
  };

  /** Approve (exact), estimate + preflight */
  const doApprove = React.useCallback(async () => {
    setErr(null);
    if (!connected || !address) {
      try { appKit?.open?.(); } catch { setErr("Connect your wallet first."); }
      return;
    }
    if (!walletClient || !publicClient) { setErr("Wallet or RPC is not ready."); return; }
    if (isZeroAddress(payTokenAddress)) { setErr("Payment token address is not set."); return; }

    // Pre-flight gas check (do not block if estimate is null/0)
    try {
      const est = (await estimateApproveFee()) ?? 0n;
      if (est > 0n && !hasEnoughFor(est)) {
        setErr(gasWarnLine(est));
        return;
      }
    } catch {}

    setBusy(true);
    setTxStage("waiting");
    try {
      const required = price;

      // current allowance
      let a = (await publicClient.readContract({
        address: payTokenAddress, abi: ERC20_ABI, functionName: "allowance",
        args: [address, marketAddress],
      })) as bigint;

      if (a > 0n && a < required) {
        const gas0 = await publicClient.estimateContractGas({
          account: address,
          address: payTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [marketAddress, 0n],
        });
        const { request } = await publicClient.simulateContract({
          account: address,
          address: payTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [marketAddress, 0n],
        });
        const h0 = await walletClient.writeContract({ ...request, gas: gas0 });
        await publicClient.waitForTransactionReceipt({ hash: h0 });
        a = 0n;
      }

      if (a < required) {
        const gas = await publicClient.estimateContractGas({
          account: address,
          address: payTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [marketAddress, required],
        });
        const { request } = await publicClient.simulateContract({
          account: address,
          address: payTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [marketAddress, required],
        });
        const hash = await walletClient.writeContract({ ...request, gas });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      const aNew = (await publicClient.readContract({
        address: payTokenAddress, abi: ERC20_ABI, functionName: "allowance",
        args: [address, marketAddress],
      })) as bigint;

      setAllowance(aNew);
      setTxStage("hidden");
    } catch (e: any) {
      const nice = rewriteGasError(e?.shortMessage || e?.details || e?.message);
      setErr(nice || e?.shortMessage || e?.details || e?.message || "Approve failed.");
      setTxStage("hidden");
    } finally {
      setBusy(false);
    }
  }, [connected, address, walletClient, publicClient, payTokenAddress, marketAddress, price, estimateApproveFee]);

  /** Buy with preflight + chain switch (estimate after switch) */
  const doBuy = React.useCallback(async () => {
    setErr(null);

    if (!connected || !address) {
      try { appKit?.open?.(); } catch { setErr("Connect your wallet first."); }
      return;
    }
    if (!walletClient || !publicClient) { setErr("Wallet or RPC is not ready."); return; }
    if (owned) return;
    if (isZeroAddress(marketAddress)) { setErr("Market address is not set."); return; }
    if (isZeroAddress(passAddress)) { setErr("Pass address is not set."); return; }

    setBusy(true);
    setTxStage("waiting");
    try {
      // Ensure wallet is on the same chain as publicClient
      const targetChainId = publicClient.chain?.id ?? chain?.id ?? currentChainId;
      if (targetChainId && chain?.id !== targetChainId && switchChainAsync) {
        try { await switchChainAsync({ chainId: targetChainId }); }
        catch {
          setBusy(false); setTxStage("hidden");
          setErr("Please switch to the correct network.");
          return;
        }
      }

      // Re-read price and balances right before sending
      const currentPrice = (await publicClient.readContract({
        address: marketAddress, abi: MARKET_ABI,
        functionName: address ? "priceOf" : "pricePublic",
        args: address ? [BigInt(tier.id), address] : [BigInt(tier.id)],
      })) as bigint;
      setPrice(currentPrice);

      if (needsToken && tokenBal < currentPrice) {
        setBusy(false); setTxStage("hidden");
        setErr(`Insufficient ${payTokenSymbol} balance to buy this NFT.`);
        return;
      }

      // Re-estimate BUY gas on the now-correct chain; do not block if unknown/zero
      try {
        const est = (await estimateBuyFee()) ?? 0n;
        if (est > 0n && !hasEnoughFor(est)) {
          setBusy(false); setTxStage("hidden");
          setErr(gasWarnLine(est));
          return;
        }
      } catch {}

      const gas = await publicClient.estimateContractGas({
        account: address,
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: "buy",
        args: [BigInt(tier.id), address],
      });
      const { request } = await publicClient.simulateContract({
        account: address,
        address: marketAddress,
        abi: MARKET_ABI,
        functionName: "buy",
        args: [BigInt(tier.id), address],
      });

      const send = walletClient.writeContract({ ...request, gas });
      const watchdog = new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("Wallet didn’t open. Tap Buy again.")), 15000)
      );
      const buyHash = await Promise.race([send, watchdog]);

      setTxStage("confirming");

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: buyHash as `0x${string}`,
      });
      if (receipt.status !== "success") throw new Error("Transaction reverted.");

      const bal = (await publicClient.readContract({
        address: passAddress, abi: YEARNPASS1155_ABI, functionName: "balanceOf",
        args: [address, BigInt(tier.id)],
      })) as bigint;

      const nowOwned = bal > 0n;
      setOwned(nowOwned);

      if (needsToken) {
        try {
          const newBal = (await publicClient.readContract({
            address: payTokenAddress, abi: ERC20_ABI, functionName: "balanceOf",
            args: [address],
          })) as bigint;
          setTokenBal(newBal);
        } catch {}
      }

      if (nowOwned) {
        setTxStage("success");
        setCelebrate(true);
        if (isMobile()) setShowImportHelp(true);
        setTimeout(() => { setTxStage("hidden"); setCelebrate(false); }, 1800);
      } else {
        setTxStage("hidden");
      }
    } catch (e: any) {
      const raw = e?.message || e?.shortMessage || e?.details;
      const nice = rewriteGasError(raw);
      setErr(nice || raw || "Transaction failed.");
      setTxStage("hidden");
    } finally {
      setBusy(false);
    }
  }, [connected, address, walletClient, publicClient, owned, marketAddress, passAddress, chain?.id, currentChainId, switchChainAsync, tier.id, needsToken, tokenBal, payTokenSymbol, estimateBuyFee]);

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

  if (!visible) return null;

  const checksumPass = React.useMemo(() => {
    try { return getAddress(passAddress); } catch { return passAddress; }
  }, [passAddress]);
  const tokenIdDec = String(tier.id);
  const tokenIdHex = `0x${idHex64(tier.id)}`;

  const lowGasForApprove = connected && feeApprove != null && !hasEnoughFor(feeApprove);
  const lowGasForBuy = connected && feeBuy != null && !hasEnoughFor(feeBuy);
  const showGasChip = (lowGasForApprove && allowance < price) || lowGasForBuy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="scroll-mt-24 last:mb-28 md:last:mb-32"
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
              style={{ transform: "translateZ(30px)", contain: "content" }}
            >
              <CornerRibbon show={isWl} />
              {needsToken && (
                <div className="absolute top-3 right-3 z-30">
                  <div className="relative">
                    <div className="absolute -inset-2 blur-md bg-gradient-to-r from-indigo-400/25 to-cyan-300/20 rounded-full" />
                  </div>
                  {connected && !owned && !hasFunds && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-red-500/15 text-red-100 ring-1 ring-red-400/30 text-[11px]">
                      <AlertCircle className="w-3 h-3" />
                      Insufficient {payTokenSymbol}
                    </div>
                  )}
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 z-10 [content-visibility:auto] [contain-intrinsic-size:320px_240px]">
                <MetaverseScene />
                <div className="absolute inset-0 grid place-items-center">
                  {mediaUrl ? (
                    isVideo ? (
                      <motion.video
                        key={mediaUrl}
                        src={mediaUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-[78%] md:w-[70%] h-auto object-contain select-none opacity-[0.95] rounded-lg"
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 140, damping: 18 }}
                      />
                    ) : (
                      <motion.img
                        key={mediaUrl}
                        src={mediaUrl}
                        alt={name}
                        loading="lazy"
                        draggable={false}
                        className="w-[78%] md:w-[70%] h-auto object-contain select-none opacity-[0.95]"
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 140, damping: 18 }}
                      />
                    )
                  ) : (
                    <motion.div
                      className="w-[70%] aspect-square rounded-xl bg-white/[0.06] ring-1 ring-white/10"
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 0.6 }}
                      transition={{ repeat: Infinity, duration: 1.4, repeatType: "reverse" }}
                    />
                  )}
                </div>
                <OrbitRings />
                <motion.div aria-hidden className="absolute inset-0" style={{ backgroundImage: glare }} />
                <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_50%_120%,rgba(0,0,0,.55),transparent)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent" />
              </div>

              <OverlayLayer blur={txStage !== "hidden"}>
                <ConfettiShower show={celebrate} />
                <TxDialog stage={txStage} />
              </OverlayLayer>
            </div>

            {/* CONTENT */}
            <div className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-white/90 font-semibold truncate tracking-wide font-orbitron" title={name}>
                  {name}
                </h3>
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
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/20"
                    >
                      <Shield className="w-3.5 h-3.5" /> Owned
                    </motion.span>
                  )}
                </div>
              </div>

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

              {connected && needsToken && (
                <div className="mt-1 text-[11px] md:text-xs text-white/60">
                  Balance: {format3(tokenBal, payTokenDecimals)} {payTokenSymbol}
                  {connected && !owned && !hasFunds && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-[2px] bg-red-500/10 text-red-200 ring-1 ring-red-400/20">
                      <AlertCircle className="w-3 h-3" /> Insufficient {payTokenSymbol}
                    </span>
                  )}
                </div>
              )}

              {connected && showGasChip && (
                <div className="mt-2 text-[11px] md:text-xs inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/20">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Low {feeSymbol} for network fees. You have ~{format5(nativeBal)} {feeSymbol}.
                </div>
              )}

              {needsToken && allowance < price ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={doApprove}
                    disabled={busy}
                    className="w-full rounded-xl px-4 py-3 bg-[#0b0f17]/75 text-white ring-1 ring-indigo-400/30 hover:ring-indigo-300/40"
                    title={
                      connected && feeApprove != null && !hasEnoughFor(feeApprove)
                        ? `Need ~${format5(feeApprove)} ${feeSymbol} for gas`
                        : undefined
                    }
                  >
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Approving…
                      </span>
                    ) : (
                      "Approve"
                    )}
                  </button>
                  <button
                    disabled
                    className="w-full rounded-xl px-4 py-3 bg-black/35 text-white/60 ring-1 ring-white/10 cursor-not-allowed"
                    title="Approve first"
                  >
                    Buy
                  </button>
                </div>
              ) : (
                <motion.button
                  onClick={doBuy}
                  disabled={owned || busy || (!hasFunds && needsToken)}
                  whileTap={{ scale: 0.985 }}
                  className={`group relative mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold tracking-wide focus:outline-none font-orbitron min-h-[44px] ${
                    owned
                      ? "bg-black/40 text-white/70 ring-1 ring-white/10 cursor-default hover:bg-black/45 transition"
                      : !hasFunds && needsToken
                      ? "bg-black/35 text-white/60 ring-1 ring-white/10 cursor-not-allowed"
                      : "bg-[#0b0f17]/75 text-white ring-1 ring-indigo-400/30 hover:ring-indigo-300/40 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_12px_36px_rgba(99,102,241,0.20)] transition"
                  }`}
                  title={
                    connected && feeBuy != null && !hasEnoughFor(feeBuy)
                      ? `Need ~${format5(feeBuy)} ${feeSymbol} for gas`
                      : undefined
                  }
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
                    ) : !connected ? (
                      <>
                        <Wallet2 className="w-4 h-4" /> Connect to Buy
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
                    <div className="flex items-center justify-center gap-2">
                      ✅ Added to your vault <Sparkles />
                    </div>
                    <div className="mt-1 text-emerald-100/70 flex items-center justify-center gap-1 text-[12px]">
                      You can see your NFT in your wallet{" "}
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isMobile() && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowImportHelp((s) => !s)}
                    className="w-full inline-flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                  >
                    <span className="text-white/80">
                      {owned
                        ? "How to add this NFT to MetaMask"
                        : "Don’t see your NFT in MetaMask Mobile? Import it manually"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition ${
                        showImportHelp ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  <div className={`acc ${showImportHelp ? "acc-open" : "acc-closed"}`}>
                    <div className="px-3 pt-3 pb-2 text-[12px] text-white/75 space-y-2">
                      <p>
                        MetaMask Mobile sometimes doesn’t auto-detect ERC-1155. You can
                        import it manually:
                      </p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open <strong>MetaMask</strong> ➜ <strong>NFTs</strong> tab.</li>
                        <li>Tap <strong>Import NFTs</strong>.</li>
                        <li>Paste the <em>Contract Address</em> and <em>Token ID</em>.</li>
                      </ol>
                      <div className="mt-2 space-y-2">
                        <CopyField label="Contract" value={checksumPass} />
                        <CopyField label="Token ID (decimal)" value={String(tier.id)} mono />
                        <CopyField label="Token ID (hex)" value={`0x${idHex64(tier.id)}`} mono />
                      </div>
                      {isMetaMaskUA() && isMobile() && (
                        <p className="pt-1 opacity-80">
                          Tip: After import, pull down to refresh if it doesn’t appear
                          immediately.
                        </p>
                      )}
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

        .acc { overflow: hidden; transition: max-height 0.22s ease, opacity 0.22s ease; will-change: max-height, opacity; }
        .acc-closed { max-height: 0; opacity: 0; }
        .acc-open   { max-height: 360px; opacity: 1; }
      `}</style>
    </motion.div>
  );
}

/* Corner ribbon */
function CornerRibbon({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 180, damping: 18 }}
      className="absolute top-2 left-2 z-30"
    >
      <div
        className="px-3 py-1 text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 ring-1 ring-white/10 shadow rounded-sm"
        style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0% 100%)" }}
        title="You're whitelisted for this tier"
      >
        Whitelisted
      </div>
    </motion.div>
  );
}
