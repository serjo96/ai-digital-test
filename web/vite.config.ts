import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // ngrok (and similar tunnels) send Host: *.ngrok-free.app; Vite 6+ rejects unknown hosts.
    allowedHosts: ['.ngrok-free.app'],
  },
});
