/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--bg)",
          up: "var(--bg-up)",
          card: "var(--bg-card)",
          overlay: "var(--bg-overlay)",
        },
        glass: {
          DEFAULT: "var(--glass-bg)",
          border: "var(--glass-border)",
        },
        accent: {
          DEFAULT: "var(--accent)",
        },
        content: {
          DEFAULT: "var(--fg)",
          2: "var(--fg-2)",
          3: "var(--fg-3)",
          4: "var(--fg-4)",
        },
        line: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
      },
    },
  },
  plugins: [],
};
