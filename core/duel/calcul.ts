/**
 * Calcul de l'affinité d'un duel (addendum à la spécification, § 5).
 *
 * Même formule que le mode classique (méthodologie v1.3, § 6) : on réutilise `scoreCandidat`, restreint aux
 * propositions de la partie. Une position `imprecise` pèse 0,5 ; le ramenage vers 50 % s'applique comme
 * ailleurs. Comme les propositions du duel sont toutes codées pour le candidat, le coefficient de ramenage ne
 * s'écarte de 1 que par les positions imprécises.
 *
 * Le score d'un duel n'est PAS comparable à celui du classement, ni d'un candidat à l'autre : les propositions
 * posées diffèrent. L'interface doit l'écrire.
 */
import { estRepondue } from '../score/codee.ts';
import { SEUIL_CLASSEMENT_QUESTIONS } from '../score/parametres.ts';
import { scoreCandidat } from '../score/resultats.ts';
import type { PoidsThemes, Position, Reponse, ScoreCandidat } from '../score/types.ts';
import { ErreurDuel } from './types.ts';

export interface AffiniteDuel extends ScoreCandidat {
  /** Propositions répondues (hors « sans avis »). */
  repondues: number;
  /**
   * Score affichable : au moins 8 propositions répondues et codées (même seuil que le classement, D13).
   * Avant, l'interface affiche « en cours ».
   */
  affichable: boolean;
  /** Propositions qui manquent pour atteindre le seuil d'affichage (0 si atteint). */
  avantAffichage: number;
}

/**
 * Affinité (en direct ou finale) avec un candidat, d'après les réponses données jusque-là.
 * `poidsThemes` : poids 1 à 3 de chaque thème répondu (un thème écarté n'est pas posé).
 */
export function calculerAffinite(
  candidatId: string,
  reponses: readonly Reponse[],
  poidsThemes: PoidsThemes,
  positions: readonly Position[],
): AffiniteDuel {
  for (const r of reponses) {
    const w = poidsThemes[r.theme];
    if (w !== 1 && w !== 2 && w !== 3) throw new ErreurDuel(`poids de thème invalide pour « ${r.theme} » : ${String(w)} (1 à 3 attendu pour un thème posé)`);
  }
  const base = scoreCandidat(candidatId, reponses, poidsThemes, positions);
  const affichable = base.score.codees >= SEUIL_CLASSEMENT_QUESTIONS;
  return {
    ...base,
    repondues: reponses.filter(estRepondue).length,
    affichable,
    avantAffichage: Math.max(0, SEUIL_CLASSEMENT_QUESTIONS - base.score.codees),
  };
}

/**
 * Qualification factuelle de l'écart entre la réponse de l'utilisateur et la position du candidat, d'après
 * les points de la formule (4 − |réponse − position|). Neutre : aucun jugement de valeur.
 */
export type EcartAvecPosition = 'meme_avis' | 'proche' | 'different' | 'oppose';

export function qualifierEcart(points: number): EcartAvecPosition {
  if (points >= 4) return 'meme_avis';
  if (points >= 3) return 'proche';
  if (points >= 2) return 'different';
  return 'oppose';
}
