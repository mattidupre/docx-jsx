import { resolve } from 'path';
import { defineConfig } from 'vite';
/// <reference types="vitest" />

export default defineConfig({
  root: __dirname,
  build: {
    outDir: './dist-frontend',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/frontend.ts'),
      name: 'frontend',
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react'],
      output: {
        globals: {
          react: 'React',
        },
      },
    },
  },
  server: {
    open: '/mock-viewer.html',
  },
  test: {
    include: ['./src/**/*.test.ts(x)?'],
  },
  resolve: {
    alias: [{ find: 'src', replacement: resolve(__dirname, './src') }],
  },
});
