// src/components/TutorialOverlay.tsx
import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ChevronRight, ChevronLeft } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                             Import your assets                              */
/*  If you keep files in src/assets, import them.                              */
/*  If you prefer public/assets, you can revert to "/assets/..." paths.       */
/* -------------------------------------------------------------------------- */
import tutorial1Img from "../assets/tutorial1.png";
import tutorial2Img from "../assets/tutorial2.png";
import tutorial3Img from "../assets/tutorial2.png";

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
    title: "Simple can become legendary. ✨",
    caption:
      "Iconic early NFTs proved that a moment can turn into history. Start bold—hesitation is the only myth.",
    media: { type: "image", src: tutorial1Img, alt: "Myth breaking orb and shards" },
    from: "from-amber-400/25",
    to: "to-rose-400/20",
  },
  {
    title: "YearnTogether opens the doors. 🔓",
    caption:
      "One pass. Many worlds. Access today—potential for tomorrow. Your journey scales with our growing ecosystem.",
    // Was incorrectly typed as "video" with a PNG. Make it an image.
    media: { type: "image", src: tutorial2Img, alt: "Opening portals and rings" },
    from: "from-indigo-500/25",
    to: "to-cyan-400/20",
  },
  {
    title: "You’re in the right place. 🌱",
    caption:
      "Thanks for choosing Yearn NFTs. You belong here. Let’s grow together—community first, momentum always.",
    media: { type: "image", src: tutorial3Img, alt: "Crown with radiant flare" },
    from: "from-emerald-400/25",
    to: "to-teal-400/20",
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

  // parallax
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotX = useTransform(my, [0, 1], [10, -10]);
  const rotY = useTransform(mx, [0, 1], [-10, 10]);
  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
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
          className="fixed inset-0 z-[80] bg-[radial-gradient(120%_120%_at_80%_10%,#0b0f17_0%,#05070c_55%,#000_100%)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <BackgroundFX />

          <div className="relative mx-auto max-w-6xl h-full px-4 py-8 sm:py-12 grid grid-rows-[auto,1fr,auto] gap-4">
            {/* top bar */}
            <div className="flex items-center justify-between">
              <div className="text-white/80 text-sm tracking-wide">Onboarding</div>
              <button
                onClick={onDone}
                className="rounded-lg px-3 py-2 text-sm bg-white/10 hover:bg-white/15 ring-1 ring-white/15 text-white"
              >
                Skip
              </button>
            </div>

            {/* center stage */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.25fr,0.9fr] gap-8 items-center">
              {/* Visual hero */}
              <motion.div
                onMouseMove={onMove as any}
                onTouchMove={onMove as any}
                className="relative aspect-[16/10] lg:aspect-[16/9] rounded-3xl overflow-hidden ring-1 ring-white/10 bg-[#0b0f17]/70"
                style={{ perspective: 1200 }}
              >
                <StarField />

                <motion.div
                  className="absolute inset-4 rounded-[26px] ring-1 ring-white/10 bg-gradient-to-br from-white/[.05] to-white/[.02] shadow-2xl"
                  style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" as any }}
                >
                  {/* dynamic glow following pointer */}
                  <motion.div
                    className="absolute -inset-10 rounded-[2rem] opacity-60 blur-3xl"
                    style={{
                      background:
                        "radial-gradient(520px circle at var(--gx) var(--gy), rgba(99,102,241,.22), transparent 60%)",
                      // @ts-ignore
                      "--gx": glowX,
                      "--gy": glowY,
                    }}
                  />
                  <div className="absolute inset-0 grid place-items-center">
                    <MediaHero media={slide.media} />
                  </div>
                </motion.div>

                {/* color wash + vignette */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${slide.from} ${slide.to}`} />
                <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(80%_80%_at_50%_120%,rgba(0,0,0,.6),transparent)]" />
              </motion.div>

              {/* Minimal micro-copy */}
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
              >
                <h2 className="text-white font-semibold text-3xl md:text-4xl leading-tight">
                  {slide.title}
                </h2>
                {slide.caption && <p className="mt-3 text-white/85 text-lg">{slide.caption}</p>}

                {/* Controls */}
                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prev}
                      disabled={idx === 0}
                      className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 ring-1 ring-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={next}
                      className="rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 ring-1 ring-white/15"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <Dots total={total} active={idx} onClick={go} />

                  <button
                    onClick={next}
                    className="rounded-xl px-6 py-3 text-sm md:text-base font-semibold bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20"
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
        className="w-[92%] h-auto rounded-2xl object-contain shadow-[0_40px_140px_rgba(0,0,0,.45)]"
        initial={{ scale: 0.96, opacity: 0 }}
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
      className="w-[92%] h-auto rounded-2xl object-contain shadow-[0_40px_140px_rgba(0,0,0,.45)]"
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      // Optional: quick inline fallback
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
