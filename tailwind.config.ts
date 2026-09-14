import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        bg: "#F7F9FC",
        ink: "#232733",
        soft: "#8A93A6",
        accent: "#4C6EF5",
        a: { DEFAULT: "#4C6EF5", light: "#E6EAFD" },
        b: { DEFAULT: "#F08C4B", light: "#FDECDD" },
      },
      borderRadius: {
        card: "22px",
        btn: "16px",
      },
      boxShadow: {
        card: "0 3px 10px rgba(20,20,20,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
