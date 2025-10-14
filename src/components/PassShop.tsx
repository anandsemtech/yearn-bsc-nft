import React from "react";
import { motion } from "framer-motion";
import { Wallet, Check, ShoppingCart, Loader2 } from "lucide-react";
import { useAccount, usePublicClient, useWalletClient, useChainId } from "wagmi";
import { Address, erc20Abi, formatUnits, parseUnits } from "viem";
import { bsc } from "viem/chains";

/** ====== CONFIG (replace with your values) ====== */
const PASS_ADDR = "0xBDb298a0104C9Db197d04bd4330DC3f235A8C36A" as Address;
const MARKET_ADDR = "0xfBc8AE9D6C6Fb5735D4C1FbAEf0faf6f417Aa9fF" as Address;
const YEARN_ADDR = "0x3aA0A40ef63F35D930E2914CABfEDfCfa6E76c1E" as Address; // <-- verify this is ERC20 YEARN

const PASS_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{type:"address","name":""},{type:"uint256","name":""}], outputs: [{type:"uint256"}] },
  { type: "function", name: "uri", stateMutability: "view", inputs: [{type:"uint256"}], outputs: [{type:"string"}] }
] as const;

const MARKET_ABI = [
  { type: "function", name: "priceOf", stateMutability: "view", inputs: [{type:"uint256"},{type:"address"}], outputs: [{type:"uint256"}] },
  { type: "function", name: "buy", stateMutability: "nonpayable", inputs: [{type:"uint256"},{type:"address"}], outputs: [] }
] as const;

/** These are your configured IDs 1..10 */
const PASS_IDS = [1,2,3,4,5,6,7,8,9,10];

type Card = {
  id: number;
  name: string;
  image: string;
  external_url?: string;
};
const FALLBACK_NAMES: Record<number,string> = {
  1:"Yearn Starter Pass", 2:"Yearn Elite Pass", 3:"Yearn Buddy Pass", 4:"Yearn Champ Pass",
  5:"Star 1 Achiever", 6:"Star 2 Achiever", 7:"Star 3 Achiever", 8:"Star 4 Achiever",
  9:"Star 5 Achiever", 10:"Golden Star Achiever"
};

const plural = (n:number, w:string) => `${n} ${w}${n===1?"":"s"}`;

