/**
 * Tirage stratifié des questions (spécification de l'application, § 7 ; méthodologie v1.1, § 7).
 *
 * Fonction pure : mêmes entrées et même graine = même tirage, sur tout navigateur. Aucune lecture de
 * fichier, aucun appel réseau, aucune horloge. Les seules données lues sont celles de la banque
 * (`banque.ts` explique pourquoi aucune donnée par candidat ne peut y entrer) et les paramètres
 * (mode, poids des thèmes, questions déjà vues, graine).
 *
 * Ordre de calcul. La spécification numérote les étapes 1 (ancres) à 4 (ordre). Les quotas (étape 2) sont
 * calculés en premier parce que l'étape 1 en a besoin (« sans dépasser le quota du thème ») et qu'ils ne
 * dépendent pas des ancres ; le résultat est exactement celui des étapes dans l'ordre décrit.
 *
 * Hasard. Trois suites indépendantes sont dérivées de la graine : « quotas » (départage des restes égaux),
 * « choix » (tirage pondéré dans chaque thème), « ordre » (ordre des chapitres et des questions). Changer
 * une étape ne change donc pas le hasard des autres.
 */
import { creerGenerateur, deriverGraine, melanger, tiragePondere, verifierGraine } from '../aleatoire/prng.ts';
import { choisirAncres } from './ancres.ts';
import type { BanqueTirage, QuestionTirable } from './banque.ts';
import { calculerQuotas } from './quotas.ts';
import {
  ErreurTirage,
  MODES,
  POIDS_PAR_DEFAUT,
  TAILLE_MODE,
  type Chapitre,
  type EntreeJournal,
  type FiltreSens,
  type ParametresTirage,
  type PoidsTheme,
  type ResultatTirage,
} from './types.ts';

/** Poids d'une question dans le tirage pondéré de l'étape 3 : 1 + 3 × D / D_max, ou 1 si D n'est pas défini. */
export function poidsDeTirage(D: number | null, dMax: number | null): number {
  if (D === null || dMax === null || dMax <= 0) return 1;
  return 1 + (3 * D) / dMax;
}

function lirePoids(banque: BanqueTirage, poids: ParametresTirage['poids']): Map<string, PoidsTheme> {
  const connus = new Set(banque.themes);
  for (const t of Object.keys(poids)) {
    if (!connus.has(t)) throw new ErreurTirage(`poids donné pour un thème inconnu : « ${t} »`);
  }
  const lus = new Map<string, PoidsTheme>();
  for (const t of banque.themes) {
    const w = poids[t] ?? POIDS_PAR_DEFAUT;
    if (w !== 0 && w !== 1 && w !== 2 && w !== 3) throw new ErreurTirage(`poids invalide pour « ${t} » : ${String(w)} (0 à 3 attendu)`);
    lus.set(t, w);
  }
  if ([...lus.values()].every((w) => w === 0)) throw new ErreurTirage('au moins un thème doit avoir un poids non nul');
  return lus;
}

const DATE_ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

/** Date de dernière vue par question (une question vue plusieurs fois garde la date la plus récente). */
function lireVues(vues: ParametresTirage['vues']): Map<string, { date: string; t: number }> {
  const lues = new Map<string, { date: string; t: number }>();
  for (const v of vues) {
    // Date seule (lue en UTC) ou date et heure avec fuseau explicite : une heure sans fuseau serait lue
    // à l'heure locale du téléphone, et le tirage dépendrait du fuseau.
    const t = DATE_ISO.test(v.date) ? Date.parse(v.date) : Number.NaN;
    if (Number.isNaN(t)) throw new ErreurTirage(`date de vue invalide pour ${v.id} : « ${v.date} » (AAAA-MM-JJ, ou date et heure ISO 8601 avec fuseau)`);
    const deja = lues.get(v.id);
    if (!deja || t > deja.t) lues.set(v.id, { date: v.date, t });
  }
  return lues;
}

/**
 * Tire les questions d'une partie.
 * Lève ErreurTirage si les paramètres sont invalides (mode, poids, date de vue, graine).
 */
