/**
 * La formule du score (méthodologie v1.1, § 6.1 et 6.2).
 *
 * Pour un candidat, sur les questions auxquelles l'utilisateur a répondu (hors « sans avis ») :
 *
 *   points(q)     = 4 − |réponse − position|                  (de 0 à 4, questions codées seulement)
 *   poids_base(q) = poids_thème × importance                  (importance : 2 si « très important », 1 sinon)
 *   poids(q)      = poids_base(q) × précision                 (précision : 0,5 si `imprecise`, 1 sinon ;
 *                                                               0 si la question n'est pas codée)
 *   score_brut    = 100 × Σ poids(q) × points(q) / (4 × Σ poids(q))      (questions codées)
 *   c             = Σ poids(q) / Σ poids_base(q)                          (questions codées / répondues)
 *   score_affiché = 50 + (score_brut − 50) × c
 *
 * Calcul en décimales ; l'arrondi à l'entier ne sert qu'à l'affichage et à l'égalité de rang.
 */
import { estCodee } from './codee.ts';
import {
  FIABILITE_BONNE_A_PARTIR_DE,
  FIABILITE_MOYENNE_A_PARTIR_DE,
  IMPORTANCE_TRES_IMPORTANT,
  POINT_DE_RAMENAGE,
  POINTS_MAX,
  PRECISION_IMPRECISE,
} from './parametres.ts';
import type { Fiabilite, LigneQuestion, NatureCodee, Position, Reponse, Score, Valeur } from './types.ts';

/** 4 − |réponse − position| */
export function points(reponse: Valeur, position: Valeur): number {
  return POINTS_MAX - Math.abs(reponse - position);
}

/** poids_thème × importance */
export function poidsBase(poidsTheme: number, tresImportant: boolean): number {
  return poidsTheme * (tresImportant ? IMPORTANCE_TRES_IMPORTANT : 1);
}

/** 0,5 pour une position `imprecise`, 1 sinon. */
export function precision(nature: NatureCodee): number {
  return nature === 'imprecise' ? PRECISION_IMPRECISE : 1;
}

/**
 * Prépare la ligne de calcul d'une question répondue pour un candidat.
 * `position` vaut `undefined` si le candidat n'a aucun enregistrement pour cette question (= non connu).
 */
export function ligneQuestion(reponse: Reponse & { valeur: Valeur }, poidsTheme: number, position: Position | undefined): LigneQuestion {
  const base = poidsBase(poidsTheme, reponse.tresImportant);
  const commun = {
    questionId: reponse.questionId,
    theme: reponse.theme,
    reponse: reponse.valeur,
    tresImportant: reponse.tresImportant,
    poidsBase: base,
  };
  if (estCodee(position)) {
    return {
      ...commun,
      etat: position.etat,
      code: position.code,
      nature: position.nature,
      codee: true,
      points: points(reponse.valeur, position.code),
      poids: base * precision(position.nature),
    };
  }
  return {
    ...commun,
    etat: position?.etat ?? 'non_connu',
    code: null,
    nature: position?.etat === 'arbitrage_en_attente' ? null : 'non_connu',
    codee: false,
    points: null,
    poids: 0,
  };
}

/** Arrondi d'affichage à l'entier (les demis vont vers le haut : 65,5 → 66). */
export function arrondirScore(x: number): number {
  // Neutralise les résidus de calcul flottant (ex. 62,49999999999 au lieu de 62,5) avant l'arrondi.
  return Math.round(Math.round(x * 1e9) / 1e9);
}

/** Applique la formule à un ensemble de lignes (toutes les questions répondues, ou celles d'un thème). */
export function calculerScore(lignes: readonly LigneQuestion[]): Score {
  let sommePoids = 0; // Σ poids(q), questions codées
  let sommePoidsPoints = 0; // Σ poids(q) × points(q), questions codées
  let sommePoidsBase = 0; // Σ poids_base(q), questions répondues
  let codees = 0;
  for (const l of lignes) {
    sommePoidsBase += l.poidsBase;
    if (l.codee && l.points !== null) {
      codees += 1;
      sommePoids += l.poids;
      sommePoidsPoints += l.poids * l.points;
    }
  }

  // Aucune question codée : pas de score (jamais d'erreur ni de division par zéro).
  if (sommePoids === 0 || sommePoidsBase === 0) {
    return { repondues: lignes.length, codees, sommePoids, sommePoidsBase, scoreBrut: null, c: 0, score: null, scoreArrondi: null };
  }

  const scoreBrut = (100 * sommePoidsPoints) / (POINTS_MAX * sommePoids);
  const c = sommePoids / sommePoidsBase;
  const score = POINT_DE_RAMENAGE + (scoreBrut - POINT_DE_RAMENAGE) * c;
  return { repondues: lignes.length, codees, sommePoids, sommePoidsBase, scoreBrut, c, score, scoreArrondi: arrondirScore(score) };
}

/** Fiabilité (§ 6.4) : faible sous 15 questions répondues et codées, moyenne de 15 à 29, bonne à partir de 30. */
export function fiabilite(codees: number): Fiabilite {
  if (codees >= FIABILITE_BONNE_A_PARTIR_DE) return 'bonne';
  if (codees >= FIABILITE_MOYENNE_A_PARTIR_DE) return 'moyenne';
  return 'faible';
}
