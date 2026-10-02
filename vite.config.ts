import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Prebundle the worker dependency before the first analysis. Otherwise Vite
  // discovers it on demand and reloads the page, discarding candidate sites.
  optimizeDeps: { include: ['astronomy-engine'] },
  build: { chunkSizeWarningLimit: 1100 },
});
