/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  "#f0f4ff",
          100: "#e0e9ff",
          200: "#c0d1fe",
          300: "#93adfb",
          400: "#6080f6",
          500: "#3b55ed",
          600: "#2636d1",
          700: "#1f28a9",
          800: "#1e2687",
          900: "#0f172a",
          950: "#080d1a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
