import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        // Set a high timeout for integration tests
        testTimeout: 30000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
