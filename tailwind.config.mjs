/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        berry: {
          50: '#fff1f5',
          100: '#ffe4ec',
          500: '#e11d48',
          600: '#be123c',
          900: '#4c0519',
          950: '#160b11'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
};
