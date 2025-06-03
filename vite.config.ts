import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      '@supabase/supabase-js', 
      'react-toastify', 
      'framer-motion'
    ],
    exclude: ['lucide-react'],
  },
  server: {
    hmr: {
      overlay: false, // Desativa overlay de erro que pode ser pesado
    },
    watch: {
      usePolling: false, // Reduz uso de CPU
    },
    host: 'localhost',
    port: 5173,
// Proxy removido temporariamente - usando URLs absolutas
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Mudado para false em desenvolvimento para melhorar o desempenho
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  base: '/',
});
