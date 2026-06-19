import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    env: {
      JWT_SECRET: 'super_secret_test_key_1234567890_32_chars',
      JWT_ACCESS_SECRET: 'super_secret_test_key_1234567890_32_chars',
      JWT_REFRESH_SECRET: 'super_refresh_test_key_1234567890_32char',
      PORT: '5001',
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:3000',
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
    // Give integration tests enough time to hit the remote Neon DB
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
