import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import url from 'node:url';

const BASE_DIR = path.dirname(fileURLToPath(import.meta.url));

const MOCK_PATH = './src/fixtures';

export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(BASE_DIR, './src'),
    },
  },
  server: {
    open: '/mock.html',
  },
  plugins: [react()],
});
