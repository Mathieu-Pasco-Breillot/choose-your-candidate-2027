/**
 * Groupes de candidats affichés sur l'accueil et la page « Candidats » : toujours par ordre alphabétique,
 * jamais par score. Même définition que le calcul (jeu.ts) : un candidat est comparé dès qu'il a au moins une
 * position publiée et qu'il n'est pas « non évalué ».
 */
import type { CandidatPaquet } from './paquet.ts';
import { paquet } from './paquet.ts';

export const alphabetique: readonly CandidatPaquet[] = [...paquet.candidats].sort(
  (a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'),
);

export const positionsPubliees = (id: string): number => (paquet.positions[id] ?? []).filter((p) => p.etat === 'publie').length;

export interface Groupes {
  /** Positions codées : comparés dans les résultats. */
  compares: CandidatPaquet[];
  /** Remplissent le critère, codage pas encore commencé. */
  enAttente: CandidatPaquet[];
  /** Ne remplissent pas encore le critère d'inclusion, groupés par motif. */
  nonEvalues: [motif: string, liste: CandidatPaquet[]][];
}

export function groupesCandidats(): Groupes {
  const compares = alphabetique.filter((c) => c.statutEvaluation !== 'non_evalue' && positionsPubliees(c.id) > 0);
  const enAttente = alphabetique.filter((c) => c.statutEvaluation !== 'non_evalue' && positionsPubliees(c.id) === 0);
  const parMotif = new Map<string, CandidatPaquet[]>();
  for (const c of alphabetique.filter((x) => x.statutEvaluation === 'non_evalue')) {
    const motif = c.motifNonEvaluation ?? 'motif_non_renseigne';
    parMotif.set(motif, [...(parMotif.get(motif) ?? []), c]);
  }
  return { compares, enAttente, nonEvalues: [...parMotif.entries()] };
}

export const nomComplet = (c: CandidatPaquet): string => `${c.prenom} ${c.nom}`;
