/**
 * Défi « Qui a dit ça ? » : appelle core/defi sur le paquet de l'application.
 * Pendant la devinette, seule la version anonymisée est montrée ; aucun score par candidat n'est calculé,
 * seul le total de bonnes réponses de la partie est compté (spécification § 5.2, J6).
 */
import { deriverGraine } from '../core/aleatoire/prng.ts';
import { tirerDefi } from '../core/defi/index.ts';
import type { ResultatDefi } from '../core/defi/index.ts';
import type { Positions } from '../core/types.generated.ts';
import { paquet } from './paquet.ts';

export const MANCHES_DEFI = 5;

/** Candidats jouables : même population que les résultats (au moins une position publiée, hors non évalués). */
const candidatsDefi = paquet.candidats
  .filter((c) => c.statutEvaluation !== 'non_evalue' && (paquet.positions[c.id] ?? []).some((p) => p.etat === 'publie'))
  .map((c) => c.id);

export function nouveauDefi(graineDePartie: number, manches = MANCHES_DEFI): ResultatDefi {
  return tirerDefi(
    {
      questions: paquet.questions,
      positions: paquet.defi as unknown as Record<string, Positions.Position[]>,
      candidats: candidatsDefi,
    },
    { graine: deriverGraine(graineDePartie, 'defi'), manches },
  );
}
