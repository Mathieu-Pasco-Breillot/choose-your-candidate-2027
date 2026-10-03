/**
 * Stockage local (navigateur) : partie en cours ou terminée, questions déjà vues.
 * Rien ne quitte le téléphone. Toute lecture ou écriture est protégée : le site fonctionne sans stockage.
 */
import type { QuestionVue } from '../core/tirage/index.ts';
import type { Partie } from './jeu.ts';
import { questionsParId } from './jeu.ts';
import { paquet } from './paquet.ts';

const CLE_PARTIE = 'isoloir:partie';
const CLE_VUES = 'isoloir:vues';

function lire(cle: string): unknown {
  try {
    const texte = localStorage.getItem(cle);
    return texte === null ? null : JSON.parse(texte);
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: unknown): void {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible : la partie continue en mémoire */
  }
}

export function lirePartie(): Partie | null {
  const p = lire(CLE_PARTIE) as Partie | null;
  if (!p || p.version !== 1 || p.empreinte !== paquet.empreinte) return null;
  if (!Array.isArray(p.questions) || !p.questions.every((id) => questionsParId.has(id))) return null;
  if (!Number.isInteger(p.position) || p.position < 0 || p.position > p.questions.length) return null;
  return p;
}

export const ecrirePartie = (p: Partie): void => ecrire(CLE_PARTIE, p);

export function lireVues(): QuestionVue[] {
  const v = lire(CLE_VUES);
  return Array.isArray(v) ? (v as QuestionVue[]).filter((x) => typeof x?.id === 'string' && typeof x?.date === 'string') : [];
}

export const ecrireVues = (v: readonly QuestionVue[]): void => ecrire(CLE_VUES, v);

/** Bouton « tout effacer ». */
export function toutEffacer(): void {
  try {
    localStorage.removeItem(CLE_PARTIE);
    localStorage.removeItem(CLE_VUES);
  } catch {
    /* rien à effacer */
  }
}
