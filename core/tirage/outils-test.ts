/**
 * Outils des tests du tirage : banques synthétiques et vérification des garanties (spécification, § 7.3).
 * Utilisé uniquement par les tests ; aucune dépendance à Node.
 */
import { creerBanque, type BanqueTirage, type QuestionTirable } from './banque.ts';
import { ANCRES_PAR_AXE_MAX, ANCRES_PAR_THEME_MAX, TAILLE_MODE, type ParametresTirage, type ResultatTirage } from './types.ts';

export const THEMES_TEST = [
  'retraites', 'fiscalite', 'economie-dette', 'sante', 'education', 'immigration',
  'securite', 'defense', 'ecologie-energie', 'union-europeenne', 'institutions',
];
const AXES = ['economie', 'securite', 'frontieres', 'europe', 'ecologie', 'institutions'];
const PREFIXES = ['RET', 'FIS', 'ECO', 'SAN', 'EDU', 'IMM', 'SEC', 'DEF', 'ENV', 'EUR', 'INS'];

/**
 * Sélection d'ancres selon la méthodologie § 7.2 (même règle que scripts/lib/derive.ts, `selectionner`),
 * recopiée ici pour que core/ ne dépende pas de scripts/.
 */
export function selectionnerAncres(
  ordre: readonly QuestionTirable[],
  n: number,
  parTheme: number | null,
  parAxe: number | null,
  minParSens: number,
): QuestionTirable[] {
  const retenues: QuestionTirable[] = [];
  const t = new Map<string, number>();
  const a = new Map<string, number>();
  const s = { plus: 0, moins: 0 };
  for (const q of ordre) {
    if (retenues.length >= n) break;
    if (parTheme !== null && (t.get(q.theme) ?? 0) >= parTheme) continue;
    if (parAxe !== null && (a.get(q.axe) ?? 0) >= parAxe) continue;
    const plus = s.plus + (q.sens === 1 ? 1 : 0);
    const moins = s.moins + (q.sens === -1 ? 1 : 0);
    const besoin = Math.max(0, minParSens - plus) + Math.max(0, minParSens - moins);
    if (n - (retenues.length + 1) < besoin) continue;
    retenues.push(q);
    t.set(q.theme, (t.get(q.theme) ?? 0) + 1);
    a.set(q.axe, (a.get(q.axe) ?? 0) + 1);
    s.plus = plus;
    s.moins = moins;
  }
  return retenues;
}

export interface OptionsBanque {
  /** Questions actives par thème (pair conseillé : les sens sont alors exactement équilibrés). */
  questionsParTheme?: number | readonly number[];
  /** D de la question k du thème t ; null = non défini. Par défaut : D varié, défini partout. */
  D?: (t: number, k: number) => number | null;
  /** Nombre maximal d'ancres (pour simuler un ancrage partiel). Par défaut : liste complète. */
  ancresMax?: number;
  themes?: readonly string[];
}

/** Banque synthétique : sens alternés (équilibrés), axes tournants (deux ou trois par thème), D varié. */
export function banqueSynthetique(o: OptionsBanque = {}): BanqueTirage {
  const themes = o.themes ?? THEMES_TEST;
  const questions: QuestionTirable[] = [];
  themes.forEach((theme, t) => {
    const n = typeof o.questionsParTheme === 'number' ? o.questionsParTheme : (o.questionsParTheme?.[t] ?? 8 + 2 * (t % 4));
    for (let k = 0; k < n; k++) {
      const D = o.D ? o.D(t, k) : ((t * 7 + k * 13) % 17) / 4.25;
      questions.push({
        id: `${PREFIXES[t % PREFIXES.length]}-${String(k + 1 + 100 * Math.floor(t / PREFIXES.length)).padStart(3, '0')}`,
        theme,
        axe: AXES[(t + (k % 3)) % AXES.length]!,
        sens: k % 2 === 0 ? 1 : -1,
        D,
      });
    }
  });
  const classement = questions
    .filter((q) => q.D !== null)
    .sort((a, b) => b.D! - a.D! || (a.id < b.id ? -1 : 1));
  const ancres = selectionnerAncres(classement, Math.min(10, o.ancresMax ?? 10), ANCRES_PAR_THEME_MAX, ANCRES_PAR_AXE_MAX, 4);
  const express = selectionnerAncres(ancres, Math.min(5, o.ancresMax ?? 5), null, null, 2);
  return creerBanque({
    questions,
    classementAncrage: classement.map((q) => q.id),
    ancres: ancres.map((q) => q.id),
    ancresExpress: express.map((q) => q.id),
  });
}

/**
 * Plus petit écart de sens atteignable dans un thème, pour un quota donné, avec `plus` et `moins` questions
 * disponibles de chaque sens.
 */
export function ecartMinimal(quota: number, plus: number, moins: number): number {
  const m = Math.min(plus, moins);
  return quota <= 2 * m ? quota % 2 : quota - 2 * m;
}

/**
 * Vérifie les garanties du § 7.3 et les règles d'étape sur un résultat. Renvoie la liste des violations
 * (vide si tout est respecté).
 *  - `equilibreGlobal` : vérifier aussi l'écart global de 10 % de N (seulement quand le stock le permet,
 *    ce que l'appelant sait).
 */
