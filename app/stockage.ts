/**
 * Stockage local (navigateur) : partie en cours ou terminée, questions déjà vues.
 * Rien ne quitte le téléphone. Toute lecture ou écriture est protégée : le site fonctionne sans stockage.
 */
import type { QuestionVue } from '../core/tirage/index.ts';
import { BADGES_VIDES } from './badges.ts';
import type { EtatBadges } from './badges.ts';
import type { Partie } from './jeu.ts';
import { questionsParId } from './jeu.ts';
import { paquet } from './paquet.ts';

const CLE_PARTIE = 'isoloir:partie';
const CLE_VUES = 'isoloir:vues';
const CLE_BADGES = 'isoloir:badges';
export const EVENEMENT_BADGES = 'isoloir:badges';

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
  if (!p || p.version !== 2 || p.empreinte !== paquet.empreinte) return null;
  if (!Array.isArray(p.questions) || !p.questions.every((id) => questionsParId.has(id))) return null;
  if (!Number.isInteger(p.position) || p.position < 0 || p.position > p.questions.length) return null;
  if (typeof p.poids !== 'object' || p.poids === null || !Array.isArray(p.affinites)) return null;
  return p;
}

export const ecrirePartie = (p: Partie): void => ecrire(CLE_PARTIE, p);

export function lireVues(): QuestionVue[] {
  const v = lire(CLE_VUES);
  return Array.isArray(v) ? (v as QuestionVue[]).filter((x) => typeof x?.id === 'string' && typeof x?.date === 'string') : [];
}

export const ecrireVues = (v: readonly QuestionVue[]): void => ecrire(CLE_VUES, v);

export function lireBadges(): EtatBadges {
  const b = lire(CLE_BADGES) as Partial<EtatBadges> | null;
  if (!b || b.version !== 1 || !Array.isArray(b.chapitres) || !Array.isArray(b.sources)) return BADGES_VIDES;
  return {
    version: 1,
    chapitres: b.chapitres.filter((t): t is string => typeof t === 'string'),
    campagneTerminee: b.campagneTerminee === true,
    sources: b.sources.filter((n): n is number => typeof n === 'number'),
    desaccordsLus: b.desaccordsLus === true,
  };
}

export const ecrireBadges = (b: EtatBadges): void => ecrire(CLE_BADGES, b);

/** Met à jour les badges (lecture, transformation, écriture) et renvoie le nouvel état. */
export function majBadges(f: (b: EtatBadges) => EtatBadges): EtatBadges {
  const suivant = f(lireBadges());
  ecrireBadges(suivant);
  // Prévient les écrans qui affichent les badges (aucune donnée ne circule : un simple signal local).
  (globalThis as unknown as { dispatchEvent?: (e: Event) => boolean }).dispatchEvent?.(new Event(EVENEMENT_BADGES));
  return suivant;
}

/** Bouton « tout effacer ». */
export function toutEffacer(): void {
  try {
    localStorage.removeItem(CLE_PARTIE);
    localStorage.removeItem(CLE_VUES);
    localStorage.removeItem(CLE_BADGES);
  } catch {
    /* rien à effacer */
  }
}
