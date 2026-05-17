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
        '/hf-api': {
          target: 'https://api-inference.huggingface.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/hf-api/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.HF_TOKEN) {
                proxyReq.setHeader('Authorization', `Bearer ${env.HF_TOKEN}`);
              }
              proxyReq.removeHeader('Origin');
            });
          },
        },
      },
    },
  };
});
