import { fileURLToPath } from 'node:url'
import { includeIgnoreFile } from '@eslint/compat'
import neostandard from 'neostandard'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier/flat'
import globals from 'globals'

export default [
  // .prettierignore is the one ignore list for both Prettier and ESLint.
  includeIgnoreFile(fileURLToPath(new URL('.prettierignore', import.meta.url))),
  ...neostandard({ ts: true }),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV_SIGN_IN__: 'readonly',
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  prettier,
]
