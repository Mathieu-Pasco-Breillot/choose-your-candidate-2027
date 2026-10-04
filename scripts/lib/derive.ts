/**
 * Calculs de derive/ : pouvoir discriminant, ancrage, couverture, accord entre codeurs.
 * Fonctions pures sur un Dataset ; règles de la méthodologie v1.1 et de la spécification (phase 5).
 *
 * Conventions communes
 *  - Un code est « publié » si la position est en accord ou arbitrée et que son code n'est pas nul.
 *    Un désaccord non arbitré compte comme « non connu » (méthodologie, D8).
 *  - Un code 0 est un code : « non nul » signifie « différent de null ».
 *  - Seules les questions actives comptent.
 *  - Candidats comparables : les candidats dont le statut n'est pas « non_evalue » et qui ont un
 *    fichier de positions. Ils sont tous comparés dans les résultats et suivis par le rapport de neutralité.
 *  - Population de référence (« candidats évalués », méthodologie v1.4, D14) : les candidats comparables
 *    codés sur au moins SEUIL_POPULATION_REFERENCE des questions actives. Elle seule sert au pouvoir
 *    discriminant et à l'ancrage, pour qu'un candidat encore très peu codé ne vide pas la liste d'ancres.
 */
import type { Dataset } from './dataset.ts';
import type { Candidats, Positions, Questions } from '../../core/types.generated.ts';

type Candidat = Candidats.Candidat;
type Position = Positions.Position;
type Question = Questions.Question;

// ── Paramètres fixés par la méthodologie v1.1 ──────────────────────────────────────────────────
export const SEUIL_CANDIDATS_CODES = 4; // § 7.1 : D non défini en dessous
export const NOMBRE_ANCRES = 10; // § 7.2 / D6
export const NOMBRE_ANCRES_EXPRESS = 5; // D11
export const COUVERTURE_MIN_ANCRAGE = 0.8; // § 7.2
export const ANCRES_PAR_THEME_MAX = 1;
export const ANCRES_PAR_AXE_MAX = 3;
export const ANCRES_MIN_PAR_SENS = 4;
export const ANCRES_MIN_PAR_SENS_EXPRESS = 2;
export const RANG_STABILITE = 20; // § 7.2 : stabilité
export const SEUIL_EVALUE = 0.4; // § 6.3 : 40 % des questions actives
export const SEUIL_POPULATION_REFERENCE = 0.2; // § 7.1, D14 : 20 % des questions actives codées

const NATURES_CODEES = ['nette', 'nuancee', 'imprecise'] as const;
type NatureCodee = (typeof NATURES_CODEES)[number];

/** Arrondi à 6 décimales : sorties stables et lisibles. */
export const arrondi = (x: number): number => Math.round(x * 1e6) / 1e6;

// ── Lecture des données ────────────────────────────────────────────────────────────────────────
export interface CodePublie {
  code: number;
  nature: NatureCodee;
}

export interface Contexte {
  questionsActives: Question[];
  /** Candidats de la population de référence, triés par identifiant. */
  population: string[];
  /** question → candidat → code publié */
  codes: Map<string, Map<string, CodePublie>>;
}

export function estPublie(p: Position): boolean {
  return (p.statut === 'accord' || p.statut === 'arbitre') && p.code !== null;
}

/** Candidats comparés dans les résultats : hors « non_evalue », avec un fichier de positions. */
export function candidatsComparables(ds: Dataset): string[] {
  return ds.candidats.candidats
    .filter((c: Candidat) => c.statut_evaluation !== 'non_evalue' && ds.positions[c.id] !== undefined)
    .map((c: Candidat) => c.id)
    .sort();
}

/** Part des questions actives sur lesquelles le candidat a un code publié (toutes natures, D9). */
export function partQuestionsCodees(ds: Dataset, candidat: string): number {
  const actives = new Set(
    Object.values(ds.questions)
      .flatMap((f) => f.questions)
      .filter((q) => q.statut === 'active')
      .map((q) => q.id),
  );
  if (actives.size === 0) return 0;
  const codees = (ds.positions[candidat]?.positions ?? []).filter((p) => actives.has(p.question_id) && estPublie(p)).length;
  return codees / actives.size;
}

/** Population de référence (D14) : candidats comparables codés sur au moins 20 % des questions actives. */
export function populationDeReference(ds: Dataset): string[] {
  return candidatsComparables(ds).filter((id) => partQuestionsCodees(ds, id) >= SEUIL_POPULATION_REFERENCE);
}

