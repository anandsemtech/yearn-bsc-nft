// src/components/Header.tsx
import React, { useEffect } from "react";
import { useAccount, useChainId, useWalletClient, useDisconnect } from "wagmi";
import { bsc } from "@reown/appkit/networks";
import { appKit } from "../lib/appkit";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Wallet2, ShieldAlert, CheckCircle2, LogOut } from "lucide-react";
import YearnTogetherMark from "./YearnTogetherMark";

const Header: React.FC = () => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  // ---- Glow / tilt cursor state (replace useTilt3D with local MotionValues) ----
  const x = useMotionValue(0.5); // normalized 0..1 across header
  const y = useMotionValue(0.5);
  const xPct = useTransform(x, (v: number) => v * 100);
  const yPct = useTransform(y, (v: number) => v * 100);

  const glow = useMotionTemplate`
    radial-gradient(
      700px 450px at ${xPct}% ${yPct}%,
      rgba(244,114,182,.28),
      rgba(56,189,248,.22) 35%,
      rgba(99,102,241,.18) 60%,
      transparent 70%
    )
  `;

  const wrongChain = isConnected && chainId !== bsc.id;

  function onMouseMove(e: React.MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width);
    y.set((e.clientY - r.top) / r.height);
  }

  async function ensureBsc() {
    if (!walletClient) return;
    const targetHex = `0x${bsc.id.toString(16)}`;
    try {
      await walletClient.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetHex }],
      });
    } catch (e: any) {
      if (e?.code !== 4902) throw e;
      await walletClient.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: targetHex,
            chainName: "BSC Mainnet",
            rpcUrls: [
              import.meta.env.VITE_BSC_RPC_URL ||
                "https://bsc-dataseed1.bnbchain.org",
            ],
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            blockExplorerUrls: ["https://bscscan.com"],
          },
        ],
      });
      await walletClient.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetHex }],
      });
    }
  }

  // Clean wagmi + kit state on disconnect
  const handleDisconnect = async () => {
    try {
      // Optional: some kits expose a disconnect method
      // @ts-ignore
      if (typeof appKit?.disconnect === "function") {
        await appKit.disconnect();
      }
    } catch {
      /* ignore */
    }
    disconnect();
  };

  useEffect(() => {
    if (isConnected && chainId && chainId !== bsc.id) {
      ensureBsc().catch(() => {});
    }
  }, [isConnected, chainId]); // eslint-disable-line react-hooks/exhaustive-deps

  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <header className="sticky top-0 z-50">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-indigo-500 opacity-70 blur-[1px]" />

      {wrongChain && (
        <div
          className="bg-gradient-to-r from-rose-600/70 to-orange-500/70 text-white/95 text-xs px-4 py-2 flex items-center gap-2 justify-center backdrop-blur-md border-b border-white/10 cursor-pointer"
          onClick={ensureBsc}
        >
          <ShieldAlert className="w-4 h-4" />
          You’re on the wrong network. Click to switch to{" "}
          <strong className="mx-1">BSC Mainnet</strong>.
        </div>
      )}

      <motion.div
        onMouseMove={onMouseMove}
        className="relative flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-black/40 backdrop-blur-xl"
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: glow, filter: "blur(18px)" }}
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 opacity-50 [background:radial-gradient(900px_600px_at_-10%_-60%,rgba(56,189,248,.12),transparent),radial-gradient(800px_500px_at_110%_160%,rgba(244,114,182,.12),transparent)]" />
          <div className="absolute inset-0 mix-blend-soft-light opacity-15 [background:repeating-linear-gradient(transparent_0,transparent_2px,rgba(255,255,255,.08)_3px,transparent_4px)]" />
        </div>

        {/* Left: Mark + chain */}
        <div className="relative flex items-center gap-3">
          <YearnTogetherMark imgClassName="h-7 sm:h-8" />
          {isConnected && (
            <span className="hidden sm:inline-block px-2 py-1 rounded-lg bg-white/5 ring-1 ring-white/10 text-[11px] text-white/70">
              chain: {chainId ?? "—"}
            </span>
          )}
        </div>

        {/* Right: Wallet / Address / Disconnect */}
        <div className="relative flex items-center gap-2 sm:gap-3">
          {isConnected && (
            <div className="relative hidden md:flex items-center gap-2 rounded-xl px-3 py-2 bg-white/5 ring-1 ring-white/10 text-white/80">
              <div
                className={`h-2 w-2 rounded-full ${
                  wrongChain ? "bg-rose-400" : "bg-emerald-400"
                } shadow-[0_0_10px]`}
              />
              <span className="text-xs">{shortAddr}</span>
              {!wrongChain && (
                <CheckCircle2 className="w-4 h-4 text-emerald-300/90" />
              )}
            </div>
          )}

          {isConnected ? (
            <>
              {/* Primary: address / switch */}
              <motion.button
                onClick={ensureBsc}
                whileTap={{ scale: 0.98 }}
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold tracking-wide focus:outline-none ring-1 ring-white/10 ${
                  wrongChain ? "text-white" : "text-black"
                }`}
              >
                <span
                  aria-hidden
                  className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-indigo-500 opacity-70 blur-md"
                />
                <span
                  className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 ${
                    wrongChain
                      ? "bg-gradient-to-r from-rose-500 to-orange-400"
                      : "bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-indigo-500"
                  }`}
                >
                  <Wallet2 className="w-4 h-4" />
                  {wrongChain ? "Switch to BSC" : shortAddr}
                </span>
              </motion.button>

              {/* Disconnect */}
              <motion.button
                onClick={handleDisconnect}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold tracking-wide text-white/90 hover:text-white bg-white/5 hover:bg-white/10 ring-1 ring-white/10"
                title="Disconnect wallet"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Disconnect</span>
              </motion.button>
            </>
          ) : (
            <motion.button
              onClick={() => appKit.open()}
              whileTap={{ scale: 0.98 }}
              className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold tracking-wide text-black focus:outline-none ring-1 ring-white/10"
            >
              <span
                aria-hidden
                className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-indigo-500 opacity-70 blur-md"
              />
              <span className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-indigo-500">
                <Wallet2 className="w-4 h-4" />
                Connect Wallet
              </span>
            </motion.button>
          )}
        </div>
      </motion.div>

      <style>{`.opacity-15{opacity:.15}`}</style>
    </header>
  );
};

export default Header;
