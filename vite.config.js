import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
              return 'vendor-recharts';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Keep React runtime, Ark UI primitives, and icons unified to avoid Rolldown CJS/ESM chunk interop breakage
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('lucide-react') ||
              id.includes('@ark-ui') ||
              id.includes('@zag-js')
            ) {
              return 'vendor-react';
            }
            // Heavy UI primitive chunk target for standalone non-react components
            if (id.includes('@ark-ui-standalone')) {
              return 'vendor-ark-ui';
            }
            return 'vendor-others';
          }
        }
      }
    }
  }
});
