import { expect, test } from '@playwright/test';
import { lancer, repondreATout } from './outils.ts';

// Ici les animations sont activées (le reste de la suite les réduit).
test.use({ reducedMotion: 'no-preference' });

test("un second tap sur l'ancienne carte, pendant sa sortie, ne remplace pas la réponse donnée", async ({ page }) => {
  await lancer(page, 'Express');
  // Deux taps rapprochés : « plutôt d'accord », puis « pas du tout d'accord » sur la carte qui part.
  // Script en chaîne : ce projet de test n'a pas les types du navigateur.
  await page.evaluate(`(async () => {
    const bouton = (nom) => [...document.querySelectorAll('button')].find((b) => b.textContent === nom);
    const pasdutout = bouton("Pas du tout d'accord");
    bouton("Plutôt d'accord").click();
    await new Promise((r) => setTimeout(r, 60)); // un tap suivant, avant la fin de la sortie (0,2 s)
    pasdutout.click();
  })()`);

  await expect(page.getByText('2 / 20')).toBeVisible();
  await page.getByRole('button', { name: '← Question précédente' }).click();
  await expect(page.getByRole('button', { name: "Plutôt d'accord" })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: "Pas du tout d'accord" })).toHaveAttribute('aria-pressed', 'false');
});

test('la révélation des résultats : suspense, puis classement, puis le reste de la page', async ({ page }) => {
  await lancer(page, 'Express');
  await repondreATout(page, 20);
  await expect(page.getByRole('status').filter({ hasText: 'Calcul de votre rapprochement' })).toBeVisible();
  // Tant que la révélation court, ni les hors classement ni les mentions de neutralité de bas de page ne sont perdues :
  // les mentions fixes sont toujours là.
  await expect(page.getByText(/Les votes au Parlement n'entrent/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hors classement' })).toBeVisible({ timeout: 15_000 });
});

test("« Passer l'animation » affiche tout de suite le résultat", async ({ page }) => {
  await lancer(page, 'Express');
  await repondreATout(page, 20);
  await page.getByRole('button', { name: "Passer l'animation" }).click();
  await expect(page.getByRole('heading', { name: 'Hors classement' })).toBeVisible();
});
