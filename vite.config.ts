import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['pv-8909edea0334-3e9f4ddb-fe21-4ca9-8534-903599c5b336.style.dev'],
  },
});
