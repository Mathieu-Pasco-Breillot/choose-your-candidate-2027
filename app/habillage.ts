/**
 * Textes d'habillage (spécification J1) : le ton vivant, avec une pointe d'humour, reste ICI, jamais dans les
 * énoncés, précisions, extraits, positions ni résultats. Règles :
 * - l'humour porte sur le parcours (l'effort, la pause, la mascotte), jamais sur un thème, une mesure, un candidat
 *   ou un parti ;
 * - les mêmes textes servent pour tous les chapitres : aucun thème n'est traité à part ;
 * - aucun retour sur les réponses (pas de score partiel, pas de candidat « qui monte ») ;
 * - le choix d'un texte dépend seulement du numéro du chapitre et de la graine de la partie.
 * Textes à valider par Mathieu (bilan du lot 5f).
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
];

export function transition(indexChapitre: number, graine: number, suivant: string): string {
  const i = (indexChapitre + (graine % TRANSITIONS.length)) % TRANSITIONS.length;
  return TRANSITIONS[i]!.replace('{suivant}', suivant);
}

/** Écrans vides et chargements. */
export const CHARGEMENT = 'L’urne range ses papiers…';
