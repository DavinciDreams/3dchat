import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  publicDir: 'public',
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022',
    },
    include: ['wlipsync'],
  },
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    all: true,
      lines: 100,
      branches: 100,
      functions: 100,
      statements: 100,
    },
  },
});
