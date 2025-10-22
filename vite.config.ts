import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'utils': ['crypto-js', 'axios', 'uuid'],
          'icons': ['lucide-react'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js'],
    exclude: [],
    esbuildOptions: {
      target: 'es2020'
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    legalComments: 'none',
    treeShaking: true
  }
});
