import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/AI-Chatbot/',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
