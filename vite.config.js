import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/groq-api': {
          target: 'https://api.groq.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/groq-api/, '/openai'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.GROQ_API_KEY || ''}`);
            });
          },
        },
      },
    },
  };
});
