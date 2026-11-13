import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Prevent Vite from obscuring Rust / Tauri errors
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  // Environment variables prefix for Tauri
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
});
