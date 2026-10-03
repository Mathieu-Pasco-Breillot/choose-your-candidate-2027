/**
 * Qui reçoit un score (spécification § 4 et § 9) : les candidats `evalue` sont calculés ;
 * les autres sont listés comme non évalués, avec leur motif.
 */
import { melangerVerifie } from './classement.ts';
import type { Candidat, Melanger, MotifNonEvaluation, NonEvalue, OptionsResultats } from './types.ts';

/** Ordre d'affichage des motifs dans la liste des non évalués (spécification § 9.4). */
export const ORDRE_MOTIFS: readonly MotifNonEvaluation[] = [
  'primaire_en_cours',
  'pressenti',
  'declaration_non_sourcee',
  'absent_liste_officielle',
  'codage_en_attente',
  'motif_non_renseigne',
];

export function motifNonEvaluation(c: Candidat): MotifNonEvaluation {
  if (c.statutEvaluation === 'codage_en_attente') return 'codage_en_attente';
  return c.motifNonEvaluation ?? 'motif_non_renseigne';
}

/**
 * Sépare les candidats à calculer (`aCalculer`, triés par identifiant) et les non évalués.
 * Les non évalués sont regroupés par motif ; l'ordre à l'intérieur d'un motif est tiré au sort
 * (aucun ordre implicite entre candidats). Les évalués deviennent ensuite « classés » ou
 * « hors classement » selon les seuils (`classer`).
 */
export function separerCandidats(
  candidats: readonly Candidat[],
  melanger: Melanger,
  options: OptionsResultats = {},
): { aCalculer: string[]; nonEvalues: NonEvalue[] } {
  const aCalculer: string[] = [];
  const parMotif = new Map<MotifNonEvaluation, string[]>();
  for (const c of [...candidats].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const calcule = c.statutEvaluation === 'evalue' || (c.statutEvaluation === 'codage_en_attente' && options.inclureCodageEnAttente === true);
    if (calcule) {
      aCalculer.push(c.id);
    } else {
      const motif = motifNonEvaluation(c);
      parMotif.set(motif, [...(parMotif.get(motif) ?? []), c.id]);
    }
  }
  const nonEvalues: NonEvalue[] = [];
  for (const motif of ORDRE_MOTIFS) {
    const ids = parMotif.get(motif);
    if (ids === undefined) continue;
    for (const candidatId of melangerVerifie(melanger, ids)) nonEvalues.push({ candidatId, motif });
  }
  return { aCalculer, nonEvalues };
}
