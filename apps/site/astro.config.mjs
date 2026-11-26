import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import solid from '@astrojs/solid-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://wyattau.com',
  adapter: cloudflare(),
  integrations: [
    solid(),
    sitemap({
      serialize(item) {
        // Priority ladder: dashboards first, reference pages after.
        const path = item.url.replace(/\/$/, '').split('/').pop() ?? '';
        const high = ['world', 'etf', 'ml'];
        if (item.url === 'https://wyattau.com/' || high.includes(path)) {
          item.changefreq = 'daily';
          item.priority = 0.9;
        } else if (['docs', 'dossier', 'projects', 'guestbook'].includes(path)) {
          item.changefreq = 'weekly';
          item.priority = 0.7;
        } else {
          item.changefreq = 'monthly';
          item.priority = 0.5;
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // The CSS minifier was stripping [data-theme] custom-property blocks
    // (all 5 theme definitions vanished from the bundle; canvases fell
    // back to hardcoded colors — the "widgets not covered in themes"
    // report). Minification off until pinned root-caused.
    css: { minify: false },
    build: { cssMinify: false },
  },
});
