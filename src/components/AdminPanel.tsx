import React from "react";
import { motion } from "framer-motion";
import { Shield, Wrench, ListChecks, Coins, Check, AlertTriangle, Send, Loader2 } from "lucide-react";
import { Address, formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient, useChainId } from "wagmi";
import { bsc } from "viem/chains";
import { ERC20_ABI, YEARNPASS1155_ABI, MARKET_ABI } from "../lib/abi";

type Props = {
  passAddress: Address;
  marketAddress: Address;
  tokenAddress: Address;      // YEARN ERC-20
  tierIds: number[];
};

export default function AdminPanel({ passAddress, marketAddress, tokenAddress, tierIds }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const wrongChain = isConnected && chainId !== bsc.id;

  const [decimals, setDecimals] = React.useState(18);
  const [adminRole, setAdminRole] = React.useState<`0x${string}`>("0x00");
  const [transferRole, setTransferRole] = React.useState<`0x${string}`>("0x00");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [canTransfer, setCanTransfer] = React.useState(false);

  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  // form state
  const [selId, setSelId] = React.useState<number>(tierIds[0] || 1);
  const [pubPrice, setPubPrice] = React.useState<string>("0");
  const [wlPrice, setWlPrice] = React.useState<string>("0");
  const [priceChecked, setPriceChecked] = React.useState<string>("");

  const [wlAddr, setWlAddr] = React.useState<string>("");
  const [wlFlag, setWlFlag] = React.useState<boolean>(true);
  const [batch, setBatch] = React.useState<string>("");

  const [tierUri, setTierUri] = React.useState<string>("");
  const [tierMax, setTierMax] = React.useState<string>("0");
  const [tierExpiry, setTierExpiry] = React.useState<string>("0");
  const [burnOnConsume, setBurnOnConsume] = React.useState<boolean>(false);

  const [fromAddr, setFromAddr] = React.useState<string>("");
  const [toAddr, setToAddr] = React.useState<string>("");

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const d = await publicClient?.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: "decimals" }) as number;
        if (!stop && d) setDecimals(d);
      } catch {}
      try {
        const A = await publicClient?.readContract({ address: passAddress, abi: YEARNPASS1155_ABI, functionName: "ADMIN_ROLE" }) as `0x${string}`;
        const T = await publicClient?.readContract({ address: passAddress, abi: YEARNPASS1155_ABI, functionName: "TRANSFER_ROLE" }) as `0x${string}`;
        if (!stop && A && T) { setAdminRole(A); setTransferRole(T); }
      } catch {}
    })();
    return () => { stop = true; };
  }, [publicClient, passAddress, tokenAddress]);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      if (!address || !publicClient) return;
      try {
        const A = await publicClient.readContract({ address: passAddress, abi: YEARNPASS1155_ABI, functionName: "hasRole", args: [adminRole, address] }) as boolean;
        const T = await publicClient.readContract({ address: passAddress, abi: YEARNPASS1155_ABI, functionName: "hasRole", args: [transferRole, address] }) as boolean;
        if (!stop) { setIsAdmin(A); setCanTransfer(T); }
      } catch {}
    })();
    return () => { stop = true; };
  }, [address, publicClient, adminRole, transferRole, passAddress]);

  const ensureBsc = async () => {
    if (!walletClient) return;
    const target = `0x${bsc.id.toString(16)}`;
    try {
      const curr = await walletClient.request({ method: "eth_chainId" }) as string;
      if (curr?.toLowerCase() === target.toLowerCase()) return;
    } catch {}
    try {
      await walletClient.request({ method:"wallet_switchEthereumChain", params:[{ chainId: target }]} );
    } catch (e:any) {
      if (e?.code !== 4902) throw e;
      await walletClient.request({
        method:"wallet_addEthereumChain",
        params:[{ chainId: target, chainName:"BSC Mainnet", rpcUrls:[import.meta.env.VITE_BSC_RPC_URL || "https://bsc-dataseed1.bnbchain.org"], nativeCurrency:{ name:"BNB", symbol:"BNB", decimals:18 }, blockExplorerUrls:["https://bscscan.com"] }]
      });
      await walletClient.request({ method:"wallet_switchEthereumChain", params:[{ chainId: target }]} );
    }
  };

  const run = async (fn: () => Promise<void>) => {
    if (!isConnected || !walletClient || !publicClient) return;
    if (wrongChain) await ensureBsc();
    setBusy(true); setNote(null);
    try {
      await fn();
      setNote("Success.");
    } catch (e:any) {
      setNote(e?.shortMessage || e?.message || "Transaction failed");
    } finally {
      setBusy(false);
      setTimeout(()=>setNote(null), 3000);
    }
  };

  const doSetPrices = async () => run(async () => {
    const pub = parseUnits(pubPrice || "0", decimals);
    const wl  = parseUnits(wlPrice  || "0", decimals);
    const hash = await walletClient!.writeContract({
      address: marketAddress, abi: MARKET_ABI, functionName: "setPrices",
      args: [BigInt(selId), pub, wl]
    });
    await publicClient!.waitForTransactionReceipt({ hash });
  });

  const doCheckMyPrice = async () => {
    if (!publicClient || !address) return;
    const v = await publicClient.readContract({
      address: marketAddress, abi: MARKET_ABI, functionName: "priceOf",
      args: [BigInt(selId), address]
    }) as bigint;
    setPriceChecked(`${formatUnits(v, decimals)} YEARN`);
  };

  const doWhitelistSingle = async () => run(async () => {
    const hash = await walletClient!.writeContract({
      address: marketAddress, abi: MARKET_ABI, functionName: "setWhitelist",
      args: [BigInt(selId), wlAddr as Address, wlFlag]
    });
    await publicClient!.waitForTransactionReceipt({ hash });
  });

  const doWhitelistBatch = async () => run(async () => {
    const list = batch.split(/\s|,|;|\n/).map(s=>s.trim()).filter(Boolean);
    try {
      const hash = await walletClient!.writeContract({
        address: marketAddress, abi: MARKET_ABI, functionName: "setWhitelistBatch",
        args: [BigInt(selId), list as Address[], wlFlag]
      });
      await publicClient!.waitForTransactionReceipt({ hash });
    } catch {
      for (const a of list) {
        const h = await walletClient!.writeContract({
          address: marketAddress, abi: MARKET_ABI, functionName: "setWhitelist",
          args: [BigInt(selId), a as Address, wlFlag]
        });
        await publicClient!.waitForTransactionReceipt({ hash: h });
      }
    }
  });

  const doConfigureTier = async () => run(async () => {
    const tuple = {
      maxSupply: BigInt(tierMax || "0"),
      minted: BigInt(0), // ignored by contract when updating
      uri: tierUri,
      tokenExpiry: Number(tierExpiry || "0"),
      burnOnConsume: Boolean(burnOnConsume),
    };
    const hash = await walletClient!.writeContract({
      address: passAddress, abi: YEARNPASS1155_ABI, functionName: "configureTier",
      args: [BigInt(selId), tuple]
    });
    await publicClient!.waitForTransactionReceipt({ hash });
  });

  const doAdminMove = async () => run(async () => {
    const to = (toAddr && toAddr.length>0) ? (toAddr as Address) : (address as Address);
    const hash = await walletClient!.writeContract({
      address: passAddress, abi: YEARNPASS1155_ABI, functionName: "adminMove",
      args: [fromAddr as Address, to as Address, BigInt(selId)]
    });
    await publicClient!.waitForTransactionReceipt({ hash });
  });

  if (!isConnected) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 text-white/80">
          <Shield className="w-5 h-5" /> Connect a wallet to access the admin panel.
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 ring-1 ring-white/15 grid place-items-center">
            <Wrench className="w-5 h-5 text-white/80" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-xl">Admin Panel</h2>
            <p className="text-white/60 text-sm">
              {wrongChain ? "Wrong network — switch to BSC." :
               isAdmin ? "Admin detected. Manage prices, whitelist, tiers, and recovery moves." :
               "You do not have ADMIN_ROLE. Actions disabled."}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-xs">
          {isAdmin ? <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30">ADMIN</span> :
                      <span className="px-2 py-1 rounded bg-white/10 text-white/70 ring-1 ring-white/15">VIEW</span>}
          {canTransfer && <span className="px-2 py-1 rounded bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/30">TRANSFER_ROLE</span>}
        </div>
      </div>

      {/* Prices */}
      <Card title="Dual Pricing per Type" icon={<Coins className="w-4 h-4" />}>
        <Row>
          <SelectId ids={tierIds} value={selId} onChange={setSelId} />
          <Field label="Public price (YEARN)" value={pubPrice} onChange={setPubPrice} placeholder="e.g. 1000" />
          <Field label="Whitelist price (YEARN)" value={wlPrice} onChange={setWlPrice} placeholder="e.g. 800" />
          <Button onClick={doSetPrices} disabled={!isAdmin || busy} label="Set Prices" busy={busy} />
          <Button subtle onClick={doCheckMyPrice} label="Check my price" />
        </Row>
        {priceChecked && <p className="text-white/70 text-sm mt-2">Your current price for ID {selId}: <b>{priceChecked}</b></p>}
      </Card>

      {/* Whitelist */}
      <Card title="Whitelist Controls" icon={<ListChecks className="w-4 h-4" />}>
        <Row>
          <SelectId ids={tierIds} value={selId} onChange={setSelId} />
          <Field label="Address" value={wlAddr} onChange={setWlAddr} placeholder="0x..." />
          <SelectBoolean label="Allow?" value={wlFlag} onChange={setWlFlag} />
          <Button onClick={doWhitelistSingle} disabled={!isAdmin || busy} label="Update Single" busy={busy} />
        </Row>
        <Row className="mt-3">
          <SelectId ids={tierIds} value={selId} onChange={setSelId} />
          <TextArea label="Batch addresses (newline/comma/space separated)" value={batch} onChange={setBatch} />
          <SelectBoolean label="Allow?" value={wlFlag} onChange={setWlFlag} />
          <Button onClick={doWhitelistBatch} disabled={!isAdmin || busy} label="Update Batch" busy={busy} />
        </Row>
      </Card>

      {/* Tiers */}
      <Card title="Configure Tier (URI / Max / Expiry / Burn)" icon={<Wrench className="w-4 h-4" />}>
        <Row>
          <SelectId ids={tierIds} value={selId} onChange={setSelId} />
          <Field label="URI" value={tierUri} onChange={setTierUri} placeholder="ipfs://.../{id}.json" />
          <Field label="Max Supply (0=unlimited)" value={tierMax} onChange={setTierMax} placeholder="0" />
          <Field label="Expiry (unix; 0=none)" value={tierExpiry} onChange={setTierExpiry} placeholder="0" />
          <SelectBoolean label="Burn on consume?" value={burnOnConsume} onChange={setBurnOnConsume} />
        </Row>
        <div className="mt-3">
          <Button onClick={doConfigureTier} disabled={!isAdmin || busy} label="Save Tier" busy={busy} />
        </div>
      </Card>

      {/* Admin move */}
      <Card title="Admin Move (soulbound recovery)" icon={<Send className="w-4 h-4" />}>
        <p className="text-white/60 text-sm mb-2">
          Requires TRANSFER_ROLE on the Pass. Destination must follow contract rules.
        </p>
        <Row>
          <Field label="From" value={fromAddr} onChange={setFromAddr} placeholder="0xFrom..." />
          <Field label="To (optional)" value={toAddr} onChange={setToAddr} placeholder="0xTo... (empty = your address)" />
          <SelectId ids={tierIds} value={selId} onChange={setSelId} />
          <Button onClick={doAdminMove} disabled={!canTransfer || busy} label="Move" busy={busy} />
        </Row>
        {!canTransfer && (
          <div className="mt-3 inline-flex items-center gap-2 text-amber-200 text-xs bg-amber-600/20 px-2 py-1 rounded ring-1 ring-amber-400/30">
            <AlertTriangle className="w-3.5 h-3.5" /> You don’t have TRANSFER_ROLE.
          </div>
        )}
      </Card>

      {note && <div className="rounded-xl bg-white/10 text-white/90 px-3 py-2 text-sm ring-1 ring-white/15">{note}</div>}
    </section>
  );
}

