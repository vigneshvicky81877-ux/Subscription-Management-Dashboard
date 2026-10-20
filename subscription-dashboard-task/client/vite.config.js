import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Proxying /api keeps the client and API same-origin in development,
      // so the SameSite=Strict refresh cookie works without CORS issues.
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_PROXY || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'node',
    },
  };
});
