/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fffef7",
          100: "#fefcf0",
          200: "#fdf8e1",
          300: "#faf3d0",
          400: "#f5eabc",
        },
        surface: {
          DEFAULT: "#fefcf0",
          light: "#ffffff",
          lighter: "#fafafa",
          border: "#e0dcc8",
          dark: "#2d2d2d",
        },
        accent: {
          green: "#4caf50",
          "green-hover": "#43a047",
          blue: "#2196f3",
          "blue-hover": "#1e88e5",
        },
      },
      fontFamily: {
        mono: ["'Courier New'", "Courier", "monospace"],
      },
    },
  },
  plugins: [],
};
