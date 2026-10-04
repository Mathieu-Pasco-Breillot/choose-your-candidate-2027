/**
 * Réservoir de propositions d'un candidat : la seule entrée de données du tirage du duel.
 *
 * Comme pour la banque du tirage classique (`core/tirage/banque.ts`), la garantie de neutralité tient par
 * construction : le réservoir ne recopie que l'identifiant, le thème, l'axe et le sens de chaque question
 * dont le candidat a une position publiée. Aucun code, aucune nature, aucun extrait n'y entre, et `tirerDuel`
 * n'accepte que ce type marqué (un objet construit à la main est refusé à la compilation).
 *
 * V1 (lot 5h) : propositions = questions de la banque commune où le candidat a une position publiée.
 * V2 (lot 5i) : le réservoir s'enrichira des mesures de son programme complet, sans changer ce contrat.
 */
import { estCodee } from '../score/codee.ts';
import type { Position } from '../score/types.ts';
import { PROPOSITIONS_MIN_DUEL } from './types.ts';
import { ErreurDuel } from './types.ts';

declare const marqueReservoir: unique symbol;

/** Ce que le tirage sait d'une proposition. */
export interface PropositionDuel {
  readonly id: string;
  readonly theme: string;
  readonly axe: string;
  readonly sens: 1 | -1;
}

export interface ReservoirDuel {
  readonly [marqueReservoir]: true;
  readonly candidat: string;
  /** Thèmes ayant au moins une proposition, par ordre alphabétique. */
  readonly themes: readonly string[];
  /** Propositions du candidat, par identifiant croissant. */
  readonly propositions: readonly PropositionDuel[];
}

export interface QuestionActive {
  readonly id: string;
  readonly theme: string;
  readonly axe: string;
  readonly sens: 1 | -1;
}

/**
 * Crée le réservoir d'un candidat. `questions` : les questions actives de la banque ; `positions` : les
 * positions du candidat. Une proposition est retenue si la position est publiée et porte un code
 * (`estCodee` : accord ou arbitrage ; « non connu » et « arbitrage en attente » sont écartés, D8).
 */
export function creerReservoirDuel(candidat: string, questions: readonly QuestionActive[], positions: readonly Position[]): ReservoirDuel {
  const codees = new Set(positions.filter((p) => estCodee(p)).map((p) => p.questionId));
  const vus = new Set<string>();
  const propositions: PropositionDuel[] = [];
  for (const q of questions) {
    if (vus.has(q.id)) throw new ErreurDuel(`question ${q.id} présente deux fois`);
    vus.add(q.id);
    if (q.sens !== 1 && q.sens !== -1) throw new ErreurDuel(`question ${q.id} : sens invalide (${String(q.sens)})`);
    if (!codees.has(q.id)) continue;
    // Recopie champ par champ : rien d'autre n'entre dans le réservoir.
    propositions.push(Object.freeze({ id: q.id, theme: q.theme, axe: q.axe, sens: q.sens }));
  }
  propositions.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const reservoir = {
    candidat,
    themes: Object.freeze([...new Set(propositions.map((p) => p.theme))].sort()),
    propositions: Object.freeze(propositions),
  };
  return Object.freeze(reservoir) as unknown as ReservoirDuel;
}

/** P24 : le duel n'est proposé que si le candidat a au moins 8 propositions. */
export const duelDisponible = (r: ReservoirDuel): boolean => r.propositions.length >= PROPOSITIONS_MIN_DUEL;

/** Nombre de propositions par thème. */
export function propositionsParTheme(r: ReservoirDuel): ReadonlyMap<string, number> {
  const m = new Map<string, number>();
  for (const p of r.propositions) m.set(p.theme, (m.get(p.theme) ?? 0) + 1);
  return m;
}
