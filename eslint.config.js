// ESLint v9 flat config
// 不再用 extends 字符串，直接 import 各 plugin 的 config 对象组合
const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const reactPlugin = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  // 1. 忽略目录
  {
    ignores: ['dist/**', 'node_modules/**', 'config/**', '*.config.js', 'NOTES/**'],
  },

  // 2. JS 基础规则
  js.configs.recommended,

  // 3. TS / React 规则
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // 一次性引入浏览器全部全局（HTMLElement / SVGSVGElement / window 等）
        ...globals.browser,
        // process（虽然源码里它会被 DefinePlugin 替换，但 eslint 阶段还看得到）
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: reactPlugin,
      'react-hooks': reactHooks,
      prettier: prettierPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // React 17+ 不要求 import React
      'react/react-in-jsx-scope': 'off',
      // 项目里偶尔需要 any，降为警告
      '@typescript-eslint/no-explicit-any': 'warn',
      // _ 开头的未用变量不报
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      // Prettier 风格通过 eslint 报告
      'prettier/prettier': 'warn',
    },
  },

  // 4. .d.ts 文件：DOM 全局类型多，不开 no-undef
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-undef': 'off',
    },
  },

  // 5. 关掉所有与 Prettier 冲突的格式化规则（必须放最后）
  prettierConfig,
];
