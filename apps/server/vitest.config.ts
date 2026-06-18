import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    pool: 'forks',
    env: {
      JWT_SECRET: 'super_secret_test_key_1234567890_32_chars',
      PORT: '5001',
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/shopsmart?schema=public',
      REDIS_URL: 'redis://localhost:6379',
      RAZORPAY_KEY_ID: 'test_rzp_123',
      RAZORPAY_KEY_SECRET: 'test_secret_123',
      STRIPE_SECRET_KEY: 'sk_test_123'
    },
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/**/*.d.ts'],
    },
    setupFiles: ['tests/setup.ts'],
    // Give integration tests enough time to hit the DB
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