export default function PassShop() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [cards, setCards] = React.useState<Card[]>([]);
  const [owned, setOwned] = React.useState<Record<number, boolean>>({});
  const [prices, setPrices] = React.useState<Record<number, bigint>>({});
  const [loading, setLoading] = React.useState<Record<number, boolean>>({});
  const [decimals, setDecimals] = React.useState<number>(18);

  const wrongChain = isConnected && chainId !== bsc.id;

  // load YEARN decimals
  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const d = await publicClient?.readContract({ address: YEARN_ADDR, abi: erc20Abi, functionName: "decimals" }) as number;
        if (!stop && d) setDecimals(d);
      } catch {}
    })();
    return () => { stop = true; };
  }, [publicClient]);

  // fetch URIs → fetch JSON metadata → cards
  React.useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const results: Card[] = [];
        for (const id of PASS_IDS) {
          const raw = await publicClient?.readContract({ address: PASS_ADDR, abi: PASS_ABI, functionName: "uri", args: [BigInt(id)] }) as string;
          // Replace {id} placeholders if present (OZ style)
          const resolved = raw.includes("{id}") ? raw.replace("{id}", String(id)) : raw;
          const json = await fetch(ipfsToHttp(resolved)).then(r => r.json()).catch(()=>null);
          results.push({
            id,
            name: json?.name || FALLBACK_NAMES[id],
            image: json?.image ? ipfsToHttp(json.image) : "",
            external_url: json?.external_url
          });
        }
        if (!stop) setCards(results);
      } catch {}
    };
    load();
    // refetch occasionally
    const t = setInterval(load, 60_000);
    return () => { stop = true; clearInterval(t); };
  }, [publicClient]);

  // user-specific: ownership + priceOf
  React.useEffect(() => {
    let stop = false;
    const load = async () => {
      if (!address || !publicClient) return;
      try {
        const [owns, p] = await Promise.all([
          Promise.all(PASS_IDS.map(async id => {
            const bal = await publicClient.readContract({ address: PASS_ADDR, abi: PASS_ABI, functionName: "balanceOf", args: [address, BigInt(id)] }) as bigint;
            return { id, has: bal > 0n };
          })),
          Promise.all(PASS_IDS.map(async id => {
            const v = await publicClient.readContract({ address: MARKET_ADDR, abi: MARKET_ABI, functionName: "priceOf", args: [BigInt(id), address] }) as bigint;
            return { id, v };
          }))
        ]);
        if (stop) return;
        setOwned(owns.reduce((m,o)=> (m[o.id]=o.has, m), {} as Record<number,boolean>));
        setPrices(p.reduce((m,o)=> (m[o.id]=o.v, m), {} as Record<number,bigint>));
      } catch {}
    };
    load();
    const t = setInterval(load, 20_000);
    return () => { stop = true; clearInterval(t); };
  }, [address, publicClient]);

  const ensureBsc = async () => {
    if (!walletClient) return;
    const target = `0x${bsc.id.toString(16)}`;
    try {
      const curr = await walletClient.request({ method: "eth_chainId" }) as string;
      if (curr.toLowerCase() === target.toLowerCase()) return;
    } catch {}
    try {
      await walletClient.request({ method: "wallet_switchEthereumChain", params: [{ chainId: target }] });
    } catch (e:any) {
      if (e?.code !== 4902) throw e;
      await walletClient.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: target, chainName: "BSC Mainnet", rpcUrls: [import.meta.env.VITE_BSC_RPC_URL || "https://bsc-dataseed1.bnbchain.org"], nativeCurrency: { name:"BNB", symbol:"BNB", decimals:18 }, blockExplorerUrls: ["https://bscscan.com"] }]
      });
      await walletClient.request({ method: "wallet_switchEthereumChain", params: [{ chainId: target }] });
    }
  };

  const buy = async (id: number) => {
    if (!isConnected || !address || !walletClient || !publicClient) return;
    if (wrongChain) { await ensureBsc(); }
    const price = prices[id] ?? 0n;
    try {
      setLoading((l)=>({...l,[id]:true}));
      if (price > 0n) {
        // Approve if needed
        const allowance = await publicClient.readContract({
          address: YEARN_ADDR, abi: erc20Abi, functionName: "allowance", args: [address, MARKET_ADDR]
        }) as bigint;
        if (allowance < price) {
          const tx1 = await walletClient.writeContract({
            address: YEARN_ADDR, abi: erc20Abi, functionName: "approve",
            args: [MARKET_ADDR, price]
          });
          await publicClient.waitForTransactionReceipt({ hash: tx1 });
        }
      }
      // Buy
      const tx = await walletClient.writeContract({
        address: MARKET_ADDR, abi: MARKET_ABI, functionName: "buy",
        args: [BigInt(id), address]
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      // refresh
      const bal = await publicClient.readContract({ address: PASS_ADDR, abi: PASS_ABI, functionName: "balanceOf", args: [address, BigInt(id)] }) as bigint;
      setOwned((o)=> ({...o, [id]: bal>0n}));
    } finally {
      setLoading((l)=>({...l,[id]:false}));
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="YearnTogether" className="h-8 w-8 rounded-lg ring-1 ring-white/20" />
          <h2 className="text-white font-semibold text-xl">Yearn Pass Shop</h2>
        </div>
        {!isConnected ? (
          <span className="text-white/60 text-sm inline-flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Connect wallet to view prices
          </span>
        ) : wrongChain ? (
          <button
            onClick={ensureBsc}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-100 text-sm ring-1 ring-amber-400/30 hover:bg-amber-500/30"
          >
            Switch to BSC
          </button>
        ) : null}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c) => {
          const p = prices[c.id] ?? 0n;
          const youOwn = owned[c.id] ?? false;
          const label = p === 0n ? "Free" : `${formatUnits(p, decimals)} YEARN`;
          return (
            <motion.div
              key={c.id}
              whileHover={{ scale: 1.01 }}
              className="rounded-3xl overflow-hidden bg-white/5 ring-1 ring-white/10 shadow-[0_8px_40px_-8px_rgba(0,0,0,.35)]"
            >
              <div className="aspect-[4/3] bg-white/5 relative overflow-hidden">
                {c.image ? (
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-white/40">No Image</div>
                )}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold truncate">{c.name}</h3>
                  {youOwn && (
                    <span className="inline-flex items-center gap-1 text-emerald-300 text-xs font-semibold">
                      <Check className="w-4 h-4" /> Owned
                    </span>
                  )}
                </div>
                <div className="mt-2 text-white/80 text-sm">{label}</div>

                <div className="mt-4">
                  <button
                    disabled={!isConnected || youOwn || loading[c.id]}
                    onClick={() => buy(c.id)}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-white transition
                      ${youOwn ? "bg-white/10 cursor-not-allowed" : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95 active:opacity-90"}`}
                  >
                    {loading[c.id] ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing…
                      </>
                    ) : youOwn ? (
                      <>
                        <Check className="w-4 h-4" />
                        Claimed
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        {p === 0n ? "Claim Free" : "Buy"}
                      </>
                    )}
                  </button>
                </div>

                {c.external_url && (
                  <a
                    href={c.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-white/60 hover:text-white/90"
                  >
                    Learn more ↗
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Soft glows that match your theme */}
      <div className="pointer-events-none fixed -z-10 inset-0">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-purple-600/10 blur-3xl" />
      </div>
    </section>
  );
}

function ipfsToHttp(uri: string) {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  return uri;
}
