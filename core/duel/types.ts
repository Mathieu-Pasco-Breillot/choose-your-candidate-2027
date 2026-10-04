/**
 * Types du mode « Duel avec un candidat » (addendum à la spécification, phase-5/specification-mode-duel.md).
 *
 * Le duel pose des propositions tirées de ce que le candidat choisi porte : on ne cherche pas les
 * questions qui séparent les candidats, mais celles qui couvrent bien son programme. Le tirage ne lit donc
 * aucune position (ni code, ni nature, ni extrait) : seul compte le fait qu'une position publiée existe.
 */
import type { PoidsTheme, QuestionVue, QuotaTheme } from '../tirage/index.ts';

/** Taille d'un duel : 20, 40 ou 60 propositions, ou tout le programme du candidat. */
export type TailleDuel = 20 | 40 | 60 | 'tout';

export const TAILLES_DUEL: readonly TailleDuel[] = [20, 40, 60, 'tout'];

/**
 * P24 : en dessous de ce nombre de propositions, le duel n'est pas proposé pour un candidat
 * (même valeur que le seuil de classement, D13 : sous 8 propositions répondues, aucun score).
 */
export const PROPOSITIONS_MIN_DUEL = 8;

/** Paramètres d'un tirage de duel, fournis par l'interface. */
export interface ParametresDuel {
  readonly taille: TailleDuel;
  /** Poids par identifiant de thème, de 0 (thème non tiré) à 3. Un thème absent prend le poids 1. */
  readonly poids: Readonly<Partial<Record<string, PoidsTheme>>>;
  readonly vues: readonly QuestionVue[];
  /** Entier de 0 à 2³² − 1, tiré à l'ouverture du duel. */
  readonly graine: number;
}

export class ErreurDuel extends Error {}

export interface ChapitreDuel {
  readonly theme: string;
  /** Identifiants des propositions, dans l'ordre de passage. */
  readonly questions: readonly string[];
}

export type EntreeJournalDuel = {
  readonly question_id: string;
  readonly theme: string;
  /** Rang de la place dans le quota du thème (1 = première place). */
  readonly place: number;
  /** `non_vue` : jamais vue ; `vue` : toutes les propositions non vues du thème étaient épuisées. */
  readonly origine: 'non_vue' | 'vue';
  readonly vue_le: string | null;
  readonly filtre_sens: 'aucun' | 'deficit_du_theme' | 'deficit_global' | 'impossible';
  readonly axe_ecarte: string | null;
  /** Nombre de propositions entre lesquelles le tirage uniforme a choisi. */
  readonly candidates: number;
};

export interface JournalDuel {
  readonly graine: number;
  readonly candidat: string;
  readonly taille: TailleDuel;
  /** Nombre de propositions visé : la taille, ou toutes celles des thèmes non écartés pour « tout ». */
  readonly N: number;
  readonly questions_tirees: number;
  readonly stock_insuffisant: boolean;
  /** Propositions du candidat dans le réservoir (tous thèmes). */
  readonly propositions_disponibles: number;
  /**
   * Quotas par thème. Le poids de calcul des quotas est « propositions du thème × poids choisi » : les parts
   * théoriques en découlent. `poids` est le poids choisi par l'utilisateur.
   */
  readonly quotas: readonly QuotaTheme[];
  readonly questions: readonly EntreeJournalDuel[];
}

export interface ResultatDuel {
  readonly graine: number;
  readonly candidat: string;
  readonly taille: TailleDuel;
  readonly chapitres: readonly ChapitreDuel[];
  /** Toutes les propositions, dans l'ordre de passage. */
  readonly questions: readonly string[];
  readonly journal: JournalDuel;
}
