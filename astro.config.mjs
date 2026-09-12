import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Update `site` to the real domain before launch — it drives canonical URLs,
// the sitemap and the JSON-LD emitted in BaseLayout.
export default defineConfig({
  site: 'https://gulfshoreshutters.com',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/thank-you'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