/** Vrai tant que le codage de la vague 1 n'est pas terminé : les résultats sont alors « provisoires » (spécification, § 7.5). */
export function estProvisoire(ds: Dataset): boolean {
  const pop = candidatsComparables(ds);
  if (pop.length === 0) return true;
  return ds.candidats.candidats.some((c: Candidat) => pop.includes(c.id) && c.statut_evaluation === 'codage_en_attente');
}

/**
 * `perimetre` : « reference » (par défaut) pour le pouvoir discriminant et l'ancrage ;
 * « comparables » pour suivre tous les candidats comparés (rapport de neutralité).
 */
export function construireContexte(ds: Dataset, perimetre: 'reference' | 'comparables' = 'reference'): Contexte {
  const questionsActives = Object.values(ds.questions)
    .flatMap((f) => f.questions)
    .filter((q) => q.statut === 'active')
    .sort((a, b) => a.id.localeCompare(b.id));
  const actives = new Set(questionsActives.map((q) => q.id));
  const population = perimetre === 'reference' ? populationDeReference(ds) : candidatsComparables(ds);
  const codes = new Map<string, Map<string, CodePublie>>();
  for (const cand of population) {
    for (const p of ds.positions[cand]!.positions) {
      if (!actives.has(p.question_id) || !estPublie(p)) continue;
      if (!NATURES_CODEES.includes(p.nature as NatureCodee)) continue;
      const parCandidat = codes.get(p.question_id) ?? new Map<string, CodePublie>();
      parCandidat.set(cand, { code: p.code as number, nature: p.nature as NatureCodee });
      codes.set(p.question_id, parCandidat);
    }
  }
  return { questionsActives, population, codes };
}

// ── Pouvoir discriminant (§ 7.1) ───────────────────────────────────────────────────────────────
/** Variance de population (D10) : somme des carrés des écarts à la moyenne, divisée par n. */
export function variancePopulation(valeurs: number[]): number {
  const n = valeurs.length;
  const moyenne = valeurs.reduce((a, b) => a + b, 0) / n;
  return valeurs.reduce((a, v) => a + (v - moyenne) ** 2, 0) / n;
}

/**
 * D(q) = variance de population des codes des candidats codés × (candidats codés / candidats évalués).
 * Non défini (null) si moins de SEUIL_CANDIDATS_CODES candidats sont codés.
 */
export function pouvoirDiscriminant(codes: number[], candidatsEvalues: number): { variance: number; D: number } | null {
  if (codes.length < SEUIL_CANDIDATS_CODES || candidatsEvalues <= 0) return null;
  const variance = variancePopulation(codes);
  return { variance, D: variance * (codes.length / candidatsEvalues) };
}

export interface LigneDiscriminance {
  theme: string;
  axe: string;
  sens: 1 | -1;
  candidats_codes: number;
  couverture: number | null;
  variance: number | null;
  D: number | null;
}

export function calculerDiscriminance(ds: Dataset) {
  const ctx = construireContexte(ds);
  const N = ctx.population.length;
  const questions: Record<string, LigneDiscriminance> = {};
  let dMax: number | null = null;
  for (const q of ctx.questionsActives) {
    const codes = [...(ctx.codes.get(q.id)?.values() ?? [])].map((c) => c.code);
    const res = pouvoirDiscriminant(codes, N);
    if (res && (dMax === null || res.D > dMax)) dMax = res.D;
    questions[q.id] = {
      theme: q.theme,
      axe: q.axe,
      sens: q.sens,
      candidats_codes: codes.length,
      couverture: N > 0 ? arrondi(codes.length / N) : null,
      variance: res ? arrondi(res.variance) : null,
      D: res ? arrondi(res.D) : null,
    };
  }
  return {
    version: 1 as const,
    empreinte_donnees: ds.empreinte,
    provisoire: estProvisoire(ds),
    population: ctx.population,
    candidats_evalues: N,
    seuil_candidats_codes: SEUIL_CANDIDATS_CODES as 4,
    d_max: dMax === null ? null : arrondi(dMax),
    questions,
  };
}

// ── Ancrage (§ 7.2) ────────────────────────────────────────────────────────────────────────────
export interface EntreeClassement {
  rang: number;
  question_id: string;
  theme: string;
  axe: string;
  sens: 1 | -1;
  D: number;
  couverture: number;
  candidats_codes: number;
}

export interface ContraintesSelection {
  n: number;
  parTheme: number | null;
  parAxe: number | null;
  minParSens: number;
}

