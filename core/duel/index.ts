/**
 * core/duel — mode « Duel avec un candidat » (phase-5/specification-mode-duel.md).
 *
 * Fonctions pures : aucun accès fichier, réseau ou horloge. Le hasard vient de la graine.
 *  - `reservoir.ts` : propositions du candidat (la seule entrée du tirage) ;
 *  - `tirage.ts` : tirage proportionnel au programme du candidat ;
 *  - `calcul.ts` : affinité en direct et finale (même formule que le classement) ;
 *  - `journal.ts` : explication du tirage pour la page « Méthode ».
 */
export * from './types.ts';
export { creerReservoirDuel, duelDisponible, propositionsParTheme } from './reservoir.ts';
export type { PropositionDuel, QuestionActive, ReservoirDuel } from './reservoir.ts';
export { tirerDuel } from './tirage.ts';
export { calculerAffinite, qualifierEcart } from './calcul.ts';
export type { AffiniteDuel, EcartAvecPosition } from './calcul.ts';
export { decrireDuel } from './journal.ts';
export { calculerRapportDuel } from './rapport.ts';
export type { ProfilDuel, RapportDuel } from './rapport.ts';
