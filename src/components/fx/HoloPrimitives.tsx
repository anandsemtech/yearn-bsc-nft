// components/fx/HoloPrimitives.tsx
import React from "react";
import { motion, useMotionTemplate, useMotionValue, useTransform } from "framer-motion";

export const useTilt3D = () => {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useTransform(y, [0, 1], [12, -12]);
  const rotateY = useTransform(x, [0, 1], [-12, 12]);
  const depth = useTransform(x, (v) => 24 + v * 12);

  const onMove = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width);
    y.set((e.clientY - r.top) / r.height);
  };
  return { x, y, rotateX, rotateY, depth, onMove };
};

export const CursorGlow: React.FC<{ x: any; y: any; blur?: number; radius?: number; className?: string }> = ({
  x,
  y,
  blur = 18,
  radius = 700,
  className,
}) => {
  const bg = useMotionTemplate`radial-gradient(${radius}px circle at ${x * 100}% ${y * 100}%,
    rgba(244,114,182,.35), rgba(56,189,248,.28) 35%, rgba(99,102,241,.22) 60% , transparent 70%)`;
  return (
    <motion.div
      aria-hidden
      className={`absolute inset-0 rounded-[inherit] pointer-events-none ${className || ""}`}
      style={{ backgroundImage: bg, filter: `blur(${blur}px)` }}
    />
  );
};

export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.2 }) => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 mix-blend-soft-light"
    style={{
      opacity,
      background:
        "repeating-linear-gradient(transparent 0, transparent 2px, rgba(255,255,255,.08) 3px, transparent 4px)",
    }}
  />
);

export const OrbitRings: React.FC<{ layers?: number }> = ({ layers = 3 }) => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div className="relative h-[120%] w-[120%]">
      {Array.from({ length: layers }).map((_, i) => (
        <div
          key={i}
          className={`absolute inset-${i * 2} rounded-full border blur-[3px]`}
          style={{
            borderColor: ["#f0abfc55", "#67e8f955", "#818cf855"][i % 3],
            animation: `${i % 2 === 0 ? "spin" : "spin-rev"} ${18 + i * 8}s linear infinite`,
          }}
        />
      ))}
    </div>
  </div>
);

export const GradientMesh: React.FC<{ intensity?: number }> = ({ intensity = 0.12 }) => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0"
    style={{
      background:
        `radial-gradient(900px 600px at -10% -60%, rgba(56,189,248,${intensity}), transparent),
         radial-gradient(800px 500px at 110% 160%, rgba(244,114,182,${intensity}), transparent)`,
    }}
  />
);

export const Sparkles: React.FC<{ count?: number; area?: { w: number; h: number } }> = ({
  count = 14,
  area = { w: 320, h: 200 },
}) => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    {Array.from({ length: count }).map((_, i) => (
      <motion.span
        key={i}
        className="absolute h-1 w-1 rounded-full bg-white"
        initial={{
          opacity: 0,
          scale: 0,
          x: Math.random() * area.w,
          y: area.h - Math.random() * 20,
        }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0, 1, 0],
          y: [-20, -80 - Math.random() * 80, -120],
        }}
        transition={{ duration: 2.5 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 1.5 }}
        style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,.7))" }}
      />
    ))}
  </div>
);

type HoloCardProps = React.HTMLAttributes<HTMLDivElement> & { depth?: number };
export const HoloCard: React.FC<HoloCardProps> = ({ children, className = "", depth = 16, ...props }) => (
  <div className={`relative rounded-3xl p-[1.5px] bg-white/10 ring-1 ring-white/10 backdrop-blur-xl ${className}`} {...props}>
    <div
      className="absolute -inset-[1.5px] rounded-3xl pointer-events-none opacity-60 blur-md"
      style={{ background: "linear-gradient(90deg, #f0abfc, #67e8f9, #818cf8)" }}
    />
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.03]"
      style={{ transform: `translateZ(${depth}px)` }}
    >
      {children}
    </div>
  </div>
);

type NeonButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { activeGradient?: string };
export const NeonButton: React.FC<NeonButtonProps> = ({ className = "", activeGradient, children, ...props }) => (
  <button
    {...props}
    className={`relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold tracking-wide focus:outline-none ring-1 ring-white/10 ${className}`}
  >
    <span
      aria-hidden
      className="absolute -inset-[1px] rounded-xl opacity-70 blur-md"
      style={{
        background: activeGradient || "linear-gradient(90deg, #f0abfc, #67e8f9, #818cf8)",
      }}
    />
    <span className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-indigo-500 text-black">
      {children}
    </span>
  </button>
);
