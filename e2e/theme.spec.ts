import { expect, test, type Page } from '@playwright/test';
import { lancer, repondreATout, surveillerErreurs, surveillerReseau } from './outils.ts';

const fond = (page: Page) => page.evaluate(`getComputedStyle(document.documentElement).backgroundColor`);
const SOMBRE = 'rgb(14, 26, 51)';
const CLAIR = 'rgb(244, 239, 227)';

test.describe('téléphone réglé en clair', () => {
  test.use({ colorScheme: 'light' });

  test("le thème suit le téléphone, et le réglage manuel est mémorisé jusqu'à « tout effacer »", async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => fond(page)).toBe(CLAIR);
    await page.getByText('Sombre', { exact: true }).click();
    await expect.poll(() => fond(page)).toBe(SOMBRE);
    await page.reload();
    await expect.poll(() => fond(page)).toBe(SOMBRE);
    await expect(page.getByRole('radio', { name: 'Sombre' })).toBeChecked();
    await page.getByRole('button', { name: 'Tout effacer sur cet appareil' }).click();
    await expect.poll(() => fond(page)).toBe(CLAIR);
    await expect(page.getByRole('radio', { name: 'Automatique' })).toBeChecked();
  });
});

test('le son est coupé par défaut, et son réglage est mémorisé', async ({ page }) => {
  await page.goto('/');
  const bouton = page.getByRole('button', { name: /Effets sonores/ });
  await expect(bouton).toHaveAttribute('aria-pressed', 'false');
  await bouton.click();
  await page.reload();
  await expect(page.getByRole('button', { name: /Effets sonores/ })).toHaveAttribute('aria-pressed', 'true');
});

test('son activé : une partie Express complète, sans erreur ni requête (sons générés dans le navigateur)', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  const externes = surveillerReseau(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Effets sonores/ }).click();
  await page.getByRole('button', { name: /^Express ·/ }).click();
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await repondreATout(page, 20);
  expect(erreurs).toEqual([]);
  expect(externes).toEqual([]);
});

/** Couleur de base et opacité d'une couleur calculée : « oklab(L a b / 0.45) » ou « rgba(r, g, b, 0.45) ». */
function decomposer(c: string): { base: string; opacite: number } {
  const n = c.match(/-?[\d.]+/g)!.map(Number);
  return { base: n.slice(0, 3).map((x) => x.toFixed(3)).join(' '), opacite: n[3] ?? 1 };
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`thème ${theme === 'dark' ? 'sombre' : 'clair'}`, () => {
    test.use({ colorScheme: theme });

    test("une seule teinte pour l'échelle de réponse, symétrique autour du centre, et une seule couleur pour les barres de score", async ({ page }) => {
      await lancer(page, 'Express');
      const couleurs = (await page.evaluate(`(() => {
        const libelles = ["Tout à fait d'accord", "Plutôt d'accord", "Ni d'accord, ni pas d'accord", "Plutôt pas d'accord", "Pas du tout d'accord"];
        const boutons = [...document.querySelectorAll('button')];
        return libelles.map((l) => getComputedStyle(boutons.find((b) => b.textContent === l)).backgroundColor);
      })()`)) as string[];
      const d = couleurs.map(decomposer);
      // Une seule teinte (l'accent du thème) pour les cinq boutons : aucune couleur d'accord ou de désaccord.
      expect(new Set(d.map((x) => x.base)).size).toBe(1);
      // Intensité croissante de part et d'autre du centre, symétrique.
      expect(d[0]!.opacite).toBe(d[4]!.opacite);
      expect(d[1]!.opacite).toBe(d[3]!.opacite);
      expect(d[0]!.opacite).toBeGreaterThan(d[1]!.opacite);
      expect(d[1]!.opacite).toBeGreaterThan(d[2]!.opacite);

      await repondreATout(page, 20);
      await page.getByRole('button', { name: "Passer l'animation" }).click({ timeout: 1000 }).catch(() => undefined);
      const barres = (await page.evaluate(`[...document.querySelectorAll('[data-barre-score]')].map((b) => getComputedStyle(b).backgroundColor)`)) as string[];
      expect(barres.length).toBeGreaterThan(0);
      expect(new Set(barres).size).toBe(1);
    });
  });
}
