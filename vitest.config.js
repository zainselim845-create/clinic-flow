import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    testTimeout: 30000,
    fileParallelism: false,
    pool: 'forks',
    forks: {
      execArgv: ['--max-old-space-size=8192']
    }
  }
});


