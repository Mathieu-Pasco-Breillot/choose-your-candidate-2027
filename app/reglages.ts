/**
 * Réglages de l'appareil : apparence (thème) et son. Stockés en local, comme le reste ; lecture et écriture protégées
 * (le site fonctionne sans stockage, avec les valeurs par défaut : thème automatique, son coupé).
 */

import { CLE_APPARENCE, CLE_SON } from './stockage.ts';

export type Apparence = 'auto' | 'clair' | 'sombre';

/** Couleur de la barre d'état du téléphone, alignée sur le fond de chaque thème (app/index.css). */
const BARRE: Record<'clair' | 'sombre', string> = { sombre: '#0e1a33', clair: '#f4efe3' };

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: string | null): void {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
  } catch {
    /* stockage indisponible : le réglage vaut pour la visite en cours */
  }
}

export function lireApparence(): Apparence {
  const v = lire(CLE_APPARENCE);
  return v === 'clair' || v === 'sombre' ? v : 'auto';
}

/** Thème effectivement affiché : le réglage manuel, sinon la préférence du téléphone. */
export function themeEffectif(a: Apparence): 'clair' | 'sombre' {
  if (a !== 'auto') return a;
  try {
    return matchMedia('(prefers-color-scheme: light)').matches ? 'clair' : 'sombre';
  } catch {
    return 'sombre';
  }
}

/** Applique l'apparence à la page : attribut data-theme sur <html> (rien en automatique) et barre d'état. */
export function appliquerApparence(a: Apparence): void {
  const racine = document.documentElement;
  if (a === 'auto') racine.removeAttribute('data-theme');
  else racine.setAttribute('data-theme', a);
  const couleur = BARRE[themeEffectif(a)];
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    // En automatique, les deux balises (media clair / sombre) font foi ; un réglage manuel les aligne toutes deux.
    meta.content = a === 'auto' ? (meta.media.includes('light') ? BARRE.clair : BARRE.sombre) : couleur;
  }
}

export function ecrireApparence(a: Apparence): void {
  ecrire(CLE_APPARENCE, a === 'auto' ? null : a);
  appliquerApparence(a);
}

/** Son : coupé par défaut (spécification J9). */
export const lireSon = (): boolean => lire(CLE_SON) === 'oui';
export const ecrireSon = (actif: boolean): void => ecrire(CLE_SON, actif ? 'oui' : null);
