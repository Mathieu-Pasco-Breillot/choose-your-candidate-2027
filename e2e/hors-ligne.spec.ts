import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { repondreATout, surveillerErreurs } from './outils.ts';

// PWA : après une première visite, le site fonctionne sans connexion (spécification § 2.1).
// Le service worker précache tout le site, y compris les pages chargées à la demande (Méthode, Candidats, Questions).

async function installerPuisCouper(page: Page, erreurs: string[]): Promise<void> {
  await page.goto('/');
  // Service worker installé et actif (précache rempli) ; il prend la main sur la page au rechargement suivant.
  await page.evaluate(`navigator.serviceWorker.ready.then(() => true)`);
  await page.reload();
  await expect.poll(() => page.evaluate(`!!navigator.serviceWorker.controller`)).toBe(true);
  await page.context().setOffline(true);
  // Le réseau est réellement coupé : une adresse hors précache ne répond plus.
  const reseau = await page.evaluate(`fetch('/inexistant-' + Date.now() + '.txt', { cache: 'no-store' }).then(() => 'joignable', () => 'coupe')`);
  expect(reseau).toBe('coupe');
  erreurs.length = 0; // l'échec attendu de cette sonde n'est pas une erreur du site
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mon Isoloir', level: 1 })).toBeVisible();
}

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? fichiers(chemin) : [chemin];
  });
}

test('le précache contient tous les fichiers du site, paquet de données et pages à la demande compris', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(`navigator.serviceWorker.ready.then(() => true)`);
  const precache = (await page.evaluate(`(async () => {
    const urls = [];
    for (const nom of await caches.keys()) {
      for (const r of await (await caches.open(nom)).keys()) urls.push(new URL(r.url).pathname);
    }
    return urls;
  })()`)) as string[];
  const dist = join(import.meta.dirname, '..', 'dist');
  const attendus = fichiers(dist)
    .map((f) => '/' + relative(dist, f).split('\\').join('/'))
    // Exclus volontairement (vite.config.ts) : le service worker lui-même et les polices non latines.
    .filter((f) => !/^\/(sw\.js|workbox-[\w-]+\.js)$/.test(f) && !/-(cyrillic|cyrillic-ext|greek|greek-ext|vietnamese)-.*\.woff2$/.test(f));
  const manquants = attendus.filter((f) => !precache.includes(f));
  expect(manquants).toEqual([]);
});

test('hors connexion : une partie Express complète, puis le défi', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await installerPuisCouper(page, erreurs);
  await page.getByRole('button', { name: /^Express ·/ }).click();
  await page.getByRole('button', { name: 'Lancer la partie' }).click();
  await repondreATout(page, 20);
  await page.getByRole('button', { name: "Passer l'animation" }).click({ timeout: 1000 }).catch(() => undefined);
  await expect(page.getByText('sur 20 questions')).toBeVisible();
  await page.getByRole('button', { name: /Jouer au défi/ }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('list', { name: 'Candidats proposés' }).getByRole('button').first().click();
    await page.getByRole('button', { name: /Manche suivante|Voir le total/ }).click();
  }
  await expect(page.getByRole('status')).toContainText(/sur 5/);
  expect(erreurs).toEqual([]);
});

test('hors connexion : les pages Méthode, Candidats et Questions se chargent', async ({ page }) => {
  const erreurs = surveillerErreurs(page);
  await installerPuisCouper(page, erreurs);
  await page.getByRole('button', { name: 'Méthode', exact: true }).click();
  await page.getByRole('tab', { name: 'Méthodologie' }).click();
  await expect(page.getByRole('tabpanel')).not.toBeEmpty();
  await expect(page.getByRole('tabpanel').getByRole('heading').first()).toBeVisible();
  await page.getByRole('button', { name: '← Retour' }).click();
  await page.getByRole('button', { name: 'Candidats', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Candidats', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /Marine Le Pen/ }).click();
  await expect(page.getByRole('heading', { name: 'Marine Le Pen', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: /Retour/ }).first().click();
  await page.getByRole('button', { name: '← Retour' }).click();
  await page.getByRole('button', { name: 'Questions', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Chargement…');
  expect(erreurs).toEqual([]);
});
