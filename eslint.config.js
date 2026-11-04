// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Deno code resolves npm: specifiers itself.
    ignores: ['dist/*', 'supabase/functions/push-dispatch/*'],
  },
]);
