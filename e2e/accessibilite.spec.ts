import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { lancer, repondreATout } from './outils.ts';

async function verifier(page: Page, nom: string): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(r.violations.map((v) => `${nom} : ${v.id} (${v.nodes.length})`), nom).toEqual([]);
}

for (const theme of ['dark', 'light'] as const) {
test.describe(`thème ${theme === 'dark' ? 'sombre' : 'clair'}`, () => {
test.use({ colorScheme: theme });

test('accueil, vie privée, méthode, candidats, questions', async ({ page }) => {
  await page.goto('/');
  await verifier(page, 'accueil');
  await page.getByRole('button', { name: 'Vie privée' }).click();
  await verifier(page, 'vie privée');
  await page.getByRole('button', { name: '← Retour' }).click();
  await page.getByRole('button', { name: 'Méthode', exact: true }).click();
  await verifier(page, 'méthode (en bref)');
  await page.getByRole('tab', { name: 'Méthodologie' }).click();
  await verifier(page, 'méthodologie');
  await page.getByRole('tab', { name: 'Rapport de neutralité' }).click();
  await verifier(page, 'rapport de neutralité');
  await page.getByRole('button', { name: '← Retour' }).click();
  await page.getByRole('button', { name: 'Questions', exact: true }).click();
  await verifier(page, 'banque de questions');
  await page.getByRole('button', { name: '← Retour' }).click();
  await page.getByRole('button', { name: 'Candidats', exact: true }).click();
  await verifier(page, 'candidats');
  await page.getByRole('button', { name: /Marine Le Pen/ }).click();
  await page.locator('summary').first().click();
  await verifier(page, 'fiche candidat');
});

test('préparation, question, résultats, défi', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Express ·/ }).click();
  await verifier(page, 'préparation');
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await verifier(page, 'question');
  // Jusqu'à la première fin de chapitre.
  let repondues = 0;
  while (!(await page.getByRole('button', { name: /^Continuer/ }).isVisible())) {
    const avant = await page.getByRole('heading', { level: 1 }).first().innerText();
    await page.getByRole('button', { name: "Plutôt d'accord" }).first().click();
    await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText(avant);
    repondues++;
  }
  await verifier(page, 'fin de chapitre');
  await repondreATout(page, 20 - repondues);
  await verifier(page, 'résultats');
  await page.getByRole('button', { name: /Jouer au défi/ }).click();
  await verifier(page, 'défi (devinette)');
  await page.getByRole('list', { name: 'Candidats proposés' }).getByRole('button').first().click();
  await verifier(page, 'défi (révélation)');
});

});
}

test('lancer() atteint bien la première question', async ({ page }) => {
  await lancer(page, 'Express');
  await expect(page.getByRole('button', { name: "Plutôt d'accord" })).toBeVisible();
});
