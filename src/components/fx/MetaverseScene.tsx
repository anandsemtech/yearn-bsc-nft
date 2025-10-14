import React from "react";

/** Pure CSS/Tailwind animated scene (no assets) */
const MetaverseScene: React.FC<{ title?: string }> = ({ title }) => {
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0d14]">
      <div className="absolute inset-0 bg-holo-mesh pointer-events-none" />
      <div className="absolute inset-0 mv-starfield animate-pulse-soft" />
      <div className="mv-sun animate-glow-pulse" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative">
          <div className="mv-ring rounded-full w-[520px] h-[520px] animate-spin-rev" />
          <div className="mv-ring rounded-full w-[380px] h-[380px] absolute inset-0 m-auto animate-spin" />
          <div className="mv-ring rounded-full w-[260px] h-[260px] absolute inset-0 m-auto animate-spin-rev" />
          <div className="mv-ring rounded-full w-[160px] h-[160px] absolute inset-0 m-auto animate-spin" />
        </div>
      </div>
      <div className="absolute inset-0">
        <div className="mv-orb absolute left-[12%] top-[24%] w-10 h-10 rounded-full blur-[1px] animate-[float1_7s_ease-in-out_infinite]" />
        <div className="mv-orb absolute right-[16%] top-[36%] w-6 h-6 rounded-full blur-[1px] animate-[float2_6s_ease-in-out_infinite]" />
        <div className="mv-orb absolute left-[28%] bottom-[14%] w-8 h-8 rounded-full blur-[1px] animate-[float3_8s_ease-in-out_infinite]" />
      </div>
      <div className="mv-floor" />
      {title && (
        <div className="absolute left-0 right-0 bottom-4 text-center">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-white/10 text-white/90 ring-1 ring-white/15">
            {title}
          </span>
        </div>
      )}
      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-6px,-10px)} }
        @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(8px,-8px)} }
      `}</style>
    </div>
  );
};

export default MetaverseScene;
