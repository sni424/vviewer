import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es', // Use ES modules for workers
  },
  server: {
    host: '0.0.0.0', // 본인 IP로 명시
    allowedHosts: ['opmay-react.ngrok.app', 'stan.ngrok.pizza'],
  },
  resolve: {
    alias: {
      VTHREE: path.resolve(__dirname, 'src/scripts/vthree/VTHREE.ts'),
      src: path.resolve(__dirname, 'src'),
    },
  },
});
