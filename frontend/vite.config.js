import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => {
  const apiUrl = process.env.VITE_API_URL || loadEnv(mode,process.cwd()).VITE_API_URL || '/api';
  const apiOrigin = new URL(apiUrl, 'https://same-origin.invalid').origin;
  const connect = apiOrigin === 'https://same-origin.invalid' ? "'self'" : "'self' " + apiOrigin;
  const csp = [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob:", "worker-src 'self' blob:",
    'connect-src ' + connect, "object-src 'none'", "base-uri 'none'", "form-action 'self'",
  ].join('; ');
  return {
  plugins: [react(), {
    name: 'production-content-security-policy',
    apply: 'build',
    transformIndexHtml: {order:'pre',handler:() => [{tag:'meta',attrs:{'http-equiv':'Content-Security-Policy',content:csp},injectTo:'head-prepend'}]},
  }],
  server: {
    port: 3000,
    proxy: {
      // Proxy /api requests to the backend during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  };
});
