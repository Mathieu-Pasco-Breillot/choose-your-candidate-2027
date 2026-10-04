/**
 * Tirage du duel (addendum à la spécification, § 4).
 *
 * Fonction pure : mêmes entrées et même graine = même tirage. Les seules données lues sont celles du réservoir
 * (`reservoir.ts` explique pourquoi aucune position ne peut y entrer) et les paramètres.
 *
 * Différences avec le tirage classique (`core/tirage/tirage.ts`) :
 *  - pas d'ancres ;
 *  - quotas proportionnels aux propositions du candidat dans chaque thème, pondérés par le poids choisi
 *    (une répartition égale entre thèmes surreprésenterait les thèmes où il a peu à dire) ;
 *  - choix uniforme dans le thème : le pouvoir discriminant D(q) mesure ce qui sépare les candidats entre
 *    eux, ce qui n'a pas de sens ici.
 * Restent identiques : filtre de sens (par thème, puis sur l'ensemble), filtre d'axe, préférence pour les
 * propositions non vues, ordre de passage par chapitres, et le départage par graine.
 */
import { creerGenerateur, deriverGraine, melanger, verifierGraine } from '../aleatoire/prng.ts';
import { calculerQuotas } from '../tirage/quotas.ts';
import { POIDS_PAR_DEFAUT, type PoidsTheme } from '../tirage/types.ts';
import { propositionsParTheme, type PropositionDuel, type ReservoirDuel } from './reservoir.ts';
import {
  ErreurDuel,
  TAILLES_DUEL,
  type ChapitreDuel,
  type EntreeJournalDuel,
  type ParametresDuel,
  type ResultatDuel,
} from './types.ts';

function lirePoids(reservoir: ReservoirDuel, poids: ParametresDuel['poids']): Map<string, PoidsTheme> {
  for (const [t, w] of Object.entries(poids)) {
    if (w !== 0 && w !== 1 && w !== 2 && w !== 3) throw new ErreurDuel(`poids invalide pour « ${t} » : ${String(w)} (0 à 3 attendu)`);
  }
  const lus = new Map<string, PoidsTheme>();
  // Un thème où le candidat n'a aucune proposition n'a pas de stock : son poids est sans effet sur le tirage.
  for (const t of reservoir.themes) lus.set(t, poids[t] ?? POIDS_PAR_DEFAUT);
  if (reservoir.themes.length > 0 && [...lus.values()].every((w) => w === 0)) {
    throw new ErreurDuel('au moins un thème avec des propositions doit avoir un poids non nul');
  }
  return lus;
}

const DATE_ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

function lireVues(vues: ParametresDuel['vues']): Map<string, { date: string; t: number }> {
  const lues = new Map<string, { date: string; t: number }>();
  for (const v of vues) {
    const t = DATE_ISO.test(v.date) ? Date.parse(v.date) : Number.NaN;
    if (Number.isNaN(t)) throw new ErreurDuel(`date de vue invalide pour ${v.id} : « ${v.date} »`);
    const deja = lues.get(v.id);
    if (!deja || t > deja.t) lues.set(v.id, { date: v.date, t });
  }
  return lues;
}

