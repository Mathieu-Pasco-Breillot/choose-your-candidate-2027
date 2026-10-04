import { expect, test, type Page } from '@playwright/test';

// Lot 5g : statut « évalué » (40 % des questions actives codées) et part codée sur chaque fiche ; nom de la mascotte.

async function ouvrirFiche(page: Page, nom: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Candidats', exact: true }).click();
  await page.locator('main ul li button', { hasText: nom }).click();
  await expect(page.getByRole('heading', { level: 1, name: nom })).toBeVisible();
}

test('un candidat codé sur au moins 40 % des questions est « Évalué », avec sa part codée', async ({ page }) => {
  await ouvrirFiche(page, 'Jean-Luc Mélenchon');
  await expect(page.getByText('Statut :')).toContainText('Évalué');
  await expect(page.getByTestId('couverture')).toContainText(/47,1\s%/);
  await expect(page.getByTestId('couverture')).toContainText(/40,0\s%/);
});

test('un candidat sous le seuil reste comparé, codage en cours, avec sa part codée', async ({ page }) => {
  await ouvrirFiche(page, 'Édouard Philippe');
  await expect(page.getByText('Statut :')).toContainText('Comparé dans les résultats, codage en cours');
  await expect(page.getByTestId('couverture')).toContainText(/22,3\s%/);
});

test('la mascotte porte son nom sur l’accueil', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('figure figcaption')).toHaveText('Urnie');
});
