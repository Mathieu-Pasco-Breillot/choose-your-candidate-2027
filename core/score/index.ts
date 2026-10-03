/**
 * core/score — calcul du score du comparateur (méthodologie v1.1, § 6 ; spécification de l'application, § 8 et § 9).
 *
 * Fonctions pures : aucune lecture de fichier, aucun appel réseau, aucun tirage interne.
 * Le hasard (ordre des ex aequo et des hors classement) arrive en argument, tiré de la graine de la partie.
 *
 * Où lire la formule : `formule.ts`. Où lire les seuils : `parametres.ts` et `classement.ts`.
 */
export * from './types.ts';
export * from './parametres.ts';
export { estCodee, estRepondue, etatDePosition } from './codee.ts';
export { arrondirScore, calculerScore, fiabilite, ligneQuestion, points, poidsBase, precision } from './formule.ts';
export { accordsEtDesaccords, detailParTheme } from './detail.ts';
export { classer, motifHorsClassement, texteMotif } from './classement.ts';
export { ORDRE_MOTIFS, motifNonEvaluation, separerCandidats } from './candidats.ts';
export { situerAffinites } from './affinites.ts';
export { ErreurEntree, validerEntree } from './validation.ts';
export { calculerResultats, scoreCandidat } from './resultats.ts';
