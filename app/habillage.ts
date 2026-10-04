/**
 * Textes d'habillage (spécification J1) : le ton vivant, avec une pointe d'humour, reste ICI, jamais dans les
 * énoncés, précisions, extraits, positions ni résultats. Règles :
 * - l'humour porte sur le parcours (l'effort, la pause, la mascotte), jamais sur un thème, une mesure, un candidat
 *   ou un parti ;
 * - les mêmes textes servent pour tous les chapitres : aucun thème n'est traité à part ;
 * - aucun retour sur les réponses (pas de score partiel, pas de candidat « qui monte ») ;
 * - le choix d'un texte dépend seulement du numéro du chapitre et de la graine de la partie.
 * Textes validés par Mathieu le 4 octobre 2026 (lot 5g), avec quatre phrases ajoutées : il y en a autant que de
 * chapitres possibles (11), donc aucune ne se répète dans une même partie.
 */

/** Titre de la fin de chapitre : la progression seulement. */
export function titreFinChapitre(restants: number): string {
  if (restants <= 0) return 'Dernier chapitre bouclé !';
  return restants === 1 ? 'Chapitre bouclé ! Plus qu’un.' : `Chapitre bouclé ! Plus que ${restants}.`;
}

/** Phrases de transition ; {suivant} est remplacé par le nom du chapitre suivant. */
export const TRANSITIONS: readonly string[] = [
  'Une enveloppe de plus dans l’urne. Prochain arrêt : {suivant}.',
  'Pause méritée. Quand vous voulez, on passe à {suivant}.',
  'Je n’ai rien regardé, promis : vos réponses restent sur votre téléphone. Suite : {suivant}.',
  'Vous tenez le rythme. Chapitre suivant : {suivant}.',
  'Un café ? Pas le temps : {suivant} vous attend.',
  'Chapitre rangé, enveloppe scellée. Direction : {suivant}.',
  'L’isoloir est toujours à vous. On continue avec {suivant}.',
  'Un chapitre de plus au compteur. À suivre : {suivant}.',
  'On tourne la page. Voici {suivant}.',
  'Toujours là ? Parfait, {suivant} arrive.',
  'Dépliez les jambes, {suivant} commence.',
];

export function transition(indexChapitre: number, graine: number, suivant: string): string {
  const i = (indexChapitre + (graine % TRANSITIONS.length)) % TRANSITIONS.length;
  return TRANSITIONS[i]!.replace('{suivant}', suivant);
}

/** Nom de la mascotte (décision de Mathieu, 4 octobre 2026) : non humain, tiré de l'urne (§ 5.3). */
export const NOM_MASCOTTE = 'Urnie';

/** Écrans vides et chargements. */
export const CHARGEMENT = `${NOM_MASCOTTE} range ses papiers…`;
