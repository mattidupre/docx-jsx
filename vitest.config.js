import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    setupFiles: ['./testSetup.js'],
  },
});
