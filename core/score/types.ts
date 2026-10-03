/**
 * Types d'entrée et de sortie du calcul du score.
 *
 * Ces types sont autonomes : ils ne dépendent pas du format brut des fichiers de `data/`.
 * Un adaptateur (lot 5e) convertit le paquet de données de l'application vers ces types.
 */

// ── Entrées ────────────────────────────────────────────────────────────────────────────────────

/** Échelle de la grille de codage et des réponses : de −2 (pas du tout d'accord) à +2 (tout à fait d'accord). */
export type Valeur = -2 | -1 | 0 | 1 | 2;

/** Une réponse de l'utilisateur à une question tirée. */
export interface Reponse {
  questionId: string;
  /** Identifiant du thème de la question (nom du fichier de la banque, ex. « retraites »). */
  theme: string;
  /** Valeur choisie, ou « sans_avis » (exclue de tous les calculs). */
  valeur: Valeur | 'sans_avis';
  /** Étoile « très important » : importance 2 au lieu de 1. */
  tresImportant: boolean;
}

/** Poids de chaque thème choisi par l'utilisateur : 1 à 3 (un thème à 0 n'est pas tiré). */
export type PoidsThemes = Readonly<Record<string, number>>;

/** Nature d'un code (grille de codage). */
export type NatureCodee = 'nette' | 'nuancee' | 'imprecise';

/**
 * État d'une position pour le calcul :
 *  - `publie` : code en accord entre codeurs ou arbitré ;
 *  - `non_connu` : pas de position trouvée dans les sources ;
 *  - `arbitrage_en_attente` : les deux codeurs divergent et l'arbitrage n'est pas fait ;
 *    traité comme « non connu » (méthodologie, D8), affiché « arbitrage en attente ».
 * `etatDePosition` (dans `codee.ts`) convertit les statuts des fichiers de données vers cet état.
 */
export type EtatPosition = 'publie' | 'non_connu' | 'arbitrage_en_attente';

/** Position d'un candidat sur une question. */
export interface Position {
  questionId: string;
  etat: EtatPosition;
  /** Code de −2 à +2 ; `null` si la position n'est pas connue. Le code 0 est un code. */
  code: Valeur | null;
  nature: NatureCodee | 'non_connu' | null;
}

/** Statut d'évaluation d'un candidat (`data/candidats.json`). */
export type StatutEvaluation = 'evalue' | 'codage_en_attente' | 'non_evalue';

/** Motif pour lequel un candidat n'est pas évalué. */
export type MotifNonEvaluation =
  | 'primaire_en_cours'
  | 'pressenti'
  | 'declaration_non_sourcee'
  | 'absent_liste_officielle'
  | 'codage_en_attente'
  /** Candidat `non_evalue` sans motif renseigné dans les données. */
  | 'motif_non_renseigne';

export interface Candidat {
  id: string;
  statutEvaluation: StatutEvaluation;
  motifNonEvaluation?: Exclude<MotifNonEvaluation, 'codage_en_attente' | 'motif_non_renseigne'>;
}

/**
 * Mélange fourni par l'appelant, tiré de la graine de la partie (générateur partagé, `core/aleatoire/`).
 * Doit renvoyer une permutation de la liste reçue, sans la modifier.
 */
export type Melanger = <T>(liste: readonly T[]) => T[];

export interface OptionsResultats {
  /**
   * Faut-il calculer un score pour les candidats en `codage_en_attente` ?
   * Spécification § 4 : seuls les `evalue` sont classés (valeur par défaut : `false`).
   * Au 3 octobre 2026 aucun candidat n'est `evalue` : voir le bilan du lot 5c.
   */
  inclureCodageEnAttente?: boolean;
}

export interface EntreeResultats {
  reponses: readonly Reponse[];
  poidsThemes: PoidsThemes;
  candidats: readonly Candidat[];
  /** Positions par identifiant de candidat. Un candidat absent n'a aucun code. */
  positions: Readonly<Record<string, readonly Position[]>>;
  /** Candidats cochés à l'écran de préparation (vide si « aucun »). N'entrent dans aucun score. */
  affinites?: readonly string[];
  options?: OptionsResultats;
}

// ── Sorties ────────────────────────────────────────────────────────────────────────────────────

