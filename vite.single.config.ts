import { defineConfig } from 'vite';

/** Build de arquivo único (scripts/package.mjs embute JS e CSS no HTML). */
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { output: { inlineDynamicImports: true } }
  }
});
