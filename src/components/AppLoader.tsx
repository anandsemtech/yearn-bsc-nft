import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cpu } from "lucide-react";
import Logo from "../assets/logo.svg";

/**
 * AppLoader — robust, mobile-stable, production-ready
 * - Fixed inset container + flex center => never drifts with browser chrome
 * - All continuous animations via CSS keyframes (GPU transforms only)
 * - Lightweight metaverse look: orbit rings + satellites + starfield
 * - No heavy blur/backdrop-filter; zero layout thrash
 *
 * Usage:
 * <AppLoader show={loading} onDone={() => setLoading(false)} durationMs={2600} />
 */

type Props = {
  show: boolean;
  onDone?: () => void;
  durationMs?: number; // default 2600
};

const RING_SIZE = 164; // px
const RING_STROKE = 7; // px

export default function AppLoader({ show, onDone, durationMs = 2600 }: Props) {
  const [progress, setProgress] = React.useState(0);

  // JS timeline -> progress % then call onDone()
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
      else onDone && setTimeout(onDone, 120);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, durationMs, onDone]);

  // Disable scroll while visible
  React.useEffect(() => {
    if (!show) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
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
          {/* Background: starfield + soft vignette */}
          <div className="absolute inset-0 bg-[#070a11]">
            <Starfield count={110} />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(70% 60% at 50% 100%, rgba(0,0,0,0.55), transparent), radial-gradient(60% 50% at 50% 50%, rgba(255,255,255,0.05), transparent 70%)",
              }}
            />
          </div>

          {/* Center stack — always perfectly centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Concentric orbit rings (CSS rotate) */}
              <div className="pointer-events-none absolute -inset-[22vmin]">
                <div className="orbit-ring orbit-ring--lg" />
                <div className="orbit-ring orbit-ring--md" />
                <div className="orbit-ring orbit-ring--sm" />
              </div>

              {/* Satellites (translateX in rotating wrapper) */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="satellite-track sat-1">
                  <span className="satellite-dot" />
                </div>
                <div className="satellite-track sat-2">
                  <span className="satellite-dot" />
                </div>
                <div className="satellite-track sat-3">
                  <span className="satellite-dot" />
                </div>
              </div>

              {/* Progress ring (SVG) */}
              <ProgressRing size={RING_SIZE} stroke={RING_STROKE} value={progress} />

              {/* Logo inside the ring */}
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <img
                  src={Logo}
                  alt="Logo"
                  draggable={false}
                  style={{
                    width: Math.floor(RING_SIZE - 56),
                    height: "auto",
                    opacity: 0.95,
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
            </div>
          </div>

          {/* Status line (centered block below ring) */}
          <div className="absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[calc(50%+72px)]">
            <div className="mx-auto flex items-center justify-center gap-2 text-xs text-white/85">
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
              <span>Synchronizing nodes… {progress}%</span>
            </div>
          </div>

          {/* Keyframes + minimal CSS (scoped) */}
          <style>{css}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Atoms ---------- */

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
    <svg width={size} height={size} style={{ filter: "drop-shadow(0 10px 30px rgba(99,102,241,0.35))" }}>
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="50%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#f0abfc" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring)" opacity="0.20" strokeWidth={stroke} />
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
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      <circle cx={size / 2} cy={size / 2} r={r - 18} fill="rgba(7,10,17,0.65)" />
    </svg>
  );
}

/* ---------- Background: Starfield (transform-only) ---------- */

function Starfield({ count = 110 }: { count?: number }) {
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
    <span
      className="absolute rounded-full star"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        animationDelay: `${delay}s`,
        animationDuration: `${dur}s`,
      }}
    />
  );
}

/* ---------- Scoped CSS (safe across browsers) ---------- */

const css = `
/* soft twinkle */
.star {
  background: rgba(255,255,255,0.9);
  box-shadow: 0 0 6px rgba(255,255,255,0.35);
  opacity: 0.15;
  animation-name: starTwinkle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
@keyframes starTwinkle {
  0% { opacity: 0.15; transform: translateZ(0); }
  50% { opacity: 0.9; transform: translateY(-0.5px); }
  100% { opacity: 0.2; transform: translateZ(0); }
}

/* Orbit rings (vector strokes via borders) */
.orbit-ring {
  position: absolute;
  inset: 0;
  margin: auto;
  border-radius: 9999px;
  border: 1px solid rgba(147,197,253,0.2);
  animation: orbitRotate 40s linear infinite;
  box-shadow:
    0 0 0 1px rgba(99,102,241,0.06) inset,
    0 0 32px rgba(99,102,241,0.15);
}
.orbit-ring--lg { width: 68vmin; height: 68vmin; }
.orbit-ring--md { width: 48vmin; height: 48vmin; animation-duration: 52s; }
.orbit-ring--sm { width: 32vmin; height: 32vmin; animation-duration: 64s; }

@keyframes orbitRotate {
  from { transform: rotate(0deg) translateZ(0); }
  to   { transform: rotate(360deg) translateZ(0); }
}

/* Satellite tracks use rotate wrapper + translateX on child */
.satellite-track {
  position: absolute;
  width: 0; height: 0;
  animation: satRotate 24s linear infinite;
}
.satellite-track.sat-2 { animation-duration: 30s; }
.satellite-track.sat-3 { animation-duration: 36s; }
@keyframes satRotate {
  from { transform: rotate(0deg) translateZ(0); }
  to   { transform: rotate(360deg) translateZ(0); }
}
.satellite-dot {
  position: absolute;
  left: 0; top: 0;
  transform: translateX(120px); /* radius; overridden per track via scale */
  width: 10px; height: 10px; border-radius: 9999px;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(99,102,241,0.6));
  box-shadow: 0 0 12px rgba(99,102,241,0.45);
}
.sat-2 .satellite-dot { transform: translateX(160px); width:8px; height:8px; }
.sat-3 .satellite-dot { transform: translateX(200px); width:9px; height:9px; }

/* Reduce motion preference */
@media (prefers-reduced-motion: reduce) {
  .orbit-ring, .satellite-track, .star { animation: none !important; }
}
`;