/** Ligne de calcul d'une question répondue, pour un candidat. */
export interface LigneQuestion {
  questionId: string;
  theme: string;
  reponse: Valeur;
  tresImportant: boolean;
  etat: EtatPosition;
  code: Valeur | null;
  nature: NatureCodee | 'non_connu' | null;
  /** Vrai si la question est codée pour ce candidat (une position `imprecise` est codée). */
  codee: boolean;
  /** 4 − |réponse − position|, de 0 à 4 ; `null` si la question n'est pas codée. */
  points: number | null;
  /** poids_thème × importance. */
  poidsBase: number;
  /** poids_base × précision ; 0 si la question n'est pas codée. */
  poids: number;
}

export type Fiabilite = 'faible' | 'moyenne' | 'bonne';

/** Résultat de la formule (méthodologie § 6.1 et 6.2) sur un ensemble de questions. */
export interface Score {
  /** Questions répondues (hors « sans avis »). */
  repondues: number;
  /** Questions répondues et codées pour ce candidat (`imprecise` comprise). */
  codees: number;
  /** Σ poids(q) des questions codées. */
  sommePoids: number;
  /** Σ poids_base(q) des questions répondues. */
  sommePoidsBase: number;
  /** De 0 à 100 ; `null` si aucune question n'est codée. */
  scoreBrut: number | null;
  /** Coefficient de ramenage, de 0 à 1. */
  c: number;
  /** 50 + (score_brut − 50) × c, en décimales ; `null` si aucune question n'est codée. */
  score: number | null;
  /** Score affiché, arrondi à l'entier ; `null` si aucune question n'est codée. */
  scoreArrondi: number | null;
}

export interface DetailTheme {
  theme: string;
  /** `trop_peu_de_questions` : moins de 3 questions répondues et codées dans le thème. */
  affichage: 'affiche' | 'trop_peu_de_questions';
  score: Score;
}

export interface AccordDesaccord {
  questionId: string;
  theme: string;
  reponse: Valeur;
  code: Valeur;
  nature: NatureCodee;
  points: number;
  poids: number;
}

export interface ScoreCandidat {
  candidatId: string;
  score: Score;
  fiabilite: Fiabilite;
  /** Une ligne par question répondue, triée par identifiant de question. */
  lignes: LigneQuestion[];
  /** Détail par thème, trié par identifiant de thème. */
  themes: DetailTheme[];
  /** Accords forts (`points = 4`), par poids décroissant, cinq au plus. */
  accords: AccordDesaccord[];
  /** Désaccords forts (`points ≤ 1`), par poids décroissant, cinq au plus. */
  desaccords: AccordDesaccord[];
  /** Questions répondues dont la position est en attente d'arbitrage. */
  arbitragesEnAttente: number;
}

export interface MotifHorsClassement {
  codees: number;
  repondues: number;
  /** Moins de 10 questions codées. */
  moinsDeDix: boolean;
  /** Codé sur moins de la moitié des questions répondues. */
  moinsDeLaMoitie: boolean;
  /** Ex. « codé sur 7 de vos 20 questions ». */
  texte: string;
}

export interface Classe extends ScoreCandidat {
  /** Rang : 1 + nombre de candidats dont le score affiché est strictement supérieur. */
  rang: number;
  /** Vrai si un autre candidat a le même score affiché (même rang). */
  exAequo: boolean;
}

export interface HorsClassement extends ScoreCandidat {
  motif: MotifHorsClassement;
}

export interface NonEvalue {
  candidatId: string;
  motif: MotifNonEvaluation;
}

export type SituationAffinite =
  | { candidatId: string; situation: 'classe'; rang: number; exAequo: boolean; score: number }
  | { candidatId: string; situation: 'hors_classement'; motif: MotifHorsClassement }
  | { candidatId: string; situation: 'non_evalue'; motif: MotifNonEvaluation }
  | { candidatId: string; situation: 'inconnu' };

export interface Resultats {
  /** Nombre de questions répondues (hors « sans avis »). */
  repondues: number;
  /** Ordre d'affichage : rang croissant ; ordre entre ex aequo tiré au sort. */
  classement: Classe[];
  /** Ordre tiré au sort. */
  horsClassement: HorsClassement[];
  /** Regroupés par motif ; ordre tiré au sort à l'intérieur de chaque motif. */
  nonEvalues: NonEvalue[];
  /** Dans l'ordre où les candidats ont été cochés. */
  affinites: SituationAffinite[];
}
