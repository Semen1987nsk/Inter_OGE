// Shared ESLint config (v9 flat) для Inter_OGE SPA-пакетов.
//
// ВАЖНО: этот файл — НЕ entry-point ESLint. Каждый пакет импортирует
// эту функцию из своего локального eslint.config.js и резолвит npm-зависимости
// (`@eslint/js`, `typescript-eslint`) из своих node_modules.
//
// Использование (eslint.config.js в пакете):
//   import js from '@eslint/js';
//   import tseslint from 'typescript-eslint';
//   import { sharedConfig } from '../_shared-spa/eslint.config.shared.js';
//   export default sharedConfig({ js, tseslint });

/**
 * @param {object} deps
 * @param {import('@eslint/js')} deps.js
 * @param {import('typescript-eslint')} deps.tseslint
 * @returns {import('eslint').Linter.Config[]}
 */
export function sharedConfig({ js, tseslint }) {
  return [
    {
      ignores: [
        'dist/**',
        'node_modules/**',
        'coverage/**',
        'playwright-report/**',
        '*.config.js',
        '*.config.ts',
        '*.config.mjs',
        'selfcheck-*.mjs',
        'probe-*.mjs',
        'selfcheck-*/',
        'probe-out/**',
        'e2e/**/*.spec.ts',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        globals: {
          window: 'readonly',
          document: 'readonly',
          navigator: 'readonly',
          localStorage: 'readonly',
          sessionStorage: 'readonly',
          location: 'readonly',
          HTMLElement: 'readonly',
          HTMLButtonElement: 'readonly',
          HTMLInputElement: 'readonly',
          HTMLFormElement: 'readonly',
          HTMLOutputElement: 'readonly',
          HTMLTableElement: 'readonly',
          HTMLTableRowElement: 'readonly',
          HTMLTableCellElement: 'readonly',
          HTMLDivElement: 'readonly',
          HTMLAnchorElement: 'readonly',
          HTMLImageElement: 'readonly',
          HTMLCanvasElement: 'readonly',
          HTMLTemplateElement: 'readonly',
          SVGElement: 'readonly',
          SVGSVGElement: 'readonly',
          SVGEllipseElement: 'readonly',
          SVGGElement: 'readonly',
          SVGRectElement: 'readonly',
          SVGTextElement: 'readonly',
          SVGPathElement: 'readonly',
          SVGCircleElement: 'readonly',
          SVGLineElement: 'readonly',
          DOMRect: 'readonly',
          IntersectionObserver: 'readonly',
          ResizeObserver: 'readonly',
          CustomEvent: 'readonly',
          Event: 'readonly',
          KeyboardEvent: 'readonly',
          MouseEvent: 'readonly',
          PointerEvent: 'readonly',
          DragEvent: 'readonly',
          Element: 'readonly',
          Node: 'readonly',
          NodeList: 'readonly',
          NodeListOf: 'readonly',
          URLSearchParams: 'readonly',
          URL: 'readonly',
          fetch: 'readonly',
          requestAnimationFrame: 'readonly',
          cancelAnimationFrame: 'readonly',
          setTimeout: 'readonly',
          clearTimeout: 'readonly',
          setInterval: 'readonly',
          clearInterval: 'readonly',
          queueMicrotask: 'readonly',
          getComputedStyle: 'readonly',
          matchMedia: 'readonly',
          confirm: 'readonly',
          alert: 'readonly',
          console: 'readonly',
          performance: 'readonly',
          Image: 'readonly',
          customElements: 'readonly',
          DOMParser: 'readonly',
          XMLSerializer: 'readonly',
          Blob: 'readonly',
          FileReader: 'readonly',
          File: 'readonly',
          FormData: 'readonly',
          crypto: 'readonly',
          AbortController: 'readonly',
          AbortSignal: 'readonly',
          structuredClone: 'readonly',
        },
      },
      rules: {
        'no-unused-vars': 'off',
        'no-undef': 'off',
        '@typescript-eslint/no-unused-vars': [
          'warn',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/triple-slash-reference': 'off',
        'prefer-const': 'warn',
        'no-console': 'off',
        'no-empty': ['warn', { allowEmptyCatch: true }],
        'no-useless-escape': 'warn',
      },
    },
    {
      files: ['**/*.test.ts', '**/__tests__/**/*.ts', '**/e2e/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ];
}
