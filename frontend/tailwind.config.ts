import type { Config } from "tailwindcss";

/**
 * Postman-flavoured palette. The signature orange (#FF6C37) drives the Send
 * button and active accents; method colours match Postman's verb coding.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pm: {
          orange: "#FF6C37",
          "orange-dark": "#EB5A2A",
          sidebar: "#FFFFFF",
          panel: "#FFFFFF",
          bg: "#F7F7F7",
          border: "#E6E6E6",
          "border-strong": "#D9D9D9",
          text: "#2E2E2E",
          muted: "#6B6B6B",
          faint: "#9A9A9A",
          hover: "#F0F0F0",
          active: "#FBE8E0",
        },
        method: {
          get: "#0CA750",
          post: "#C2872B",
          put: "#0E7DC4",
          patch: "#7A41A6",
          delete: "#C0392B",
          head: "#0CA750",
          options: "#7A41A6",
        },
        status: {
          ok: "#0CA750",
          redirect: "#C2872B",
          client: "#C0392B",
          server: "#C0392B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "'SF Mono'", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "2xs": "11px",
      },
    },
  },
  plugins: [],
};

export default config;
