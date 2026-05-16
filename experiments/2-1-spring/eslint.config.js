// ESLint flat config (v9). Базовая конфигурация — в _shared-spa/eslint.config.shared.js.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { sharedConfig } from '../_shared-spa/eslint.config.shared.js';

export default sharedConfig({ js, tseslint });
