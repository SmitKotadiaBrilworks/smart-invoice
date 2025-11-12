/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0284C7",
          hover: "#0369A1",
        },
        success: {
          DEFAULT: "#16A34A",
        },
        warning: {
          DEFAULT: "#EAB308",
        },
        error: {
          DEFAULT: "#DC2626",
        },
        bg: {
          DEFAULT: "#F9FAFB",
        },
        surface: {
          DEFAULT: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E5E7EB",
        },
        text: {
          primary: "#111827",
          secondary: "#374151",
          tertiary: "#6B7280",
          disabled: "#9CA3AF",
        },
      },
      screens: {
        xs: "475px",
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable Tailwind's base styles to work with Ant Design
  },
};
