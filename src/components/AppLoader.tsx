import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cpu } from "lucide-react";
import Logo from "../assets/logo.svg";

/**
 * AppLoader — Metaverse Core (wow center) + Low-poly Universe
 * - Center: holo eye rings + radial ticks + hexgrid + scanlines + NFT diamond + orbiting nodes + particle swirl
 * - Surroundings: low-poly terrain, planets, astronaut, rocket, starfield
 * - Pure CSS/SVG animations (transform/opacity only). Mobile-safe, jank-free.
 */

type Props = {
  show: boolean;
  onDone?: () => void;
  durationMs?: number;
};

const RING_SIZE = 164;
const RING_STROKE = 7;

export default function AppLoader({ show, onDone, durationMs = 2600 }: Props) {
  const [progress, setProgress] = React.useState(0);

  // progress timeline
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
      else onDone && setTimeout(onDone, 120);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [show, durationMs, onDone]);

  // lock scroll
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
          {/* Deep space + stars */}
          <div className="absolute inset-0 bg-[#070a11]" />
          <Starfield count={120} />

          {/* Low-poly universe */}
          <LowPolyGround />
          <LowPolyPlanets />
          <Astronaut />
          <Rocket />

          {/* Center stack */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* WOW CENTER: MetaverseCore sits *behind* the functional ring */}
              <MetaverseCore size={RING_SIZE + 72} />

              {/* Functional progress ring */}
              <ProgressRing size={RING_SIZE} stroke={RING_STROKE} value={progress} />

              {/* Brand logo inside */}
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <img
                  src={Logo}
                  alt="Logo"
                  draggable={false}
                  style={{ width: Math.floor(RING_SIZE - 56), height: "auto", opacity: 0.98 }}
                />
              </div>

              {/* Tech chips */}
              <div className="absolute inset-x-0 -bottom-14 flex items-center justify-center gap-2 text-[10px]">
                <Chip>AI</Chip>
                <Chip>Metaverse</Chip>
                <Chip>NFT</Chip>
                <Chip>Blockchain</Chip>
              </div>
            </div>
          </div>

          {/* Status line */}
          <div className="absolute left-1/2 top-1/2 translate-x-[-50%] translate-y-[calc(50%+72px)]">
            <div className="mx-auto flex items-center justify-center gap-2 text-xs text-white/85">
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
              <span>Synchronizing nodes… {progress}%</span>
            </div>
          </div>

          {/* scoped CSS */}
          <style>{css}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── Center “Metaverse Core” ───────────────────────── */

