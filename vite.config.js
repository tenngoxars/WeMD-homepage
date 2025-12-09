import { defineConfig } from 'vite'

export default defineConfig({
    base: './', // Ensure relative paths for simple deployment
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                docs: 'docs/index.html',
            },
        },
    },
})
