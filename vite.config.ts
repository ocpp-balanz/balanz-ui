import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import version from 'vite-plugin-package-version';

export default defineConfig({
  plugins: [react(), version()],
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  server: {
    watch: {
      usePolling: true,
    },
    host: true, // needed for the Docker Container port mapping to work
    strictPort: true,
    port: 8888, // you can replace this port with any port,
    allowedHosts: true
  }
});