/** Tire les propositions d'un duel. Lève ErreurDuel si les paramètres sont invalides. */
export function tirerDuel(reservoir: ReservoirDuel, parametres: ParametresDuel): ResultatDuel {
  const { taille, graine } = parametres;
  if (!TAILLES_DUEL.includes(taille)) throw new ErreurDuel(`taille de duel inconnue : ${String(taille)}`);
  try {
    verifierGraine(graine);
  } catch (e) {
    throw new ErreurDuel((e as Error).message);
  }
  const poids = lirePoids(reservoir, parametres.poids);
  const vues = lireVues(parametres.vues);

  const stock = propositionsParTheme(reservoir);
  const parTheme = new Map<string, PropositionDuel[]>();
  for (const p of reservoir.propositions) parTheme.set(p.theme, [...(parTheme.get(p.theme) ?? []), p]);

  // « Tout le programme » : toutes les propositions des thèmes non écartés.
  const stockActif = reservoir.themes.reduce((s, t) => s + (poids.get(t)! > 0 ? stock.get(t)! : 0), 0);
  const N = taille === 'tout' ? stockActif : taille;

  // ── Quotas : parts proportionnelles à « propositions × poids choisi » ─────────────────────────
  const quotas = calculerQuotas(
    N,
    reservoir.themes.map((t) => ({ theme: t, poids: stock.get(t)! * poids.get(t)!, stock: stock.get(t)! })),
    creerGenerateur(deriverGraine(graine, 'quotas')),
  );

  // ── Choix dans chaque thème ──────────────────────────────────────────────────────────────────
  const retenues = new Map<string, PropositionDuel[]>(reservoir.themes.map((t) => [t, []]));
  const pris = new Set<string>();
  const journalParId = new Map<string, EntreeJournalDuel>();
  const ecartDe = (theme: string) => retenues.get(theme)!.reduce((s, q) => s + q.sens, 0);
  const themesTermines = new Set<string>();
  /** Écart de sens (plus − moins) déjà acquis sur l'ensemble, dans les thèmes terminés. */
  const ecartGlobalAcquis = (themeEnCours: string): number => {
    let total = 0;
    for (const t of themesTermines) if (t !== themeEnCours) total += ecartDe(t);
    return total;
  };

  const gChoix = creerGenerateur(deriverGraine(graine, 'choix'));
  for (const theme of melanger(gChoix, reservoir.themes)) {
    const quota = quotas.quotas.get(theme) ?? 0;
    const dansTheme = retenues.get(theme)!;
    let place = 0;
    while (dansTheme.length < quota) {
      place++;
      const restantes = parTheme.get(theme)!.filter((q) => !pris.has(q.id));
      const nonVues = restantes.filter((q) => !vues.has(q.id));
      const origine = nonVues.length > 0 ? 'non_vue' : 'vue';
      let candidates = origine === 'non_vue' ? nonVues : restantes;

      // Filtre de sens : sens en déficit dans le thème ; à égalité, sens en déficit sur l'ensemble.
      const plus = dansTheme.filter((q) => q.sens === 1).length;
      const moins = dansTheme.length - plus;
      let filtreSens: EntreeJournalDuel['filtre_sens'] = 'aucun';
      const garderSens = (s: 1 | -1, motif: 'deficit_du_theme' | 'deficit_global') => {
        const f = candidates.filter((q) => q.sens === s);
        if (f.length > 0) {
          candidates = f;
          filtreSens = motif;
        } else if (motif === 'deficit_du_theme') {
          filtreSens = 'impossible';
        }
      };
      if (plus !== moins) garderSens(plus < moins ? 1 : -1, 'deficit_du_theme');
      else {
        const acquis = ecartGlobalAcquis(theme);
        if (acquis !== 0) garderSens(acquis < 0 ? 1 : -1, 'deficit_global');
      }

      // Filtre d'axe : un axe qui dépasse déjà la moitié des propositions du thème est écarté, si un autre est disponible.
      let axeEcarte: string | null = null;
      const parAxe = new Map<string, number>();
      for (const q of dansTheme) parAxe.set(q.axe, (parAxe.get(q.axe) ?? 0) + 1);
      for (const [axe, n] of parAxe) {
        if (n * 2 > dansTheme.length && candidates.some((q) => q.axe !== axe)) {
          candidates = candidates.filter((q) => q.axe !== axe);
          axeEcarte = axe;
        }
      }

      // Propositions déjà vues : les plus anciennement vues d'abord.
      let vueLe: string | null = null;
      if (origine === 'vue') {
        const plusAncienne = Math.min(...candidates.map((q) => vues.get(q.id)!.t));
        candidates = candidates.filter((q) => vues.get(q.id)!.t === plusAncienne);
      }

      // Tirage uniforme.
      const q = candidates[gChoix.entier(candidates.length)]!;
      if (origine === 'vue') vueLe = vues.get(q.id)!.date;
      dansTheme.push(q);
      pris.add(q.id);
      journalParId.set(q.id, {
        question_id: q.id,
        theme,
        place,
        origine,
        vue_le: vueLe,
        filtre_sens: filtreSens,
        axe_ecarte: axeEcarte,
        candidates: candidates.length,
      });
    }
    themesTermines.add(theme);
  }

  // ── Ordre de passage ─────────────────────────────────────────────────────────────────────────
  const gOrdre = creerGenerateur(deriverGraine(graine, 'ordre'));
  const chapitres: ChapitreDuel[] = [];
  for (const theme of melanger(gOrdre, reservoir.themes.filter((t) => retenues.get(t)!.length > 0))) {
    chapitres.push({ theme, questions: melanger(gOrdre, retenues.get(theme)!.map((q) => q.id)) });
  }
  const questions = chapitres.flatMap((c) => c.questions);

  return {
    graine,
    candidat: reservoir.candidat,
    taille,
    chapitres,
    questions,
    journal: {
      graine,
      candidat: reservoir.candidat,
      taille,
      N,
      questions_tirees: questions.length,
      stock_insuffisant: questions.length < N,
      propositions_disponibles: reservoir.propositions.length,
      quotas: quotas.lignes.map((l) => ({ ...l, poids: poids.get(l.theme)! })),
      questions: questions.map((id) => journalParId.get(id)!),
    },
  };
}
