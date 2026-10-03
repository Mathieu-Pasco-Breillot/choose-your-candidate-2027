/**
 * Seuils, rangs et ordre d'affichage (méthodologie § 6.3, spécification § 6 et § 8).
 */
import { SEUIL_CLASSEMENT_PART, SEUIL_CLASSEMENT_QUESTIONS } from './parametres.ts';
import type { Classe, HorsClassement, Melanger, MotifHorsClassement, Score, ScoreCandidat } from './types.ts';

/** Texte du motif, ex. « codé sur 7 de vos 20 questions ». */
export function texteMotif(codees: number, repondues: number): string {
  if (repondues === 0) return 'aucune question répondue';
  if (repondues === 1) return `codé sur ${codees} de votre seule question`;
  return `codé sur ${codees} de vos ${repondues} questions`;
}

/**
 * Un candidat figure au classement s'il est codé sur au moins 10 questions répondues
 * et sur au moins 50 % des questions répondues (une position `imprecise` compte pour une question codée).
 * Renvoie `null` s'il passe les seuils, sinon le motif chiffré.
 */
export function motifHorsClassement(score: Score): MotifHorsClassement | null {
  const moinsDeDix = score.codees < SEUIL_CLASSEMENT_QUESTIONS;
  const moinsDeLaMoitie = score.codees < SEUIL_CLASSEMENT_PART * score.repondues;
  // Sans aucun code il n'y a pas de score : toujours hors classement (cas déjà couvert par « moins de 10 »).
  if (!moinsDeDix && !moinsDeLaMoitie && score.score !== null) return null;
  return { codees: score.codees, repondues: score.repondues, moinsDeDix, moinsDeLaMoitie, texte: texteMotif(score.codees, score.repondues) };
}

/** Vérifie que le mélange fourni renvoie bien une permutation de la liste reçue. */
export function melangerVerifie<T>(melanger: Melanger, liste: readonly T[]): T[] {
  const copie = [...liste];
  const resultat = melanger(copie);
  const restants = [...liste];
  const valide =
    Array.isArray(resultat) &&
    resultat.length === liste.length &&
    resultat.every((x) => {
      const i = restants.indexOf(x);
      if (i < 0) return false;
      restants.splice(i, 1);
      return true;
    });
  if (!valide) throw new Error('La fonction de mélange doit renvoyer une permutation de la liste reçue.');
  return resultat;
}

const parIdentifiant = (a: { candidatId: string }, b: { candidatId: string }): number =>
  a.candidatId < b.candidatId ? -1 : a.candidatId > b.candidatId ? 1 : 0;

/**
 * Sépare les candidats classés et hors classement, et fixe l'ordre d'affichage.
 *
 *  - Les classés sont groupés par score affiché (entier) décroissant. Les candidats d'un même groupe
 *    sont ex aequo : même rang (1 + nombre de candidats au score affiché strictement supérieur),
 *    ordre entre eux tiré au sort.
 *  - Les hors classement sont dans un ordre tiré au sort.
 *
 * Pour que le résultat ne dépende que de la graine et non de l'ordre des données, chaque liste est
 * d'abord triée par identifiant, puis mélangée : chaque groupe d'ex aequo, du meilleur score au plus
 * faible, puis la liste des hors classement.
 */
export function classer(scores: readonly ScoreCandidat[], melanger: Melanger): { classement: Classe[]; horsClassement: HorsClassement[] } {
  const classables: ScoreCandidat[] = [];
  const hors: HorsClassement[] = [];
  for (const s of [...scores].sort(parIdentifiant)) {
    const motif = motifHorsClassement(s.score);
    if (motif === null) classables.push(s);
    else hors.push({ ...s, motif });
  }

  const groupes = new Map<number, ScoreCandidat[]>();
  for (const s of classables) {
    const cle = s.score.scoreArrondi as number;
    groupes.set(cle, [...(groupes.get(cle) ?? []), s]);
  }

  const classement: Classe[] = [];
  for (const valeur of [...groupes.keys()].sort((a, b) => b - a)) {
    const groupe = groupes.get(valeur)!;
    const rang = classement.length + 1;
    const exAequo = groupe.length > 1;
    const ordre = exAequo ? melangerVerifie(melanger, groupe) : groupe;
    for (const s of ordre) classement.push({ ...s, rang, exAequo });
  }

  return { classement, horsClassement: melangerVerifie(melanger, hors) };
}
