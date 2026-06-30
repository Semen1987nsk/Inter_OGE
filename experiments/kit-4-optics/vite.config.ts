import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './', // относительные пути для оффлайн-Electron-сборки
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@physics': resolve(__dirname, 'src/physics'),
      '@controller': resolve(__dirname, 'src/controller'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@shell': resolve(__dirname, 'src/shell'),
      '@screens': resolve(__dirname, 'src/screens'),
      '@shared': resolve(__dirname, '../_shared-spa/src'),
      '@labosfera/shared-spa': resolve(__dirname, '../_shared-spa/src'),
    },
  },
  server: {
    fs: {
      // Разрешить чтение файлов выше корня проекта (../_shared-spa/)
      allow: ['..'],
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'screen-lens-bench': ['./src/screens/lens-bench/LensBenchScreen.ts'],
        },
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
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
