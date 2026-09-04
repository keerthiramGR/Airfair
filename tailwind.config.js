/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        airfair: {
          orange: "#F97316",       // Primary accent (Orange-500)
          "orange-hover": "#EA580C", // Orange-600
          "orange-dark": "#C2410C",  // Orange-700
          light: "#FFF1E6",        // Light orange tint
          subtle: "#FFF8F2",       // Very light orange
          bg: "#FFFCF9",           // Warm canvas background
          border: "#F1E5DB",       // Warm neutral border
          text: "#171717",         // Primary dark text
          muted: "#6B7280",        // Secondary text
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-plus-jakarta)", "Plus Jakarta Sans", "Inter", "sans-serif"],
      },
      boxShadow: {
        "warm-sm": "0 1px 2px 0 rgba(241, 229, 219, 0.5)",
        "warm-md": "0 4px 12px -2px rgba(249, 115, 22, 0.08), 0 2px 6px -1px rgba(241, 229, 219, 0.6)",
        "warm-lg": "0 12px 24px -4px rgba(249, 115, 22, 0.1), 0 4px 12px -2px rgba(241, 229, 219, 0.8)",
      }
    },
  },
  plugins: [],
}
