/**
 * Badges (spécification J5) : obtenus pour l'usage, jamais pour le contenu. Aucun badge ne dépend du sens d'une
 * réponse ni d'un candidat ; ils incitent à lire les sources. Stockés sur le téléphone, effacés par « tout effacer ».
 * On ne retient ni nom de candidat ni réponse : seulement des compteurs et des empreintes numériques d'adresses lues.
 */
import { THEMES } from './libelles.ts';
import type { Partie } from './jeu.ts';

export const SOURCES_POUR_ENQUETEUR = 10;

export interface EtatBadges {
  version: 1;
  /** Chapitres rencontrés dans des parties terminées. */
  chapitres: string[];
  campagneTerminee: boolean;
  /** Empreintes numériques des sources ouvertes (distinctes), plafonnées. */
  sources: number[];
  /** Le détail des désaccords les plus forts d'un candidat, avec extraits, a été ouvert. */
  desaccordsLus: boolean;
}

export const BADGES_VIDES: EtatBadges = { version: 1, chapitres: [], campagneTerminee: false, sources: [], desaccordsLus: false };

export interface Badge {
  id: 'chapitres' | 'campagne' | 'enqueteur' | 'contradicteur';
  nom: string;
  description: string;
  obtenu: boolean;
  /** Avancement lisible (« 4 sur 11 »), pour les badges à compteur. */
  avancement?: string;
}

/** Empreinte numérique d'une adresse (djb2) : on ne garde pas l'adresse elle-même. */
export function empreinte(texte: string): number {
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = ((h * 33) ^ texte.charCodeAt(i)) >>> 0;
  return h;
}

export function apresPartie(b: EtatBadges, p: Pick<Partie, 'mode' | 'chapitres'>): EtatBadges {
  return {
    ...b,
    chapitres: [...new Set([...b.chapitres, ...p.chapitres.map((c) => c.theme)])].sort(),
    campagneTerminee: b.campagneTerminee || p.mode === 'campagne',
  };
}

export function apresSource(b: EtatBadges, url: string): EtatBadges {
  const e = empreinte(url);
  if (b.sources.includes(e) || b.sources.length >= SOURCES_POUR_ENQUETEUR) return b;
  return { ...b, sources: [...b.sources, e] };
}

export function apresDesaccordsLus(b: EtatBadges): EtatBadges {
  return b.desaccordsLus ? b : { ...b, desaccordsLus: true };
}

export function badgesDe(b: EtatBadges): Badge[] {
  const nThemes = Object.keys(THEMES).length;
  const explores = b.chapitres.filter((t) => t in THEMES).length;
  return [
    {
      id: 'chapitres',
      nom: 'Tous les chapitres explorés',
      description: `Avoir rencontré les ${nThemes} chapitres dans vos parties.`,
      obtenu: explores >= nThemes,
      avancement: `${explores} sur ${nThemes}`,
    },
    { id: 'campagne', nom: 'Partie Campagne terminée', description: 'Avoir terminé une partie de 60 questions.', obtenu: b.campagneTerminee },
    {
      id: 'enqueteur',
      nom: 'Enquêteur',
      description: `Avoir ouvert ${SOURCES_POUR_ENQUETEUR} sources différentes.`,
      obtenu: b.sources.length >= SOURCES_POUR_ENQUETEUR,
      avancement: `${b.sources.length} sur ${SOURCES_POUR_ENQUETEUR}`,
    },
    {
      id: 'contradicteur',
      nom: 'Contradicteur',
      description: 'Avoir lu les extraits des trois désaccords les plus forts avec un candidat.',
      obtenu: b.desaccordsLus,
    },
  ];
}
