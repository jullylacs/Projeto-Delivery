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
    host: "10.0.254.32", // opcional (pra acessar na rede)
    port: 5173       // muda aqui
  }
});