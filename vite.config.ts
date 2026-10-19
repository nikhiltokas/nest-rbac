import { defineConfig } from 'vite-plus';

export default defineConfig(({ mode }) => ({
  // Resolves tsconfig aliases, including those added by `nest g library`.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    globals: true,
    root: './',
    include: mode === 'e2e' ? ['**/*.e2e-spec.ts'] : ['**/*.spec.ts'],
  },
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    rules: {
      'typescript/no-explicit-any': 'off',
      'typescript/no-floating-promises': 'error',
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    env: {
      node: true,
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },

  fmt: {
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 80,
    sortPackageJson: false,
    ignorePatterns: ['src/prisma/generated/**'],
  },
}));
