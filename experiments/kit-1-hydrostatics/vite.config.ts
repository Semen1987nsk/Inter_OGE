import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@physics': resolve(__dirname, 'src/physics'),
      '@controller': resolve(__dirname, 'src/controller'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@shell': resolve(__dirname, 'src/shell'),
      '@screens': resolve(__dirname, 'src/screens'),
      '@shared': resolve(__dirname, '../_shared-spa/src'),
    },
  },
  server: {
    port: 5174,
    strictPort: false,
    fs: {
      allow: ['..'],
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'screen-density-solid': ['./src/screens/density-solid/DensitySolidScreen.ts'],
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
    /* Тяжёлые DOM-тесты с happy-dom: customElements registry и shadow DOM
       аккумулируют метаданные. Forks pool, увеличенная куча, файлы в
       отдельных fork'ах и принудительная изоляция между тестами. */
    pool: 'forks',
    poolOptions: {
      forks: {
        execArgv: ['--max-old-space-size=8192', '--max-semi-space-size=512', '--expose-gc'],
        singleFork: false,
      },
    },
    isolate: true,
    fileParallelism: false,
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