export function tirer(banque: BanqueTirage, parametres: ParametresTirage): ResultatTirage {
  // On ne lit que les quatre champs prévus.
  const { mode, graine } = parametres;
  if (!MODES.includes(mode)) throw new ErreurTirage(`mode inconnu : ${String(mode)}`);
  try {
    verifierGraine(graine);
  } catch (e) {
    throw new ErreurTirage((e as Error).message);
  }
  const poids = lirePoids(banque, parametres.poids);
  const vues = lireVues(parametres.vues);
  const N = TAILLE_MODE[mode];

  const questionParId = new Map(banque.questions.map((q) => [q.id, q]));
  const parTheme = new Map<string, QuestionTirable[]>();
  for (const q of banque.questions) {
    const liste = parTheme.get(q.theme) ?? [];
    liste.push(q);
    parTheme.set(q.theme, liste);
  }
  const dMax = banque.questions.reduce<number | null>((m, q) => (q.D === null ? m : m === null ? q.D : Math.max(m, q.D)), null);

  // ── Étape 2 : quotas ─────────────────────────────────────────────────────────────────────────
  const quotas = calculerQuotas(
    N,
    banque.themes.map((t) => ({ theme: t, poids: poids.get(t)!, stock: parTheme.get(t)!.length })),
    creerGenerateur(deriverGraine(graine, 'quotas')),
  );

  // ── Étape 1 : ancres ─────────────────────────────────────────────────────────────────────────
  const ancres = choisirAncres({
    mode,
    prevues: mode === 'express' ? banque.ancresExpress : banque.ancres,
    classement: banque.classementAncrage,
    questionParId,
    poids,
    quotas: quotas.quotas,
  });

  // État du tirage : questions retenues par thème.
  const retenues = new Map<string, QuestionTirable[]>(banque.themes.map((t) => [t, []]));
  const pris = new Set<string>();
  const journalParId = new Map<string, EntreeJournal>();
  const retenir = (q: QuestionTirable, entree: EntreeJournal) => {
    retenues.get(q.theme)!.push(q);
    pris.add(q.id);
    journalParId.set(q.id, entree);
  };
  /** Écart de sens (plus − moins) des questions retenues d'un thème. */
  const ecartDe = (theme: string) => retenues.get(theme)!.reduce((s, q) => s + q.sens, 0);
  const themesTermines = new Set<string>();
  /**
   * Écart de sens global déjà acquis, hors du thème en cours : écart réel des thèmes terminés, et pour les
   * autres la part que le filtre de sens du thème ne pourra plus compenser (ancres d'un même sens au-delà
   * des places restantes). Les places encore libres ne comptent pas : elles seront équilibrées dans leur
   * thème.
   */
  const ecartGlobalAcquis = (themeEnCours: string): number => {
    let total = 0;
    for (const t of banque.themes) {
      if (t === themeEnCours) continue;
      const ecart = ecartDe(t);
      if (themesTermines.has(t)) {
        total += ecart;
        continue;
      }
      const restantes = (quotas.quotas.get(t) ?? 0) - retenues.get(t)!.length;
      if (Math.abs(ecart) > restantes) total += Math.sign(ecart) * (Math.abs(ecart) - restantes);
    }
    return total;
  };
  for (const a of ancres.ancres) {
    const q = questionParId.get(a.id)!;
    retenir(q, { question_id: q.id, theme: q.theme, motif: a.remplacement ? 'ancre_de_remplacement' : 'ancre' });
  }

  // ── Étape 3 : choix dans chaque thème ────────────────────────────────────────────────────────
  const gChoix = creerGenerateur(deriverGraine(graine, 'choix'));
  // Les thèmes sont traités dans un ordre tiré au sort : le départage global des sens (voir plus bas)
  // ne favorise ainsi aucun thème de façon systématique.
  for (const theme of melanger(gChoix, banque.themes)) {
    const quota = quotas.quotas.get(theme) ?? 0;
    const dansTheme = retenues.get(theme)!;
    let place = 0;
    while (dansTheme.length < quota) {
      place++;
      const restantes = parTheme.get(theme)!.filter((q) => !pris.has(q.id));
      // 3.1 Candidates : questions non vues ; à défaut, questions déjà vues.
      const nonVues = restantes.filter((q) => !vues.has(q.id));
      const origine = nonVues.length > 0 ? 'non_vue' : 'vue';
      let candidates = origine === 'non_vue' ? nonVues : restantes;

      // 3.2 Filtre de sens : on ne garde que le sens en déficit dans le thème, s'il en reste.
      const plus = dansTheme.filter((q) => q.sens === 1).length;
      const moins = dansTheme.length - plus;
      let filtreSens: FiltreSens = 'aucun';
      const garderSens = (s: 1 | -1, motif: FiltreSens) => {
        const f = candidates.filter((q) => q.sens === s);
        if (f.length > 0) {
          candidates = f;
          filtreSens = motif;
        } else if (motif === 'deficit_du_theme') {
          filtreSens = 'impossible';
        }
      };
      if (plus !== moins) garderSens(plus < moins ? 1 : -1, 'deficit_du_theme');
      // Complément nécessaire à la garantie globale (§ 7.3 : écart de 10 % de N au plus sur l'ensemble) :
      // quand le thème est à égalité, le sens en déficit sur l'ensemble du tirage est préféré.
      else {
        const acquis = ecartGlobalAcquis(theme);
        if (acquis !== 0) garderSens(acquis < 0 ? 1 : -1, 'deficit_global');
      }

      // 3.3 Filtre d'axe : un axe qui dépasse déjà la moitié des questions du thème est écarté, si un autre
      // axe est disponible.
      let axeEcarte: string | null = null;
      const parAxe = new Map<string, number>();
      for (const q of dansTheme) parAxe.set(q.axe, (parAxe.get(q.axe) ?? 0) + 1);
      for (const [axe, n] of parAxe) {
        if (n * 2 > dansTheme.length && candidates.some((q) => q.axe !== axe)) {
          candidates = candidates.filter((q) => q.axe !== axe);
          axeEcarte = axe;
        }
      }

      // Questions déjà vues : les plus anciennement vues d'abord.
      let vueLe: string | null = null;
      if (origine === 'vue') {
        const plusAncienne = Math.min(...candidates.map((q) => vues.get(q.id)!.t));
        candidates = candidates.filter((q) => vues.get(q.id)!.t === plusAncienne);
      }

      // 3.4 Tirage pondéré : 1 + 3 × D / D_max.
      const poidsCandidates = candidates.map((q) => poidsDeTirage(q.D, dMax));
      const i = tiragePondere(gChoix, poidsCandidates);
      const q = candidates[i]!;
      if (origine === 'vue') vueLe = vues.get(q.id)!.date;
      retenir(q, {
        question_id: q.id,
        theme,
        motif: 'quota',
        place,
        origine,
        vue_le: vueLe,
        filtre_sens: filtreSens,
        axe_ecarte: axeEcarte,
        candidates: candidates.length,
        poids_tirage: poidsCandidates[i]!,
      });
    }
    themesTermines.add(theme);
  }

  // ── Étape 4 : ordre de passage ───────────────────────────────────────────────────────────────
  const gOrdre = creerGenerateur(deriverGraine(graine, 'ordre'));
  const chapitres: Chapitre[] = [];
  for (const theme of melanger(gOrdre, banque.themes.filter((t) => retenues.get(t)!.length > 0))) {
    chapitres.push({ theme, questions: melanger(gOrdre, retenues.get(theme)!.map((q) => q.id)) });
  }
  const questions = chapitres.flatMap((c) => c.questions);

  return {
    graine,
    mode,
    chapitres,
    questions,
    journal: {
      graine,
      mode,
      N,
      questions_tirees: questions.length,
      stock_insuffisant: questions.length < N,
      minimum_par_theme_applicable: quotas.minimumApplicable,
      d_max: dMax,
      provisoire: banque.provisoire,
      quotas: quotas.lignes,
      ancres: ancres.journal,
      questions: questions.map((id) => journalParId.get(id)!),
    },
  };
}
