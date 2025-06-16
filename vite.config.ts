import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
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
    },
    build: {
      outDir: isDev ? 'dist-dev' : 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: isDev ? false : 'esbuild', // Sem minificação em dev = mais rápido
      rollupOptions: {
        output: {
          manualChunks: isDev ? undefined : {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
      // Configurações para build mais rápido em desenvolvimento
      ...(isDev && {
        cssCodeSplit: false,
        reportCompressedSize: false,
        chunkSizeWarningLimit: 2000,
      }),
    },
    base: '/',
  };
});
