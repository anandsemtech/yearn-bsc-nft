import React from "react";
import { AnimatePresence } from "framer-motion";
import { Cpu } from "lucide-react";
import Logo from "../assets/logo.svg";

/* Video assets */
import BotVideo from "../assets/BotVideoAnimation.webm";
import BotPoster from "../assets/BotVideoPosterBlur.jpg";

/**
 * AppLoader — Logo + Caption + Video + Tags + Linear Progress
 */

type Props = {
  show: boolean;
  onDone?: () => void;
  durationMs?: number;
  version?: string;
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    q.addEventListener?.("change", fn);
    return () => q.removeEventListener?.("change", fn);
  }, []);
  return reduced;
};

export default function AppLoader({ show, onDone, durationMs = 2600, version }: Props) {
  const [progress, setProgress] = React.useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const resolvedVersion =
    version ??
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_VERSION) ??
    (typeof process !== "undefined" && (process as any).env?.REACT_APP_VERSION) ??
    "v0.0.0";

  // Progress timeline
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

  // Lock scroll while loader shown
  React.useEffect(() => {
    if (!show) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [show]);

  const shouldAutoplay = show && !reducedMotion;

  return (
    <AnimatePresence>
      {show && (
        <div
          key="app-loader"
          className="fixed inset-0 z-[9999] text-white"
          aria-live="polite"
          aria-busy={true}
          role="alert"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-[#070a11]" />
          {!reducedMotion && <Starfield count={120} />}

          {/* Low-poly universe */}
          {!reducedMotion && (
            <>
              <LowPolyGround />
              <LowPolyPlanets />
              <Astronaut />
              <Rocket />
            </>
          )}

          {/* ── Layout column ───────────────────────────────────────────── */}
          <div className="absolute inset-0 flex flex-col items-center">
            {/* Top header: Logo + Caption */}
            <div className="w-full pt-6 md:pt-8 px-4 flex flex-col items-center gap-3 text-center">
              <img
                src={Logo}
                alt="YearnTogether"
                className="w-[120px] md:w-[140px] h-auto drop-shadow"
                draggable={false}
              />
              <div className="font-orbitron leading-tight text-white/90">
                <p className="text-[12px] md:text-sm tracking-wide">
                  <span className="font-semibold text-white">Buy Yearn NFT.</span>
                </p>
                <p className="text-[12px] md:text-sm tracking-wide">Unlock unlimited Potentials</p>
              </div>
            </div>

            {/* Center: Video */}
            <div className="flex-1 w-full px-4 flex items-center justify-center">
              <div className="relative">
                <VideoCore playing={shouldAutoplay} />
                {/* subtle static halo */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ boxShadow: "0 0 60px 18px rgba(99,102,241,0.25)" }}
                />
              </div>
            </div>

            {/* Tags */}
            {!reducedMotion && (
              <div className="w-full px-4 mt-4 flex flex-wrap items-center justify-center gap-8 md:gap-6">
                <Chip>AI</Chip>
                <Chip>Metaverse</Chip>
                <Chip>NFT</Chip>
                <Chip>Blockchain</Chip>
              </div>
            )}

            {/* Progress (bar + text) */}
            <div className="w-full max-w-[560px] px-6 mt-4 mb-8 flex flex-col items-center gap-2">
              <ProgressBar value={progress} />
              <div className="text-xs md:text-sm text-white/85 leading-none flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" />
                <span>Synchronizing nodes… {progress}%</span>
              </div>
            </div>
          </div>

          {/* Version badge */}
          <div
            className="version-badge"
            aria-label={`App version ${resolvedVersion}`}
            data-version={resolvedVersion}
            title={`Version ${resolvedVersion}`}
          >
            {resolvedVersion}
          </div>

          {/* Scoped CSS */}
          <style>{css}</style>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── Video Core (WEBM teaser + poster) ───────────────────────── */

function VideoCore({ playing }: { playing: boolean }) {
  return (
    <div className="relative w-[260px] h-[260px] md:w-[320px] md:h-[320px]">
      {/* Glow behind */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: "0 0 60px 20px rgba(99,102,241,0.25)" }}
        aria-hidden
      />

      {/* Poster (blurred fallback image) */}
      <img
        src={BotPoster}
        alt=""
        className="absolute inset-0 w-full h-full object-cover rounded-full opacity-80"
        draggable={false}
      />

      {/* WebM video (autoplay unless reduced-motion) */}
      <video
        className="absolute inset-0 w-full h-full object-cover rounded-full"
        src={BotVideo}
        poster={BotPoster}
        muted
        loop
        playsInline
        preload="auto"
        autoPlay={playing}
      />

      {/* Glass ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow:
            "inset 0 0 0 2px rgba(255,255,255,0.06), inset 0 0 40px rgba(255,255,255,0.08)",
          background:
            "radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,0.08), transparent)",
        }}
        aria-hidden
      />
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

function ProgressBar({ value = 0 }: { value?: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      <div className="h-2.5 w-full rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/10 overflow-hidden">
        <div
          className="h-full progress-fill"
          style={{ width: `${pct}%` }}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          role="progressbar"
        />
      </div>
    </div>
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
/* Orbitron/Audiowide utility (fallback to system) */
.font-orbitron { font-family: 'Orbitron','Audiowide',system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif; }

/* stars */
.star { background: rgba(255,255,255,0.9); box-shadow: 0 0 6px rgba(255,255,255,0.35); opacity: .15; animation: starTwinkle 5s ease-in-out infinite; }
@keyframes starTwinkle { 0%{opacity:.15} 50%{opacity:.9} 100%{opacity:.2} }

/* surroundings drift */
.lp-planet { animation: lpDrift 26s ease-in-out infinite; transform-origin: center; }
@keyframes lpDrift { 0%{transform:translateY(0)} 50%{transform:translateY(-1.5px)} 100%{transform:translateY(0)} }
.astro-float { animation: floatY 6s ease-in-out infinite; }
.rocket-float { animation: floatY 5.5s ease-in-out infinite; }
@keyframes floatY { 0%{transform:translateY(0)} 50%{transform:translateY(-8px)} 100%{transform:translateY(0)} }

/* progress bar fill */
.progress-fill {
  background: linear-gradient(90deg, #a5b4fc, #67e8f9, #f0abfc);
  box-shadow: 0 0 18px rgba(99,102,241,0.35);
}

/* chip polish */
span.rounded-full.bg-white\\/8 {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  backdrop-filter: blur(6px);
  padding: 6px 10px;
  border-radius: 999px;
}

/* Version badge */
.version-badge {
  position: fixed;
  left: 12px;
  bottom: 12px;
  z-index: 10000;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  letter-spacing: 0.3px;
  color: rgba(255,255,255,0.85);
  background: linear-gradient(180deg, rgba(17,24,39,0.75), rgba(7,10,17,0.75));
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(148,163,184,0.22);
  backdrop-filter: blur(6px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.25), inset 0 0 12px rgba(99,102,241,0.15);
  pointer-events: none;
}

/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  .star, .lp-planet, .astro-float, .rocket-float { animation: none !important; }
}
`;
