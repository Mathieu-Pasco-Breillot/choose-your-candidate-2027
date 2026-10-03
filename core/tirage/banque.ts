/**
 * Banque de tirage : la seule entrée de données du tirage.
 *
 * Garantie de neutralité (spécification, § 7.3) : le tirage ne lit aucune donnée par candidat autre que
 * D(q), qui est un agrégat. Cette garantie tient par construction, pas seulement par documentation :
 *
 *  - `tirer` n'accepte qu'une `BanqueTirage`, type marqué qu'on ne peut obtenir qu'avec `creerBanque` ou
 *    `construireBanqueTirage` (un objet construit à la main est refusé à la compilation) ;
 *  - ces deux fonctions recopient champ par champ ce que le tirage a le droit de lire : pour chaque
 *    question active, son identifiant, son thème, son axe, son sens et D(q) ; l'ordre du classement
 *    d'ancrage et les deux listes d'ancres. Tout autre champ fourni (codes, positions, noms de candidats,
 *    affinités…) est ignoré et n'atteint jamais le tirage ;
 *  - la banque est gelée (Object.freeze) : elle ne peut pas être complétée après coup.
 */
import type { DeriveAncrage, DeriveDiscriminance, Questions } from '../types.generated.ts';

declare const marqueBanque: unique symbol;

/** Ce que le tirage sait d'une question. */
export interface QuestionTirable {
  readonly id: string;
  readonly theme: string;
  readonly axe: string;
  readonly sens: 1 | -1;
  /** Pouvoir discriminant (méthodologie, § 7.1), de 0 à 4, ou null s'il n'est pas défini. */
  readonly D: number | null;
}

export interface BanqueTirage {
  readonly [marqueBanque]: true;
  /** Thèmes ayant au moins une question active, par ordre alphabétique. */
  readonly themes: readonly string[];
  /** Questions actives, par identifiant croissant. */
  readonly questions: readonly QuestionTirable[];
  /** Questions éligibles à l'ancrage, par D décroissant (derive/ancrage.json, `classement`). */
  readonly classementAncrage: readonly string[];
  /** Les dix ancres (modes Débat et Campagne), éventuellement moins si le codage est partiel. */
  readonly ancres: readonly string[];
  /** Les cinq ancres du mode Express, éventuellement moins. */
  readonly ancresExpress: readonly string[];
  /** D et l'ancrage sont calculés sur un codage partiel (spécification, § 7.5). */
  readonly provisoire: boolean;
}

export class ErreurBanque extends Error {}

/** Données minimales pour créer une banque (jeux de test, ou toute autre source que derive/). */
export interface EntreeBanque {
  readonly questions: readonly {
    readonly id: string;
    readonly theme: string;
    readonly axe: string;
    readonly sens: 1 | -1;
    readonly D: number | null;
  }[];
  readonly classementAncrage: readonly string[];
  readonly ancres: readonly string[];
  readonly ancresExpress: readonly string[];
  readonly provisoire?: boolean;
}

function verifierListe(nom: string, liste: readonly string[], connues: Set<string>, eligibles?: Set<string>): string[] {
  const vues = new Set<string>();
  for (const id of liste) {
    if (!connues.has(id)) throw new ErreurBanque(`${nom} : ${id} n'est pas une question active de la banque`);
    if (eligibles && !eligibles.has(id)) throw new ErreurBanque(`${nom} : ${id} n'est pas dans le classement d'ancrage`);
    if (vues.has(id)) throw new ErreurBanque(`${nom} : ${id} apparaît deux fois`);
    vues.add(id);
  }
  return [...liste];
}

/** Crée une banque de tirage en ne recopiant que les champs autorisés. */
export function creerBanque(entree: EntreeBanque): BanqueTirage {
  const questions: QuestionTirable[] = [];
  const ids = new Set<string>();
  for (const q of entree.questions) {
    if (ids.has(q.id)) throw new ErreurBanque(`question ${q.id} présente deux fois`);
    if (q.sens !== 1 && q.sens !== -1) throw new ErreurBanque(`question ${q.id} : sens invalide (${String(q.sens)})`);
    if (q.D !== null && !(Number.isFinite(q.D) && q.D >= 0 && q.D <= 4)) {
      throw new ErreurBanque(`question ${q.id} : D invalide (${q.D}), attendu entre 0 et 4 ou null`);
    }
    ids.add(q.id);
    // Recopie champ par champ : rien d'autre n'entre dans la banque.
    questions.push(Object.freeze({ id: q.id, theme: q.theme, axe: q.axe, sens: q.sens, D: q.D }));
  }
  questions.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const classement = verifierListe('classement d\'ancrage', entree.classementAncrage, ids);
  const eligibles = new Set(classement);
  const banque = {
    themes: Object.freeze([...new Set(questions.map((q) => q.theme))].sort()),
    questions: Object.freeze(questions),
    classementAncrage: Object.freeze(classement),
    ancres: Object.freeze(verifierListe('ancres', entree.ancres, ids, eligibles)),
    ancresExpress: Object.freeze(verifierListe('ancres du mode Express', entree.ancresExpress, ids, eligibles)),
    provisoire: entree.provisoire ?? false,
  };
  return Object.freeze(banque) as unknown as BanqueTirage;
}

/**
 * Construit la banque à partir des données publiées : questions (seules les actives sont gardées),
 * derive/discriminance.json (on n'y lit que D) et derive/ancrage.json (classement et listes d'ancres).
 * Les deux fichiers dérivés doivent provenir du même état des données.
 */
export function construireBanqueTirage(
  questions: readonly Pick<Questions.Question, 'id' | 'theme' | 'axe' | 'sens' | 'statut'>[],
  discriminance: Pick<DeriveDiscriminance.DeriveDiscriminance, 'empreinte_donnees' | 'provisoire' | 'questions'>,
  ancrage: Pick<DeriveAncrage.DeriveAncrage, 'empreinte_donnees' | 'provisoire' | 'classement' | 'ancres' | 'ancres_express'>,
): BanqueTirage {
  if (discriminance.empreinte_donnees !== ancrage.empreinte_donnees) {
    throw new ErreurBanque('discriminance.json et ancrage.json ne proviennent pas du même état des données (empreintes différentes)');
  }
  return creerBanque({
    questions: questions
      .filter((q) => q.statut === 'active')
      .map((q) => ({ id: q.id, theme: q.theme, axe: q.axe, sens: q.sens, D: discriminance.questions[q.id]?.D ?? null })),
    classementAncrage: ancrage.classement.map((e) => e.question_id),
    ancres: ancrage.ancres,
    ancresExpress: ancrage.ancres_express,
    provisoire: discriminance.provisoire || ancrage.provisoire,
  });
}
