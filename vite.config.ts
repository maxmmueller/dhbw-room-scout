import { defineConfig, type ProxyOptions } from 'vite';

// The DHBW APIs don't send CORS headers, so the browser talks to these
// local paths and Vite forwards them (dev server and `vite preview`).
const proxy: Record<string, ProxyOptions> = {
  '/api/rooms': {
    target: 'https://api.dhbw.dev',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/rooms/, '/rapla/MA/rooms'),
  },
  '/api/lectures': {
    target: 'https://api.dhbw.app',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/lectures/, '/rapla/lectures'),
  },
};

export default defineConfig({
  server: { proxy },
  preview: { proxy },
});
