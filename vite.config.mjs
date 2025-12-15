import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    root: 'src/react',
    envDir: '../../', // Look for .env in project root
    build: {
        outDir: '../../public/dist',
        emptyOutDir: true
    }
});
