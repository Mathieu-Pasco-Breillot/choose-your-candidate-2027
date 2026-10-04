import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { lireEntetesCaddy } from './scripts/lib/entetes-caddy.ts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Le script d'enregistrement est un fichier externe : la CSP interdit les scripts inline.
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mon Isoloir',
        short_name: 'Mon Isoloir',
        description: "Comparateur des positions des candidats à l'élection présidentielle de 2027.",
        lang: 'fr',
        // Couleurs du thème sombre, thème de référence (spécification § 5.1) : barre d'état et écran de lancement.
        theme_color: '#0e1a33',
        background_color: '#0e1a33',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // Icône « maskable » : fond plein et urne réduite dans la zone sûre (80 % central), pour les icônes rognées.
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // Polices : le site est en français, seuls les sous-ensembles latin et latin étendu servent hors connexion.
        // Les autres restent servis en ligne si un caractère en a besoin (unicode-range), sans peser sur le précache.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        // Le bundle principal embarque le paquet de données (plus de 1,6 Mo). Au-delà de cette limite, Workbox
        // exclurait le fichier du précache sans erreur et le site ne marcherait plus hors connexion :
        // e2e/hors-ligne.spec.ts vérifie que tout fichier utile de dist/ est bien précaché.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  build: { target: 'es2023' },
  // Les tests de bout en bout tournent sur `vite preview` : il sert les mêmes en-têtes que le site en ligne (CSP
  // comprise), lus dans le Caddyfile, pour qu'une violation de la CSP fasse échouer la CI (e2e/csp.spec.ts).
  preview: { headers: lireEntetesCaddy() },
});
