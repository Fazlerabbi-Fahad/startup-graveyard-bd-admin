import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3002, strictPort: true },
  // The editor chunk (Markdown editor + dnd) is ~190 kB gzipped and lazy-loaded; that's fine for a one-user admin.
  build: { chunkSizeWarningLimit: 700 },
  preview: { port: 3002, strictPort: true },
});
