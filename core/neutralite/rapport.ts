/**
 * Rapport de neutralité du tirage (spécification, § 7.4 et § 10).
 *
 * Question posée : le tirage, qui ne regarde aucun candidat, donne-t-il à chacun la même chance d'atteindre
 * les seuils de classement ? Sur un grand nombre de tirages simulés par mode, avec des poids de thème
 * aléatoires, on mesure pour chaque candidat :
 *  - la part des tirages où il atteint le seuil de classement (méthodologie § 6.3, v1.3 : codé sur au moins
 *    8 des questions répondues, sans condition de proportion, D13 ; une position `imprecise` compte, D9),
 *    en supposant que l'utilisateur répond à toutes les questions ;
 *  - sa couverture moyenne (questions codées / questions tirées) et le nombre moyen de questions codées.
 *
 * Le rapport rend visible un déséquilibre entre candidats ; il ne le corrige pas (décision P4) et ne bloque
 * pas la construction. Il est déterministe : même graine, mêmes données = même rapport.
 *
 * Les données par candidat (questions codées) servent ici à mesurer le résultat des tirages ; elles ne sont
 * jamais transmises au tirage, qui ne reçoit que la banque.
 */
import { creerGenerateur, deriverGraine, verifierGraine } from '../aleatoire/prng.ts';
import { SEUIL_CLASSEMENT_QUESTIONS } from '../score/parametres.ts';
import { MODES, TAILLE_MODE, tirer, type BanqueTirage, type Mode, type PoidsTheme } from '../tirage/index.ts';

/** Paramètres publiés du rapport. */
export const TIRAGES_PAR_MODE = 10_000;
export const GRAINE_RAPPORT = 2027;

export interface EntreeRapport {
  readonly banque: BanqueTirage;
  /**
   * Questions codées par candidat : code publié (accord ou arbitré) et non nul, quelle que soit la nature
   * (`imprecise` compte pour une question codée dans les seuils, D9). Clé : identifiant du candidat.
   */
  readonly codees: Readonly<Record<string, readonly string[]>>;
}

export interface ParametresRapport {
  readonly graine: number;
  readonly tirages: number;
}

export interface LigneCandidat {
  /** Part des tirages où le candidat atteint les seuils de classement. */
  readonly part_atteint_seuils: number;
  /** Moyenne, sur les tirages, de (questions codées / questions tirées). */
  readonly couverture_moyenne: number;
  readonly questions_codees_moyenne: number;
  /** Plus petit et plus grand nombre de questions codées observés sur un tirage. */
  readonly questions_codees_min: number;
  readonly questions_codees_max: number;
}

export interface LigneMode {
  readonly N: number;
  readonly questions_tirees_moyenne: number;
  readonly candidats: Readonly<Record<string, LigneCandidat>>;
  /** Écart entre la plus grande et la plus petite part de tirages atteignant les seuils. */
  readonly ecart_parts_atteint_seuils: number;
}

export interface RapportNeutralite {
  readonly parametres: {
    readonly tirages_par_mode: number;
    readonly graine: number;
    readonly seuil_questions_codees: number;
    readonly poids_themes: 'uniforme_0_a_3_au_moins_un_non_nul';
    readonly reponses: 'toutes_les_questions_tirees';
    readonly questions_deja_vues: 'aucune';
  };
  readonly candidats: readonly string[];
  /** Part des questions actives de la banque codées pour chaque candidat (point de comparaison). */
  readonly couverture_banque: Readonly<Record<string, number>>;
  readonly modes: Readonly<Record<Mode, LigneMode>>;
}

/** Arrondi à 6 décimales : sorties stables et lisibles (comme derive/). */
const arrondi = (x: number): number => Math.round(x * 1e6) / 1e6;

/** Poids de thème aléatoires : chaque thème de 0 à 3, uniformément ; on retire si tous valent 0. */
export function poidsAleatoires(themes: readonly string[], graine: number): Record<string, PoidsTheme> {
  const g = creerGenerateur(graine);
  for (;;) {
    const poids = Object.fromEntries(themes.map((t) => [t, g.entier(4) as PoidsTheme]));
    if (Object.values(poids).some((w) => w > 0)) return poids;
  }
}

export function calculerRapportNeutralite(entree: EntreeRapport, parametres: ParametresRapport): RapportNeutralite {
  const { banque } = entree;
  verifierGraine(parametres.graine);
  if (!Number.isInteger(parametres.tirages) || parametres.tirages < 1) throw new RangeError(`nombre de tirages invalide : ${parametres.tirages}`);
  const candidats = Object.keys(entree.codees).sort();
  const actives = new Set(banque.questions.map((q) => q.id));
  const codees = new Map(candidats.map((c) => [c, new Set(entree.codees[c]!.filter((id) => actives.has(id)))]));

  const modes = {} as Record<Mode, LigneMode>;
  for (const mode of MODES) {
    const cumul = new Map(candidats.map((c) => [c, { atteint: 0, couverture: 0, codees: 0, min: Infinity, max: -Infinity }]));
    let questionsTirees = 0;
    for (let i = 0; i < parametres.tirages; i++) {
      const graineTirage = deriverGraine(parametres.graine, `${mode}:${i}`);
      const poids = poidsAleatoires(banque.themes, deriverGraine(graineTirage, 'poids'));
      const { questions } = tirer(banque, { mode, poids, vues: [], graine: graineTirage });
      const repondues = questions.length;
      questionsTirees += repondues;
      for (const c of candidats) {
        const set = codees.get(c)!;
        let n = 0;
        for (const id of questions) if (set.has(id)) n++;
        const k = cumul.get(c)!;
        if (n >= SEUIL_CLASSEMENT_QUESTIONS) k.atteint++;
        k.couverture += repondues > 0 ? n / repondues : 0;
        k.codees += n;
        k.min = Math.min(k.min, n);
        k.max = Math.max(k.max, n);
      }
    }
    const lignes: Record<string, LigneCandidat> = {};
    for (const c of candidats) {
      const k = cumul.get(c)!;
      lignes[c] = {
        part_atteint_seuils: arrondi(k.atteint / parametres.tirages),
        couverture_moyenne: arrondi(k.couverture / parametres.tirages),
        questions_codees_moyenne: arrondi(k.codees / parametres.tirages),
        questions_codees_min: k.min,
        questions_codees_max: k.max,
      };
    }
    const parts = candidats.map((c) => lignes[c]!.part_atteint_seuils);
    modes[mode] = {
      N: TAILLE_MODE[mode],
      questions_tirees_moyenne: arrondi(questionsTirees / parametres.tirages),
      candidats: lignes,
      ecart_parts_atteint_seuils: parts.length > 0 ? arrondi(Math.max(...parts) - Math.min(...parts)) : 0,
    };
  }

  return {
    parametres: {
      tirages_par_mode: parametres.tirages,
      graine: parametres.graine,
      seuil_questions_codees: SEUIL_CLASSEMENT_QUESTIONS,
      poids_themes: 'uniforme_0_a_3_au_moins_un_non_nul',
      reponses: 'toutes_les_questions_tirees',
      questions_deja_vues: 'aucune',
    },
    candidats,
    couverture_banque: Object.fromEntries(candidats.map((c) => [c, actives.size > 0 ? arrondi(codees.get(c)!.size / actives.size) : 0])),
    modes,
  };
}
