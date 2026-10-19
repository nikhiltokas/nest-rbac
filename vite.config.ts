import { defineConfig } from 'vite-plus';

export default defineConfig({
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
    ignorePatterns: [],
  },
});
