/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gcs-bg': '#F2F4F7',
        'gcs-card': '#FFFFFF',
        'gcs-card-hover': '#F9FAFB',
        'gcs-border': '#E5E7EB',
        'gcs-cyan': '#248AFD',
        'gcs-rose': '#F5A623',
        'gcs-emerald': '#71C02B',
        'gcs-amber': '#FFC100',
        'gcs-red': '#FF4747',
        'gcs-text': '#111827',
        'gcs-muted': '#6B7280',
        'gcs-subtle': '#9CA3AF',
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        'ios': '0 2px 8px rgba(0,0,0,0.08)',
        'ios-lg': '0 8px 24px rgba(0,0,0,0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-start infinite',
      },
      keyframes: {
        blink: { '50%': { opacity: '0' } },
      },
    },
  },
  plugins: [],
};
