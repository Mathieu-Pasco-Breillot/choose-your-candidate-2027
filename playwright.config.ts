import { defineConfig, devices } from '@playwright/test';

// Parcours de bout en bout sur un écran de téléphone, contre le site construit (`npm run build`).
// En local, PLAYWRIGHT_CHROMIUM_PATH peut désigner un Chromium déjà installé ; en CI, `npx playwright install chromium`.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['Pixel 7'],
    // Animations réduites : parcours plus rapides et plus stables (le site respecte prefers-reduced-motion).
    reducedMotion: 'reduce',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