/**
 * Parcourt `ordre` et retient une question si elle respecte les plafonds par thème et par axe et si les
 * minimums par sens restent atteignables avec les places restantes. S'arrête à n questions.
 * Si l'ordre ne permet pas d'en retenir n, la liste est plus courte (spécification, § 7.5).
 */
export function selectionner<T extends { theme: string; axe: string; sens: 1 | -1 }>(
  ordre: T[],
  c: ContraintesSelection,
): T[] {
  const retenues: T[] = [];
  const parTheme = new Map<string, number>();
  const parAxe = new Map<string, number>();
  const parSens = { plus: 0, moins: 0 };
  for (const q of ordre) {
    if (retenues.length >= c.n) break;
    if (c.parTheme !== null && (parTheme.get(q.theme) ?? 0) >= c.parTheme) continue;
    if (c.parAxe !== null && (parAxe.get(q.axe) ?? 0) >= c.parAxe) continue;
    const plus = parSens.plus + (q.sens === 1 ? 1 : 0);
    const moins = parSens.moins + (q.sens === -1 ? 1 : 0);
    const besoin = Math.max(0, c.minParSens - plus) + Math.max(0, c.minParSens - moins);
    if (c.n - (retenues.length + 1) < besoin) continue;
    retenues.push(q);
    parTheme.set(q.theme, (parTheme.get(q.theme) ?? 0) + 1);
    parAxe.set(q.axe, (parAxe.get(q.axe) ?? 0) + 1);
    parSens.plus = plus;
    parSens.moins = moins;
  }
  return retenues;
}

const minimumParSensAtteint = (liste: { sens: 1 | -1 }[], minimum: number): boolean =>
  liste.filter((q) => q.sens === 1).length >= minimum && liste.filter((q) => q.sens === -1).length >= minimum;

/**
 * Ancrage. `precedent` est la liste d'ancres du calcul précédent : une ancre n'est remplacée que si elle
 * sort des RANG_STABILITE premières questions éligibles (stabilité, § 7.2).
 */
export function calculerAncrage(ds: Dataset, precedent?: readonly string[]) {
  const ctx = construireContexte(ds);
  const N = ctx.population.length;
  const classement: EntreeClassement[] = [];
  for (const q of ctx.questionsActives) {
    const codes = [...(ctx.codes.get(q.id)?.values() ?? [])].map((c) => c.code);
    const res = pouvoirDiscriminant(codes, N);
    if (!res) continue;
    const couverture = codes.length / N;
    if (couverture < COUVERTURE_MIN_ANCRAGE) continue;
    classement.push({
      rang: 0,
      question_id: q.id,
      theme: q.theme,
      axe: q.axe,
      sens: q.sens,
      D: arrondi(res.D),
      couverture: arrondi(couverture),
      candidats_codes: codes.length,
    });
  }
  classement.sort((a, b) => b.D - a.D || a.question_id.localeCompare(b.question_id));
  classement.forEach((e, i) => (e.rang = i + 1));

  const top = new Set(classement.slice(0, RANG_STABILITE).map((e) => e.question_id));
  const gardees = new Set((precedent ?? []).filter((id) => top.has(id)));
  const ordre = [...classement.filter((e) => gardees.has(e.question_id)), ...classement.filter((e) => !gardees.has(e.question_id))];
  const choisies = new Set(
    selectionner(ordre, { n: NOMBRE_ANCRES, parTheme: ANCRES_PAR_THEME_MAX, parAxe: ANCRES_PAR_AXE_MAX, minParSens: ANCRES_MIN_PAR_SENS }).map(
      (e) => e.question_id,
    ),
  );
  const ancres = classement.filter((e) => choisies.has(e.question_id));
  // Mode Express : les premières de la liste, en ajustant pour avoir au moins deux questions de chaque sens.
  const express = selectionner(ancres, { n: NOMBRE_ANCRES_EXPRESS, parTheme: null, parAxe: null, minParSens: ANCRES_MIN_PAR_SENS_EXPRESS });

  return {
    version: 1 as const,
    empreinte_donnees: ds.empreinte,
    provisoire: estProvisoire(ds),
    parametres: {
      nombre_ancres: NOMBRE_ANCRES as 10,
      nombre_express: NOMBRE_ANCRES_EXPRESS as 5,
      couverture_min: COUVERTURE_MIN_ANCRAGE as 0.8,
      par_theme_max: ANCRES_PAR_THEME_MAX as 1,
      par_axe_max: ANCRES_PAR_AXE_MAX as 3,
      min_par_sens: ANCRES_MIN_PAR_SENS as 4,
      min_par_sens_express: ANCRES_MIN_PAR_SENS_EXPRESS as 2,
      rang_stabilite: RANG_STABILITE as 20,
    },
    classement,
    ancres: ancres.map((e) => e.question_id),
    ancres_express: express.map((e) => e.question_id),
    ancres_completes: ancres.length === NOMBRE_ANCRES && minimumParSensAtteint(ancres, ANCRES_MIN_PAR_SENS),
    express_complet: express.length === NOMBRE_ANCRES_EXPRESS && minimumParSensAtteint(express, ANCRES_MIN_PAR_SENS_EXPRESS),
  };
}

