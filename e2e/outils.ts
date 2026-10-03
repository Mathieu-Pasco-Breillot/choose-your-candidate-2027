import { expect, type Page } from '@playwright/test';

/** Enregistre toute requête qui ne vise pas le site lui-même (il ne doit y en avoir aucune). */
export function surveillerReseau(page: Page): string[] {
  const externes: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:')) externes.push(url);
  });
  return externes;
}

export function surveillerErreurs(page: Page): string[] {
  const erreurs: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erreurs.push(m.text());
  });
  page.on('pageerror', (e) => erreurs.push(String(e)));
  return erreurs;
}

/** Répond « plutôt d'accord » à toutes les questions du quiz en cours. */
export async function repondreATout(page: Page, nombre: number): Promise<void> {
  for (let i = 0; i < nombre; i++) {
    // On attend le changement d'écran entre deux réponses : l'ancienne carte met un instant à partir.
    const avant = await page.getByRole('heading', { level: 1 }).first().innerText();
    await page.getByRole('button', { name: "Plutôt d'accord" }).first().click();
    await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText(avant);
  }
  await expect(page.getByText('Vos résultats')).toBeVisible();
}

export async function lancer(page: Page, mode: 'Express' | 'Débat' | 'Campagne'): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(`^${mode} ·`) }).click();
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
}

/** Répond à `nombre` questions sans aller jusqu'aux résultats. */
export async function repondreQuelques(page: Page, nombre: number): Promise<void> {
  for (let i = 0; i < nombre; i++) {
    const avant = await page.getByRole('heading', { level: 1 }).first().innerText();
    await page.getByRole('button', { name: "Plutôt d'accord" }).first().click();
    await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText(avant);
  }
}
