import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    root: 'src/react',
    build: {
        outDir: '../../public/dist',
        emptyOutDir: true
    },
    server: {
        port: 5173,
        proxy: {
            '^/(?!src|node_modules|@vite|@fs).*': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    }
});
