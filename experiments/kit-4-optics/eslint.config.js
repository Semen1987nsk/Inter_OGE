// ESLint flat config (v9). Импорт npm-зависимостей резолвится из kit-4-optics/node_modules.
// Базовая конфигурация — в _shared-spa/eslint.config.shared.js.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { sharedConfig } from '../_shared-spa/eslint.config.shared.js';

export default sharedConfig({ js, tseslint });
