/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "rgb(var(--app-bg) / <alpha-value>)",
          surface: "rgb(var(--app-surface) / <alpha-value>)",
          surface2: "rgb(var(--app-surface-2) / <alpha-value>)",
          border: "rgb(var(--app-border) / <alpha-value>)",
          text: "rgb(var(--app-text) / <alpha-value>)",
          muted: "rgb(var(--app-muted) / <alpha-value>)",
          primary: "rgb(var(--app-primary) / <alpha-value>)",
          primary2: "rgb(var(--app-primary-2) / <alpha-value>)",
          onPrimary: "rgb(var(--app-on-primary) / <alpha-value>)",
          accent: "rgb(var(--app-accent) / <alpha-value>)",
          accent2: "rgb(var(--app-accent-2) / <alpha-value>)",
          danger: "rgb(var(--app-danger) / <alpha-value>)",
          success: "rgb(var(--app-success) / <alpha-value>)",
          warning: "rgb(var(--app-warning) / <alpha-value>)"
        },
        brand: {
          accent: "rgb(var(--brand-accent) / <alpha-value>)",
          accent2: "rgb(var(--brand-accent-2) / <alpha-value>)",
          bg: "rgb(var(--brand-bg) / <alpha-value>)",
          panel: "rgb(var(--brand-panel) / <alpha-value>)",
          panel2: "rgb(var(--brand-panel-2) / <alpha-value>)"
        }
      }
    },
  },
  plugins: [],
}

