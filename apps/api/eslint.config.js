// @ts-check
import { defineConfig } from 'eslint/config'
import { baseConfig } from '@repo/eslint-config'

export default defineConfig(baseConfig, {
  // wrangler types の生成物は対象外
  ignores: ['worker-configuration.d.ts', 'dist/**', '.wrangler/**', 'coverage/**'],
})