function MetaverseCore({ size = 240 }: { size?: number }) {
  const s = size;
  const half = s / 2;
  return (
    <div
      className="absolute"
      style={{ width: s, height: s, left: `calc(50% - ${half}px)`, top: `calc(50% - ${half}px)` }}
      aria-hidden
    >
      {/* Outer rotating eye rings */}
      <svg width={s} height={s} viewBox="0 0 200 200" className="core-rotate-slow">
        <defs>
          <linearGradient id="coreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="50%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#f0abfc" />
          </linearGradient>
          {/* hex grid pattern */}
          <pattern id="hex" width="8" height="6.928" patternUnits="userSpaceOnUse" patternTransform="scale(0.9)">
            <path d="M2,0 L6,0 L8,3.464 L6,6.928 L2,6.928 L0,3.464 Z" fill="none" stroke="rgba(99,102,241,0.18)" strokeWidth="0.6"/>
          </pattern>
        </defs>

        {/* Soft background glow */}
        <circle cx="100" cy="100" r="94" fill="none" stroke="url(#coreGrad)" strokeOpacity="0.12" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="78" fill="none" stroke="url(#coreGrad)" strokeOpacity="0.18" strokeWidth="0.8" />

        {/* Radial ticks */}
        <g className="core-rotate-fast" opacity="0.7" stroke="url(#coreGrad)">
          {Array.from({ length: 36 }).map((_, i) => {
            const a = (i / 36) * Math.PI * 2;
            const r1 = 86, r2 = 92;
            const x1 = 100 + Math.cos(a) * r1;
            const y1 = 100 + Math.sin(a) * r1;
            const x2 = 100 + Math.cos(a) * r2;
            const y2 = 100 + Math.sin(a) * r2;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.8" strokeOpacity="0.6" />;
          })}
        </g>

        {/* Inner hex grid + scanlines disc */}
        <g>
          <circle cx="100" cy="100" r="58" fill="url(#hex)" />
          <circle cx="100" cy="100" r="58" className="core-scanlines" />
          <circle cx="100" cy="100" r="58" fill="none" stroke="url(#coreGrad)" strokeOpacity="0.25" strokeWidth="0.8" />
        </g>

        {/* NFT diamond (holo) */}
        <g className="core-diamond">
          <polygon points="100,62 120,100 100,138 80,100" fill="url(#coreGrad)" opacity="0.85" />
          <polygon points="100,62 120,100 100,100" fill="rgba(255,255,255,0.35)" />
          <polygon points="100,62 80,100 100,100" fill="rgba(255,255,255,0.20)" />
          <polygon points="100,100 120,100 100,138" fill="rgba(0,0,0,0.25)" />
          <polygon points="100,100 80,100 100,138" fill="rgba(0,0,0,0.35)" />
        </g>

        {/* Orbiting nodes (chip / link / token) */}
        <g className="core-orbit">
          <circle cx="100" cy="100" r="72" fill="none" stroke="rgba(147,197,253,0.18)" strokeWidth="0.6"/>
          <g className="orbit-node n1">
            <circle r="4" fill="#67e8f9" />
            <rect x="-3" y="-9" width="6" height="4" rx="1" fill="#1e293b" stroke="#67e8f9" strokeWidth="0.6"/>
          </g>
          <g className="orbit-node n2">
            <circle r="4" fill="#a78bfa" />
            <path d="M-3,0 L0,-3 L3,0 L0,3 Z" fill="#1e293b" stroke="#a78bfa" strokeWidth="0.6"/>
          </g>
          <g className="orbit-node n3">
            <circle r="4" fill="#f0abfc" />
            <circle r="2" fill="#1e293b" stroke="#f0abfc" strokeWidth="0.6"/>
          </g>
        </g>

        {/* Particle spiral */}
        <g className="core-spiral">
          {Array.from({ length: 24 }).map((_, i) => {
            const t = i / 24;
            const r = 20 + t * 34;
            const a = t * Math.PI * 4;
            const x = 100 + Math.cos(a) * r;
            const y = 100 + Math.sin(a) * r;
            const op = 0.25 + 0.6 * t;
            return <circle key={i} cx={x} cy={y} r={0.9 + t * 1.1} fill="white" opacity={op} />;
          })}
        </g>
      </svg>
    </div>
  );
}

/* ───────────────────────── Utility atoms ───────────────────────── */

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
    <svg width={size} height={size} style={{ filter: "drop-shadow(0 10px 30px rgba(99,102,241,0.35))" }}>
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="50%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#f0abfc" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#ring)" opacity="0.20" strokeWidth={stroke} />
      <motion.circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke="url(#ring)" strokeLinecap="round" strokeWidth={stroke}
        strokeDasharray={`${dash} ${c - dash}`}
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      <circle cx={size/2} cy={size/2} r={r - 18} fill="rgba(7,10,17,0.65)" />
    </svg>
  );
}

/* ───────────────────────── Surroundings ───────────────────────── */

function Starfield({ count = 120 }: { count?: number }) {
  const stars = React.useMemo(() => Array.from({ length: count }).map((_, i) => i), [count]);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((i) => (
        <span
          key={i}
          className="absolute rounded-full star"
          style={{
            left: `${(i * 73) % 100}%`,
            top: `${(i * 37) % 100}%`,
            width: 1 + ((i * 13) % 2),
            height: 1 + ((i * 13) % 2),
            animationDelay: `${(i % 24) * 0.15}s`,
            animationDuration: `${4 + ((i * 7) % 6)}s`,
          }}
        />
      ))}
    </div>
  );
}

function LowPolyGround() {
  return (
    <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-[40vh] w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
      <polygon points="0,35 100,35 100,26 0,30" fill="#321b66" opacity="0.85" />
      <polygon points="0,34 18,28 33,31 55,26 70,30 100,24 100,40 0,40" fill="#3a1e78" />
      <polygon points="10,40 25,33 36,36 52,31 64,34 90,29 100,40" fill="#4a2392" opacity="0.9" />
    </svg>
  );
}

