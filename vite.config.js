import { defineConfig } from 'vite'

export default defineConfig({
    base: './', // Ensure relative paths for simple deployment
    server: {
        proxy: {
            '/docs': {
                target: 'http://localhost:5174',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/docs/, '')
            }
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                docs: 'docs/index.html',
            },
        },
    },
})
