import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cpu } from "lucide-react";
import MetaverseScene from "./fx/MetaverseScene";
import { OrbitRings } from "./fx/HoloPrimitives";
import Logo from "../assets/logo.svg";

/**
 * AppLoader (Cinematic + Metaverse)
 * - Real 3D scene via MetaverseScene
 * - Extra metaverse elements: PortalRing, OrbitingSatellites, FloatingHoloShards
 * - Logo centered inside progress ring
 * - Build-safe animations (no repeat: Infinity)
 *
 * Usage:
 * <AppLoader show={loading} onDone={() => setLoading(false)} />
 */

const RING_SIZE = 164;
const RING_STROKE = 7;

export default function AppLoader({
  show,
  onDone,
  durationMs = 2600,
  // optional, accepted but unused in logo-mode
  brandName: _brandName,
  tagline: _tagline,
}: {
  show: boolean;
  onDone?: () => void;
  durationMs?: number;
  brandName?: string;
  tagline?: string;
}) {
  const [progress, setProgress] = React.useState(0);

  // Auto progress + finish
  React.useEffect(() => {
    if (!show) return;
    setProgress(0);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const pct = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - pct, 3); // easeOutCubic
      setProgress(Math.floor(eased * 100));
      if (pct < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => onDone?.(), 120);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, durationMs, onDone]);

  // Lock scroll while visible
  React.useEffect(() => {
    if (!show) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="app-loader"
          className="fixed inset-0 z-[9999] text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-live="polite"
          aria-busy={true}
          role="alert"
        >
          {/* Base glass */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />

          {/* === REAL 3D SCENE LAYER === */}
          <div className="absolute inset-0 z-0">
            <MetaverseScene />
            {/* Soft veil so 3D blends with UI */}
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(70% 60% at 50% 100%, rgba(0,0,0,0.45), transparent), " +
                  "radial-gradient(55% 55% at 50% 50%, rgba(255,255,255,0.06), transparent 70%)",
                filter: "blur(2px)",
              }}
              animate={{ opacity: [0.55, 0.75, 0.55] }}
              transition={{ duration: 7.5, ease: "easeInOut", repeat: 999999 }}
            />
          </div>

          {/* === CINEMATIC ADD-ONS (tasteful, behind UI) === */}
          <PortalRing />            {/* big ethereal ring behind center */}
          <OrbitingSatellites />    {/* subtle orbiters near mid-plane */}
          <FloatingHoloShards />    {/* slow drifting shards across scene */}

          {/* Keep a touch of the original layers for depth */}
          <AuroraLayer />
          <Starfield />
          <GridFloor />

          {/* === CENTERPIECE === */}
          <div className="absolute inset-0 z-40 grid place-items-center">
            <motion.div
              className="relative"
              initial={{ scale: 0.94, opacity: 0.0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 4 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              {/* Halo + orbit rings for extra depth */}
              <div className="pointer-events-none absolute -inset-16">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(40% 40% at 50% 50%, rgba(99,102,241,0.35), transparent 65%)",
                    filter: "blur(28px)",
                  }}
                />
              </div>
              <div className="absolute inset-0 -translate-y-2 scale-110">
                <OrbitRings />
              </div>

              {/* Progress ring */}
              <ProgressRing size={RING_SIZE} stroke={RING_STROKE} value={progress} />

              {/* Centered LOGO inside the ring */}
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <img
                  src={Logo}
                  alt="Logo"
                  draggable={false}
                  className="opacity-95"
                  style={{
                    width: Math.floor(RING_SIZE - 56), // safely inside ring
                    height: "auto",
                    filter: "drop-shadow(0 2px 10px rgba(99,102,241,0.35))",
                  }}
                />
              </div>

              {/* Chips kept subtle & compact */}
              <div className="absolute inset-x-0 -bottom-14 flex items-center justify-center gap-2 text-[10px]">
                <Chip>AI</Chip>
                <Chip>Metaverse</Chip>
                <Chip>NFT</Chip>
                <Chip>Blockchain</Chip>
              </div>
            </motion.div>

            {/* Micro status pulse below */}
            <motion.div
              className="absolute mt-28 flex items-center gap-2 text-xs text-white/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              transition={{ duration: 0.6 }}
            >
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
              <span>Synchronizing nodes… {progress}%</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------ Visual atoms ------------------------ */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full px-2.5 py-1 bg-white/8 ring-1 ring-white/10 text-white/85 tracking-wide">
      {children}
    </span>
  );
}

