// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Static output for SEO + cPanel deploy (no Node runtime). See docs/30-STOREFRONT-PLAN.md.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://www.shreekrishnacollection.com',
  output: 'static',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
