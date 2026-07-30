// @ts-check
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

/**
 * TypeScript ライブラリパッケージ向けの基本 ESLint 設定
 *
 * 使い方 (eslint.config.js):
 *   import { baseConfig } from '@repo/eslint-config'
 *   export default baseConfig
 */
export const baseConfig = defineConfig(
  tseslint.configs.recommended,
  {
    rules: {
      // 未使用変数を禁止（アンダースコアプレフィックスは許可）
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // any 型の使用を警告
      '@typescript-eslint/no-explicit-any': 'warn',
      // 型インポートに type 修飾子を強制
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // var を禁止（let/const を使用）
      'no-var': 'error',
      // const を優先
      'prefer-const': 'error',
      // console.log を警告（warn/error/info は許可）
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
)