function ProgressRing({
  size = 120,
  stroke = 6,
  value = 0,
}: {
  size?: number;
  stroke?: number;
  value?: number; // 0..100
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;

  return (
    <svg
      width={size}
      height={size}
      className="drop-shadow-[0_20px_40px_rgba(99,102,241,0.35)]"
    >
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="50%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#f0abfc" />
        </linearGradient>
      </defs>
      {/* Outer glow */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#ring)"
        opacity="0.20"
        strokeWidth={stroke}
      />
      {/* Animated arc */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#ring)"
        strokeLinecap="round"
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c - dash}`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          filter: "drop-shadow(0 0 16px rgba(99,102,241,0.45))",
        }}
      />
      {/* Core */}
      <circle cx={size / 2} cy={size / 2} r={r - 18} fill="rgba(7,10,17,0.65)" />
    </svg>
  );
}

/* ------------------------ Extra Metaverse Elements ------------------------ */

/** Large ethereal portal ring that slowly rotates behind the center */
function PortalRing() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <motion.div
        initial={{ scale: 0.95, opacity: 0.38, rotate: 0 }}
        animate={{ scale: 1, opacity: 0.55, rotate: 360 }}
        transition={{ duration: 42, ease: "linear", repeat: 999999 }}
        className="w-[60vmin] h-[60vmin]"
        style={{ filter: "drop-shadow(0 0 28px rgba(99,102,241,0.35))" }}
      >
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <defs>
            <linearGradient id="portal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(165,180,252,0.8)" />
              <stop offset="50%" stopColor="rgba(103,232,249,0.85)" />
              <stop offset="100%" stopColor="rgba(240,171,252,0.8)" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="80" fill="none" stroke="url(#portal)" strokeWidth="1.6" strokeOpacity="0.9" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="url(#portal)" strokeWidth="1.0" strokeOpacity="0.5" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="url(#portal)" strokeWidth="0.8" strokeOpacity="0.35" />
        </svg>
      </motion.div>
    </div>
  );
}

/** Small orbs that orbit around the center at different radii/speeds */
function OrbitingSatellites() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <Orb r={110} size={6} delay={0.2} dur={18} />
      <Orb r={150} size={4} delay={1.1} dur={24} />
      <Orb r={190} size={5} delay={0.6} dur={30} reverse />
    </div>
  );
}
function Orb({
  r,
  size = 6,
  delay = 0,
  dur = 18,
  reverse = false,
}: {
  r: number;
  size?: number;
  delay?: number;
  dur?: number;
  reverse?: boolean;
}) {
  return (
    <motion.div
      className="absolute"
      style={{ width: 0, height: 0 }}
      initial={{ rotate: 0 }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ delay, duration: dur, ease: "linear", repeat: 999999 }}
    >
      <div
        className="absolute rounded-full"
        style={{
          left: r,
          width: size,
          height: size,
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(99,102,241,0.6))",
          boxShadow: "0 0 12px rgba(99,102,241,0.55)",
          filter: "blur(0.2px)",
        }}
      />
    </motion.div>
  );
}

/** Slow drifting prism-like shards for depth and sparkle */
function FloatingHoloShards() {
  const shards = [
    { x: "12%", y: "28%", w: 22, h: 32, delay: 0.2, dur: 12 },
    { x: "78%", y: "22%", w: 18, h: 28, delay: 0.8, dur: 14 },
    { x: "18%", y: "70%", w: 26, h: 36, delay: 1.1, dur: 16 },
    { x: "68%", y: "64%", w: 20, h: 30, delay: 0.4, dur: 13 },
  ] as const;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {shards.map((s, i) => (
        <HoloShard key={i} {...s} />
      ))}
    </div>
  );
}
function HoloShard({
  x,
  y,
  w,
  h,
  delay = 0,
  dur = 14,
}: {
  x: string;
  y: string;
  w: number;
  h: number;
  delay?: number;
  dur?: number;
}) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y, width: w, height: h }}
      initial={{ y: 0, rotate: 0, opacity: 0.55 }}
      animate={{ y: [-8, 8, -8], rotate: [0, 12, 0], opacity: [0.55, 0.9, 0.55] }}
      transition={{ delay, duration: dur, ease: "easeInOut", repeat: 999999 }}
    >
      {/* slanted prism via linear gradients */}
      <div
        className="w-full h-full rounded-[6px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(165,180,252,0.35), rgba(103,232,249,0.35) 60%, rgba(240,171,252,0.35))",
          boxShadow:
            "0 0 10px rgba(99,102,241,0.35), inset 0 0 12px rgba(255,255,255,0.15)",
          transform: "skewY(-8deg) rotate(-6deg)",
        }}
      />
      <div className="absolute -inset-2 blur-lg rounded-[10px] bg-cyan-300/14" />
    </motion.div>
  );
}

/* ------------------------ Background Layers ------------------------ */

function AuroraLayer() {
  return (
    <>
      <motion.div
        className="absolute -inset-24"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 10%, rgba(99,102,241,.45), transparent 60%)," +
            "radial-gradient(70% 55% at 80% 20%, rgba(56,189,248,.36), transparent 60%)," +
            "radial-gradient(45% 45% at 50% 85%, rgba(217,70,239,.35), transparent 60%)",
          filter: "blur(44px)",
        }}
        animate={{ opacity: [0.6, 0.95, 0.65], scale: [1, 1.05, 1] }}
        transition={{ duration: 9, ease: "easeInOut", repeat: 999999 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(70% 60% at 50% 100%, rgba(0,0,0,.50), transparent)" }}
        aria-hidden
      />
    </>
  );
}

function Starfield({ count = 120 }: { count?: number }) {
  const stars = React.useMemo(() => Array.from({ length: count }).map((_, i) => i), [count]);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((i) => (
        <Star key={i} idx={i} />
      ))}
    </div>
  );
}
function Star({ idx }: { idx: number }) {
  const x = (idx * 73) % 100;
  const y = (idx * 37) % 100;
  const size = 1 + ((idx * 13) % 2);
  const delay = (idx % 24) * 0.15;
  const dur = 4 + ((idx * 7) % 6);
  return (
    <motion.span
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: "rgba(255,255,255,0.9)",
        boxShadow: "0 0 6px rgba(255,255,255,0.35)",
      }}
      initial={{ opacity: 0.0 }}
      animate={{ opacity: [0.1, 0.9, 0.2] }}
      transition={{ delay, duration: dur, ease: "easeInOut", repeat: 999999 }}
    />
  );
}

function GridFloor() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46vh]">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.18) 1px, transparent 1px)",
          backgroundSize: "44px 44px, 44px 44px",
          backgroundPosition: "center",
          maskImage: "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0))",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0))",
          transform: "perspective(900px) rotateX(60deg) translateY(12vh)",
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(60% 40% at 50% 100%, rgba(99,102,241,0.20), transparent 60%)" }}
        animate={{ opacity: [0.3, 0.55, 0.35] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: 999999 }}
      />
    </div>
  );
}
