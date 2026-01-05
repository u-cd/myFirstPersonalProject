import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['vitest/**/*.{js,jsx,ts,tsx}'],
    setupFiles: ['vitest/vitest.setup.js'],
    exclude: ['**/vitest.setup.js', 'vitest/index.test.js'],
  },
});
