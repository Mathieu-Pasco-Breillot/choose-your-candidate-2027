/**
 * Logique d'une partie : tirage, réponses, résultats. Fonctions pures (le stockage est dans stockage.ts),
 * appuyées sur core/tirage et core/score. Aucun nom de candidat n'intervient avant les résultats.
 */
import { creerGenerateur, deriverGraine, melanger } from '../core/aleatoire/prng.ts';
import { calculerResultats } from '../core/score/index.ts';
import type { Resultats, Valeur } from '../core/score/index.ts';
import { construireBanqueTirage, tirer } from '../core/tirage/index.ts';
import type { BanqueTirage, QuestionVue } from '../core/tirage/index.ts';
import type { QuestionPaquet } from './paquet.ts';
import { paquet } from './paquet.ts';

export type ModeJeu = 'express' | 'debat';

export interface ReponseSaisie {
  valeur: Valeur | 'sans_avis';
  tresImportant: boolean;
}

export interface Partie {
  version: 1;
  mode: ModeJeu;
  graine: number;
  /** Empreinte des données au moment du tirage : une partie sauvegardée avec d'autres données est écartée. */
  empreinte: string;
  chapitres: { theme: string; questions: string[] }[];
  questions: string[];
  reponses: Record<string, ReponseSaisie>;
  /** Indice de la question en cours ; égal au nombre de questions quand la partie est terminée. */
  position: number;
  /** Ordre des boutons de l'échelle, inversé une partie sur deux (spécification § 5.4). */
  echelleInversee: boolean;
}

export const questionsParId: ReadonlyMap<string, QuestionPaquet> = new Map(paquet.questions.map((q) => [q.id, q]));

let banqueEnCache: BanqueTirage | undefined;
function banque(): BanqueTirage {
  banqueEnCache ??= construireBanqueTirage(paquet.questions, paquet.discriminance, paquet.ancrage);
  return banqueEnCache;
}

/** Graine tirée à l'ouverture du quiz (spécification § 7.1). */
export function nouvelleGraine(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!;
}

export function nouvellePartie(mode: ModeJeu, vues: readonly QuestionVue[], graine: number): Partie {
  const tirage = tirer(banque(), { mode, poids: {}, vues, graine });
  return {
    version: 1,
    mode,
    graine,
    empreinte: paquet.empreinte,
    chapitres: tirage.chapitres.map((c) => ({ theme: c.theme, questions: [...c.questions] })),
    questions: [...tirage.questions],
    reponses: {},
    position: 0,
    echelleInversee: graine % 2 === 1,
  };
}

export const estTerminee = (p: Partie): boolean => p.position >= p.questions.length;

export function questionCourante(p: Partie): QuestionPaquet {
  const q = questionsParId.get(p.questions[p.position] ?? '');
  if (!q) throw new Error('Aucune question en cours.');
  return q;
}

export function repondre(p: Partie, reponse: ReponseSaisie): Partie {
  if (estTerminee(p)) return p;
  const id = p.questions[p.position]!;
  const tresImportant = reponse.valeur === 'sans_avis' ? false : reponse.tresImportant;
  return {
    ...p,
    reponses: { ...p.reponses, [id]: { valeur: reponse.valeur, tresImportant } },
    position: p.position + 1,
  };
}

export function reculer(p: Partie): Partie {
  return p.position > 0 ? { ...p, position: p.position - 1 } : p;
}

/** Place du chapitre en cours : « chapitre 3 sur 11 », « question 2 sur 4 du chapitre ». */
export function situation(p: Partie) {
  let reste = p.position;
  for (const [i, c] of p.chapitres.entries()) {
    if (reste < c.questions.length) return { chapitre: i, theme: c.theme, dansChapitre: reste, taille: c.questions.length };
    reste -= c.questions.length;
  }
  const dernier = p.chapitres.length - 1;
  return { chapitre: dernier, theme: p.chapitres[dernier]!.theme, dansChapitre: 0, taille: 0 };
}

/**
 * Population calculée : les candidats qui ont au moins une position publiée (même définition que la population
 * de référence de derive/, validée au lot 5b : candidats non « non_evalue » disposant de positions). Aucun candidat
 * n'est `evalue` au 3 octobre 2026 (bilan 5c) : ceux-là sont traités comme évalués, avec les mêmes seuils de
 * classement ; les autres sont listés « codage en attente ».
 */
const candidatsCalcules = paquet.candidats.map((c) =>
  c.statutEvaluation !== 'non_evalue' && (paquet.positions[c.id] ?? []).some((p) => p.etat === 'publie')
    ? { ...c, statutEvaluation: 'evalue' as const }
    : c,
);

export function resultatsDePartie(p: Partie): Resultats {
  const themes = [...new Set(paquet.questions.map((q) => q.theme))];
  const reponses = p.questions.map((id) => {
    const saisie = p.reponses[id];
    return {
      questionId: id,
      theme: questionsParId.get(id)!.theme,
      valeur: saisie?.valeur ?? ('sans_avis' as const),
      tresImportant: saisie?.tresImportant ?? false,
    };
  });
  const g = creerGenerateur(deriverGraine(p.graine, 'resultats'));
  return calculerResultats(
    {
      reponses,
      poidsThemes: Object.fromEntries(themes.map((t) => [t, 1])),
      candidats: candidatsCalcules,
      positions: paquet.positions,
    },
    <T>(liste: readonly T[]): T[] => melanger(g, liste),
  );
}

/** Ajoute les questions de la partie aux questions déjà vues (date UTC « AAAA-MM-JJ »). */
export function marquerVues(vues: readonly QuestionVue[], p: Partie, date: string): QuestionVue[] {
  const retenues = new Map(vues.map((v) => [v.id, v]));
  for (const id of p.questions) retenues.set(id, { id, date });
  return [...retenues.values()];
}
