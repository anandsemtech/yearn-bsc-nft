// src/components/TutorialOverlay.tsx
import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                             Import your assets                              */
/* -------------------------------------------------------------------------- */
import yearnftVideo from "../assets/yearnft.mp4";

type Media =
  | { type: "video"; src: string; alt: string }
  | { type: "image"; src: string; alt: string };

type Slide = {
  title: string;
  caption?: string;
  media: Media;
  from: string;
  to: string;
};

const SLIDES: Slide[] = [
  {
    title: "YearnTogether opens the doors. 🔓",
    caption:
      "One pass. Many worlds. Access today—potential for tomorrow. Your journey scales with our growing ecosystem.",
    media: { type: "video", src: yearnftVideo, alt: "Opening portals and rings" },
    from: "from-indigo-500/25",
    to: "to-cyan-400/20",
  },
];

type Props = {
  open: boolean;
  onDone: () => void;
};

export default function TutorialOverlay({ open, onDone }: Props) {
  const [idx, setIdx] = React.useState(0);
  const total = SLIDES.length;
  const isLast = idx === total - 1;

  // lock scroll while open
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // keyboard nav
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key.toLowerCase() === "enter") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx]);

  const next = () => (isLast ? onDone() : setIdx((i) => Math.min(i + 1, total - 1)));
  const prev = () => setIdx((i) => Math.max(i - 1, 0));
  const go = (i: number) => setIdx(Math.min(Math.max(i, 0), total - 1));

  // responsive tilt (only on lg+)
  const isTilt = useMedia("(min-width: 1024px)");

  // parallax
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotX = useTransform(my, [0, 1], [8, -8]);
  const rotY = useTransform(mx, [0, 1], [-8, 8]);
  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isTilt) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const p = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    mx.set((p.clientX - rect.left) / rect.width);
    my.set((p.clientY - rect.top) / rect.height);
  };

  const slide = SLIDES[idx];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] bg-[radial-gradient(120%_120%_at_80%_10%,#0b0f17_0%,#05070c_55%,#000_100%)] pb-[env(safe-area-inset-bottom)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <BackgroundFX />

          {/* Wider container, mobile-safe padding */}
          <div className="relative mx-auto max-w-7xl xl:max-w-8xl h-full px-4 sm:px-6 py-8 sm:py-12 grid grid-rows-[auto,1fr,auto] gap-6">

            {/* Center stage */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.55fr,1fr] gap-8 sm:gap-10 items-center">
              {/* Visual hero — fully contained on all screens */}
              <motion.div
                onMouseMove={onMove as any}
                onTouchMove={onMove as any}
                className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden ring-1 ring-white/10 bg-[#0b0f17]/70 min-h-[240px] sm:min-h-[300px] lg:min-h-[420px]"
                style={
                  {
                    perspective: isTilt ? 1200 : 0,
                    contain: "paint",
                  } as React.CSSProperties
                }
              >
                <StarField />

                <motion.div
                  className="absolute inset-2 sm:inset-3 lg:inset-4 rounded-[22px] sm:rounded-[24px] lg:rounded-[26px] ring-1 ring-white/10 bg-gradient-to-br from-white/[.05] to-white/[.02] shadow-2xl overflow-hidden"
                  style={{
                    rotateX: isTilt ? (rotX as any) : 0,
                    rotateY: isTilt ? (rotY as any) : 0,
                    transformStyle: isTilt ? ("preserve-3d" as any) : "flat",
                    backfaceVisibility: "hidden",
                    willChange: isTilt ? "transform" : "auto",
                  }}
                >
                  {/* dynamic glow (never exceeds frame) */}
                  <motion.div
                    className="absolute inset-0 rounded-[2rem] opacity-60 blur-3xl"
                    style={
                      {
                        background:
                          "radial-gradient(520px circle at var(--gx) var(--gy), rgba(99,102,241,.22), transparent 60%)",
                        // @ts-ignore
                        "--gx": glowX,
                        "--gy": glowY,
                      } as React.CSSProperties
                    }
                  />

                  {/* Media container — pad a bit but keep inside */}
                  <div className="absolute inset-0 grid place-items-center p-2 sm:p-3 lg:p-4 overflow-hidden">
                    <MediaHero media={slide.media} />
                  </div>
                </motion.div>

                {/* color wash + vignette (also clipped by overflow-hidden) */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${slide.from} ${slide.to}`} />
                <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(80%_80%_at_50%_120%,rgba(0,0,0,.6),transparent)]" />
              </motion.div>

              {/* Copy */}
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                className="text-center lg:text-left"
              >
                <h2 className="text-white font-semibold text-3xl md:text-5xl leading-tight">
                  {slide.title}
                </h2>
                {slide.caption && (
                  <p className="mt-4 text-white/85 text-lg md:text-xl leading-relaxed">
                    {slide.caption}
                  </p>
                )}

                {/* Controls — centered on mobile */}
                <div className="mt-10 flex items-center justify-center lg:justify-start gap-4">
                  <button
                    onClick={prev}
                    disabled={idx === 0}
                    className="hidden sm:inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-white/5 hover:bg-white/10 text-white/90 ring-1 ring-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="size-4" />
                    Back
                  </button>

                  <button
                    onClick={next}
                    className="rounded-xl px-7 py-3.5 text-base font-semibold bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                  >
                    {isLast ? "Enter app" : "Continue"}
                  </button>
                </div>
              </motion.div>
            </div>

            <div />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ---------- Visual helpers ---------- */

function MediaHero({ media }: { media: Media }) {
  if (media.type === "video") {
    return (
      <motion.video
        key={media.src}
        src={media.src}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full max-w-full max-h-full rounded-xl object-contain shadow-[0_40px_140px_rgba(0,0,0,.45)]"
        initial={{ scale: 0.99, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
      />
    );
  }
  return (
    <motion.img
      key={media.src}
      src={media.src}
      alt={media.alt}
      className="w-full h-full max-w-full max-h-full rounded-xl object-contain shadow-[0_40px_140px_rgba(0,0,0,.45)]"
      initial={{ scale: 0.99, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.opacity = "0.2";
        (e.currentTarget as HTMLImageElement).alt = "Asset failed to load";
      }}
    />
  );
}

function Dots({
  total,
  active,
  onClick,
}: {
  total: number;
  active: number;
  onClick: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onClick(i)}
          aria-label={`Go to ${i + 1}`}
          className={`h-2.5 w-2.5 rounded-full ring-1 ring-white/20 transition ${
            i === active ? "bg-white/90 scale-110" : "bg-white/30 hover:bg-white/60"
          }`}
        />
      ))}
    </div>
  );
}

function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-32 -left-24 w-[42rem] h-[42rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(99,102,241,.18), transparent 70%)" }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-24 w-[46rem] h-[46rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(56,189,248,.16), transparent 70%)" }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 [background-image:repeating-linear-gradient(transparent,transparent_6px,rgba(255,255,255,0.03)_7px,transparent_8px)] opacity-[0.35]" />
    </div>
  );
}

function StarField() {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.7), transparent)," +
            "radial-gradient(1.5px 1.5px at 70% 40%, rgba(255,255,255,.7), transparent)," +
            "radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,.7), transparent)," +
            "radial-gradient(1.25px 1.25px at 80% 80%, rgba(255,255,255,.7), transparent)",
        }}
      />
      <motion.div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 30% 20%, rgba(255,255,255,.8), transparent)," +
            "radial-gradient(1.5px 1.5px at 60% 65%, rgba(255,255,255,.8), transparent)",
        }}
        animate={{ x: [-10, 10, -10], y: [7, -7, 7] }}
        transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
      />
    </div>
  );
}

/* Small utility: matchMedia hook */
function useMedia(query: string) {
  const [matches, setMatches] = React.useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [query]);
  return matches;
}
