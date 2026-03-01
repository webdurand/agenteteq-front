/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#030712",
          900: "#080c14",
          800: "#0a1628",
          700: "#0f2040",
          600: "#1e3a8a",
          500: "#1d4ed8",
          400: "#3b82f6",
          300: "#60a5fa",
          200: "#93c5fd",
        },
      },
      animation: {
        "orb-idle": "orbIdle 3s ease-in-out infinite",
        "orb-listen": "orbListen 1s ease-in-out infinite",
        "orb-think": "orbThink 1.5s linear infinite",
        "wave-out": "waveOut 2s ease-out infinite",
      },
      keyframes: {
        orbIdle: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.05)", opacity: "1" },
        },
        orbListen: {
          "0%, 100%": { transform: "scale(1.02)", opacity: "1" },
          "50%": { transform: "scale(1.12)", opacity: "1" },
        },
        orbThink: {
          "0%": { transform: "rotate(0deg) scale(1)" },
          "50%": { transform: "rotate(180deg) scale(1.05)" },
          "100%": { transform: "rotate(360deg) scale(1)" },
        },
        waveOut: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
}


