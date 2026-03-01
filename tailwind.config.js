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
      animation: {},
      keyframes: {},
    },
  },
  plugins: [],
}


