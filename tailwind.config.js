/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "vs-dark": {
          50: "#e0e0e0",
          100: "#cccccc",
          200: "#999999",
          300: "#666666",
          400: "#333333",
          500: "#1e1e1e",
          600: "#1a1a1a",
          700: "#161616",
          800: "#0d0d0d",
          900: "#000000",
        },
        "vs-gray": {
          50: "#f5f5f5",
          100: "#eeeeee",
          200: "#e0e0e0",
          300: "#c0c0c0",
          400: "#808080",
          500: "#606060",
          600: "#404040",
          700: "#3c3c3c",
          800: "#262626",
          900: "#1e1e1e",
        },
        accent: {
          green: "#4ec9b0",
          "green-hover": "#64d5c0",
          blue: "#569cd6",
          "blue-hover": "#6fb8e8",
          orange: "#dcdcaa",
          purple: "#c586c0",
          red: "#f48771",
        },
      },
      fontFamily: {
        mono: ["'Fira Code'", "'Courier New'", "monospace"],
      },
      boxShadow: {
        xs: "0 0 4px rgba(0, 0, 0, 0.3)",
        sm: "0 0 8px rgba(0, 0, 0, 0.4)",
        md: "0 0 16px rgba(0, 0, 0, 0.5)",
        lg: "0 0 24px rgba(0, 0, 0, 0.6)",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".5" },
        },
        slideIn: {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        slideIn: "slideIn 0.3s ease-out",
        fadeIn: "fadeIn 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
