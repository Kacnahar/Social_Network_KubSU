import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: { NODE_ENV: 'test' },
    // Каждый тест поднимает свою базу; на занятом компьютере это бывает медленно
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
