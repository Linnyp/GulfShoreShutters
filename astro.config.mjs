import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Update `site` to the real domain before launch — it drives canonical URLs,
// the sitemap and the JSON-LD emitted in BaseLayout.
export default defineConfig({
  site: 'https://gulfshoreshutters.com',
  output: 'static',
  /*
   * Named explicitly so a missing sharp is a build failure rather than a silent
   * downgrade. Astro ships sharp as an *optional* dependency: when it cannot be
   * loaded, the default config quietly swaps in the passthrough service, which
   * emits on-demand `/_image?href=…` URLs instead of optimizing at build time.
   * On a static host there is nothing to answer those, so every image 404s —
   * and the build still reports success. sharp is a direct devDependency for the
   * same reason; do not rely on Astro pulling it in.
   */
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/thank-you'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
