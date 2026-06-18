import cloudflare from '@astrojs/cloudflare';
import solid from '@astrojs/solid-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  adapter: cloudflare(),
  integrations: [solid()],
  vite: {
    plugins: [tailwindcss()],
  },
});
