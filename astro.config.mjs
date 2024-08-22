import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({platformProxy: true}),
  output: 'server',
  markdown: {
    shikiConfig: {
      theme: 'vitesse-dark',
      tailwind: true,
      langs: [
        'typescript',
        'javascript',
        'tsx',
        'jsx',
        'js',
        'css',
        'html',
        'go',
        'json',
        'yaml',
        'markdown',
      ],
      wrap: true,
      transformers: [],
    },
  },
  integrations: [react()],
});
