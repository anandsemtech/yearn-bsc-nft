import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cpu } from "lucide-react";
import MetaverseScene from "./fx/MetaverseScene";
import { OrbitRings } from "./fx/HoloPrimitives";
import Logo from "../assets/logo.svg";

/**
 * AppLoader (Mobile-stable)
 * - True 3D via MetaverseScene
 * - Centered with h-svh + translate to avoid mobile URL bar drift
 * - Orbit/satellite animations use transforms only (GPU-friendly)
 * - Filters reduced on small screens to prevent jitter
 */

const RING_SIZE = 164;
const RING_STROKE = 7;

export default function AppLoader({
  show,
  onDone,
  durationMs = 2600,
}: {
  show: boolean;
  onDone?: () => void;
  durationMs?: number;
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
      const eased = 1 - Math.pow(1 - pct, 3);
      setProgress(Math.floor(eased * 100));
      if (pct < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => onDone?.(), 120);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, durationMs, onDone]);

  // Lock scroll
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
          className="fixed inset-0 z-[9999] text-white w-screen h-svh" // << mobile-safe height
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-live="polite"
          aria-busy={true}
          role="alert"
        >
          {/* Base veil (lighter blur on mobile) */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-lg md:backdrop-blur-xl" />

          {/* Real 3D scene */}
          <div className="absolute inset-0 z-0">
            <MetaverseScene />
            {/* Very light veil; avoid heavy filter on mobile */}
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(70% 60% at 50% 100%, rgba(0,0,0,0.45), transparent), " +
                  "radial-gradient(55% 55% at 50% 50%, rgba(255,255,255,0.05), transparent 70%)",
              }}
              animate={{ opacity: [0.45, 0.65, 0.45] }}
              transition={{ duration: 7.5, ease: "easeInOut", repeat: 999999 }}
            />
          </div>

          {/* Metaverse extras (GPU-friendly) */}
          <PortalRing />
          <OrbitingSatellites />
          <FloatingHoloShards />

          {/* Subtle layers */}
          <AuroraLayer />
          <Starfield />
          <GridFloor />

          {/* === Absolute center stack (never drifts) === */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
            <motion.div
              className="relative"
              initial={{ scale: 0.94, opacity: 0.0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 4 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              {/* Soft halo (no filter) */}
              <div className="pointer-events-none absolute -inset-16">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(40% 40% at 50% 50%, rgba(99,102,241,0.28), transparent 65%)",
                  }}
                />
              </div>
              <div className="absolute inset-0 -translate-y-2 scale-110">
                <OrbitRings />
              </div>

              {/* Progress ring */}
              <ProgressRing size={RING_SIZE} stroke={RING_STROKE} value={progress} />

              {/* Centered logo inside ring */}
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <img
                  src={Logo}
                  alt="Logo"
                  draggable={false}
                  className="opacity-95"
                  style={{
                    width: Math.floor(RING_SIZE - 56),
                    height: "auto",
                  }}
                />
              </div>

              {/* Chips */}
              <div className="absolute inset-x-0 -bottom-14 flex items-center justify-center gap-2 text-[10px]">
                <Chip>AI</Chip>
                <Chip>Metaverse</Chip>
                <Chip>NFT</Chip>
                <Chip>Blockchain</Chip>
              </div>
            </motion.div>

            {/* Status line (anchored to center stack) */}
            <motion.div
              className="mt-24 md:mt-28 mx-auto flex items-center justify-center gap-2 text-xs text-white/85"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              transition={{ duration: 0.6 }}
            >
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
              <span>Synchronizing nodes… {progress}%</span>
            </motion.div>
          </div>

          {/* Mobile-specific perf tuning */}
          <style>{`
            @media (max-width: 480px) {
              /* Avoid expensive large blurs on tiny screens */
              .avoid-heavy-blur { filter: none !important; backdrop-filter: none !important; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- UI atoms ---------- */

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
}: { size?: number; stroke?: number; value?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;

  return (
    <svg width={size} height={size}>
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="50%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#f0abfc" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#ring)" opacity="0.20" strokeWidth={stroke}/>
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#ring)"
        strokeLinecap="round" strokeWidth={stroke} strokeDasharray={`${dash} ${c - dash}`}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      <circle cx={size/2} cy={size/2} r={r - 18} fill="rgba(7,10,17,0.65)" />
    </svg>
  );
}

/* ---------- Extra Metaverse Elements (mobile-jank safe) ---------- */

/** Soft portal ring using vector strokes; transform-only rotation */
function PortalRing() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
      <motion.div
        initial={{ scale: 0.96, opacity: 0.4, rotate: 0 }}
        animate={{ scale: 1, opacity: 0.55, rotate: 360 }}
        transition={{ duration: 42, ease: "linear", repeat: 999999 }}
        className="w-[64vmin] h-[64vmin]"
      >
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <defs>
            <linearGradient id="portal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(165,180,252,0.8)" />
              <stop offset="50%" stopColor="rgba(103,232,249,0.85)" />
              <stop offset="100%" stopColor="rgba(240,171,252,0.8)" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="82" fill="none" stroke="url(#portal)" strokeWidth="1.3" strokeOpacity="0.9" />
          <circle cx="100" cy="100" r="70" fill="none" stroke="url(#portal)" strokeWidth="0.9" strokeOpacity="0.45" />
        </svg>
      </motion.div>
    </div>
  );
}

/** Orbs that orbit using translateX(radius) instead of left: radius (no layout thrash) */
function OrbitingSatellites() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
      <Orb r={120} size={8} delay={0.0} dur={18} />
      <Orb r={160} size={6} delay={0.6} dur={24} />
      <Orb r={200} size={7} delay={1.2} dur={30} reverse />
    </div>
  );
}
function Orb({
  r, size = 6, delay = 0, dur = 18, reverse = false,
}: { r: number; size?: number; delay?: number; dur?: number; reverse?: boolean }) {
  return (
    <motion.div
      className="absolute"
      initial={{ rotate: 0 }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ delay, duration: dur, ease: "linear", repeat: 999999 }}
      style={{ width: 0, height: 0 }}
    >
      <div
        className="absolute rounded-full"
        style={{
          transform: `translateX(${r}px)`,
          width: size, height: size,
          background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(99,102,241,0.6))",
          boxShadow: "0 0 10px rgba(99,102,241,0.45)",
        }}
      />
    </motion.div>
  );
}

/** Slow drifting shards; transform-only translate/rotate */
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
        <motion.div
          key={i}
          className="absolute"
          style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
          initial={{ y: 0, rotate: 0, opacity: 0.55 }}
          animate={{ y: [-8, 8, -8], rotate: [0, 12, 0], opacity: [0.55, 0.9, 0.55] }}
          transition={{ delay: s.delay, duration: s.dur, ease: "easeInOut", repeat: 999999 }}
        >
          <div
            className="w-full h-full rounded-[6px]"
            style={{
              background: "linear-gradient(135deg, rgba(165,180,252,0.35), rgba(103,232,249,0.35) 60%, rgba(240,171,252,0.35))",
              boxShadow: "0 0 10px rgba(99,102,241,0.35), inset 0 0 12px rgba(255,255,255,0.15)",
              transform: "skewY(-8deg) rotate(-6deg)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Background layers ---------- */

function AuroraLayer() {
  return (
    <>
      <motion.div
        className="absolute -inset-24"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 10%, rgba(99,102,241,.40), transparent 60%)," +
            "radial-gradient(70% 55% at 80% 20%, rgba(56,189,248,.32), transparent 60%)," +
            "radial-gradient(45% 45% at 50% 85%, rgba(217,70,239,.30), transparent 60%)",
        }}
        animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.03, 1] }}
        transition={{ duration: 9, ease: "easeInOut", repeat: 999999 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(70% 60% at 50% 100%, rgba(0,0,0,.45), transparent)" }}
        aria-hidden
      />
    </>
  );
}

function Starfield({ count = 90 }: { count?: number }) {
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
        animate={{ opacity: [0.28, 0.5, 0.3] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: 999999 }}
      />
    </div>
  );
}
