/**
 * Mise en phrases du journal de tirage, pour la page « Méthode » : chaque question tirée y est expliquée
 * (ancre, quota, filtres appliqués). Texte factuel, sans habillage.
 */
import type { EntreeJournal, JournalTirage } from './types.ts';

const NOM_MODE = { express: 'Express', debat: 'Débat', campagne: 'Campagne' } as const;

const nombre = (x: number, decimales = 2): string =>
  x.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: decimales });

const pluriel = (n: number, mot: string, motPluriel = `${mot}s`): string => `${n} ${n > 1 ? motPluriel : mot}`;

function phraseQuestion(e: EntreeJournal): string {
  if (e.motif !== 'quota') {
    return e.motif === 'ancre'
      ? `${e.question_id} (${e.theme}) : question d'ancrage.`
      : `${e.question_id} (${e.theme}) : question d'ancrage de remplacement (suivante du classement d'ancrage).`;
  }
  const morceaux: string[] = [`place ${e.place} du quota du thème`];
  morceaux.push(e.origine === 'non_vue' ? 'question non vue' : `toutes les questions non vues du thème étaient épuisées, question vue le ${e.vue_le} (la plus ancienne)`);
  if (e.filtre_sens === 'deficit_du_theme') morceaux.push('sens en déficit dans le thème');
  else if (e.filtre_sens === 'deficit_global') morceaux.push('thème à égalité de sens : sens en déficit sur l\'ensemble du tirage');
  else if (e.filtre_sens === 'impossible') morceaux.push('aucune question du sens en déficit disponible');
  if (e.axe_ecarte) morceaux.push(`axe « ${e.axe_ecarte} » écarté (plus de la moitié du thème)`);
  morceaux.push(`tirée parmi ${pluriel(e.candidates, 'question')}, poids ${nombre(e.poids_tirage)}`);
  return `${e.question_id} (${e.theme}) : ${morceaux.join(' ; ')}.`;
}

/** Décrit un tirage en phrases, dans l'ordre : paramètres, quotas, ancres, puis chaque question. */
export function decrireTirage(j: JournalTirage): string[] {
  const lignes: string[] = [];
  lignes.push(`Mode ${NOM_MODE[j.mode]} : ${j.N} questions prévues, ${j.questions_tirees} tirées. Graine du tirage : ${j.graine}.`);
  if (j.stock_insuffisant) lignes.push('Les thèmes choisis ne contiennent pas assez de questions actives pour atteindre N.');
  if (j.provisoire) lignes.push('Pouvoir discriminant et ancrage provisoires : le codage des positions n\'est pas terminé.');
  lignes.push(
    j.d_max === null
      ? 'Aucun pouvoir discriminant n\'est encore défini : toutes les questions ont le même poids de tirage (1).'
      : `Poids de tirage d'une question : 1 + 3 × D / ${nombre(j.d_max, 3)} (1 si D n'est pas défini).`,
  );

  lignes.push('Quotas par thème (plus fort reste) :');
  for (const q of j.quotas) {
    if (q.poids === 0) {
      lignes.push(`— ${q.theme} : poids 0, thème non tiré.`);
      continue;
    }
    const notes: string[] = [];
    if (q.plafonne) notes.push(`limité aux ${q.stock} questions actives`);
    if (q.minimum_applique) notes.push('relevé au minimum d\'une question');
    if (q.place_au_reste) notes.push('une place au titre des plus grands restes');
    lignes.push(
      `— ${q.theme} : poids ${q.poids}, part théorique ${nombre(q.part_theorique)}, quota ${q.quota}${notes.length ? ` (${notes.join(', ')})` : ''}.`,
    );
  }
  if (!j.minimum_par_theme_applicable) lignes.push('N est inférieur au nombre de thèmes choisis : le minimum d\'une question par thème ne peut pas s\'appliquer.');

  const a = j.ancres;
  lignes.push(
    a.prevues.length === 0
      ? 'Aucune question d\'ancrage n\'est encore disponible.'
      : `Questions d'ancrage prévues : ${a.prevues.join(', ')}.`,
  );
  for (const e of a.ecartees) {
    lignes.push(`— ${e.question_id} écartée : ${e.motif === 'theme_a_zero' ? 'son thème a le poids 0' : 'le quota de son thème est atteint'}.`);
  }
  if (a.remplacements.length > 0) lignes.push(`Ancres de remplacement : ${a.remplacements.join(', ')}.`);
  if (a.contrainte_un_par_theme_levee) lignes.push('La contrainte « une ancre par thème » a été levée pour compléter les remplacements.');
  if (a.places_non_pourvues > 0) {
    lignes.push(`${pluriel(a.places_non_pourvues, 'place')} d'ancre sans question éligible, rendue${a.places_non_pourvues > 1 ? 's' : ''} au tirage ordinaire.`);
  }

  lignes.push('Questions, dans l\'ordre de passage :');
  for (const e of j.questions) lignes.push(`— ${phraseQuestion(e)}`);
  return lignes;
}
