// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Jest setup runs in Node under the Jest globals.
    files: ['jest.setup.js'],
    languageOptions: {
      globals: { jest: 'readonly', module: 'readonly', require: 'readonly' },
    },
  },
  {
    // Supabase Edge Functions are Deno code committed verbatim from the live
    // project; they use URL imports and the Deno global, which this React
    // Native ESLint config cannot resolve. They are not part of the app build.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
