import { expect, test, type Page } from '@playwright/test';
import { lancer, repondreATout } from './outils.ts';

// Aucun défilement horizontal sur un téléphone étroit (360 px), même avec les détails et sources dépliés.
test.use({ viewport: { width: 360, height: 780 } });

const largeur = (page: Page) => page.evaluate(`document.documentElement.scrollWidth`);

test('accueil, préparation et résultats dépliés tiennent dans 360 px', async ({ page }) => {
  await page.goto('/');
  expect(await largeur(page)).toBeLessThanOrEqual(360);
  await lancer(page, 'Express');
  await repondreATout(page, 20);
  const voir = page.getByRole('button', { name: /Voir le détail/ });
  while ((await voir.count()) > 0) await voir.first().click();
  expect(await largeur(page)).toBeLessThanOrEqual(360);
});

test('toutes les fiches candidat, chapitres dépliés, tiennent dans 360 px', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Candidats', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Comparés/ })).toBeVisible();
  const n = await page.locator('main ul li button').count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await page.locator('main ul li button').nth(i).click();
    await expect(page.getByRole('button', { name: '← Retour' })).toBeVisible();
    for (const s of await page.locator('summary').all()) await s.click();
    expect(await largeur(page), await page.getByRole('heading', { level: 1 }).innerText()).toBeLessThanOrEqual(360);
    await page.getByRole('button', { name: '← Retour' }).click();
    await expect(page.getByRole('heading', { name: /^Comparés/ })).toBeVisible();
  }
});
