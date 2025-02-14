import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@monogrid/gainmap-js'], // wasm mimetype 관련 에러 해결
  },
  server: {
    allowedHosts: ['opmay-react.ngrok.app'],
  },
});
