/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        wiggle: {
          "0%,100%": { transform: "rotate(0deg)" },
          "10%": { transform: "rotate(-15deg)" },
          "20%": { transform: "rotate(15deg)" },
          "30%": { transform: "rotate(-10deg)" },
          "40%": { transform: "rotate(10deg)" },
          "50%": { transform: "rotate(-5deg)" },
          "60%": { transform: "rotate(5deg)" },
        },
      },
      animation: {
        wiggle: "wiggle 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};