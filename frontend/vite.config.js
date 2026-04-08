// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // @ aponta para src
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'delivery.nvxnetworks.com',
      'www.delivery.nvxnetworks.com',
      'localhost',
      '127.0.0.1',
      '10.0.254.32',
    ],
  },
});