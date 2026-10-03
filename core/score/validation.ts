/**
 * Contrôle des entrées. Une entrée incohérente (réponse hors échelle, question en double, thème sans poids)
 * est une erreur de programmation et lève une `ErreurEntree`. Une donnée simplement absente
 * (candidat sans aucune position) n'est jamais une erreur.
 */
import { POIDS_THEME_MAX, POIDS_THEME_MIN } from './parametres.ts';
import type { EntreeResultats } from './types.ts';

export class ErreurEntree extends Error {
  override name = 'ErreurEntree';
}

const VALEURS = new Set([-2, -1, 0, 1, 2]);
const ETATS = new Set(['publie', 'non_connu', 'arbitrage_en_attente']);
const NATURES = new Set(['nette', 'nuancee', 'imprecise', 'non_connu', null]);

export function validerEntree(e: EntreeResultats): void {
  const questions = new Set<string>();
  for (const r of e.reponses) {
    if (questions.has(r.questionId)) throw new ErreurEntree(`Question répondue deux fois : ${r.questionId}`);
    questions.add(r.questionId);
    if (r.valeur !== 'sans_avis' && !VALEURS.has(r.valeur)) throw new ErreurEntree(`Réponse hors échelle pour ${r.questionId} : ${String(r.valeur)}`);
    if (r.valeur === 'sans_avis') continue;
    const poids = e.poidsThemes[r.theme];
    if (poids === undefined || !Number.isInteger(poids) || poids < POIDS_THEME_MIN || poids > POIDS_THEME_MAX) {
      throw new ErreurEntree(`Poids du thème « ${r.theme} » absent ou hors de 1 à 3 (question ${r.questionId}) : ${String(poids)}`);
    }
  }

  const candidats = new Set<string>();
  for (const c of e.candidats) {
    if (candidats.has(c.id)) throw new ErreurEntree(`Candidat en double : ${c.id}`);
    candidats.add(c.id);
  }

  for (const [candidatId, positions] of Object.entries(e.positions)) {
    const vues = new Set<string>();
    for (const p of positions) {
      if (vues.has(p.questionId)) throw new ErreurEntree(`Deux positions pour ${candidatId} × ${p.questionId}`);
      vues.add(p.questionId);
      if (!ETATS.has(p.etat)) throw new ErreurEntree(`État de position inconnu pour ${candidatId} × ${p.questionId} : ${String(p.etat)}`);
      if (p.code !== null && !VALEURS.has(p.code)) throw new ErreurEntree(`Code hors échelle pour ${candidatId} × ${p.questionId} : ${String(p.code)}`);
      if (!NATURES.has(p.nature)) throw new ErreurEntree(`Nature inconnue pour ${candidatId} × ${p.questionId} : ${String(p.nature)}`);
    }
  }
}
