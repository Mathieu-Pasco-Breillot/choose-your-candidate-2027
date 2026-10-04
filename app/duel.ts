/**
 * Logique d'un duel avec un candidat : tirage, réponses, révélation, affinité. Fonctions pures (le stockage est
 * dans stockage.ts), appuyées sur core/duel (phase-5/specification-mode-duel.md).
 *
 * Contrairement à une partie classique, le candidat est nommé dès le départ et sa position est révélée après
 * chaque réponse. Le parcours reste enregistré question par question : une réponse donnée dont la position n'a
 * pas encore été « passée » (bouton « Suite ») se retrouve à la reprise sur l'écran de révélation.
 */
import { creerGenerateur, deriverGraine, melanger } from '../core/aleatoire/prng.ts';
import { calculerAffinite, creerReservoirDuel, decrireDuel, duelDisponible, propositionsParTheme, tirerDuel } from '../core/duel/index.ts';
import type { AffiniteDuel, ReservoirDuel, TailleDuel } from '../core/duel/index.ts';
import type { Position, Reponse } from '../core/score/types.ts';
import type { PoidsTheme, QuestionVue } from '../core/tirage/index.ts';
import type { Parcours, ReponseSaisie } from './jeu.ts';
import { questionsParId } from './jeu.ts';
import type { CandidatPaquet, PositionPaquet } from './paquet.ts';
import { paquet } from './paquet.ts';

export interface PartieDuel extends Parcours {
  version: 1;
  /** Identifiant du candidat choisi. */
  candidat: string;
  taille: TailleDuel;
  graine: number;
  /** Empreinte des données au moment du tirage : un duel sauvegardé avec d'autres données est écarté. */
  empreinte: string;
  /** Poids des chapitres choisis (0 = chapitre écarté). Un thème absent vaut 1. */
  poids: Record<string, PoidsTheme>;
  /** Explication du tirage (page Méthode). */
  journal?: string[];
  /** Ordre des boutons de l'échelle, inversé un duel sur deux (spécification § 5.4). */
  echelleInversee: boolean;
}

const themes = [...new Set(paquet.questions.map((q) => q.theme))];

export const positionsDe = (candidat: string): PositionPaquet[] => paquet.positions[candidat] ?? [];

const reservoirs = new Map<string, ReservoirDuel>();
/** Réservoir de propositions d'un candidat : ses positions publiées sur les questions actives de la banque. */
export function reservoirDe(candidat: string): ReservoirDuel {
  let r = reservoirs.get(candidat);
  if (!r) {
    r = creerReservoirDuel(candidat, paquet.questions, positionsDe(candidat) as Position[]);
    reservoirs.set(candidat, r);
  }
  return r;
}

export interface CandidatDuel {
  candidat: CandidatPaquet;
  /** Propositions du candidat dans la banque. */
  propositions: number;
  /** Au moins 8 propositions (P24) : le duel peut être lancé. */
  disponible: boolean;
}

/**
 * Candidats ayant au moins une proposition, par ordre alphabétique (jamais classés). Ceux qui n'atteignent pas
 * le minimum sont listés avec leur nombre de propositions, sans possibilité de lancer un duel.
 */
export function candidatsDuel(): CandidatDuel[] {
  return [...paquet.candidats]
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'))
    .map((candidat) => {
      const r = reservoirDe(candidat.id);
      return { candidat, propositions: r.propositions.length, disponible: duelDisponible(r) };
    })
    .filter((c) => c.propositions > 0);
}

/** Nombre de propositions du candidat par thème (pour la préparation : stock par chapitre). */
export const propositionsParChapitre = (candidat: string): ReadonlyMap<string, number> => propositionsParTheme(reservoirDe(candidat));

export interface PreparationDuel {
  poids: Record<string, PoidsTheme>;
}

export function nouveauDuel(candidat: string, taille: TailleDuel, vues: readonly QuestionVue[], graine: number, preparation: PreparationDuel): PartieDuel {
  const tirage = tirerDuel(reservoirDe(candidat), { taille, poids: preparation.poids, vues, graine });
  return {
    version: 1,
    candidat,
    taille,
    graine,
    empreinte: paquet.empreinte,
    chapitres: tirage.chapitres.map((c) => ({ theme: c.theme, questions: [...c.questions] })),
    questions: [...tirage.questions],
    reponses: {},
    position: 0,
    poids: { ...preparation.poids },
    journal: decrireDuel(tirage.journal),
    echelleInversee: graine % 2 === 1,
  };
}

/** Mélange l'ordre d'affichage des candidats à choisir (tiré de la graine : ni alphabétique figé, ni classement). */
export function ordreAleatoire<T>(liste: readonly T[], graine: number): T[] {
  return melanger(creerGenerateur(deriverGraine(graine, 'choix-candidat')), liste);
}

/** Question dont la réponse est donnée mais dont la position du candidat est encore à lire (écran de révélation). */
export function enRevelation(p: PartieDuel): boolean {
  const id = p.questions[p.position];
  return id !== undefined && p.reponses[id] !== undefined;
}

/** Enregistre la réponse à la question en cours, sans avancer : la position du candidat est révélée ensuite. */
export function repondreDuel(p: PartieDuel, reponse: ReponseSaisie): PartieDuel {
  const id = p.questions[p.position];
  if (id === undefined) return p;
  const tresImportant = reponse.valeur === 'sans_avis' ? false : reponse.tresImportant;
  return { ...p, reponses: { ...p.reponses, [id]: { valeur: reponse.valeur, tresImportant } } };
}

/** Passe à la proposition suivante (ou à la fin du duel). */
export function suivante(p: PartieDuel): PartieDuel {
  return p.position < p.questions.length ? { ...p, position: p.position + 1 } : p;
}

/** Efface la réponse à la question en cours pour pouvoir la donner à nouveau. */
export function modifierReponse(p: PartieDuel): PartieDuel {
  const id = p.questions[p.position];
  if (id === undefined || p.reponses[id] === undefined) return p;
  return { ...p, reponses: Object.fromEntries(Object.entries(p.reponses).filter(([k]) => k !== id)) };
}

/** Poids de calcul de chaque thème (1 à 3 ; un thème écarté n'est pas posé, son poids ne sert pas). */
const poidsDeCalcul = (p: PartieDuel): Record<string, number> =>
  Object.fromEntries(themes.map((t) => [t, p.poids[t] === undefined || p.poids[t] === 0 ? 1 : p.poids[t]!]));

/** Réponses données, dans l'ordre du duel, jusqu'à la question en cours comprise si elle est répondue. */
export function reponsesDonnees(p: PartieDuel): Reponse[] {
  const out: Reponse[] = [];
  for (const id of p.questions) {
    const saisie = p.reponses[id];
    if (saisie === undefined) continue;
    out.push({ questionId: id, theme: questionsParId.get(id)!.theme, valeur: saisie.valeur, tresImportant: saisie.tresImportant });
  }
  return out;
}

/** Affinité avec le candidat d'après les réponses données jusque-là (en direct) ou toutes (à la fin). */
export function affiniteDePartie(p: PartieDuel): AffiniteDuel {
  return calculerAffinite(p.candidat, reponsesDonnees(p), poidsDeCalcul(p), positionsDe(p.candidat) as Position[]);
}

/** Position du candidat sur une question du duel (toujours publiée : le réservoir ne contient que celles-là). */
export const positionSur = (p: PartieDuel, questionId: string): PositionPaquet | undefined =>
  positionsDe(p.candidat).find((x) => x.questionId === questionId);
