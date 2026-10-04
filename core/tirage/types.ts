/**
 * Types et paramètres du tirage stratifié (spécification de l'application, § 7 ; méthodologie v1.1, § 7).
 */

/** Modes de jeu (spécification, J2). */
export type Mode = 'express' | 'debat' | 'campagne' | 'semi' | 'marathon' | 'ultra';

export const MODES: readonly Mode[] = ['express', 'debat', 'campagne', 'semi', 'marathon', 'ultra'];

/** Nombre de questions N par mode. */
export const TAILLE_MODE: Readonly<Record<Mode, number>> = {
  express: 20,
  debat: 40,
  campagne: 60,
  semi: 100,
  marathon: 150,
  ultra: 200,
};

/** Nombre d'ancres prévu par mode (méthodologie, D11). */
export const ANCRES_MODE: Readonly<Record<Mode, number>> = {
  express: 5,
  debat: 10,
  campagne: 10,
  semi: 10,
  marathon: 10,
  ultra: 10,
};

/** Minimum d'ancres de chaque sens (méthodologie § 7.2 : quatre ; D11 : deux en mode court). */
export const ANCRES_MIN_PAR_SENS_MODE: Readonly<Record<Mode, number>> = {
  express: 2,
  debat: 4,
  campagne: 4,
  semi: 4,
  marathon: 4,
  ultra: 4,
};

/** Contraintes de l'ancrage (méthodologie § 7.2, D6). */
export const ANCRES_PAR_THEME_MAX = 1;
export const ANCRES_PAR_AXE_MAX = 3;

/** Poids d'un thème choisi par l'utilisateur, de 0 (thème non tiré) à 3. 1 par défaut (spécification, § 6). */
export type PoidsTheme = 0 | 1 | 2 | 3;
export const POIDS_PAR_DEFAUT: PoidsTheme = 1;

/** Une question déjà vue lors d'une partie précédente, avec la date (ISO 8601) où elle a été vue. */
export interface QuestionVue {
  readonly id: string;
  readonly date: string;
}

/**
 * Paramètres d'un tirage, fournis par l'interface.
 *
 * Il n'y a délibérément aucun champ pour les affinités déclarées ni pour une donnée par candidat :
 * le tirage n'en dépend pas (spécification, § 7.3). Un objet littéral portant un tel champ est refusé
 * à la compilation, et `tirer` ne lit que les quatre champs ci-dessous.
 */
export interface ParametresTirage {
  readonly mode: Mode;
  /** Poids par identifiant de thème. Un thème absent prend le poids par défaut (1). */
  readonly poids: Readonly<Partial<Record<string, PoidsTheme>>>;
  readonly vues: readonly QuestionVue[];
  /** Entier de 0 à 2³² − 1, tiré à l'ouverture du quiz et affiché sur la page de résultats. */
  readonly graine: number;
}

export class ErreurTirage extends Error {}

// ── Journal de tirage (page « Méthode ») ───────────────────────────────────────────────────────

/** Ligne de quota d'un thème (étape 2). */
export interface QuotaTheme {
  readonly theme: string;
  readonly poids: PoidsTheme;
  /** Questions actives du thème. */
  readonly stock: number;
  /** Part théorique N × poids / Σ poids, avant minimum et plafond. */
  readonly part_theorique: number;
  readonly quota: number;
  /** Quota limité au nombre de questions actives du thème ; l'excédent a été redistribué. */
  readonly plafonne: boolean;
  /** Quota relevé à 1 (minimum d'une question par thème de poids non nul). */
  readonly minimum_applique: boolean;
  /** A reçu une place au titre des plus grands restes. */
  readonly place_au_reste: boolean;
  /** Rang tiré au sort qui départage les restes égaux (1 = prioritaire). */
  readonly rang_departage: number;
}

export type MotifEcartAncre = 'theme_a_zero' | 'quota_du_theme_atteint';

export interface JournalAncres {
  /** Ancres prévues par derive/ancrage.json pour ce mode (liste éventuellement incomplète, § 7.5). */
  readonly prevues: readonly string[];
  readonly ecartees: readonly { readonly question_id: string; readonly motif: MotifEcartAncre }[];
  /** Ancres de remplacement, prises dans l'ordre du classement d'ancrage. */
  readonly remplacements: readonly string[];
  /** Ancres finalement posées (ancres prévues conservées, puis remplacements). */
  readonly retenues: readonly string[];
  /** Vrai si la contrainte « une ancre par thème » a dû être levée pour compléter les remplacements. */
  readonly contrainte_un_par_theme_levee: boolean;
  /** Places d'ancre restées libres faute de question éligible : elles reviennent au tirage ordinaire. */
  readonly places_non_pourvues: number;
}

export type FiltreSens = 'aucun' | 'deficit_du_theme' | 'deficit_global' | 'impossible';

/** Pourquoi une question a été tirée. */
export type EntreeJournal =
  | {
      readonly question_id: string;
      readonly theme: string;
      readonly motif: 'ancre' | 'ancre_de_remplacement';
    }
  | {
      readonly question_id: string;
      readonly theme: string;
      readonly motif: 'quota';
      /** Rang de la place dans le quota du thème (1 = première place après les ancres). */
      readonly place: number;
      /** `non_vue` : question jamais vue ; `vue` : toutes les questions non vues du thème étaient épuisées. */
      readonly origine: 'non_vue' | 'vue';
      /** Date où la question avait été vue (si `origine` vaut `vue`). */
      readonly vue_le: string | null;
      readonly filtre_sens: FiltreSens;
      /** Axe écarté par le filtre d'axe, ou null. */
      readonly axe_ecarte: string | null;
      /** Nombre de questions entre lesquelles le tirage pondéré a choisi. */
      readonly candidates: number;
      /** Poids de la question dans ce tirage : 1 + 3 × D / D_max, ou 1 si D n'est pas défini. */
      readonly poids_tirage: number;
    };

export interface JournalTirage {
  readonly graine: number;
  readonly mode: Mode;
  readonly N: number;
  /** Nombre de questions effectivement tirées (inférieur à N si le stock des thèmes choisis ne suffit pas). */
  readonly questions_tirees: number;
  readonly stock_insuffisant: boolean;
  /** Vrai si N permettait de donner au moins une question à chaque thème de poids non nul. */
  readonly minimum_par_theme_applicable: boolean;
  /** Plus grand D parmi les questions actives (dénominateur des poids de tirage), ou null. */
  readonly d_max: number | null;
  /** D et l'ancrage sont calculés sur un codage partiel (spécification, § 7.5). */
  readonly provisoire: boolean;
  readonly quotas: readonly QuotaTheme[];
  readonly ancres: JournalAncres;
  /** Une entrée par question, dans l'ordre de passage. */
  readonly questions: readonly EntreeJournal[];
}

export interface Chapitre {
  readonly theme: string;
  /** Identifiants des questions, dans l'ordre de passage. */
  readonly questions: readonly string[];
}

export interface ResultatTirage {
  readonly graine: number;
  readonly mode: Mode;
  /** Un chapitre par thème tiré, dans l'ordre de passage. */
  readonly chapitres: readonly Chapitre[];
  /** Toutes les questions, dans l'ordre de passage (concaténation des chapitres). */
  readonly questions: readonly string[];
  readonly journal: JournalTirage;
}
