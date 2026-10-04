import { expect, test, type Page } from '@playwright/test';
import { repondreATout, surveillerErreurs, surveillerReseau } from './outils.ts';

/**
 * La CSP du site en ligne, testée en CI (lot 5g) : `vite preview` sert les en-têtes lus dans le Caddyfile
 * (vite.config.ts). Ce parcours relève tout événement `securitypolicyviolation` et tout message de console qui
 * signale une violation, et en exige zéro.
 */

async function surveillerCsp(page: Page): Promise<() => Promise<string[]>> {
  const console_: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Content-Security-Policy/i.test(m.text())) console_.push(m.text());
  });
  // Script injecté par le navigateur de test (hors CSP de la page) : il écoute les violations dès le chargement.
  await page.addInitScript(`
    window.__violations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__violations.push(e.violatedDirective + ' ' + (e.blockedURI || '(en ligne)') + ' ' + e.sourceFile + ':' + e.lineNumber);
    });
  `);
  return async () => [...console_, ...((await page.evaluate('window.__violations')) as string[])];
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`thème ${theme === 'dark' ? 'sombre' : 'clair'}`, () => {
    test.use({ colorScheme: theme });

    test('la CSP du Caddyfile est servie, et un parcours complet ne la viole jamais', async ({ page }) => {
      test.setTimeout(120_000);
      const violations = await surveillerCsp(page);
      const erreurs = surveillerErreurs(page);
      const externes = surveillerReseau(page);
      let relevees: string[] = [];
      const reponse = await page.goto('/');
      expect(reponse?.headers()['content-security-policy']).toContain("script-src 'self'");

      // Accueil : son activé, puis préparation, quiz avec fins de chapitre et résultats.
      await page.getByRole('button', { name: /Effets sonores/ }).click();
      await expect(page.getByRole('button', { name: /Effets sonores/ })).toHaveAttribute('aria-pressed', 'true');
      await page.getByRole('button', { name: /^Express ·/ }).click();
      await page.getByRole('button', { name: 'Lancer la partie' }).click();
      await repondreATout(page, 20);
      await page.getByRole('button', { name: "Passer l'animation" }).click({ timeout: 1000 }).catch(() => undefined);

      // Détail d'un candidat, puis sa fiche, puis retour.
      await page.getByRole('button', { name: /Voir le détail/ }).first().click();
      await page.getByRole('button', { name: /: ouvrir la fiche$/ }).first().click();
      await expect(page.getByRole('button', { name: '← Retour aux résultats' })).toBeVisible();
      for (const s of (await page.locator('summary').all()).slice(0, 2)) await s.click();
      await page.getByRole('button', { name: '← Retour aux résultats' }).click();

      // Défi.
      await page.getByRole('button', { name: /Jouer au défi/ }).click();
      for (let i = 0; i < 5; i++) {
        await page.getByRole('list', { name: 'Candidats proposés' }).getByRole('button').first().click();
        await page.getByRole('button', { name: /Manche suivante|Voir le total/ }).click();
      }
      await expect(page.getByRole('status')).toContainText(/sur 5/);

      // Pages chargées à la demande : Méthode, Candidats.
      await page.goto('/');
      await page.getByRole('button', { name: 'Méthode', exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.goto('/');
      await page.getByRole('button', { name: 'Candidats', exact: true }).click();
      await expect(page.getByRole('heading', { name: /^Comparés/ })).toBeVisible();

      relevees = await violations();
      expect(relevees).toEqual([]);
      expect(erreurs).toEqual([]);
      expect(externes).toEqual([]);
    });
  });
}
