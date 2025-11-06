import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: "0.0.0.0",
    port: 3000,
    // Proxy API requests to Vercel dev server
    proxy: {
      '/api': {
        target: process.env.VERCEL_DEV_PORT 
          ? `http://localhost:${process.env.VERCEL_DEV_PORT}`
          : 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        // Don't proxy if Vercel dev is handling it
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('Proxy error:', err);
          });
        },
      },
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
}));