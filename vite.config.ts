import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { aiChatDevPlugin } from './vite.ai-chat-plugin';

export default defineConfig({
  plugins: [react(), aiChatDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
