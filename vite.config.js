/// <reference types="vitest" />

import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  test: {
    include: ['./src/**/*.test.ts(x)?'],
  },
});
