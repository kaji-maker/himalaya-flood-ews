/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        himalaya: {
          dark: '#0B111E',
          card: '#131D31',
          border: '#1E2C4A',
          ice: '#60A5FA',
          cyan: '#38BDF8',
          accent: '#3B82F6',
          danger: '#EF4444',
          warning: '#F59E0B',
          watch: '#EAB308',
          success: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
