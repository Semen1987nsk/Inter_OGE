import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './', // относительные пути для оффлайн-Electron-сборки
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@physics': resolve(__dirname, 'src/physics'),
      '@view': resolve(__dirname, 'src/view'),
      '@controller': resolve(__dirname, 'src/controller'),
      '@ui': resolve(__dirname, 'src/ui'),
      // §20 REFERENCE.md — shared infrastructure.
      '@shared': resolve(__dirname, '../_shared-spa/src'),
      '@labosfera/shared-spa': resolve(__dirname, '../_shared-spa/src'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Hash в имени для cache-busting (заменяет ?v=1445 хаки старого кода)
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**', 'src/main.ts'],
      thresholds: {
        // Цель из спеки: physics 100%, остальное 80%
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