// ── Couverture (§ 6.3, grille § 7) ─────────────────────────────────────────────────────────────
export function calculerCouverture(ds: Dataset) {
  const ctx = construireContexte(ds);
  const actives = ctx.questionsActives;
  const idsActives = new Set(actives.map((q) => q.id));
  const activesParTheme = new Map<string, number>();
  for (const q of actives) activesParTheme.set(q.theme, (activesParTheme.get(q.theme) ?? 0) + 1);

  const candidats: Record<string, unknown> = {};
  const concernes = ds.candidats.candidats
    .filter((c: Candidat) => c.statut_evaluation !== 'non_evalue')
    .sort((a: Candidat, b: Candidat) => a.id.localeCompare(b.id));
  for (const c of concernes) {
    const fichier = ds.positions[c.id];
    const positions = (fichier?.positions ?? []).filter((p) => idsActives.has(p.question_id));
    const natures: Record<NatureCodee, number> = { nette: 0, nuancee: 0, imprecise: 0 };
    const parTheme: Record<string, { questions_actives: number; codes_publies: number; taux_couverture: number }> = {};
    for (const [theme, n] of [...activesParTheme.entries()].sort()) {
      parTheme[theme] = { questions_actives: n, codes_publies: 0, taux_couverture: 0 };
    }
    const themeDe = new Map(actives.map((q) => [q.id, q.theme]));
    let codesPublies = 0;
    for (const p of positions) {
      if (!estPublie(p) || !NATURES_CODEES.includes(p.nature as NatureCodee)) continue;
      codesPublies++;
      natures[p.nature as NatureCodee]++;
      parTheme[themeDe.get(p.question_id)!]!.codes_publies++;
    }
    for (const t of Object.values(parTheme)) t.taux_couverture = arrondi(t.codes_publies / t.questions_actives);
    const taux = actives.length > 0 ? codesPublies / actives.length : 0;
    candidats[c.id] = {
      vague: c.vague ?? null,
      statut_evaluation: c.statut_evaluation,
      positions_disponibles: fichier !== undefined,
      questions_avec_position: positions.length,
      avec_extrait: positions.filter((p) => p.extraits.length > 0).length,
      codes_publies: codesPublies,
      arbitrages_en_attente: positions.filter((p) => p.statut === 'arbitrage_en_attente').length,
      non_connu_apres_accord: positions.filter((p) => p.statut === 'accord' && p.code === null).length,
      taux_couverture: arrondi(taux),
      seuil_evalue_atteint: taux >= SEUIL_EVALUE,
      natures,
      parts_natures:
        codesPublies > 0
          ? {
              nette: arrondi(natures.nette / codesPublies),
              nuancee: arrondi(natures.nuancee / codesPublies),
              imprecise: arrondi(natures.imprecise / codesPublies),
            }
          : null,
      par_theme: parTheme,
    };
  }
  return {
    version: 1 as const,
    empreinte_donnees: ds.empreinte,
    provisoire: estProvisoire(ds),
    questions_actives: actives.length,
    seuil_evalue: SEUIL_EVALUE as 0.4,
    candidats,
  };
}

// ── Accord entre codeurs (grille § 7) ──────────────────────────────────────────────────────────
/**
 * Kappa pondéré quadratique entre deux séries de codes (échelle −2…+2, poids (i−j)²).
 * Renvoie null s'il n'y a aucun couple, ou si l'accord attendu par hasard est nul
 * (tous les codes identiques : le kappa n'est pas défini).
 */