/* ---------- Tiny UI atoms matching your theme ---------- */
function Card({ title, icon, children }:{title:string; icon:React.ReactNode; children:React.ReactNode}) {
  return (
    <motion.div layout className="card">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-xl bg-white/10 ring-1 ring-white/15 grid place-items-center">{icon}</div>
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}
function Row({ children, className }:{children:React.ReactNode; className?:string}) {
  return <div className={`grid grid-cols-1 md:grid-cols-5 gap-3 items-end ${className||""}`}>{children}</div>;
}
function Field({ label, value, onChange, placeholder }:{
  label:string; value:string; onChange:(v:string)=>void; placeholder?:string;
}) {
  return (
    <div>
      <label className="text-white/70 text-sm">{label}</label>
      <input value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}
        className="input mt-1" />
    </div>
  );
}
function TextArea({ label, value, onChange }:{
  label:string; value:string; onChange:(v:string)=>void;
}) {
  return (
    <div className="md:col-span-3">
      <label className="text-white/70 text-sm">{label}</label>
      <textarea rows={3} value={value} onChange={(e)=>onChange(e.target.value)} className="input mt-1" />
    </div>
  );
}
function SelectBoolean({ label, value, onChange }:{
  label:string; value:boolean; onChange:(v:boolean)=>void;
}) {
  return (
    <div>
      <label className="text-white/70 text-sm">{label}</label>
      <select className="input mt-1" value={value ? "1" : "0"} onChange={(e)=>onChange(e.target.value==="1")}>
        <option value="1">Yes</option>
        <option value="0">No</option>
      </select>
    </div>
  );
}
function SelectId({ ids, value, onChange }:{ids:number[]; value:number; onChange:(n:number)=>void}) {
  return (
    <div>
      <label className="text-white/70 text-sm">Pass ID</label>
      <select className="input mt-1" value={value} onChange={(e)=>onChange(Number(e.target.value))}>
        {ids.map(i => <option key={i} value={i}>{i}</option>)}
      </select>
    </div>
  );
}
function Button({ onClick, label, disabled, busy, subtle }:{
  onClick:()=>void; label:string; disabled?:boolean; busy?:boolean; subtle?:boolean;
}) {
  const cls = subtle ? "btn-secondary" : "btn-primary";
  return (
    <button onClick={onClick} disabled={disabled || busy} className={`${cls} w-full`}>
      {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {label}</> : <><Check className="w-4 h-4" /> {label}</>}
    </button>
  );
}
