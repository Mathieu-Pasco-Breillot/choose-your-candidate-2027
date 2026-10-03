import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Le script d'enregistrement est un fichier externe : la CSP interdit les scripts inline.
      injectRegister: 'script',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Mon Isoloir',
        short_name: 'Mon Isoloir',
        description: "Comparateur des positions des candidats à l'élection présidentielle de 2027.",
        lang: 'fr',
        theme_color: '#1f2a44',
        background_color: '#f7f4ee',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'], navigateFallback: '/index.html' },
    }),
  ],
  build: { target: 'es2023' },
});
