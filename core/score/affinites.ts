/**
 * Écart avec les affinités déclarées (spécification § 9.7) : où se trouve chaque candidat coché
 * à l'écran de préparation. Les affinités n'entrent dans aucun score : cette fonction ne fait
 * que lire un résultat déjà calculé.
 */
import type { Classe, HorsClassement, NonEvalue, SituationAffinite } from './types.ts';

export function situerAffinites(
  affinites: readonly string[],
  resultats: { classement: readonly Classe[]; horsClassement: readonly HorsClassement[]; nonEvalues: readonly NonEvalue[] },
): SituationAffinite[] {
  const dejaVus = new Set<string>();
  const situations: SituationAffinite[] = [];
  for (const candidatId of affinites) {
    if (dejaVus.has(candidatId)) continue;
    dejaVus.add(candidatId);
    const classe = resultats.classement.find((c) => c.candidatId === candidatId);
    if (classe) {
      situations.push({ candidatId, situation: 'classe', rang: classe.rang, exAequo: classe.exAequo, score: classe.score.scoreArrondi as number });
      continue;
    }
    const hors = resultats.horsClassement.find((c) => c.candidatId === candidatId);
    if (hors) {
      situations.push({ candidatId, situation: 'hors_classement', motif: hors.motif });
      continue;
    }
    const non = resultats.nonEvalues.find((c) => c.candidatId === candidatId);
    situations.push(non ? { candidatId, situation: 'non_evalue', motif: non.motif } : { candidatId, situation: 'inconnu' });
  }
  return situations;
}