function LowPolyPlanets() {
  return (
    <svg className="pointer-events-none absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <g className="lp-planet lp-left">
        <circle cx="18" cy="22" r="8" fill="#2a1b6c" />
        <ellipse cx="18" cy="22" rx="14" ry="5" fill="none" stroke="#53e0ff" strokeOpacity="0.4" strokeWidth="0.6" />
      </g>
      <g className="lp-planet lp-right">
        <circle cx="85" cy="18" r="12" fill="#1e254f" />
      </g>
      <g className="lp-planet lp-moon">
        <circle cx="60" cy="10" r="4" fill="#2b2f5e" />
      </g>
    </svg>
  );
}

function Astronaut() {
  return (
    <div className="pointer-events-none absolute left-3 bottom-[22vh] astro-float">
      <svg width="64" height="80" viewBox="0 0 64 80" fill="none">
        <circle cx="32" cy="18" r="12" fill="#0e1530" stroke="#7dd3fc" strokeWidth="3" />
        <rect x="20" y="28" width="24" height="28" rx="6" fill="#1b2347" />
      </svg>
    </div>
  );
}

function Rocket() {
  return (
    <div className="pointer-events-none absolute right-3 bottom-[21vh] rocket-float">
      <svg width="64" height="96" viewBox="0 0 64 96" fill="none">
        <path d="M32 6 C20 24, 20 40, 32 56 C44 40, 44 24, 32 6 Z" fill="#ef476f" />
        <path d="M32 56 L24 78 L40 78 Z" fill="#fb7185" />
      </svg>
    </div>
  );
}

/* ───────────────────────── Scoped CSS ───────────────────────── */

const css = `
/* stars */
.star { background: rgba(255,255,255,0.9); box-shadow: 0 0 6px rgba(255,255,255,0.35); opacity: .15; animation: starTwinkle 5s ease-in-out infinite; }
@keyframes starTwinkle { 0%{opacity:.15} 50%{opacity:.9} 100%{opacity:.2} }

/* surroundings drift */
.lp-planet { animation: lpDrift 26s ease-in-out infinite; transform-origin: center; }
@keyframes lpDrift { 0%{transform:translateY(0)} 50%{transform:translateY(-1.5px)} 100%{transform:translateY(0)} }
.astro-float { animation: floatY 6s ease-in-out infinite; }
.rocket-float { animation: floatY 5.5s ease-in-out infinite; }
@keyframes floatY { 0%{transform:translateY(0)} 50%{transform:translateY(-8px)} 100%{transform:translateY(0)} }

/* core animations */
.core-rotate-slow { animation: coreSpin 20s linear infinite; transform-origin:center; }
.core-rotate-fast { animation: coreSpin 12s linear infinite; transform-origin:center; }
@keyframes coreSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
.core-scanlines { fill: repeating-linear-gradient( to bottom, rgba(255,255,255,0.05) 0 2px, rgba(255,255,255,0.0) 2px 5px ); opacity:.25; }
.core-diamond { animation: diamondPulse 2.4s ease-in-out infinite; transform-origin: 100px 100px; }
@keyframes diamondPulse { 0%{transform:scale(1) rotate(0deg)} 50%{transform:scale(1.06) rotate(3deg)} 100%{transform:scale(1) rotate(0deg)} }
.core-orbit { animation: orbitTurn 16s linear infinite; transform-origin:100px 100px; }
@keyframes orbitTurn { from{transform:rotate(0)} to{transform:rotate(360deg)} }
.orbit-node { transform-origin: 100px 100px; }
.orbit-node.n1 { transform: translate(100px,100px) rotate(0deg) translate(72px,0); }
.orbit-node.n2 { transform: translate(100px,100px) rotate(120deg) translate(72px,0); }
.orbit-node.n3 { transform: translate(100px,100px) rotate(240deg) translate(72px,0); }
.core-spiral { animation: spiralFade 4.8s ease-in-out infinite; transform-origin: 100px 100px; opacity:.8; }
@keyframes spiralFade { 0%,100%{opacity:.65} 50%{opacity:1} }

/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  .star, .lp-planet, .astro-float, .rocket-float, .core-rotate-slow, .core-rotate-fast, .core-diamond, .core-orbit, .core-spiral { animation: none !important; }
}
`;
