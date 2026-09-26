import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_BACKEND_TARGET || process.env.VITE_BACKEND_TARGET || 'http://localhost:8080';

  const apiProxy = {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
    configure: (proxy: any) => {
      proxy.on('proxyReq', (proxyReq: any) => {
        proxyReq.removeHeader('origin');
      });
    },
  };

  const wsProxy = {
    target: backendTarget,
    changeOrigin: true,
    secure: false,
    ws: true,
    configure: (proxy: any) => {
      proxy.on('proxyReqWs', (proxyReq: any) => {
        proxyReq.removeHeader('origin');
      });
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: '@/motion', replacement: fileURLToPath(new URL('./src/motion/index.ts', import.meta.url)) },
        { find: 'next/link', replacement: fileURLToPath(new URL('./src/v0/shims/next-link.tsx', import.meta.url)) },
        { find: 'next/navigation', replacement: fileURLToPath(new URL('./src/v0/shims/next-navigation.ts', import.meta.url)) },
        { find: 'next-themes', replacement: fileURLToPath(new URL('./src/v0/shims/next-themes.tsx', import.meta.url)) },
        { find: 'next', replacement: fileURLToPath(new URL('./src/v0/shims/next.ts', import.meta.url)) },
        { find: '@', replacement: fileURLToPath(new URL('./src/v0', import.meta.url)) },
        { find: '@app', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      ],
    },
    server: {
      port: 5174,
      strictPort: false,
      proxy: {
        '/api': apiProxy,
        '/ws': wsProxy,
      },
    },
    preview: {
      proxy: {
        '/api': apiProxy,
        '/ws': wsProxy,
      },
    },
  };
});

