/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.15)",
      },

      // 🪩 METAVERSE FX EXTENSIONS
      keyframes: {
        spin: { to: { transform: "rotate(360deg)" } },
        "spin-rev": { to: { transform: "rotate(-360deg)" } },
        "pulse-soft": { "0%,100%": { opacity: ".06" }, "50%": { opacity: ".10" } },
        "glow-pulse": { "0%,100%": { opacity: "0.4", filter: "blur(4px)" }, "50%": { opacity: "0.8", filter: "blur(6px)" } },
      },
      animation: {
        spin: "spin 18s linear infinite",
        "spin-rev": "spin-rev 18s linear infinite",
        "pulse-soft": "pulse-soft 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },

      backgroundImage: {
        "holo-gradient": "linear-gradient(90deg, #f0abfc, #67e8f9, #818cf8)",
        "holo-mesh":
          "radial-gradient(900px 600px at -10% -60%, rgba(56,189,248,.12), transparent), radial-gradient(800px 500px at 110% 160%, rgba(244,114,182,.12), transparent)",
      },

      colors: {
        holo: {
          pink: "#f0abfc",
          cyan: "#67e8f9",
          indigo: "#818cf8",
        },
      },
    },
  },
  plugins: [],
};
