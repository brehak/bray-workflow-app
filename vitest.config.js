import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Frontend (React) test runner. Kept separate from vite.config.js so the
// Laravel/Inertia plugins don't load in the test environment.
export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./vitest.setup.js'],
        include: ['resources/js/**/*.{test,spec}.{js,jsx}'],
    },
});
