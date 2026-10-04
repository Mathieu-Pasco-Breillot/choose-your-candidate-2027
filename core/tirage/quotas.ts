/**
 * Étape 2 du tirage : quotas par thème, au plus fort reste (spécification, § 7.2).
 *
 * Règle, appliquée telle quelle :
 *  1. Part théorique de chaque thème : N × poids / Σ poids.
 *  2. Plafond : un thème ne peut pas recevoir plus que son nombre de questions actives. Un thème dont la
 *     part dépasse ce nombre reçoit ce nombre, et les places en trop sont redistribuées aux autres thèmes
 *     par la même règle (on recalcule les parts sur les places et les poids restants).
 *  3. Minimum : quand N le permet (N au moins égal au nombre de thèmes de poids non nul), un thème dont la
 *     part est inférieure à 1 reçoit 1 ; les autres se partagent les places restantes.
 *  Les étapes 2 et 3 sont répétées jusqu'à stabilité. Quand un même tour trouve des thèmes au-dessus du
 *  plafond et d'autres sous 1, le côté au plus grand dépassement total est fixé en premier (voir la boucle) :
 *  la somme des quotas vaut toujours exactement le nombre de places.
 *  4. Chaque thème restant reçoit la partie entière de sa part ; les places qui restent vont aux plus grands
 *     restes. Deux restes égaux sont départagés par un ordre tiré au sort avec la graine.
 *
 * Les calculs se font en nombres entiers (une part vaut places × poids / Σ poids : on compare les restes
 * par leurs numérateurs) : deux restes « égaux » le sont exactement, sans erreur d'arrondi.
 */
import { melanger, type Generateur } from '../aleatoire/prng.ts';
import type { QuotaTheme } from './types.ts';

export interface EntreeQuota {
  readonly theme: string;
  /** Poids entier du thème (0 = thème non tiré). Le duel y passe « propositions × poids choisi ». */
  readonly poids: number;
  /** Nombre de questions actives du thème. */
  readonly stock: number;
}

export interface ResultatQuotas {
  readonly quotas: ReadonlyMap<string, number>;
  readonly lignes: readonly QuotaTheme[];
  /** Places effectivement réparties : N, ou moins si le stock des thèmes choisis ne suffit pas. */
  readonly places: number;
  readonly minimumApplicable: boolean;
}

export function calculerQuotas(N: number, entrees: readonly EntreeQuota[], g: Generateur): ResultatQuotas {
  // Ordre de départage tiré au sort, une fois pour toutes, sur la liste triée des thèmes.
  const themesTries = [...entrees].map((e) => e.theme).sort();
  const rang = new Map(melanger(g, themesTries).map((t, i) => [t, i + 1]));

  const actifs = entrees.filter((e) => e.poids > 0 && e.stock > 0);
  const stockTotal = actifs.reduce((s, e) => s + e.stock, 0);
  const places = Math.min(N, stockTotal);
  const minimumApplicable = actifs.length > 0 && places >= actifs.length;

  const fixes = new Map<string, { quota: number; plafonne: boolean; minimum: boolean }>();
  for (;;) {
    const libres = actifs.filter((e) => !fixes.has(e.theme));
    if (libres.length === 0) break;
    const reste = places - [...fixes.values()].reduce((s, f) => s + f.quota, 0);
    const poidsLibres = libres.reduce((s, e) => s + e.poids, 0);
    // Part du thème = reste × poids / poidsLibres. Comparaisons en entiers (numérateurs sur poidsLibres).
    // Plafond et minimum sont deux bornes ; quand des thèmes dépassent l'une et d'autres l'autre au même tour,
    // on fixe le côté dont le dépassement total est le plus grand : c'est celui qui reste borné une fois les
    // places redistribuées. Si les plafonds libèrent plus de places que les minimums n'en demandent, les parts
    // des autres thèmes augmentent et les plafonnés restent au-dessus de leur stock ; sinon elles diminuent et
    // les thèmes sous 1 y restent. Fixer toujours le plafond d'abord peut faire dépasser N (minimums
    // distribués sans places) ; fixer toujours le minimum d'abord peut laisser des places vides.
    const auDessusDuPlafond = libres.filter((e) => reste * e.poids > e.stock * poidsLibres);
    const sousUn = minimumApplicable ? libres.filter((e) => reste * e.poids < poidsLibres) : [];
    if (auDessusDuPlafond.length === 0 && sousUn.length === 0) break;
    const excedent = auDessusDuPlafond.reduce((s, e) => s + reste * e.poids - e.stock * poidsLibres, 0);
    const manque = sousUn.reduce((s, e) => s + poidsLibres - reste * e.poids, 0);
    if (excedent >= manque) {
      for (const e of auDessusDuPlafond) fixes.set(e.theme, { quota: e.stock, plafonne: true, minimum: false });
    } else {
      for (const e of sousUn) fixes.set(e.theme, { quota: 1, plafonne: false, minimum: true });
    }
  }

  const quotas = new Map<string, number>();
  const auReste = new Set<string>();
  const libres = actifs.filter((e) => !fixes.has(e.theme));
  for (const [t, f] of fixes) quotas.set(t, f.quota);
  if (libres.length > 0) {
    const reste = places - [...fixes.values()].reduce((s, f) => s + f.quota, 0);
    const poidsLibres = libres.reduce((s, e) => s + e.poids, 0);
    const restes = libres.map((e) => {
      const entier = Math.floor((reste * e.poids) / poidsLibres);
      return { theme: e.theme, entier, numerateurReste: reste * e.poids - entier * poidsLibres };
    });
    let aDistribuer = reste - restes.reduce((s, r) => s + r.entier, 0);
    restes.sort((a, b) => b.numerateurReste - a.numerateurReste || rang.get(a.theme)! - rang.get(b.theme)!);
    for (const r of restes) {
      let q = r.entier;
      if (aDistribuer > 0 && r.numerateurReste > 0) {
        q++;
        aDistribuer--;
        auReste.add(r.theme);
      }
      quotas.set(r.theme, q);
    }
  }

  const poidsTotal = actifs.reduce((s, e) => s + e.poids, 0);
  const lignes: QuotaTheme[] = [...entrees]
    .sort((a, b) => (a.theme < b.theme ? -1 : 1))
    .map((e) => {
      const f = fixes.get(e.theme);
      return {
        theme: e.theme,
        poids: e.poids,
        stock: e.stock,
        part_theorique: poidsTotal > 0 && e.poids > 0 && e.stock > 0 ? (N * e.poids) / poidsTotal : 0,
        quota: quotas.get(e.theme) ?? 0,
        plafonne: f?.plafonne ?? false,
        minimum_applique: f?.minimum ?? false,
        place_au_reste: auReste.has(e.theme),
        rang_departage: rang.get(e.theme)!,
      };
    });
  for (const e of entrees) if (!quotas.has(e.theme)) quotas.set(e.theme, 0);
  return { quotas, lignes, places, minimumApplicable };
}
