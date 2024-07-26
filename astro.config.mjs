import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
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
});
