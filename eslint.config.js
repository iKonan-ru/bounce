// ESLint: правила ПВЗ (host-app/eslint.config.js) и правила, которые раньше проверял Biome.
//
// Из правил ПВЗ не взяты правила FSD и ui-kit: в проекте нет слоёв FSD и кита, а импорты из
// shadcn (@/components/ui/button) - третьего уровня по устройству shadcn.
//
// У TypeScript 7 пока нет API для typescript-eslint, поэтому пакет typescript - это TypeScript 6
// (@typescript/typescript6), а tsc - TypeScript 7 из пакета @typescript/native.
import importPlugin from 'eslint-plugin-import';
import jsDocPlugin from 'eslint-plugin-jsdoc';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';

/** Пустые строки между инструкциями (ПВЗ) */
const PADDING_RULE = [
  'error',
  // строка перед return
  { blankLine: 'always', prev: '*', next: 'return' },
  // строка перед export
  { blankLine: 'always', prev: '*', next: 'export' },
  // никогда не строка между import
  { blankLine: 'never', prev: 'import', next: 'import' },
  // строка перед if
  { blankLine: 'always', prev: '*', next: 'if' },
  // строка после if
  { blankLine: 'always', prev: 'if', next: '*' },
];

/** Правила оформления для JS и TS: ПВЗ и бывшие правила Biome */
const STYLE_RULES = {
  'padding-line-between-statements': PADDING_RULE,
  'default-case': 'error',
  curly: ['error', 'all'],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-else-return': ['error', { allowElseIf: false }],
  'no-lonely-if': 'error',
  'no-nested-ternary': 'error',
  'no-param-reassign': 'error',
  'no-unneeded-ternary': 'error',
  'no-useless-concat': 'error',
  'no-var': 'error',
  yoda: 'error',
  'one-var': ['error', 'never'],
  'prefer-const': 'error',
  'prefer-template': 'error',
};

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      '.pnpm-store',
      'pocketbase/bin',
      'pocketbase/pb_data',
      'src/routeTree.gen.ts',
      'src/lib/pb-types.ts',
    ],
  },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        projectService: { defaultProject: './tsconfig.json' },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      unicorn: unicornPlugin,
      // import подключает importPlugin.flatConfigs.typescript
      react: reactPlugin,
      jsdoc: jsDocPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...STYLE_RULES,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'unicorn/filename-case': ['error', { cases: { kebabCase: true } }],
      // складывает 2 импорта в 1, если у них одинаковый путь
      'import/no-duplicates': 'error',
      'import/extensions': [
        'error',
        'never',
        {
          ignorePackages: true,
          pattern: { js: 'never', jsx: 'never', ts: 'never', tsx: 'never' },
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          // typeParameter - имя дженерика
          selector: ['enumMember', 'typeParameter'],
          format: ['PascalCase'],
        },
        {
          selector: ['enum'],
          format: ['PascalCase'],
          // енамы не могут иметь префикс "E"
          custom: { regex: '^E[A-Z]', match: false },
        },
        {
          selector: ['typeAlias'],
          format: ['PascalCase'],
          // типы не могут иметь префикс "T"
          custom: { regex: '^T[A-Z]', match: false },
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          // интерфейсы не могут иметь префикс "I"
          custom: { regex: '^I[A-Z]', match: false },
        },
        {
          // snake_case - поля PocketBase
          selector: ['typeProperty'],
          format: ['camelCase', 'UPPER_CASE', 'snake_case'],
          // переменные CSS в style: --fill
          filter: { regex: '^--', match: false },
        },
        {
          selector: ['typeMethod'],
          format: ['camelCase'],
        },
        {
          selector: ['variable'],
          format: ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
        },
      ],
      'react/jsx-key': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: [
            // енамы и их записи
            { context: 'TSEnumDeclaration', inlineCommentBlock: true },
            { context: 'TSEnumMember', inlineCommentBlock: true },
          ],
        },
      ],
      '@typescript-eslint/no-namespace': 'off',
      // interface A extends B {} - вместо type A = B: типы объектов - интерфейсы
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            object: {
              message:
                'Avoid using the `object` type. Use `AbstractObject` or a more specific type instead.',
              fixWith: 'AbstractObject',
            },
            Object: {
              message:
                'Avoid using the `Object` type. Use `AbstractObject` or a more specific type instead.',
              fixWith: 'AbstractObject',
            },
            '{}': {
              message:
                'Avoid using the `{}` type. Use `AbstractObject` or a more specific type instead.',
              fixWith: 'AbstractObject',
            },
            'Record<string, unknown>': {
              message:
                "Avoid using the `Record<string, unknown>` type. Use `AbstractObject` or a more specific type instead. import type { AbstractObject } from '@/lib/guards';",
              fixWith: 'AbstractObject',
            },
          },
        },
      ],
      'react/jsx-curly-brace-presence': [
        'error',
        // запрещает {} для строковых пропсов и дочерних элементов
        { props: 'never', children: 'never' },
      ],
      // бывшие правила Biome
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/require-await': 'error',
      'no-negated-condition': 'error',
      'unicorn/explicit-length-check': 'error',
      'unicorn/prefer-number-properties': 'error',
    },
  },
  // константы в папках constants - UPPER_CASE (ПВЗ)
  {
    files: ['**/constants/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['UPPER_CASE'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid',
        },
      ],
    },
  },
  // настройки сборки и тесты работают в Node
  {
    files: ['*.config.ts', 'tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  // shadcn: код генератора, правила оформления проекта к нему не применяются
  {
    files: ['src/components/ui/**'],
    rules: {
      ...Object.fromEntries(
        Object.keys(STYLE_RULES).map((rule) => [rule, 'off'])
      ),
      'jsdoc/require-jsdoc': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/prefer-function-type': 'off',
      'no-negated-condition': 'off',
      'unicorn/explicit-length-check': 'off',
    },
  },
  // настройки ESLint
  {
    files: ['eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
    rules: STYLE_RULES,
  },
  // хуки и миграции PocketBase: JS в движке PocketBase, его глобальные функции ESLint не знает
  {
    files: ['pocketbase/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'script',
      globals: { ...globals.commonjs },
    },
    plugins: { unicorn: unicornPlugin },
    rules: {
      ...STYLE_RULES,
      'no-undef': 'off',
      // catch (_error): в хуках PocketBase catch без переменной не используется
      'no-unused-vars': ['error', { caughtErrorsIgnorePattern: '^_' }],
      'unicorn/filename-case': ['error', { cases: { kebabCase: true } }],
    },
  },
  // имена миграций задаёт PocketBase: время и описание через "_"
  {
    files: ['pocketbase/pb_migrations/**/*.js'],
    rules: { 'unicorn/filename-case': 'off' },
  }
);
