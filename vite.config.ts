import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  build: {
    // Production optimizations
    target: 'es2015',
    minify: 'terser',
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        // Manual chunking for better caching and smaller bundles
        manualChunks: (id) => {
          // Chart libraries - separate heavy analytics dependencies
          if (id.includes('recharts')) {
            return 'recharts-vendor';
          }
          if (id.includes('d3')) {
            return 'd3-vendor';
          }

          // Core React libraries
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'react-vendor';
          }

          // UI component libraries (Radix UI)
          if (id.includes('@radix-ui/')) {
            return 'ui-vendor';
          }

          // Query and state management
          if (id.includes('@tanstack/react-query') || id.includes('zustand')) {
            return 'query-vendor';
          }

          // Backend/API libraries
          if (id.includes('@supabase/supabase-js') || id.includes('@sentry/')) {
            return 'backend-vendor';
          }

          // Utility libraries
          if (id.includes('date-fns') || id.includes('clsx') || id.includes('class-variance-authority') ||
              id.includes('lucide-react') || id.includes('cmdk')) {
            return 'utils-vendor';
          }

          // Form libraries
          if (id.includes('react-hook-form') || id.includes('@hookform/') || id.includes('zod')) {
            return 'form-vendor';
          }

          // Node modules that aren't specifically chunked above
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Asset file names for better caching
        assetFileNames: (assetInfo) => {
          const fileName = assetInfo.names?.[0] || assetInfo.originalFileNames?.[0] || 'asset';
          if (/\.(png|jpe?g|gif|svg)$/.test(fileName)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/\.css$/.test(fileName)) {
            return `assets/styles/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Bundle size optimizations
    chunkSizeWarningLimit: 1000,
    // Enable tree shaking
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
  },
  // Environment variables prefix
  envPrefix: 'VITE_',
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'zustand',
      'react-paystack',
    ],
  },
}));