export function kappaQuadratique(couples: readonly (readonly [number, number])[]): number | null {
  const n = couples.length;
  if (n === 0) return null;
  const echelle = [-2, -1, 0, 1, 2];
  const idx = (v: number) => v + 2;
  const observe = echelle.map(() => echelle.map(() => 0));
  const lignes = echelle.map(() => 0);
  const colonnes = echelle.map(() => 0);
  for (const [a, b] of couples) {
    observe[idx(a)]![idx(b)]!++;
    lignes[idx(a)]!++;
    colonnes[idx(b)]!++;
  }
  let numerateur = 0;
  let denominateur = 0;
  for (const i of echelle) {
    for (const j of echelle) {
      const poids = (i - j) ** 2;
      numerateur += poids * observe[idx(i)]![idx(j)]!;
      denominateur += (poids * lignes[idx(i)]! * colonnes[idx(j)]!) / n;
    }
  }
  if (denominateur === 0) return null;
  return 1 - numerateur / denominateur;
}

export interface BlocAccord {
  couples_codes: number;
  accord_code_et_nature: number;
  taux_accord: number | null;
  accord_code_seul: number;
  taux_accord_code_seul: number | null;
  couples_pour_kappa: number;
  kappa_pondere_quadratique: number | null;
  arbitrages_en_attente: number;
}

export function blocAccord(positions: readonly Position[]): BlocAccord {
  const doubles = positions.filter((p) => p.codage !== null);
  let memeCodeEtNature = 0;
  let memeCode = 0;
  const pourKappa: [number, number][] = [];
  for (const p of doubles) {
    const { codeur_1: a, codeur_2: b } = p.codage!;
    if (a.code === b.code) {
      memeCode++;
      if (a.nature === b.nature) memeCodeEtNature++;
    }
    if (a.code !== null && b.code !== null) pourKappa.push([a.code, b.code]);
  }
  const kappa = kappaQuadratique(pourKappa);
  return {
    couples_codes: doubles.length,
    accord_code_et_nature: memeCodeEtNature,
    taux_accord: doubles.length > 0 ? arrondi(memeCodeEtNature / doubles.length) : null,
    accord_code_seul: memeCode,
    taux_accord_code_seul: doubles.length > 0 ? arrondi(memeCode / doubles.length) : null,
    couples_pour_kappa: pourKappa.length,
    kappa_pondere_quadratique: kappa === null ? null : arrondi(kappa),
    arbitrages_en_attente: positions.filter((p) => p.statut === 'arbitrage_en_attente').length,
  };
}

export function calculerAccordCodeurs(ds: Dataset) {
  const actives = new Set(
    Object.values(ds.questions)
      .flatMap((f) => f.questions)
      .filter((q) => q.statut === 'active')
      .map((q) => q.id),
  );
  const parCandidat: Record<string, Position[]> = {};
  const modeles: Record<'codeur_1' | 'codeur_2', Set<string>> = { codeur_1: new Set(), codeur_2: new Set() };
  for (const [id, f] of Object.entries(ds.positions).sort(([a], [b]) => a.localeCompare(b))) {
    parCandidat[id] = f.positions.filter((p) => actives.has(p.question_id));
    for (const p of parCandidat[id]!) {
      if (!p.codage) continue;
      modeles.codeur_1.add(p.codage.codeur_1.modele);
      modeles.codeur_2.add(p.codage.codeur_2.modele);
    }
  }
  const vagueDe = new Map(ds.candidats.candidats.map((c: Candidat) => [c.id, c.vague]));
  const parVague: Record<string, Position[]> = {};
  for (const [id, positions] of Object.entries(parCandidat)) {
    const v = vagueDe.get(id);
    if (v === undefined) continue;
    (parVague[String(v)] ??= []).push(...positions);
  }
  const toutes = Object.values(parCandidat).flat();
  return {
    version: 1 as const,
    empreinte_donnees: ds.empreinte,
    provisoire: estProvisoire(ds),
    codeurs: { codeur_1: [...modeles.codeur_1].sort(), codeur_2: [...modeles.codeur_2].sort() },
    global: blocAccord(toutes),
    par_vague: Object.fromEntries(Object.entries(parVague).sort(([a], [b]) => a.localeCompare(b)).map(([v, ps]) => [v, blocAccord(ps)])),
    par_candidat: Object.fromEntries(Object.entries(parCandidat).map(([id, ps]) => [id, blocAccord(ps)])),
    arbitrages: {
      en_attente: toutes.filter((p) => p.statut === 'arbitrage_en_attente').length,
      rendus: toutes.filter((p) => p.statut === 'arbitre').length,
    },
    controle_humain: {
      tires_au_sort: toutes.filter((p) => p.controle_humain.tire_au_sort).length,
      effectues: toutes.filter((p) => p.controle_humain.resultat != null).length,
      corrections: toutes.filter((p) => p.controle_humain.resultat === 'corrige').length,
    },
  };
}
