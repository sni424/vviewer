import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['opmay-react.ngrok.app', "stan.ngrok.pizza"],
  },
  resolve: {
    alias: {
      VTHREE: path.resolve(__dirname, 'src/scripts/vthree/VTHREE.ts'),
      src: path.resolve(__dirname, 'src'),
    },
  },
});
