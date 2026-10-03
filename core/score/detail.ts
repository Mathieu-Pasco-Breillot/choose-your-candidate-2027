/**
 * Ce que la page de résultats montre pour chaque candidat, au-delà du score global
 * (spécification § 8 et § 9) : détail par thème, accords et désaccords les plus forts.
 */
import { calculerScore } from './formule.ts';
import { ACCORDS_MAX, DETAIL_THEME_MIN_QUESTIONS, POINTS_ACCORD_FORT, POINTS_DESACCORD_FORT_MAX } from './parametres.ts';
import type { AccordDesaccord, DetailTheme, LigneQuestion, NatureCodee, Valeur } from './types.ts';

/**
 * Détail par thème : même formule, ramenage compris, restreinte aux questions du thème.
 * Affiché seulement avec au moins 3 questions répondues et codées dans le thème ;
 * sinon « trop peu de questions ». Trié par identifiant de thème.
 */
export function detailParTheme(lignes: readonly LigneQuestion[]): DetailTheme[] {
  const parTheme = new Map<string, LigneQuestion[]>();
  for (const l of lignes) {
    const liste = parTheme.get(l.theme) ?? [];
    liste.push(l);
    parTheme.set(l.theme, liste);
  }
  return [...parTheme.keys()].sort().map((theme) => {
    const score = calculerScore(parTheme.get(theme)!);
    return {
      theme,
      affichage: score.codees >= DETAIL_THEME_MIN_QUESTIONS ? 'affiche' : 'trop_peu_de_questions',
      score,
    };
  });
}

function versEntree(l: LigneQuestion): AccordDesaccord {
  return {
    questionId: l.questionId,
    theme: l.theme,
    reponse: l.reponse,
    code: l.code as Valeur,
    nature: l.nature as NatureCodee,
    points: l.points as number,
    poids: l.poids,
  };
}

/** Poids décroissant ; à poids égal, identifiant de question croissant (ordre stable et vérifiable). */
const parPoidsDecroissant = (a: AccordDesaccord, b: AccordDesaccord): number =>
  b.poids - a.poids || (a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0);

/**
 * Accords forts (`points = 4`, même valeur que la position) et désaccords forts (`points ≤ 1`,
 * au moins trois crans d'écart), parmi les questions répondues et codées.
 * Triés par poids décroissant, cinq de chaque au plus.
 */
export function accordsEtDesaccords(lignes: readonly LigneQuestion[]): { accords: AccordDesaccord[]; desaccords: AccordDesaccord[] } {
  const codees = lignes.filter((l) => l.codee && l.points !== null);
  const accords = codees.filter((l) => l.points === POINTS_ACCORD_FORT).map(versEntree).sort(parPoidsDecroissant).slice(0, ACCORDS_MAX);
  const desaccords = codees
    .filter((l) => (l.points as number) <= POINTS_DESACCORD_FORT_MAX)
    .map(versEntree)
    .sort(parPoidsDecroissant)
    .slice(0, ACCORDS_MAX);
  return { accords, desaccords };
}
