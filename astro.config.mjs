import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

const isGhPages = process.env.GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  site: 'https://ClaudioCeppi83.github.io',
  base: isGhPages ? '/derguisGummies' : '/',
  integrations: [tailwind()],
  output: 'static'
});
