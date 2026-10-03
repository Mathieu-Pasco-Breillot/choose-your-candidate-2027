/**
 * Assemble tout ce que la page de résultats affiche (spécification § 9), à partir des réponses,
 * des poids de thème, des candidats et de leurs positions.
 */
import { situerAffinites } from './affinites.ts';
import { separerCandidats } from './candidats.ts';
import { estRepondue } from './codee.ts';
import { classer } from './classement.ts';
import { accordsEtDesaccords, detailParTheme } from './detail.ts';
import { calculerScore, fiabilite, ligneQuestion } from './formule.ts';
import { validerEntree } from './validation.ts';
import type { EntreeResultats, Melanger, Position, PoidsThemes, Reponse, Resultats, ScoreCandidat, Valeur } from './types.ts';

/**
 * Score complet d'un candidat : lignes de calcul, score, fiabilité, détail par thème,
 * accords et désaccords. Les questions sont traitées par identifiant croissant :
 * l'ordre des réponses ne change rien.
 */
export function scoreCandidat(
  candidatId: string,
  reponses: readonly Reponse[],
  poidsThemes: PoidsThemes,
  positions: readonly Position[] = [],
): ScoreCandidat {
  const parQuestion = new Map(positions.map((p) => [p.questionId, p]));
  const repondues = reponses
    .filter(estRepondue)
    .sort((a, b) => (a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0)) as (Reponse & { valeur: Valeur })[];
  const lignes = repondues.map((r) => ligneQuestion(r, poidsThemes[r.theme] as number, parQuestion.get(r.questionId)));
  const score = calculerScore(lignes);
  return {
    candidatId,
    score,
    fiabilite: fiabilite(score.codees),
    lignes,
    themes: detailParTheme(lignes),
    ...accordsEtDesaccords(lignes),
    arbitragesEnAttente: lignes.filter((l) => l.etat === 'arbitrage_en_attente').length,
  };
}

/**
 * Calcule les résultats d'une partie.
 *
 * `melanger` est tiré de la graine de la partie : il fixe l'ordre des ex aequo, des hors classement
 * et des non évalués à l'intérieur de chaque motif. Il n'a aucun effet sur les scores ni sur les rangs.
 * Appels dans cet ordre : non évalués (un par motif présent), groupes d'ex aequo (du meilleur score
 * au plus faible), hors classement.
 */
export function calculerResultats(entree: EntreeResultats, melanger: Melanger): Resultats {
  validerEntree(entree);
  const { aCalculer, nonEvalues } = separerCandidats(entree.candidats, melanger, entree.options);
  const scores = aCalculer.map((id) => scoreCandidat(id, entree.reponses, entree.poidsThemes, entree.positions[id]));
  const { classement, horsClassement } = classer(scores, melanger);
  return {
    repondues: entree.reponses.filter(estRepondue).length,
    classement,
    horsClassement,
    nonEvalues,
    affinites: situerAffinites(entree.affinites ?? [], { classement, horsClassement, nonEvalues }),
  };
}
