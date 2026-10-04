/**
 * Mise en phrases du journal d'un tirage de duel, pour la page « Méthode ». Texte factuel, sans habillage.
 */
import type { EntreeJournalDuel, JournalDuel } from './types.ts';

const nombre = (x: number, decimales = 2): string =>
  x.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: decimales });
const pluriel = (n: number, mot: string, motPluriel = `${mot}s`): string => `${n} ${n > 1 ? motPluriel : mot}`;

function phraseQuestion(e: EntreeJournalDuel): string {
  const morceaux: string[] = [`place ${e.place} du quota du thème`];
  morceaux.push(e.origine === 'non_vue' ? 'proposition non vue' : `toutes les propositions non vues du thème étaient épuisées, proposition vue le ${e.vue_le} (la plus ancienne)`);
  if (e.filtre_sens === 'deficit_du_theme') morceaux.push('sens en déficit dans le thème');
  else if (e.filtre_sens === 'deficit_global') morceaux.push("thème à égalité de sens : sens en déficit sur l'ensemble du tirage");
  else if (e.filtre_sens === 'impossible') morceaux.push('aucune proposition du sens en déficit disponible');
  if (e.axe_ecarte) morceaux.push(`axe « ${e.axe_ecarte} » écarté (plus de la moitié du thème)`);
  morceaux.push(`tirée au hasard parmi ${pluriel(e.candidates, 'proposition')}`);
  return `${e.question_id} (${e.theme}) : ${morceaux.join(' ; ')}.`;
}

/** Décrit un tirage de duel en phrases : paramètres, quotas, puis chaque proposition dans l'ordre de passage. */
export function decrireDuel(j: JournalDuel): string[] {
  const lignes: string[] = [];
  const taille = j.taille === 'tout' ? 'tout le programme' : `${j.taille} propositions`;
  lignes.push(`Duel (${taille}) : ${j.N} propositions visées, ${j.questions_tirees} tirées parmi les ${j.propositions_disponibles} que le candidat porte dans la banque. Graine du tirage : ${j.graine}.`);
  if (j.stock_insuffisant) lignes.push('Les thèmes choisis ne contiennent pas assez de propositions pour atteindre ce nombre.');
  lignes.push('Aucun pouvoir discriminant : toutes les propositions ont la même chance d\'être tirées dans leur thème.');
  lignes.push('Quotas par thème (plus fort reste), proportionnels aux propositions du candidat et au poids choisi :');
  for (const q of j.quotas) {
    if (q.poids === 0) {
      lignes.push(`— ${q.theme} : poids 0, thème non tiré.`);
      continue;
    }
    const notes: string[] = [];
    if (q.plafonne) notes.push(`limité aux ${q.stock} propositions du candidat`);
    if (q.minimum_applique) notes.push("relevé au minimum d'une proposition");
    if (q.place_au_reste) notes.push('une place au titre des plus grands restes');
    lignes.push(`— ${q.theme} : poids ${q.poids}, ${q.stock} propositions, part théorique ${nombre(q.part_theorique)}, quota ${q.quota}${notes.length ? ` (${notes.join(', ')})` : ''}.`);
  }
  lignes.push('Propositions, dans l\'ordre de passage :');
  for (const e of j.questions) lignes.push(`— ${phraseQuestion(e)}`);
  return lignes;
}
