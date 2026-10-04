/**
 * Rapport de neutralité du duel (addendum à la spécification, § 8) : pour chaque candidat, ce que son
 * réservoir contient. Il rend visible un déséquilibre (un candidat avec peu de propositions, concentrées sur
 * un thème ou sur un sens) sans le corriger, et ne bloque jamais la construction.
 *
 * Les positions servent ici à décrire le réservoir (notamment la part de positions imprécises) ; elles ne
 * sont jamais transmises au tirage, qui ne reçoit que le réservoir.
 */
import { estCodee } from '../score/codee.ts';
import type { Position } from '../score/types.ts';
import { creerReservoirDuel, duelDisponible, type QuestionActive } from './reservoir.ts';
import { PROPOSITIONS_MIN_DUEL } from './types.ts';

export interface ProfilDuel {
  readonly candidat: string;
  /** Propositions du candidat dans la banque (positions publiées avec un code). */
  readonly propositions: number;
  /** Part des questions actives de la banque : propositions / questions actives. */
  readonly couverture_banque: number;
  /** Duel proposé : au moins 8 propositions (P24). */
  readonly duel_disponible: boolean;
  readonly par_theme: Readonly<Record<string, number>>;
  /** Sens des questions (+1 : l'accord va dans le sens « pour » la mesure ; −1 : dans le sens inverse). */
  readonly par_sens: { readonly plus: number; readonly moins: number };
  readonly positions_imprecises: number;
  /** Positions imprécises / propositions (0 si le candidat n'en a aucune). */
  readonly part_imprecise: number;
}

export interface RapportDuel {
  readonly proposition_min: number;
  readonly questions_actives: number;
  readonly candidats: readonly ProfilDuel[];
}

const arrondi = (x: number): number => Math.round(x * 1e6) / 1e6;

/** Profil de chaque candidat, par identifiant croissant. */
export function calculerRapportDuel(
  questions: readonly QuestionActive[],
  positionsParCandidat: Readonly<Record<string, readonly Position[]>>,
): RapportDuel {
  const candidats = Object.keys(positionsParCandidat)
    .sort()
    .map((candidat): ProfilDuel => {
      const positions = positionsParCandidat[candidat]!;
      const reservoir = creerReservoirDuel(candidat, questions, positions);
      const natures = new Map(positions.filter((p) => estCodee(p)).map((p) => [p.questionId, p.nature]));
      const imprecises = reservoir.propositions.filter((p) => natures.get(p.id) === 'imprecise').length;
      const parTheme: Record<string, number> = {};
      for (const p of reservoir.propositions) parTheme[p.theme] = (parTheme[p.theme] ?? 0) + 1;
      const n = reservoir.propositions.length;
      return {
        candidat,
        propositions: n,
        couverture_banque: questions.length === 0 ? 0 : arrondi(n / questions.length),
        duel_disponible: duelDisponible(reservoir),
        par_theme: Object.fromEntries(Object.entries(parTheme).sort(([a], [b]) => a.localeCompare(b))),
        par_sens: {
          plus: reservoir.propositions.filter((p) => p.sens === 1).length,
          moins: reservoir.propositions.filter((p) => p.sens === -1).length,
        },
        positions_imprecises: imprecises,
        part_imprecise: n === 0 ? 0 : arrondi(imprecises / n),
      };
    });
  return { proposition_min: PROPOSITIONS_MIN_DUEL, questions_actives: questions.length, candidats };
}