export function violations(
  banque: BanqueTirage,
  p: ParametresTirage,
  r: ResultatTirage,
  options: { equilibreGlobal?: boolean } = {},
): string[] {
  const v: string[] = [];
  const N = TAILLE_MODE[p.mode];
  const parId = new Map(banque.questions.map((q) => [q.id, q]));
  const poids = (t: string) => p.poids[t] ?? 1;
  const vues = new Set(p.vues.map((x) => x.id));

  // Aucun doublon, toutes les questions existent.
  if (new Set(r.questions).size !== r.questions.length) v.push('doublon');
  for (const id of r.questions) if (!parId.has(id)) v.push(`question inconnue ${id}`);

  // Chapitres : un par thème, contigus, concaténation = liste.
  const themesChapitres = r.chapitres.map((c) => c.theme);
  if (new Set(themesChapitres).size !== themesChapitres.length) v.push('thème présent dans deux chapitres');
  if (r.chapitres.flatMap((c) => c.questions).join() !== r.questions.join()) v.push('chapitres et liste diffèrent');
  for (const c of r.chapitres) for (const id of c.questions) if (parId.get(id)?.theme !== c.theme) v.push(`${id} hors de son chapitre`);

  // Quotas.
  const stockActif = banque.themes.filter((t) => poids(t) > 0).reduce((s, t) => s + banque.questions.filter((q) => q.theme === t).length, 0);
  if (r.questions.length !== Math.min(N, stockActif)) v.push(`nombre de questions ${r.questions.length}, attendu ${Math.min(N, stockActif)}`);
  const nonNuls = banque.themes.filter((t) => poids(t) > 0);
  for (const t of banque.themes) {
    const ligne = r.journal.quotas.find((q) => q.theme === t)!;
    const tirees = r.questions.filter((id) => parId.get(id)!.theme === t);
    const stock = banque.questions.filter((q) => q.theme === t).length;
    if (tirees.length !== ligne.quota) v.push(`${t} : ${tirees.length} questions, quota ${ligne.quota}`);
    if (poids(t) === 0 && tirees.length > 0) v.push(`${t} : thème à 0 tiré`);
    if (ligne.quota > stock) v.push(`${t} : quota au-dessus du stock`);
    if (poids(t) > 0 && Math.min(N, stockActif) >= nonNuls.length && ligne.quota < 1) v.push(`${t} : minimum d'une question non respecté`);

    // Sens dans le thème (sans questions vues : le stock est tout le thème).
    if (p.vues.length === 0) {
      const plus = tirees.filter((id) => parId.get(id)!.sens === 1).length;
      const ecart = Math.abs(2 * plus - tirees.length);
      const dispoPlus = banque.questions.filter((q) => q.theme === t && q.sens === 1).length;
      const dispoMoins = stock - dispoPlus;
      const minimal = Math.max(1, ecartMinimal(tirees.length, dispoPlus, dispoMoins));
      if (ecart > minimal) v.push(`${t} : écart de sens ${ecart} (minimum atteignable ${minimal})`);
    }

    // Questions vues : aucune tant qu'il reste des non-vues dans le thème (les ancres font exception).
    const ancres = new Set(r.journal.ancres.retenues);
    const vuesTirees = tirees.filter((id) => vues.has(id) && !ancres.has(id));
    if (vuesTirees.length > 0) {
      const nonVuesRestantes = banque.questions.filter((q) => q.theme === t && !vues.has(q.id) && !r.questions.includes(q.id));
      if (nonVuesRestantes.length > 0) v.push(`${t} : question vue tirée alors qu'il reste ${nonVuesRestantes.length} non vue(s)`);
    }
  }

  // Ancres : toutes les ancres retenues sont dans le tirage ; une ancre prévue dont le thème est tiré est
  // présente sauf si le quota de son thème est atteint ; aucune ancre dans un thème à 0.
  for (const id of r.journal.ancres.retenues) {
    if (!r.questions.includes(id)) v.push(`ancre ${id} absente`);
    if (poids(parId.get(id)!.theme) === 0) v.push(`ancre ${id} dans un thème à 0`);
  }
  const prevues = p.mode === 'express' ? banque.ancresExpress : banque.ancres;
  for (const id of prevues) {
    const t = parId.get(id)!.theme;
    const ecart = r.journal.ancres.ecartees.find((e) => e.question_id === id);
    if (poids(t) > 0 && !r.questions.includes(id) && ecart?.motif !== 'quota_du_theme_atteint') v.push(`ancre prévue ${id} absente`);
  }

  // Équilibre global des sens.
  if (options.equilibreGlobal) {
    const plus = r.questions.filter((id) => parId.get(id)!.sens === 1).length;
    const ecart = Math.abs(2 * plus - r.questions.length);
    // Le stock peut imposer un écart : en piochant n questions parmi s+ « pour » et s- « contre », le nombre
    // de « pour » est au moins n - s- et au plus s+. On n'exige que le meilleur écart atteignable.
    const n = r.questions.length;
    const actifs = banque.questions.filter((q) => poids(q.theme) > 0);
    const sPlus = actifs.filter((q) => q.sens === 1).length;
    const sMoins = actifs.length - sPlus;
    const plusMin = Math.max(0, n - sMoins);
    const plusMax = Math.min(n, sPlus);
    const meilleur = Math.min(...[plusMin, plusMax, Math.min(Math.max(n / 2, plusMin), plusMax)].map((x) => Math.abs(2 * x - n)));
    if (ecart > Math.max(0.1 * N, meilleur)) v.push(`écart global de sens ${ecart} > 10 % de ${N}`);
  }
  return v;
}
