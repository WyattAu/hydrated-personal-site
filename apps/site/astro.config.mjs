import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import solid from '@astrojs/solid-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://wyattau.com',
  adapter: cloudflare(),
  integrations: [solid(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
